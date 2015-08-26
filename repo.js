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

Repo.prototype.resetOnErr = function(cb) {
  return function(err, data) {
    if (!err) return callback(data);
    this.git.fetch('origin', 'master').resetHard('origin/master', function(resetErr) {
      if (resetErr) throw resetErr;
      cb();
    })
  }
}

Repo.prototype.pull = function(callback) {
  this.git.add(['.']).commit("Edits").pull('origin', 'master', resetOnErr(callback));
}

Repo.prototype.push = function(callback) {
  this.git.add(['.']).commit("Edits").push('origin', 'master', resetOnErr(callback));
}

Repo.prototype.sync = function(callback) {
  var self = this;
  self.pull(function(err) {
    if (err) return callback(err);
    self.push(callback)
  })
}
