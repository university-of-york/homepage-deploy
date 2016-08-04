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

		clean: ['download','upload'],

		curl: {
			'template': {
				src: 'http://www.york.ac.uk/static/data/homepage/homepage.html',
				dest: 'download/index_template.html'
			}
		},

		bake: {
			build: {
				files: {
					"upload/index.html": "download/index_template.html"
				}
			}
		},

		credentials: grunt.file.readJSON('.ftppass'),

		sftp: {
			test: {
				files : {
					'./': 'upload/index.html'
				},
				options: {
					path: '/usr/yorkwebtest/wwwtest.york.ac.uk/np/',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.key1.username %>',
					password: '<%= credentials.key1.password %>',
					srcBasePath: 'upload/',
					showProgress: true
				}
			},
			live: {
				files : {
					'./': 'upload/index.html'
				},
				options: {
					path: '.',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.key1.username %>',
					password: '<%= credentials.key1.password %>',
					srcBasePath: 'upload/',
					showProgress: true
				}
			},
			screenshot: {
				files : {
					'./': 'upload/screenshots/**'
				},
				options: {
					path: 'screenshots',
					host: 'sftp.york.ac.uk',
					username: '<%= credentials.key1.username %>',
					password: '<%= credentials.key1.password %>',
					srcBasePath: 'upload/screenshots',
					showProgress: true
				}
			}
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
    	sftp: {
      	options: {
        	// Static text.
        	question: 'This will deploy your local copy of index.html to the live site.\nHave you tested it? If in doubt, run "grunt test" again. (y/n)',
        	continue: function(answer) {
          	return answer.toLowerCase() === 'y';
        	}
      	}
    	}
  	},

    get: {
      api: {
        layoutsDir: 'layouts',
        targetDir: 'download'
      }
    }

	});

	// Load the plugins
	require('load-grunt-tasks')(grunt);
  grunt.loadTasks('tasks');

	//Tasks
  grunt.registerTask('default',[
    'clean',
    'curl',
    'get',
    'bake'
  ]);
  grunt.registerTask('test',[
    'default',
    'sftp:test',
    'open:test'
  ]);
	grunt.registerTask('live',[
		'confirm',
		'sftp:live',
		'autoshot',
		'sftp:screenshot',
		'open:live'
	]);
};
