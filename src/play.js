/*global module:false*/

var _ = require('underscore');

var Play = function(playJson) {
  _.extend(this, playJson);
};

Play.prototype.toString = function() {
  return 'play with id ' + this.id;
};

module.exports = Play;
