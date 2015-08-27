var Gitback = module.exports = require('./lib/gitback.js');

var PORT = 3333;

if (require.main === module) {
  var gb = new Gitback({
    directory: __dirname + '/database',
    remote: 'https://github.com/bobby-brennan/gitback-petstore.git',
  });
  gb.initialize(function() {
    gb.listen(PORT);
    console.log('Gitback ready! Listening on port ' + PORT);
  });
}

