/*global module:false, require:false */

var _ = require('underscore');

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-requirejs');
  grunt.loadNpmTasks('grunt-exec');

  // Project configuration.
  grunt.initConfig({
    meta: {
      version: '0.2.0',
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
      // options common to all configs
      options: {
        mainConfigFile: 'src/config.js',
        baseUrl: 'vendor',
        name: 'almond',
        include: [ 'feed/feed' ]
      },

      'feed-without-jquery': {
        options: {
          out: 'dist/feed-without-jquery.js',

          map: {
            '*': {
              // use existing, in page, jquery
              'jquery': 'feed/jquery-external',
              // stub out logging
              'feed/log': 'feed/nolog'
            }
          }
        }
      },

      'feed': {
        options: {
          out: 'dist/feed.js',

          map: {
            '*': {
              // use our own jQuery, with noConflict(true) to we don't break things
              'jquery': 'feed/jquery-noconflict',
              // stub out logging
              'feed/log': 'feed/nolog'
            },
            'feed/jquery-noconflict': {
              'jquery': 'jquery'
            }
          }
        }
      },

      'feed-without-jquery-debug': {
        options: {
          out: 'dist/feed-without-jquery-debug.js',

          optimize: 'none',

          map: {
            '*': {
              // use jquery already in page
              'jquery': 'feed/jquery-external'
            }
          }
        }
      },

      'feed-debug': {
        options: {
          out: 'dist/feed-debug.js',

          optimize: 'none',

          map: {
            '*': {
              // use our own jQuery, with noConflict(true) to we don't break things
              'jquery': 'feed/jquery-noconflict'
            },
            'feed/jquery-noconflict': {
              'jquery': 'jquery'
            }
          }
        }
      }
    },

    exec: {
      noConsole: {
        // look for debugging calls to console.log in the code
        command: 'grep console.log src/* | grep -v src/log.js',
        stderr: false,
        exitCode: 1
      }
    }

  });

  grunt.config('requirejs');
  
  // copy the map config in the requirejs entries to the 'wrap'
  // so the mapping is added to the final file
  _.each(grunt.config('requirejs'), function(value, key) {
    if (key !== 'options') {
      grunt.config(
        'requirejs.' + key + '.options.wrap',
        {
          start: 'window.SM2_DEFER = true;',
          end: 'require.config({ map: ' + 
            JSON.stringify(grunt.config('requirejs.' + key + '.options.map')) +
            ' }); window.Feed = require("feed/feed");'
        }
      );
    }
  });

  // Default task.
  grunt.registerTask('default', ['exec:noConsole', 'jshint', 
    'requirejs:feed', 'requirejs:feed-without-jquery', 
    'requirejs:feed-debug', 'requirejs:feed-without-jquery-debug' ]);

};

