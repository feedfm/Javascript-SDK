/*global module:false*/

var _ = require('underscore');

var Station = function(stationJson) {
  _.extend(this, stationJson);
};

module.exports = Station;
