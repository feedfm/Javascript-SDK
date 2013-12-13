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
      // options common to all configs
      options: {
        mainConfigFile: 'src/config.js',
        baseUrl: 'vendor',
        name: 'almond',
        include: [ 'feed/feed' ],

        wrap: {
          start: '(function() {',
          end: ' window.Feed = require("feed/feed"); }());'
        }
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
            }
          }
        }
      }
    },

    uglify: {
      options: {
        compress: false,
        report: 'min',
        preserveComments: 'some',
        banner: '/* A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */'
      }

    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 
    'requirejs:feed', 'requirejs:feed-without-jquery', 
    'requirejs:feed-debug', 'requirejs:feed-without-jquery-debug' ]);

};

