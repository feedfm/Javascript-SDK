/*global module:false */

/*! A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */

/*
 * This is the object we export as 'Feed' when everything is bundled up.
 */

var Session = require('./session');
var log = require('./log');
var PlayerView = require('./player-view');
var Player = require('./player');
var getSpeaker = require('./speaker');
var version = require('./version');

module.exports = {
  Session: Session,
  Player: Player,
  PlayerView: PlayerView,
  log: log,
  version: version,

  _getSpeaker: getSpeaker
};

