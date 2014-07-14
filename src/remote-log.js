/*global JSON:false, define:false*/

define([ 'jquery' ], function($) {

  var buffer = [];

  function now() {
    var date = new Date();

    return date.toString() + '.' + date.getMilliseconds();
  }

  function log() {
    var entry = now() + ': ' + arguments[0];

    for (var x = 1; x < arguments.length; x++) {
      entry += ' ' + JSON.stringify(arguments[x]);
    }

    buffer.push(entry);
  }

  log.submit = function() {
    var message = '';
    for (var x = 0; x < buffer.length; x++) {
      message += buffer[x] + '\n';
    }

    $.ajax({
      type: 'POST',
      url: 'https://feed.fm/api/v2/internal/log',
      contentType: 'text/plain',
      data: message
    });

    buffer = [];
  };

  return log;

});

