/*global require:true */
/*jshint unused:false */

/* This is the default requirejs config file. If you're editing the
 * source, you can have all the various modules load dynamically on
 * browser refresh by using this pattern:
 *
 *  <script src="../src/config.js"  type="application/javascript"></script>
 *  <script src="../vendor/require.js" type="application/javascript"></script>
 *  <script>
 *    require([ 'feed/session', function(Session) {
 *      var s = new Session(..);
 *      ..
 *    });
 *  </script>
 *
 * (this assumes your HTML is in the 'html' dir of this project)
 */

var require = {
  /* base is set to the 3rd party libs dir because many 3rd party
   * modules (*cough* jquery *cough*) use define('myname', [ .. ], function() ..)
   * rather than the more portable define([ .. ], function() ..)
   */
  baseUrl: '../vendor',

  paths: {
    // all our stuff is in the 'feed/' namespace
    'feed' : '../src',

    // version aliases... yeah, these should be in
    // the 'map' section, but that isn't merging
    // properly with the grunt requirejs task, so
    // I'm leaving them here.
    'jquery': 'jquery-1.10.2',
    'Backbone': 'backbone-1.1.0',
    'Soundmanager': 'soundmanager2-nodebug-97a-20131201',
    'CryptoJS': 'hmac-sha256'
  },

  map: {
    '*' : {
      'jquery': 'feed/jquery-noconflict'
    },
    'feed/jquery-noconflict': {
      'jquery': 'jquery'
    }
  },

  shim: {
    'json2': { exports: 'JSON' },
    'underscore': { exports: '_' },
    'OAuth': { exports: 'OAuth' },
    'CryptoJS': { exports: 'CryptoJS' },
    'enc-base64': [ 'CryptoJS' ],
    'Soundmanager': { exports: 'SoundManager' }
  }

};


