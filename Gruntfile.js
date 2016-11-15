module.exports = function(grunt) {

	var snippetsURL = 'http://www.york.ac.uk/homepage-snippets/';
	var currentDate = new Date();
	var dateStamp =  currentDate.getFullYear() + '_' +
                  ('0' + (currentDate.getMonth()+1)).slice(-2) + '_' +
                  ('0' + currentDate.getDate()).slice(-2) + '_' +
                  ('0' + currentDate.getHours()).slice(-2) +
                  ('0' + currentDate.getMinutes()).slice(-2) +
                  ('0' + currentDate.getSeconds()).slice(-2);

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
					"upload/index.shtml": "download/index_template.html"
				}
			}
		},

		credentials: grunt.file.readJSON('.ftppass'),

		sftp: {
			test: {
				files : {
					'./': 'upload/index.shtml'
				},
				options: {
          path: '/usr/yorkweb/web/static/data/homepage/',
          host: 'sftp.york.ac.uk',
          username: '<%= credentials.static.username %>',
          password: '<%= credentials.static.password %>',
          srcBasePath: 'upload/',
					showProgress: true
				}
      },
      preview: {
        files : {
          './': 'upload/index.shtml'
        },
        options: {
          path: '/usr/yorkweb/web/preview/',
          host: 'sftp.york.ac.uk',
          username: '<%= credentials.preview.username %>',
          password: '<%= credentials.preview.password %>',
          srcBasePath: 'upload/',
          showProgress: true
        }
      },
      live: {
        files : {
          './': 'upload/index.shtml'
        },
        options: {
          path: '.',
          host: 'sftp.york.ac.uk',
          username: '<%= credentials.live.username %>',
          password: '<%= credentials.live.password %>',
          srcBasePath: 'upload/',
          showProgress: true
        }
      },
      images: {
        files : {
          './': 'upload/images/**'
        },
        options: {
          path: '/usr/yorkweb/web/static/data/homepage/images/',
          host: 'sftp.york.ac.uk',
          username: '<%= credentials.static.username %>',
          password: '<%= credentials.static.password %>',
          srcBasePath: 'upload/images/',
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
					username: '<%= credentials.live.username %>',
					password: '<%= credentials.live.password %>',
					srcBasePath: 'upload/screenshots',
					showProgress: true
				}
			}
		},

		screenshot: {
			live: {
				options: {
					src:'https://www.york.ac.uk',
					dest:'upload/screenshots/homepage_' + dateStamp +'.jpg',
					delay:1000,
          viewport: '1024x1000'
				}
			}
		},

		open: {
			test: {
				path:'https://www.york.ac.uk/static/data/homepage/'
			},
			live: {
				path:'https://www.york.ac.uk/'
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
        layoutDir: 'layouts',
        targetDir: 'download',
        uploadDir: 'upload'
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
    'sftp:images',
    'sftp:test',
    'open:test'
  ]);
	grunt.registerTask('live',[
		'confirm',
    // 'sftp:preview',
    'sftp:live',
		'screenshot',
		'sftp:screenshot',
		'open:live'
	]);
};
