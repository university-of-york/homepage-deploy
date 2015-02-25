#Deploying homepage changes

##One-off setup
1. __Install NodeJS and Git__  
If you don't already have them, download them directly or via your favourite package manager.
* __Install Grunt__  
To install Grunt, type:
`npm install -g grunt-cli`  
*You may find that this is a lot less straightforward than it looks on managed Windows machines.*

* __Clone the respository__

* __Install dependencies__  
From your local clone of the repository, run:
`npm install`.
* __Populate login details__  
In the root of the repository, create a file called .ftppass, paste in the code below and replace the username and password values.

		{  
			"key1": {  
  				"username": "USERNAME",  
  				"password": "PASSWORD"  
  			}  
  		}

##Day-to-day usage
Content needs to have published from the CMS before it can be included in the homepage.

From your local copy of the repository, run

`grunt --path=PATHNAME`

eg 

`grunt --path=2015/02/16`

This will take a copy of the HTML published from the CMS, incorporate it into index.shtml and upload the result to [http://wwwtest.york.ac.uk](http://wwwtest.york.ac.uk).

Once you're happy with how that looks, run `TBC` to make the changes live. 