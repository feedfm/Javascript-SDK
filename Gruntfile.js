/*global module:false*/

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');
  grunt.loadNpmTasks('grunt-contrib-uglify');

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

    uglify: {
      options: {
        compress: true,
        report: 'gzip',
        preserveComments: 'some',
        banner: '/* A Feed.fm joint: github.com/fuzz-radio/Javascript-SDK */'
      },

      dist: {
        files: {
          'dist/feed.js': [ 
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
          ]
        }
      }
    }
  });

  // Default task.
  grunt.registerTask('default', ['jshint', 'uglify:dist']);

};

