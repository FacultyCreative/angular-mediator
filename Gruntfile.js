'use strict';

module.exports = function(grunt) {

  require('load-grunt-tasks')(grunt, {scope: ['dependencies', 'devDependencies']});

  grunt.initConfig({

    karma: {
      plugins: [
        'karma-osx-reporter'
      ],
      unit: {
        configFile: 'karma-unit.conf.js',
        autoWatch: false,
        singleRun: true
      },
      unitAuto: {
        configFile: 'karma-unit.conf.js',
        autoWatch: true,
        singleRun: false
      }
    }

  });

  grunt.registerTask('test', [
    'test:unit', // - run unit tests
  ]);

  grunt.registerTask('test:unit', [
    'karma:unit'
  ]);

  grunt.registerTask('autotest', [
    'autotest:unit'
  ]);

  grunt.registerTask('autotest:unit', [
    'karma:unitAuto'
  ]);

};
