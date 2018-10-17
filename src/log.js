/* eslint-disable no-console */

let enabled = false;

let log = function () {
  if (enabled) {
    console.log.apply( console, [ ...arguments ]);
  }
};

log.enable = function() {
  enabled = true;
};

export default log;
