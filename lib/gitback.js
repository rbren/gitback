var Async = require('async');
var FS = require('fs');
var Path = require('path');
var Express = require('express');
var Rmdir = require('rimraf');

var Repo = require('./repo.js');
var Collection = require('./collection.js');

var Gitback = module.exports = function(options) {
  this.router = Express.Router();
  this.directory = options.directory;
  if (!FS.existsSync(this.directory)) FS.mkdirSync(this.directory);
  this.remote = options.remote;
  this.collections = {};
  this.repo = new Repo(this.remote, options.branch);
  this.globals = {
    collections: this.collections,
  }
};

Gitback.prototype.listen = function(port) {
  var App = Express();
  App.use(this.router);
  App.listen(port);
}

Gitback.prototype.initialize = function(callback) {
  var self = this;
  var gitbackDir = Path.join(self.directory, 'gitback');
  
  self.router.use(require('body-parser').json());
  self.router.use(function(req, res, next) {
    res.type('json');
    next();
  });

  self.repo.clone(self.directory, function(err) {
    var files = FS.readdirSync(gitbackDir);
    var collections = files.filter(function(name) {
      return FS.statSync(Path.join(gitbackDir, name)).isDirectory()
    });
    var api = FS.readFileSync(Path.join(gitbackDir, 'api.js'), 'utf8');
    eval('api = ' + api);
    var controllers = files.filter(function(file) {
      return file !== 'api.js' && Path.extname(file) === '.js'
    });
    api.collections = api.collections || {};
    controllers.forEach(function(controller) {
      var js = FS.readFileSync(Path.join(gitbackDir, controller), 'utf8');
      eval('api.collections.' + Path.basename(controller, '.js') + ' = ' + js);
    });

    for (collection in api.collections) {
      self.addRoutesForCollection(collection, api.collections[collection]);
    }

    callback();
  })
}

Gitback.prototype.addRoutesForCollection = function(name, col) {
  var self = this;
  var colDir = Path.join(self.directory, 'gitback', name);
  self.collections[name] = new Collection(name, colDir, col);

  for (key in col.access) {
    if (key.indexOf('|') === -1) continue;
    methods = key.split('|');
    methods.forEach(function(method) {
      col.access[method] = col.access[key];
    });
  }

  if (col.access.get) {
    self.router.get('/' + name + '/:id', function(req, res) {
      var item = self.collections[name].get(req.params.id);
      if (!item) return res.status(404).json({error: 'Item ' + req.params.id + ' not found'});
      if (col.read) item = col.read.call(self.globals, item);
      res.json(item);
    });
    self.router.get('/' + name, function(req, res) {
      var items = self.collections[name].get();
      if (col.read) {
        items = items.map(function(item) {
          return col.read.call(self.globals, item);
        })
      }
      res.json(items);
    });
  }

  var editMethods = ['post', 'put', 'patch'];
  editMethods.forEach(function(method) {
    if (col.access[method]) {
      self.router[method]('/' + name, function(req, res) {
        var id = self.collections[name][method](req.body);
        if (id.error) return res.json(id);
        self.collections[name].save(id, function(err) {
          if (err) return res.json(err);
          self.sync(function(err) {
            if (err) res.json(err);
            else res.json({success: true});
          });
        });
      })
    }
  });
}

Gitback.prototype.sync = function(callback) {
  var self = this;
  self.repo.sync(function(conflictErr) {
    if (conflictErr) return callback(conflictErr);
    Async.parallel(Object.keys(self.collections).map(function(c) {
      return function(acb) {
        self.collections[c].reload(acb);
      }
    }), callback);
  });
}
