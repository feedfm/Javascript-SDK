/*global console:true, module:false, feedLogger:false */

/**
 * Console wrapper.
 *
 * Originally from 
 *
 *   https://github.com/cpatik/console.log-wrapper
 *
 * by Craig Patik
 *
 * MIT License ----
 *
 * Copyright (c) 2012 Craig Patik
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the
 * "Software"), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish,
 * distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to
 * the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.
 *
 * THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF
 * MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY
 * CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE
 * SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
 *
 **/


// Tell IE9 to use its built-in console
if (Function.prototype.bind && (typeof console === 'object' || typeof console === 'function') && typeof console.log === 'object') {
  var fields = ['log','info','warn','error','assert','dir','clear','profile','profileEnd'];
  for (var x = 0; x < fields.length; x++) {
    var method = fields[x];

    console[method] = Function.prototype.bind.call(console, console[method]);
  }
}

// log() -- The complete, cross-browser (we don't judge!) console.log wrapper for his or her logging pleasure
var log = function () {
  log.history = log.history || [];  // store logs to an array for reference
  log.history.push(arguments);
  // Modern browsers
  if (typeof console !== 'undefined' && typeof console.log === 'function') { // Opera 11
    if (window.opera) {
      var i = 0;
      while (i < arguments.length) {
        console.log('Item ' + (i+1) + ': ' + arguments[i]);
        i++;
      }
    }

    // All other modern browsers
    else if ((Array.prototype.slice.call(arguments)).length === 1 && typeof Array.prototype.slice.call(arguments)[0] === 'string') {
      console.log( (Array.prototype.slice.call(arguments)).toString() );
    }
    else {
      console.log.apply( console, Array.prototype.slice.call(arguments) );
    }

  }

  // IE8
  else if (!Function.prototype.bind && typeof console !== 'undefined' && typeof console.log === 'object') {
    Function.prototype.call.call(console.log, console, Array.prototype.slice.call(arguments));
  }

  // IE7 and lower, and other old browsers
  else {
    // Inject Firebug lite
    if (!document.getElementById('firebug-lite')) {
      // Include the script
      var script = document.createElement('script');
      script.type = 'text/javascript';
      script.id = 'firebug-lite';
      // If you run the script locally, point to /path/to/firebug-lite/build/firebug-lite.js
      script.src = 'https://getfirebug.com/firebug-lite.js';
      // If you want to expand the console window by default, uncomment this line
      //document.getElementsByTagName('HTML')[0].setAttribute('debug','true');
      document.getElementsByTagName('HEAD')[0].appendChild(script);
      setTimeout(function () { log( Array.prototype.slice.call(arguments) ); }, 2000);
    }
    else {
      // FBL was included but it hasn't finished loading yet, so try again momentarily
      setTimeout(function () { log( Array.prototype.slice.call(arguments) ); }, 500);
    }
  }
};

// allow external code to swap in their own logger
if (typeof feedLogger === 'function') {
  log = feedLogger;
}


module.exports = log;


