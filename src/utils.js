'use strict';
const _ = require('lodash');
const mongoDb = require('mongodb');

/**
 * Takes the base path and full path of the file and generates the relative path
 * for the file.
 * @param {string} basePath 
 * @param {string} fullPath 
 * @returns the relative path to the file
 */
function getRelativePath(basePath, fullPath) {
    let fileParts = fullPath.split('/');
    let relParts = basePath.split('/');
    let result = '';
    for (let i = 0; i < fileParts.length; i++) {
        let filePart = fileParts[i];

        if (i < relParts.length) {
            let relPart = relParts[i];
            if (filePart !== relPart) {
                throw new Error('file and relativePath dont match');
            }
        }
        else {
            if (result.length === 0) {
                result += filePart;
            }
            else {
                result += '/' + filePart;
            }
        }
    }
    return result;
}
module.exports.getRelativePath = getRelativePath;
/**
 * Changes the base path for a filesystem path.
 * Expects paths to be delimited with /
 * @param {string} basePath
 * the base path portion of the full path.
 * @param {string} fullPath
 * the full path to the resource.
 * @param {string} newBasePath
 * the new base path to replace the old one with.
 * @returns
 * The new base path.
 */
function changeBasePath(basePath, fullPath, newBasePath) {
    let baseParts = basePath.split('/');
    let fullParts = fullPath.split('/');
    let i = 0;
    let relativePath = '';

    if (basePath === fullPath) {
        return newBasePath;
    }

    for (let i = 0; i < fullParts.length; i++) {
        if (i < baseParts.length) {
            if (baseParts[i] != fullParts[i]) {
                throw new Error(`base path mismatch base: ${basePath}, full: ${fullPath}`);
            }
        }
        else {
            if (relativePath.length > 0) {
                relativePath += '/';
            }
            relativePath += fullParts[i];
        }
    }
    if (newBasePath.endsWith('/') === false) {
        newBasePath = newBasePath + '/';
    }
    return newBasePath + relativePath;
}

module.exports.changeBasePath = changeBasePath;

/**
 * Tries to replace invalid windows path chars with space.
 * Useful when converting between linux and windows paths.
 * @param {string} path 
 * @returns the new path with the invalid characters replaced.
 *
 */
function removeNonWindowsChars(path) {
    let result = '';
    let chars = `<>"|?*`;

    let isWindowsPath = /[a-z]:\\/i.test(path);

    let regexString = '[' + _.escapeRegExp(chars) + ']';
    let reg = new RegExp(regexString, 'g');

    for (let i = 0; i < path.length; i++) {
        let char = path[i];
        char = _.replace(char, reg, ' ');

        //cater for second char eg c:\
        if (i != 1) {
            if (char == ':') {
                char = ' ';
            }
        }

        if (isWindowsPath && char == '/') {
            char = ' ';
        }
        result += char;
    }
    return result;
}
module.exports.removeNonWindowsChars = removeNonWindowsChars;


/**
 * Generates a globally unique identifier.
 * 
 * @returns UID string
 */
function generateGuid() {
    return mongoDb.ObjectId().toString();
}
module.exports.generateGuid = generateGuid;