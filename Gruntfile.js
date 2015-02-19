module.exports = function(grunt) {

	//get path value from command line 'grunt --path=pathname'
	var datepath = grunt.option('path');

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		clean: ['download','upload'],

		curl: {
			'main': {
				src: 'http://www.york.ac.uk/homepage-snippets/'+datepath+'/main/index.html',
				dest: 'download/main.html'
			},
			'research': {
				src: 'http://www.york.ac.uk/homepage-snippets/'+datepath+'/research/index.html',
				dest: 'download/research.html'
			},
			'discover': {
				src: 'http://www.york.ac.uk/homepage-snippets/'+datepath+'/discover/index.html',
				dest: 'download/discover.html'
			}

		},
		bake: {
			build: {
				files: {
					"upload/index.shtml": "src/homepage/index.shtml"
				}
			}
		},
		replace: {
  		another_example: {
    		src: ['upload/index.shtml'],
    		overwrite: true,                 // overwrite matched source files
    		replacements: [{
      		from: '="/media',
      		to: '="http://www.york.ac.uk/media'
    		}]
  		}
		}


	});



	// Load the plugins
	//Using load-grunt-tasks instead of having a loadNpmTasks line for each plugin
	require('load-grunt-tasks')(grunt);
	require('time-grunt')(grunt);


	//Tasks


	grunt.registerTask('default',['clean','curl', 'bake', 'replace']);





};
