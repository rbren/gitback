var Request = require('request');
var Expect = require('chai').expect;
var Rmdir = require('rimraf');
var Mkdir = require('mkdirp');

var Gitback = require('../index.js');

var TEST_REPO_DIR = '/home/ubuntu/git/petstore_test';

var Git = require('simple-git')(TEST_REPO_DIR)
  .init()
  .add(['.'])
  .commit("Init")
  .checkoutLocalBranch('newbranch');

describe('Server', function() {
  var gitback = null;
  before(function(done) {
    gitback = new Gitback({remote: TEST_REPO_DIR, directory: __dirname + '/test_database'});
    gitback.initialize(function() {
      gitback.listen(3333);
      done();
    });
  });

  after(function() {
    Rmdir.sync(TEST_REPO_DIR + '/.git');
    Rmdir.sync(TEST_REPO_DIR + '/gitback/pets');
    Rmdir.sync(TEST_REPO_DIR + '/gitback/owners');
    Rmdir.sync(__dirname + '/test_database');
  })

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

  it('should return all pets', function(done) {
    expectResponse('/pets', [TACO], done);
  });

  it('should return all users', function(done) {
    expectResponse('/owners', [ANNIE], done);
  });
})
