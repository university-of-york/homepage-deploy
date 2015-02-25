module.exports = function(grunt) {

	//get path value from command line 'grunt --path=pathname'
	var datepath = grunt.option('path');
	var snippetsURL = 'http://www.york.ac.uk/homepage-snippets/';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		clean: ['download','upload'],

		curl: {
			'main': {
				src: snippetsURL + datepath + '/main/',
				dest: 'download/main.html'
			},
			'sidebar': {
				src: snippetsURL + datepath + '/sidebar/',
				dest: 'download/sidebar.html'
			},
			'research': {
				src: snippetsURL + datepath + '/research/',
				dest: 'download/research.html'
			},
			'discover': {
				src: snippetsURL + datepath + '/discover/',
				dest: 'download/discover.html'
			}/*,
			'homepage_only_css':{
				src: 'https://raw.githubusercontent.com/university-of-york/homepage-redesign/master/src/css/homepage_only.css',
				dest: 'upload/css/homepage_only.css'
			},
			'york_styles_css': {
				src: 'https://raw.githubusercontent.com/university-of-york/homepage-redesign/master/src/css/york_styles.css',
				dest: 'upload/css/york_styles.css'
			}*/


		},
		bake: {
			build: {
				files: {
					"upload/index.shtml": "src/homepage/index.shtml"
				}
			}
		},
		replace: {
  		media_paths: {
    		src: ['upload/index.shtml'],
    		overwrite: true,                 // overwrite matched source files
    		replacements: [{
      		from: '="/media',
      		to: '="http://www.york.ac.uk/media'
    		}]
  		}
		},
		ftpush: {
			test: {
				auth: {
					host: 'ftp.york.ac.uk',
					port: 21,
					authKey: 'key1'
				},
				src: 'upload',
				dest: '/usr/yorkwebtest/wwwtest.york.ac.uk/np/',
				simple: 'true'
			}
		}
	});



	// Load the plugins
	//Using load-grunt-tasks instead of having a loadNpmTasks line for each plugin
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);


	//Tasks
	grunt.registerTask('default',['clean','curl', 'bake', 'replace','ftpush']);





};
