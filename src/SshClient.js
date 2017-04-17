var BPromise = require('bluebird');
let ssh2 = require('ssh2');
let winston = require('winston');
let Client = ssh2.Client;

class SshClient {
    constructor() {
        this.client = new Client();
        this.ready = false;
    }
    connect(connectionDetails) {
        let connPromise = new BPromise((resolve, reject) => {
            this.client.on('ready', () => {
                this.ready = true;
                resolve(this);
            }).connect(connectionDetails);
        });
        return connPromise;
    }

    /**
     * returns a sftp handler to perform sftp calls.
     * 
     * @returns 
     * SFTP promise.
     * @memberOf SshClient
     */
    sftp() {
        if (!this.ready) {
            throw 'connection not ready';
        }
        return this.client.sftpAsync().then(sftp => {
            return BPromise.promisifyAll(sftp);
        });
    }

    /**
     * disconnects the existing connection.
     * 
     * 
     * @memberOf SshClient
     */
    disconnect() {
        try {
            this.client.destroy();
        } catch (error) {
            winston.error('failed to disconnect from ssh', error);
        }

        this.ready = false;

    }
}

module.exports = SshClient;