var Utils = module.exports = {};

var Crypto = require('crypto').createHash('md5');

Utils.hash = function(str) {
  return Crypto.update(str).digest('hex');
}
