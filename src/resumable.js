import Player from './player';
import { retrieveStateAndElapsed } from './persist';

export default function resumable(maxMilliseconds = 4000) {
  const state = retrieveStateAndElapsed(maxMilliseconds);

  console.log('state is', state);

  if (state.length === 2) {
    const [ persisted, elapsed ] = state;
    const player = new Player({ persisted, elapsed });
    return player;
  }

  return null;
}

