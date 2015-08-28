var Utils = module.exports = {};

var Crypto = require('crypto');

Utils.hash = function(str) {
  return Crypto.createHash('md5').update(str).digest('hex');
}
