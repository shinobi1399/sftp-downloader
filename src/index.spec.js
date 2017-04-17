let chai = require('chai');
let expect = chai.expect;
let sut = require('./index');


describe('index tests', () => {
    describe('changeBasePathTests', () => {
        it('changes base path', () => {
            let result = sut.changeBasePath('c:/test/test2', 'c:/test/test2/test3', 'c:/a/b/c/d');

            expect(result).to.equal('c:/a/b/c/d/test3');
        });

        it('basepath does not match with trailing slash, throws exception', () => {
            var fn = () => {
                let result = sut.changeBasePath('c:/test/test2/', 'c:/test/test2/test3', 'c:/a/b/c/d');
            };
            expect(fn).to.throw(Error);
        });

        it('basepath does not match with different path, throws exception', () => {
            var fn = () => {
                let result = sut.changeBasePath('c:/a/test2/', 'c:/test/test2/test3', 'c:/a/b/c/d');
            };
            expect(fn).to.throw(Error);
        });

        it('basepath matches fullpath, returns new base path', () => {
            let result = sut.changeBasePath('c:/test/test2/test3', 'c:/test/test2/test3', 'c:/a/b/c/d');

            expect(result).to.equal('c:/a/b/c/d');
        });


    });
    describe('removeNonWindowsChars tests', () => {
        it('removes invalid chars', () => {
            let input = `?aA<>:"|?*bB<>:"|?*`;

            let result = sut.removeNonWindowsChars(input);

            expect(result).to.equal(' aA       bB       ');
        });

        it('replace just bad chars in filename', () => {
            let result = sut.removeNonWindowsChars('c:\\test\\bob?.txt');

            expect(result).to.equal('c:\\test\\bob .txt');
        });

        it('replace / when file starts with c:\\', () => {
            let result = sut.removeNonWindowsChars('c:\\test\\bob/.txt');

            expect(result).to.equal('c:\\test\\bob .txt');
        });

        it('dont replace / when used as path separator', () => {
            let result = sut.removeNonWindowsChars('c:/test/bob.txt');

            expect(result).to.equal('c:/test/bob.txt');
        });
    });
});