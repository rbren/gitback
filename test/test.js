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
    "type": "dog",
  }
  var TACO = {
    "name": "Taco",
    "owners": ["annie"],
    "age": 1,
    "type": "cat",
  }
  var BBRENNAN = {
    "id": "bbrennan",
    "name": "Bobby",
  }
  var ANNIE = {
    "id": "annie",
    "name": "Annie",
  }

  var expectResponse = function(path, expected, done) {
    Request(HOST + path, {json: true}, function(err, resp, body) {
      Expect(err).to.equal(null);
      Expect(body).to.deep.equal(expected);
      done();
    });
  }

  var expectSuccess = function(method, path, data, done) {
    Request(HOST + path, {method: method, json: true, body: data}, function(err, resp, body) {
      Expect(err).to.equal(null);
      Expect(body).to.deep.equal({success: true});
      done();
    })
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
  });

  it('should allow posting a pet', function(done) {
    this.timeout(5000);
    expectSuccess('post', '/pets', TACO, done);
  });

  it('should allow posting an owner', function(done) {
    this.timeout(5000);
    expectSuccess('post', '/owners', ANNIE, done)
  });

  it('should return Taco', function(done) {
    expectResponse('/pets/Taco', TACO, done);
  })

  it('should return Annie', function(done) {
    expectResponse('/owners/annie', ANNIE, done);
  })
})
