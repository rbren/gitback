var Git = require('simple-git');
Git.prototype.resetHard = function (to, then) {
    return this._run(['reset', '--hard', to], function (err) {
        then && then(err);
    });
};

var Repo = module.exports = function(remote, branch) {
  this.remote = remote;
  this.branch = branch;
}

Repo.prototype.clone = function(dest, callback) {
  var self = this;
  self.directory = dest;
  self.git = (new Git(dest)).clone(this.remote, dest).checkout(this.branch);
}

var resetOnErr = function(repo, cb) {
  return function(err, data) {
    if (!err) return cb(null, data);
    repo.git.fetch('origin', repo.branch).resetHard('origin/' + repo.branch, function(resetErr) {
      if (resetErr) throw resetErr;
      cb(err)
    })
  }
}

Repo.prototype.pull = function(callback) {
  this.git.add(['gitback/*'])
    .commit("Edits")
    .pull('origin', this.branch, resetOnErr(this, callback));
}

Repo.prototype.push = function(callback) {
  this.git.add(['gitback/*'])
    .commit("Edits")
    .push('origin', this.branch, resetOnErr(this, callback));
}

Repo.prototype.sync = function(callback) {
  var self = this;
  self.pull(function(err) {
    if (err) return callback(err);
    self.push(callback)
  })
}
