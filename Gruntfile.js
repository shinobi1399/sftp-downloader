module.exports = function (grunt) {

    // Project configuration.
    grunt.initConfig({
        mochaTest: {
            test: {
                options: {
                    reporter: 'spec',
                    captureFile: 'results.txt', // Optionally capture the reporter output to a file
                    quiet: false, // Optionally suppress output to standard out (defaults to false)
                    clearRequireCache: false, // Optionally clear the require cache before running tests (defaults to false)
                    noFail: false // Optionally set to not fail on failed tests (will still fail on other errors)
                },
                src: ['src/**/*.spec.js']
            }
        }
    });

    grunt.loadNpmTasks('grunt-mocha-test');

    // Default task(s).
    grunt.registerTask('default', ['mochaTest']);
    grunt.registerTask('test', ['mochaTest']);

};