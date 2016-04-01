/*global module:false */

/*! A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */

/*
 * This is the object we export as 'Feed' when everything is bundled up.
 */

var Session = require('./session');
var Auth = require('./auth');
var Request = require('./request');
var Client = require('./client');

/*
var log = require('./log');
var PlayerView = require('./player-view');
var Player = require('./player');
var getSpeaker = require('./speaker');
*/

module.exports = {
  Session: Session,
  Auth: Auth,
  Request: Request,
  Client: Client
//  Player: Player,
//  PlayerView: PlayerView,
//  log: log,

//  _getSpeaker: getSpeaker
};

