"use strict";
let bbp = require('bluebird');
let mongodb = require('mongodb');
bbp.promisifyAll(mongodb);
let MongoClient = mongodb.MongoClient;
let winston = require('winston');

class DbClient {
    get db() {
        if (!this._db) {
            throw 'connect to database before using';
        }
        return this._db;
    }

    connect(url) {
        return MongoClient.connectAsync(url)
            .bind(this)
            .then(db => {

                this._db = db;
                return this;
            });
    }

    /**
     * 
     * 
     * @param {any} obj
     * takes a string name or an object with a tableName property.
     * @returns 
     * 
     * @memberOf DbClient
     */
    getRepository(obj) {
        let name = this.getCollectionName(obj);
        return new Repository(this.db.collection(name));
    }

    execCommand(cmd) {
        return this.db.commandAsync(cmd);
    }

    getCollectionName(obj) {
        let collectionName = obj ? obj.tableName ? obj.tableName : obj : null;

        if (!collectionName) {
            throw 'no tableName could be determined';
        }
        return collectionName;
    }

    disconnect() {
        try {
            return this.db.closeAsync();
        } catch (error) {
            winston.error('could not disconnect database', error);
        }

    }
}

class Repository {
    constructor(collection) {
        this.collection = collection;
    }
    saveOrUpdate(obj) {
        if (!obj._id) {
            obj._id = mongodb.ObjectId();
        }
        return this.collection.findOneAndUpdateAsync(
            { _id: obj._id },
            { $set: obj },
            { returnOriginal: false, upsert: true });
    }

    find(search) {
        return this.collection.find(search).toArrayAsync();
    }

    findOne(search) {
        return this.collection.findOneAsync(search);
    }


    /**
     * 
     * 
     * @param {any} search
     * A mongodb format search object.
     * @returns 
     * Returns true if the object exists, else false.
     * @memberOf Repository
     */
    exists(search) {
        return bbp.coroutine(function* () {
            let result = yield this.findOne(search);
            return !!result;
        });
    }

    getById(id) {
        return this.collection.findOneAsync(
            { _id: id });
    }

    remove(obj) {
        if (!obj._id) {
            throw new Error('object has no id and therefore cannot remove');
        }
        return this.removeById(obj._id);
    }
    removeById(id) {
        return this.collection.removeAsync({ _id: id });
    }

    createIdObject(id) {
        if (!id) {
            throw 'cannot create id object';
        }
        return {
            id: mongodb.ObjectId(id)
        };
    }
}



module.exports = DbClient;