var Git = require('simple-git');
Git.prototype.resetHard = function (to, then) {
    return this._run(['reset', '--hard', to], function (err) {
        then && then(err);
    });
};

var Repo = module.exports = function(url) {
  this.remote = url;
}

Repo.prototype.clone = function(dest, callback) {
  var self = this;
  self.directory = dest;
  self.git = (new Git()).clone(this.remote, dest, function(err, repository) {
    if (err) return callback(err);
    self.repo = repository;
    callback(null);
  });
}

var resetOnErr = function(repo, cb) {
  return function(err, data) {
    console.log('reset?', err, data);
    if (!err) return cb(data);
    repo.git.fetch('origin', 'master').resetHard('origin/master', function(resetErr) {
      if (resetErr) throw resetErr;
      cb(err)
    })
  }
}

Repo.prototype.pull = function(callback) {
  this.git.add(['.']).commit("Edits").pull('origin', 'master', resetOnErr(this, callback));
}

Repo.prototype.push = function(callback) {
  console.log('push!')
  this.git.add(['.']).commit("Edits").push('origin', 'master', resetOnErr(this, callback));
}

Repo.prototype.sync = function(callback) {
  console.log('sync');
  var self = this;
  self.pull(function(err) {
    if (err) return callback(err);
    console.log('push?')
    self.push(callback)
  })
}
