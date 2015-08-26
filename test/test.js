var Request = require('request');
var Expect = require('chai').expect;

describe('Server', function() {
  before(function(done) {
    require('../server.js').listen(3333, done);
  });

  var HOST = 'http://localhost:3333';
  var LUCY = {
    "name": "Lucy",
    "owners": ["bbrennan"],
    "age": 2,
    "type": "dog"
  }
  var BBRENNAN = {
    "id": "bbrennan",
    "name": "Bobby"
  }

  var expectResponse = function(path, expected, done) {
    Request(HOST + path, {json: true}, function(err, resp, body) {
      Expect(err).to.equal(null);
      Expect(body).to.deep.equal(expected);
      done();
    });
  }

  it('should return Lucy', function(done) {
    expectResponse('/pets/Lucy', LUCY, done);
  });

  it('should return bbrennan', function(done) {
    expectResponse('/owners/bbrennan', BBRENNAN, done);
  });

  it('should return all pets', function(done) {
    expectResponse('/pets', [LUCY], done);
  });

  it('should return all users', function(done) {
    expectResponse('/owners', [BBRENNAN], done);
  })
})
