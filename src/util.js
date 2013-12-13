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
      
      } else {
        url = window.location.protocol + url;
      }
    }
    
    return url;
  };

  return util;

});
