/*global define:false */

define(function() {
  // no loggy!
  return function() { console.log.call(console.log, arguments); };

});

