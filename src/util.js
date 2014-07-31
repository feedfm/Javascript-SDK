/*global define:false */

define(function() {

  var util = { };

  util.addProtocol = function(url, secure) {
    // handle '//somewhere.com/' url's
    if (url.slice(0, 2) === '//') {
      if (secure === true) {
        url = 'https:' + url;

      } else if (secure === false) {
        url = 'http:' + url;
      
      } else if (window.location.protocol.substr(0, 4) === 'http') {
        url = window.location.protocol + url;

      } else {
        url = 'http';
      }
    }
    
    return url;
  };

  return util;

});
