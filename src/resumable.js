import Player from './player';
import { retrieveStateAndElapsed } from './persist';

/**
 * This method checks local storage to see if a Player instance was playing
 * music within the given number of milliseconds. If not, null is returned.
 * If so, a new Player instance is created and returned, but the `tune()`
 * method is swapped out so that, after calling `tune()` the player will 
 * transition into a `paused` state. When `play()` is called, the player
 * will begin playback from the last position of the song the player
 * was previously playing.
 **/

export default function resumable(maxMilliseconds = 4000) {
  const state = retrieveStateAndElapsed(maxMilliseconds);

  if (state.length === 2) {
    const [ persisted, elapsed ] = state;
    const player = new Player({ persisted, elapsed });
    return player;
  }

  return null;
}

