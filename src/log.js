/* eslint-disable no-console */

let enabled = false;

let log = function () {
  let args = [ ...arguments ];

  args[0] = Date.now() + ' feed.fm: ' + args[0];
  
  if (enabled) {
    console.log.apply( console, args);
  }

  let historyEntry;
  try {
    historyEntry = JSON.stringify({
      ts: new Date(),
      message: args[0],
      args: args.slice(1)
    });
  } catch (e) {
    historyEntry = JSON.stringify({
      ts: new Date(),
      message: args[0],
      args: 'truncated'
    });
  }

  log.history.push(historyEntry);

  if (history.length > 500) {
    log.history.shift();
  }
};

log.history = [];

log.enable = function() {
  enabled = true;
};

log.reset = function() {
  let oldHistory = log.history;

  log.history = [];

  return oldHistory;
};

export default log;
