import { getClientId, deleteClientId as resetClientId } from './client-id';

import Listener from './listener';
import Player from './player';
import PlayerView from './player-view';
import Session from './session';
import SimulcastPlayer from './simulcast-player';
/*! A Feed.fm joint: github.com/feedfm/Javascript-SDK */
import Speaker from './speaker';
import log from './log';
import resumable from './resumable';
import { setBaseUrl } from './base-url';
import { version } from '../package.json';

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
  setBaseUrl,
  resumable
};
