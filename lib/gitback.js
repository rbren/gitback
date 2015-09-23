var Async = require('async');
var FS = require('fs');
var Path = require('path');
var Express = require('express');
var Rmdir = require('rimraf');

var Repo = require('./repo.js');
var Collection = require('./collection.js');

var Gitback = module.exports = function(options) {
  this.router = Express.Router();
  this.options = options;
  this.directory = options.directory;
  if (!FS.existsSync(this.directory)) FS.mkdirSync(this.directory);
  this.remote = options.remote;
  this.collections = {};
  this.repo = new Repo(this.remote, options.branch, this.directory);
  this.globals = {
    collections: this.collections,
    utils: require('./global-utils.js'),
  }
};

Gitback.prototype.listen = function(port) {
  var App = Express();
  App.use(this.router);
  App.listen(port);
}

Gitback.prototype.initialize = function(callback) {
  var self = this;
  
  self.router.use(require('body-parser').json());
  self.router.use(function(req, res, next) {
    res.type('json');
    next();
  });

  var initFromDir = function(err) {
    if (err) throw err;
    var files = FS.readdirSync(self.directory);
    var api = FS.readFileSync(Path.join(self.directory, 'api.js'), 'utf8');
    eval('self.api = ' + api);
    var controllers = files.filter(function(file) {
      return file !== 'api.js' && Path.extname(file) === '.js'
    });
    self.api.collections = self.api.collections || {};
    controllers.forEach(function(controller) {
      var js = FS.readFileSync(Path.join(self.directory, controller), 'utf8');
      eval('self.api.collections.' + Path.basename(controller, '.js') + ' = ' + js);
    });

    for (collection in self.api.collections) {
      self.addRoutesForCollection(collection, self.api.collections[collection]);
    }

    if (self.options.refreshRate) {
      setInterval(function() {
        self.sync(function(err) {
          if (err) throw err;
        })
      }, self.options.refreshRate);
    }

    callback();
  }
  if (FS.existsSync(Path.join(self.directory, '.git'))) self.repo.pull(initFromDir);
  else self.repo.clone(self.directory, initFromDir);
}

Gitback.prototype.addRoutesForCollection = function(name, col) {
  var self = this;
  var colDir = Path.join(self.directory, name);
  self.collections[name] = new Collection(name, colDir, col);

  var methodFields = ['access', 'middleware'];
  methodFields.forEach(function(field) {
    col[field] = col[field] || {};
    for (key in col[field]) {
      if (key.indexOf('|') === -1) continue;
      methods = key.split('|');
      methods.forEach(function(method) {
        col[field][method] = col[field][key];
      });
    }
  });

  var checkAccess = function(method, item, user, strategy) {
    if (!col.access[method]) return false;
    if (col.access[method] === 'all') return true;
    return col.access[method].call(self.globals, item, user, strategy);
  }

  var applyMiddleware = function(method, item) {
    self.globals.variables = col.variables;
    if (col.middleware[method]) item = col.middleware[method].call(self.globals, item);
    return item;
  }

  var matchesQuery = function(item, query) {
    for (key in query) {
      if (item[key] !== query[key]) return false;
    }
    return true;
  }

  var signIn = function(req, res, next) {
    if (!self.api.authentication) return next();
    var userKey = self.api.authentication.userCollection || 'users';
    var users = self.collections[userKey].get();
    for (var strategyName in self.api.authentication.strategies) {
      var strategy = self.api.authentication.strategies[strategyName];
      var user = null;
      if (typeof strategy === 'function') {
        try {
          user = strategy.call(self.globals, req, users);
        } catch (e) {
          return res.status(500).json({error: "Authentication error:" + e.message})
        }
      } else {
        var keyLoc = strategy.in;
        var key = req[keyLoc][strategy.name];
        if (!key) continue;
        user = users.filter(function(u) {
          return u[strategy.name] === key;
        })[0];
      }
      if (!user) continue;
      req.user = user;
      req.strategy = strategyName;
      return next();
    }
    next();
  }

  if (col.access.get) {
    self.router.get('/' + name + '/:id', signIn, function(req, res) {
      var item = self.collections[name].get(req.params.id);
      if (!item) return res.status(404).json({error: 'Item ' + req.params.id + ' not found'});
      try {
        item = applyMiddleware('get', item, res);
        if (!checkAccess('get', item, req.user, req.strategy)) return res.status(401).json({error: 'Not authorized'});
      } catch (e) {
        return res.status(500).json({error: e.message});
      }
      res.json(item);
    });
    self.router.get('/' + name, signIn, function(req, res) {
      var items = self.collections[name].get();
      try {
        items = items.map(function(item) {
          return applyMiddleware('get', item);
        }).filter(function(item) {
          return checkAccess('get', item, req.user, req.strategy);
        }).filter(function(item) {
          return matchesQuery(item, req.query);
        })
      } catch (e) {
        return res.status(500).json({error: e.message});
      }
      res.json(items);
    });
  }

  var editMethods = ['post', 'put', 'patch', 'delete'];
  editMethods.forEach(function(method) {
    if (col.access[method]) {
      self.router[method]('/' + name, signIn, function(req, res) {
        var item = req.body;
        var id;
        try {
          item = applyMiddleware(method, item);
          if (checkAccess(method, item, req.user, req.strategy)) {
            id = self.collections[name][method](req.body);
          } else {
            return res.status(401).json({error: "Not authorized"});
          }
        } catch (e) {
          return res.status(500).json({error: e.message})
        }
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
  Async.parallel(Object.keys(self.collections).map(function(c) {
    return function(acb) {
      self.collections[c].save(acb);
    }
  }), function(err) {
    if (err) return callback(err);
    self.repo.sync(function(conflictErr) {
      if (conflictErr) return callback(conflictErr);
      Async.parallel(Object.keys(self.collections).map(function(c) {
        return function(acb) {
          self.collections[c].reload(acb);
        }
      }), callback);
    });
  });
}
