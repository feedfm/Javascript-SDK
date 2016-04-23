/*global module:false*/

var _ = require('underscore');

/**
 * @classdesc
 *
 * This class holds `audio_file` data returned from the feed servers.
 * A typical audio_file object looks like:
 *
 * ```
 * var audio_file = {
 *   id: '789',
 *   duration_in_seconds: 123,
 *   codec: 'mp3',
 *   url: 'http://foo.bar/blah.mp3',
 *   bitrate: 123,
 *
 *   track: {
 *     id: '0ab',
 *     title: 'track title'
 *   },
 *
 *   artist: {
 *     id: 'cde',
 *     name: 'artist name'
 *   },
 *
 *   release: {
 *     id: 'f01',
 *     title: 'release title'
 *   },
 *
 *   extra: {
 *     // arbitrary JSON data
 *   }
 *
 * }
 * ```
 *
 * @constructor
 */

var AudioFile = function(audioFileJson) {
  _.extend(this, audioFileJson);
};

AudioFile.prototype.toString = function() {
  return 'audio_file with id ' + this.id;
};

module.exports = AudioFile;
