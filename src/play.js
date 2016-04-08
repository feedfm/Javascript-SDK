/*global module:false*/

var _ = require('underscore');

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
 *   audio_file: {
 *     id: '789',
 *     duration_in_seconds: 123,
 *     codec: 'mp3',
 *     url: 'http://foo.bar/blah.mp3',
 *     bitrate: 123,
 *
 *     track: {
 *       id: '0ab',
 *       title: 'track title'
 *     },
 *
 *     artist: {
 *       id: 'cde',
 *       name: 'artist name'
 *     },
 *
 *     release: {
 *       id: 'f01',
 *       title: 'release title'
 *     },
 *
 *     extra: {
 *       // arbitrary JSON data
 *     }
 *
 *   },
 *   liked: true
 *
 * }
 * ```
 *
 * @constructor
 */

var Play = function(playJson) {
  _.extend(this, playJson);
};

Play.prototype.toString = function() {
  return 'play with id ' + this.id;
};

module.exports = Play;
