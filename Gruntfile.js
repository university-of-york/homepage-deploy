module.exports = function(grunt) {


	var snippetsURL = 'http://www.york.ac.uk/homepage-snippets/';
	var currentDate = new Date();
	var dateStamp =  currentDate.getFullYear() + '_'
                + ('0' + (currentDate.getMonth()+1)).slice(-2) + '_'
                + ('0' + currentDate.getDate()).slice(-2) + '_'
                + currentDate.getHours() +
                + currentDate.getMinutes() +
                + currentDate.getSeconds();

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
			'template': {
				src: 'http://www.york.ac.uk/np/index_template_live.shtml',
				dest: 'download/index_template.shtml'
			},
			'main': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/main/',
				dest: 'download/main/index.html'
			},
			'sidebar': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/sidebar/',
				dest: 'download/sidebar/index.html'
			},
			'research': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/research/',
				dest: 'download/research/index.html'
			},
			'discover': {
				src: snippetsURL + '<%=grunt.config("datepath")%>' + '/discover/',
				dest: 'download/discover/index.html'
			}

		},

		bake: {
			build: {
				files: {
					"upload/index.shtml": "download/index_template.shtml"
				}
			}
		},

		replace: {
			news_include: {
    		src: ['download/index_template.shtml'],
    		overwrite: true,                 // overwrite matched source files
    		replacements: [{
      		from: '<!--(bake path-to-snippets/news/index.html)-->',
      		to: '<!--#include virtual="/news-and-events/snippets/news/" -->'
    		}]
  		},
			snippets_path: {
    		src: ['download/index_template.shtml'],
    		overwrite: true,                 // overwrite matched source files
    		replacements: [{
      		from: 'path-to-snippets/',
      		to: ''
    		}]
  		},
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
			},
      live: {
        auth: {
          host: 'ftp.york.ac.uk',
          port: 21,
          authKey: 'key1'
        },
        src: 'upload/',
        dest: '.',
        simple: 'true'
      },
			screenshot: {
				auth: {
					host: 'ftp.york.ac.uk',
					port: 21,
					authKey: 'key1'
				},
				src: 'upload/screenshots/',
				dest: 'screenshots',
				simple: 'true'
			},
		},

		autoshot: {
			live: {
				options: {
					path: 'upload/screenshots',
					remote: {
						files: [
							{
								src:'http://www.york.ac.uk',
								dest: 'homepage_' + dateStamp +'.png',
								delay:1000
							}
						]
					},
					viewport: ['1024x1300']
				}
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

	grunt.registerTask('test',[
		'prompt',
		'clean',
		'curl',
		'replace:news_include',
		'replace:snippets_path',
		'bake',
		'replace:media_paths',
		'ftpush:test',
		'open:test'
	]);
	grunt.registerTask('live',[
		'confirm',
		'ftpush:live',
		'autoshot',
  	'ftpush:screenshot',
		'open:live'
	])
};
