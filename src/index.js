/*! A Feed.fm joint: github.com/feedfm/Javascript-SDK */
import Speaker from './speaker';
import log from './log';
import { version } from '../package.json';
import Session from './session';
import Player from './player';
import Listener from './listener';
import PlayerView from './player-view';
import SimulcastPlayer from './simulcast-player';
import { deleteClientId as resetClientId, getClientId } from './client-id';
import { setBaseUrl } from './base-url';

export default {
  Speaker,
  Session,
  Player,
  Listener,
  PlayerView,
  SimulcastPlayer,
  log,
  version,
  resetClientId,
  getClientId,
  setBaseUrl
};
