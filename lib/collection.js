var FS = require('fs');
var Path = require('path')
var Async = require('async');
var _ = require('underscore');
var Validator = new (require('jsonschema').Validator)();

var Collection = module.exports = function(name, dir, options) {
  var self = this;
  self.name = name;
  self.directory = dir;
  self.options = options;
  self.items = {};
  self.idField = self.options.id || 'id';
  if (self.options.schema) {
    self.options.schema.properties[self.idField] = {type: 'string'}
  }
  if (!FS.existsSync(dir)) FS.mkdirSync(dir);
  FS.readdirSync(dir).forEach(function(file) {
    var itemName = Path.basename(file, '.json');
    self.items[itemName] = JSON.parse(FS.readFileSync(Path.join(dir, file), 'utf8'));
  });
}

Collection.prototype.get = function(id) {
  var self = this;
  if (!id) return _.values(self.items).map(function(item) {return _.extend({}, item)})
  else return _.extend({}, self.items[id]);
}

Collection.prototype.post = function(data) {
  var self = this;
  var id = data[self.idField];
  if (!id) return {error: 'Identifier field ' + self.idField + ' not specified'};
  if (self.items[id]) return {error: 'Item ' + id + ' already exists in ' + self.name};
  if (self.options.schema) {
    var result = Validator.validate(data, self.options.schema);
    if (!result.valid) return {error: JSON.stringify(result.errors)};
  }
  self.items[id] = data;
  return id;
}

Collection.prototype.save = function(id, callback) {
  FS.writeFile(Path.join(this.directory, id + '.json'), JSON.stringify(this.items[id], null, 2), callback);
}

Collection.prototype.reload = function(callback) {
  var self = this;
  self.items = {};
  FS.readdir(this.directory, function(err, files) {
    if (err) return callback (err);
    Async.parallel(files.map(function(file) {
      return function(acb) {
        FS.readFile(Path.join(self.directory, file), 'utf8', function(err, data) {
          if (err) return acb(err);
          var itemName = Path.basename(file, '.json');
          self.items[itemName] = JSON.parse(data);
          acb();
        });
      }
    }), callback);
  })
}
