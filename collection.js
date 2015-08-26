var FS = require('fs');
var Path = require('path')
var Async = require('async');
var _ = require('underscore');

var Collection = module.exports = function(name, dir) {
  var self = this;
  self.name = name;
  self.directory = dir;
  self.items = {};
  FS.readdirSync(dir).forEach(function(file) {
    var itemName = Path.basename(file, '.json');
    self.items[itemName] = JSON.parse(FS.readFileSync(Path.join(dir, file), 'utf8'));
  });
}

Collection.prototype.get = function(id) {
  if (id) return this.items[id];
  else return _.values(this.items);
}

Collection.prototype.save = function(id, callback) {
  FS.writeFile(Path.join(this.directory, id + '.json'), items[id], callback);
}

Collection.prototype.reload = function(callback) {
  var self = this;
  self.items = {};
  FS.readDir(this.directory, function(err, files) {
    if (err) return callback (err);
    Async.parallel(files.map(function(file) {
      return function(acb) {
        FS.readFile(Path.join(self.directory, file + '.json'), 'utf8', acb);
      }
    }), callback);
  })
}
