var chai = require('chai');
var Client = require('./Repository');
var expect = chai.expect;
var bbp = require('bluebird');

describe('Client tests', () => {
    let _client = null;
    beforeEach((done) => {
        bbp.coroutine(function* () {
            _client = new Client();
            yield _client.connect('mongodb://localhost/test');
            yield _client.execCommand({
                dropDatabase: 1
            });
            done();
        })().catch(err => {
            done(err);
        });
    });

    describe('RepositoryTests', () => {
        let _table1;
        let _table2;
        beforeEach(() => {
            _table1 = _client.getRepository('table1');
            _table2 = _client.getRepository('table2');
        });

        it('table repos created', () => {
            expect(_table1).to.be.ok;
            expect(_table2).to.be.ok;
            expect(_table1).to.not.be.equal(_table2);
        });

        describe('upsert tests', (done) => {
            beforeEach((done) => {
                bbp.coroutine(function* () {
                    yield _table1.saveOrUpdate({
                        a: 1
                    });

                    yield _table2.saveOrUpdate({
                        a: 2
                    });
                    done();
                })().catch((err) => {
                    done(err);
                });
            });

            it('can update existing record.', (done) => {
                bbp.coroutine(function* () {
                    let existingRow =
                        (yield _table1.find({
                            a: 1
                        }))[0];

                    existingRow.a = 5;
                    yield _table1.saveOrUpdate(existingRow);
                    let rows = yield _table1.find();

                    expect(rows).to.have.lengthOf(1);
                    expect(rows[0].a).to.equal(5);
                    done();
                })().catch(err => done(err));
            });

            it('tables should contain records inserted into their tables', (done) => {
                bbp.coroutine(function* () {
                    let data = [{
                        table: _table1,
                        value: 1
                    }, {
                        table: _table2,
                        value: 2
                    }];

                    yield bbp.each(data, function* (data) {
                        var rows = yield data.table.find();

                        expect(rows).to.have.lengthOf(1);
                        expect(rows[0].a).to.equal(data.value);
                    });

                    done();
                })().catch(err => done(err));
            });

            describe('remove tests', () => {
                it('can remove existing record', (done) => {
                    bbp.coroutine(function* () {
                        let row = yield _table1.findOne({ a: 1 });
                        yield _table1.remove(row);

                        let rows = yield _table1.find();
                        expect(rows).to.have.lengthOf(0);
                        done();
                    })().catch(err => done(err));
                });
            });

            // it('table 2 should contain table ones record only', (done) => {
            //     bbp.coroutine(function* () {
            //         var rows = yield _table2.find();

            //         expect(rows).to.have.lengthOf(1);
            //         expect(rows[0].a).to.equal(2);
            //         done();
            //     }).catch(err => done(err));
            // });
        });

    });
});