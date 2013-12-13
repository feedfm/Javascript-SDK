/*global module:false*/

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');
  grunt.loadNpmTasks('grunt-contrib-concat');
  grunt.loadNpmTasks('grunt-contrib-requirejs');

  // Project configuration.
  grunt.initConfig({
    meta: {
      version: '0.1.0',
      banner: '/* Feed Media */'
    },

    watch: {
      js: {
        files: [ 'src/*.js' ],
        tasks: [ 'jshint' ]
      }
    },

    jshint: {
      options: {
        jshintrc: '.jshintrc'
      },
      all: [
        'src/*.js'
      ]
    },

    requirejs: {
      'feed-without-jquery': {
        options: {
          mainConfigFile: 'src/config.js',

          baseUrl: 'vendor',
          name: 'almond',
          include: [ 'feed/main' ],
          out: 'dist/feed-without-jquery.js',

          optimize: 'none',

          paths: {
            'jquery': '../src/jquery-external'
          },

          wrap: {
            start: '(function() {',
            end: ' window.Feed = require("feed/main"); }());'
          }
        }
      }

    },

    concat: {
      dist: {
        files: {
          'dist/feed-with-jquery.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/nolog.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-with-jquery-debug.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/log.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-without-jquery.js': [
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/nolog.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-without-jquery-debug.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/log.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ]
        }
      }
    },

    uglify: {
      options: {
        compress: false,
        report: 'min',
        preserveComments: 'some',
        banner: '/* A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */'
      },

      dist: {
        options: {
          compress: false
        },
        files: {
          'dist/feed-with-jquery.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/nolog.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-with-jquery-debug.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/log.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-without-jquery.js': [
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/nolog.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ],

          'dist/feed-without-jquery-debug.js': [ 
            'lib/json2.js',
            'lib/hmac-sha256.js',
            'lib/enc-base64.js',
            'lib/oauth.js',
            'lib/jquery.cookie.js',
            'lib/underscore.js',
            'lib/soundmanager2.js',

            'src/events.js',
            'src/log.js',
            'src/speaker.js',
            'src/session.js',
            'src/player.js',
            'src/player-view.js'
          ]
        }
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'uglify:dist']);

};

