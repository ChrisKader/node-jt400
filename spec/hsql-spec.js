'use strict';
var jt400 = require('../lib/jt400').useInMemoryDb(),
	JSONStream = require('JSONStream');

function onFail(that, done) {
	return function(err) {
		that.fail(err);
		done();
	};
}

describe('hsql in memory', function() {

	var testtblColumns = [{
		name: 'ID',
		typeName: 'DECIMAL',
		precision: 15,
		scale: 0
	}, {
		name: 'NAME',
		typeName: 'VARCHAR',
		precision: 300,
		scale: 0
	}];

	beforeEach(function(done) {
		jt400.update('create table testtbl (ID DECIMAL(15, 0) GENERATED BY DEFAULT AS IDENTITY(START WITH 1234567891234), NAME VARCHAR(300), START DATE, STAMP TIMESTAMP, PRIMARY KEY(ID))')
			.then(function() {
				return jt400.update('insert into testtbl (NAME) values(\'Foo bar baz\')');
			})
			.then(function() {
				done();
			})
			.fail(onFail(this, done));
	});

	afterEach(function(done) {
		jt400.update('drop table testtbl')
			.then(function() {
				done();
			})
			.fail(onFail(this, done));
	});

	it('should select form testtbl', function(done) {
		jt400.query('select * from testtbl')
			.then(function(res) {
				expect(res.length).toBe(1);
				done();
			})
			.fail(onFail(this, done));
	});

	it('should insert and return id', function(done) {
		jt400.insertAndGetId('insert into testtbl (NAME) values(?)', ['foo'])
			.then(function(res) {
				expect(res).toBe(1234567891235);
				done();
			})
			.fail(onFail(this, done));
	});

	it('should insert list', function(done) {
		jt400.insertList('testtbl', 'ID', [{
			NAME: 'foo'
		}, {
			NAME: 'bar'
		}])
			.then(function(res) {
				expect(res).toEqual([1234567891235, 1234567891236]);
				return jt400.query('select * from testtbl');
			})
			.then(function(res) {
				expect(res.length).toBe(3);
				done();
			})
			.fail(onFail(this, done));
	});

	it('should mock pgm call', function(done) {
		var callFoo = jt400.pgm('foo', {
			name: 'bar',
			size: 10
		}, {
			name: 'baz',
			size: 9,
			decimals: 2
		}),
			input = {
				bar: 'a',
				baz: 10
			};
		callFoo(input).then(function(res) {
			expect(res).toEqual(input);
			done();
		})
			.fail(onFail(this, done));
	});

	it('should insert date and timestamp', function (done) {
		jt400.insertList('testtbl', 'ID', [{
			START: new Date().toISOString().substr(0, 10),
			STAMP: new Date()
		}]).then(function () {
			done();
		})
			.fail(onFail(this, done));
	});

	it('should return results as array of arrays with metadata when configured to do that.', function(done) {
		jt400.executeQuery('select ID, NAME from testtbl').then(function(result) {
			expect(result).toEqual({
				metadata: {
					columns: testtblColumns
				},
				data: [
					['1234567891234', 'Foo bar baz']
				]
			});
			done();
		})
			.fail(onFail(this, done));
	});

	it('should return metadata', function (done) {
		jt400.getMetaData({schema: 'PUBLIC'}).then(function (result) {
			expect(result).toEqual([{
				schema: 'PUBLIC',
				table: 'TESTTBL',
				remarks: '',
				columns: testtblColumns
			}]);
			done();
		})
			.fail(onFail(this, done));
	});

	it('should return metadata as stream', function (done) {
		var stream = jt400.getMetaDataAsStream({schema: 'PUBLIC'})
			.pipe(JSONStream.parse()),
			schema;
		stream.on('data', function (data) {
			schema = data;
		});
		stream.on('end', function () {
			expect(schema).toEqual([{
				schema: 'PUBLIC',
				table: 'TESTTBL',
				remarks: '',
				columns: testtblColumns
			}]);
			done();
		});
		stream.on('error', onFail(this, done));
	});
});