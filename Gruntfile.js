/*global module:false*/

module.exports = function(grunt) {

  grunt.loadNpmTasks('grunt-contrib-watch');
  grunt.loadNpmTasks('grunt-contrib-jshint');

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
    }

  });

  // Default task.
  grunt.registerTask('default', ['watch']);

};

