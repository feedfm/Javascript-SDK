/*global module:false*/

var _ = require('underscore');
var AudioFile = require('./audio_file');

/**
 * @classdesc
 *
 * This class holds the `play` data returned from the feed servers.
 * A typical play object looks like:
 *
 * ```
 * var play = {
 *   id: '123',
 *   station: {
 *     id: '456',
 *     name: 'foobar'
 *   },
 *   audio_file: [[ audio_file instance ]],
 *   liked: true
 * }
 * ```
 *
 * @constructor
 */

var Play = function(playJson) {
  this.audio_file = new AudioFile(playJson.audio_file); 
  delete playJson.audio_file;

  _.extend(this, playJson);

};

Play.prototype.toString = function() {
  return 'play with id ' + this.id + ' and ' + this.audio_file.toString();
};

module.exports = Play;
