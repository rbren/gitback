var Utils = module.exports = {};

var Crypto = require('crypto').createHash('md5');

Utils.hash = function(str) {
  console.log('hashing', str);
  return Crypto.update(str).digest('hex');
}
