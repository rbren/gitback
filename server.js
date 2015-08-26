var Async = require('async');
var FS = require('fs');
var Path = require('path');
var App = require('express')();
var Rmdir = require('rimraf');

var Repo = require('./repo.js');
var Collection = require('./collection.js');

var PORT = 3333;

App.use(require('body-parser').json());
App.use(function(req, res, next) {
  res.type('json');
  next();
});

var repo = new Repo('https://github.com/bobby-brennan/gitback-petstore.git');
var destDir = Path.join(__dirname, 'repo');
var gitbackDir = Path.join(destDir, 'gitback');
if (FS.existsSync(destDir)) Rmdir.sync(destDir);

var sync = function(callback) {
  repo.sync(function(conflictErr) {
    Async.parallel(Object.keys(Collections).map(function(c) {
      return function(acb) {
        Collections[c].reload(acb);
      }
    }), callback);
  });
}

// Globals
Collections = {};

var addCollectionRoutes = function(name, col) {
  var colDir = Path.join(gitbackDir, name);
  Collections[name] = new Collection(name, colDir);

  for (key in col.access) {
    if (key.indexOf('|') === -1) continue;
    methods = key.split('|');
    methods.forEach(function(method) {
      col.access[method] = col.access[key];
    });
  }

  if (col.access.get) {
    App.get('/' + name + '/:id', function(req, res) {
      res.json(Collections[name].get(req.params.id));
    });
    App.get('/' + name, function(req, res) {
      var items = Collections[name].get();
      res.json(Collections[name].get());
    });
  }

  var editMethods = ['post', 'put', 'patch'];
  editMethods.forEach(function(method) {
    if (col.access[method]) {
      App.post('/' + name + '/{id}', function(req, res) {
        Collections[name][method](req.params.id);
        Collections[name].save(req.params.id, function(err) {
          if (err) return res.json(err);
          sync(function(err) {
            if (err) res.json(err);
            else res.json({success: true});
          });
        });
      })
    }
  });
}

var Server = module.exports = {};
Server.listen = function(port, callback) {
  repo.clone(destDir, function(err) {
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
      addCollectionRoutes(collection, api.collections[collection]);
    }

    App.listen(port);
    callback();
  })
}
if (require.main === module) {
  Server.listen(PORT, function() {
    console.log('Server ready! Listening on port ' + PORT);
  });
}

