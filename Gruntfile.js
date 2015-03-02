module.exports = function(grunt) {


	var snippetsURL = 'http://www.york.ac.uk/homepage-snippets/';

	// Project configuration.
	grunt.initConfig({
		pkg: grunt.file.readJSON('package.json'),

		prompt: {
			curl: {
				options: {
					questions : [
						{
								config: 'datepath',
								type: 'input',
								message: 'Enter the path to the snippets (eg 2015/02/16): '
						}
					]
				}
			}
		},

		clean: ['download','upload'],

		curl: {
			'main': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/main/',
				dest: 'download/main.html'
			},
			'sidebar': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/sidebar/',
				dest: 'download/sidebar.html'
			},
			'research': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/research/',
				dest: 'download/research.html'
			},
			'discover': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/discover/',
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
  		media_paths: {
    		src: ['upload/index.shtml'],
    		overwrite: true,                 // overwrite matched source files
    		replacements: [{
      		from: '="/media',
      		to: '="//www.york.ac.uk/media' 
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
		},
		open: {
			test: {
				path: 'http://wwwtest.york.ac.uk'
			},
			live: {
				path:'http://www.york.ac.uk'
			}

		},
		confirm: {
    	ftpush: {
      	options: {
        	// Static text.
        	question: 'This will deploy your local copy of index.shtml to the live site.\nHave you tested it? If in doubt, run "grunt test" again. (y/n)',
        	continue: function(answer) {
          	return answer.toLowerCase() === 'y';
        	}
      	}
    	}
  	},
	});



	// Load the plugins
	//Using load-grunt-tasks instead of having a loadNpmTasks line for each plugin
	require('load-grunt-tasks')(grunt);
	//require('time-grunt')(grunt);


	//Tasks
	//ftpush tasks to be added back in
	grunt.registerTask('test',['prompt','clean','curl', 'bake', 'replace','open:test']);
	grunt.registerTask('live',['confirm','open:live'])




};
