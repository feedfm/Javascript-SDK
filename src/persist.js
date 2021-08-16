import log from './log';

const FEED_STATE_KEY='feedfm:active';
const FEED_ELAPSED_TIME_KEY='feedfm:elapsed_time';

function supports_html5_storage() {
  try {
    return 'localStorage' in window && window['localStorage'] !== null;
  } catch (e) {
    return false;
  }
}

function store(key, value) {
  if (supports_html5_storage()) {
    localStorage.setItem(key, value);
  }
}

function remove(key) {
  if (supports_html5_storage()) {
    localStorage.removeItem(key);
  }
}

function get(key) {
  if (supports_html5_storage()) {
    return localStorage.getItem(key);
  } else {
    return null;
  }
}

export function persistState(state) {
  const timestamp = Date.now();
  const asString = JSON.stringify({ state, timestamp });

  // update timestamp and store in local storage
  store(FEED_STATE_KEY, asString);
  store(FEED_ELAPSED_TIME_KEY, '0');

  log('persisted state', { timestamp, state });
}

export function persistElapsed(milliseconds) {
  // save elapsed seconds in current song
  store(FEED_ELAPSED_TIME_KEY, milliseconds.toString());

  log('persisted elapsed time', { milliseconds });
}

export function retrieveStateAndElapsed(maxAge) {
  // pull things out of state, if they're less than maxAge milliseconds old, or null
  var encoded = get(FEED_STATE_KEY);

  if (encoded) {
    var persisted = JSON.parse(encoded);
    if (persisted.timestamp + maxAge > Date.now()) {
      var elapsed = parseFloat(get(FEED_ELAPSED_TIME_KEY), 10);

      return [ persisted.state, elapsed ];
    }
  }

  return [ ];
}

export function clearPersistance() {
  // nuke any stored state
  remove(FEED_STATE_KEY);
  remove(FEED_ELAPSED_TIME_KEY);
}
