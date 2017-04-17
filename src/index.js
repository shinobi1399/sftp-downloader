"use strict";
const bbp = require('bluebird');
const DbClient = require('./Repository');
const ssh2 = require('ssh2');
const fs = require('fs');
const winston = require('winston');
const mongoDb = require('mongodb');
const assert = require('assert');
const level = require('level');
const path = require('path');
const shell = require('shelljs');
const _ = require('lodash');
const WinstonMongo = require('winston-mongodb').MongoDB;
const utils = require('./utils');
const SshClient = require('./SshClient');
const FileInfo = require('./FileInfo');
const config = require('config');


bbp.promisifyAll(mongoDb);
bbp.promisifyAll(ssh2);
bbp.promisifyAll(fs);

let MongoClient = mongoDb.MongoClient;
let Client = ssh2.Client;


let mongoConfig = config.get('mongodb');
let sshConfig = config.get('ssh');
let downloaderConfig = config.get('downloader');
let loggingConfig = config.get('logging');

let ssh = new SshClient();
let db = new DbClient();

function buildMongoUrl(config) {
    return `mongodb://${config.host}:${config.port}/${config.db}`;
}

function configureWinston() {
    winston.add(winston.transports.File, {
        filename: loggingConfig.filename,
        maxsize: 1024 * 1024 * 20,
        maxFiles: 5,
        handleExceptions: true,
        humanReadableUnhandledException: true
    });
    winston.add(WinstonMongo, {
        db: buildMongoUrl(mongoConfig),
        capped: true,
        cappedSize: 1024 * 1024 * 50
    });
}

function main() {
    return bbp.coroutine(function* () {
        yield db.connect(buildMongoUrl(mongoConfig));
        yield ssh.connect(sshConfig);
        let files = [];
        let filesRepository = getFileRepository(db);

        let sftp = yield ssh.sftp();
        winston.info('reading remote files');
        yield readRemoteFiles(
            sftp,
            files,
            downloaderConfig.remoteBasePath,
            downloaderConfig.remoteBasePath);

        winston.info('syncing database');
        yield syncDb(files, filesRepository);
        if (downloaderConfig.downloadFilesEnabled) {
            winston.info('downloading files');
            yield downloadFiles(
                files,
                sftp,
                filesRepository,
                downloaderConfig.remoteBasePath,
                downloaderConfig.localBasePath);
        }


        winston.info('finished');
    })()
        .catch((err) => winston.error(err))
        .finally(() => {
            return bbp.coroutine(function* () {
                yield db.disconnect();
                ssh.disconnect();
            })();

        });
}
module.exports.main = main;

/**
 * Builds up a array of files calling itself recursively to traverse subfolders. 
 * 
 * @param {sftp} sftp
 * The sftp client used to to navigate a remote filesystem
 * @param {File[]} files
 * resulting list of files from traversing the folder and subfolders.
 * @param {string} path
 * The remote base path to start searching.
 * @param {string} basePath The base path used to calculate the relative path of files found.
 * 
 * @returns a promise.
 */
function readRemoteFiles(sftp, files, path, basePath) {
    return bbp.coroutine(function* () {
        winston.log('info', `processing dir ${path}`);
        let list = yield sftp.readdirAsync(path);

        for (let i = 0; i < list.length; i++) {
            let x = list[i];
            let file = new FileInfo(x, path, basePath);
            if (file.isDir) {
                yield readRemoteFiles(sftp, files, file.fullPath, basePath);
            }
            else {
                winston.log('info', `found file ${file.fullPath}`);
                files.push(file);
            }
        }
    })();
}
module.exports.addFiles = readRemoteFiles;


/**
 * Syncs the files retrieved from the remote server with whats stored in the database.
 * The Files array is enriched with data from the database too eg downloaded and _id
 * @param {File[]} files 
 * @param {Repository} fileRepository 
 * @returns Promise.
 */
function syncDb(files, fileRepository) {
    return bbp.coroutine(function* () {

        let changeId = utils.generateGuid();

        for (let i = 0; i < files.length; i++) {
            let file = files[i];
            let existingDbFile = yield fileRepository.findOne({ relativePath: file.relativePath });

            if (existingDbFile) {
                existingDbFile.changeId = changeId;
                file.downloaded = existingDbFile.downloaded;
                file._id = existingDbFile._id;
                winston.info(`updating existing file ${file.fullPath}`);
            }
            else {
                winston.info(`adding new file ${file.fullPath}`);
            }

            let newDbFile = file.export();
            newDbFile.changeId = changeId;
            let updated = yield fileRepository.saveOrUpdate(newDbFile);
        }

        var orphanDbFiles = yield fileRepository.find({ changeId: { $ne: changeId } });
        for (let i = 0; i < orphanDbFiles.length; i++) {
            let oFile = orphanDbFiles[i];
            let tempFile = new FileInfo().import(oFile);
            winston.log('info', `removing orphan file ${tempFile.fullPath}`);
            yield fileRepository.remove(oFile);
        }
    })();
}
module.exports.syncDb = syncDb;


/**
 * Loops over the files in the array downloading each file if it hasn't been downloaded.
 * Once the file is downloaded its flagged in the database as downloaded.
 * 
 * @param {FileInfo[]} files 
 * @param {sftp} sftp 
 * @param {repository} fileRepository 
 * @param {string} remoteBasePath 
 * @param {string} localBasePath 
 * @returns 
 */
function downloadFiles(files, sftp, fileRepository, remoteBasePath, localBasePath) {
    return bbp.coroutine(function* () {
        let file;

        for (let i = 0; i < files.length; i++) {
            file = files[i];
            if (file.downloaded === true) {
                continue;
            }

            let downloadPath = utils.changeBasePath(remoteBasePath, file.fullPath, localBasePath);

            yield downloadFile(downloadPath, file, sftp);
            file.downloaded = true;
        }
    })();
}
module.exports.downloadFiles = downloadFiles;

/**
 * Downloads a file from the remote server.
 * 
 * @param {string} downloadPath The local directory for where to save the downloaded file
 * @param {FileInfo} file The file to download
 * @param {SFTPWrapper} sftp The sftp connection to use to download the file
 * @returns promise.
 */
function downloadFile(downloadPath, file, sftp) {
    let stepCallback = (transferred, chunk, total) => { winston.info(`${file.name} transferred ${transferred} of ${total}`); };
    return bbp.coroutine(function* () {
        downloadPath = utils.removeNonWindowsChars(downloadPath);
        let tempDownloadPath = downloadPath + '.tmp';
        winston.info(`downloading ${file.name} to ${downloadPath}`);
        let downloadDir = path.dirname(downloadPath);
        shell.mkdir('-p', downloadDir);

        yield sftp.fastGetAsync(
            file.fullPath,
            tempDownloadPath,
            { step: stepCallback });
        winston.info(`moving file from ${tempDownloadPath} to ${downloadPath}`);
        shell.mv(tempDownloadPath, downloadPath);
    })();
}
module.exports.downloadFile = downloadFile;



function getFileRepository(db) {
    return db.getRepository('files');
}



configureWinston(mongoConfig);
main();
