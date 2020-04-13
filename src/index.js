/*! A Feed.fm joint: github.com/feedfm/Javascript-SDK */
import Speaker from './speaker';
import log from './log';
import { version } from '../package.json';
import Session from './session';
import Player from './player';
import Listener from './listener';
import PlayerView from './player-view';
import { deleteClientId as resetClientId } from './client-id';

export default {
  Speaker,
  Session,
  Player,
  Listener,
  PlayerView,
  log,
  version,
  resetClientId
};
