'use strict';
const utils = require('./utils');
const mongoDb = require('mongodb');

class FileInfo {
    /**
     * Creates an instance of FileInfo.
     * @param {Object} file 
     * @param {string} directory 
     * @param {string} baseDir 
     * 
     * @memberOf FileInfo
     */
    constructor() {

        this._id = mongoDb.ObjectId();
    }
    static CreateFromData(file, directory, baseDir, locationId) {
        let result = new FileInfo();
        result._directory = directory;
        result._baseDir = baseDir;
        result._filename = file.filename;
        result._longname = file.longname;
        result._downloaded = false;
        result._locationId = locationId;
        return result;
    }

    /**
     * Exports the state information for this FileInfo so it can be persisted.
     * 
     * @returns state of the object.
     * 
     * @memberOf FileInfo
     */
    export() {
        return {
            directory: this._directory,
            baseDir: this._baseDir,
            filename: this._filename,
            longname: this._longname,
            downloaded: this._downloaded,
            relativePath: this.relativePath,
            _id: this._id,
            locationId: this._locationId
        };
    }

    /**
     * Can be used to import the state of the object.
     * Not sure if this is currently of any use.
     * @param {Object} obj the files state.
     * @returns 
     * 
     * @memberOf FileInfo
     */
    import(obj) {
        this._directory = obj.directory;
        this._baseDir = obj.baseDir;
        this._filename = obj.filename;
        this._longname = obj.longname;
        this._downloaded = obj.downloaded;
        this._id = obj._id;
        this._locationId = obj.locationId;
        return this;
    }
    get locationId() {
        return this._locationId;
    }

    /**
     * gets whether this file has been downloaded.
     * 
     * 
     * @memberOf FileInfo
     */
    get downloaded() {
        return !!this._downloaded;
    }

    /**
     * Sets whether this file has been downloaded.
     * 
     * 
     * @memberOf FileInfo
     */
    set downloaded(val) {
        this._downloaded = val;
    }

    /**
     * Returns the full path to the file.
     * 
     * @readonly
     * 
     * @memberOf FileInfo
     */
    get fullPath() {
        let prefix = this._directory;
        if (prefix.endsWith('/') === false) {
            prefix = prefix + '/';
        }
        return this._directory + '/' + this.name;
    }

    /**
     * Returns the relative path to the file from the root of the remote base path.
     * 
     * @readonly
     * 
     * @memberOf FileInfo
     */
    get relativePath() {
        return utils.getRelativePath(this._baseDir, this.fullPath);
    }

    /**
     * Returns the filename excluding dir information.
     * 
     * @readonly
     * 
     * @memberOf FileInfo
     */
    get name() {
        return this._filename;
    }

    /**
     * Returns true if this entry represents a directory, else false.
     * 
     * @readonly
     * 
     * @memberOf FileInfo
     */
    get isDir() {
        return this.type == "DIR";
    }
    /**
     * Returns DIR for directories and FILE for files.
     * 
     * @readonly
     * 
     * @memberOf FileInfo
     */
    get type() {
        return this._longname.startsWith('d') ? "DIR" : "FILE";
    }

    toString() {
        return `${this.type} ${this.fullPath}`;
    }
}
module.exports = FileInfo;