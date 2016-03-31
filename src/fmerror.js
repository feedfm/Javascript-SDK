/*global module:false*/

var FMError = function(message, code) {
  this.message = message;
  this.code = code;

  return this;
};

FMError.prototype.toString = function() {
  return 'FMError (code ' + this.code + ') with message \'' + this.message + '\'';
};

module.exports = FMError;
