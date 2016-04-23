/*global module:false*/

var _ = require('underscore');
var AudioFile = require('./audio_file');

/**
 * @classdesc
 *
 * Class to wrap a 'station' representation returned from
 * a REST call. A typical value looks like:
 *
 * ```
 * var station = {
 *   id: '123',
 *   name: 'name of station',
 *   on_demand: false,
 *   options: {
 *     // arbitrary json
 *   },
 *   audio_files: [ 
 *     // audio_file entries 
 *   ]
 * };
 * ```
 *
 * @constructor
 */

var Station = function(stationJson) {
  if (stationJson.hasOwnProperty('audio_files')) {
    this.audio_files = _.map(stationJson.audio_files, function(afJson) {
      return new AudioFile(afJson);
    });
    
    delete stationJson.audio_files;
  }

  _.extend(this, stationJson);
};

Station.prototype.toString = function() {
  return 'station with id ' + this.id + ' and name \'' + this.name + '\'';
};

module.exports = Station;
