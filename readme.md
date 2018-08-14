# Deploying homepage changes

[![Build Status](https://semaphoreci.com/api/v1/university-of-york/homepage-deploy/branches/master/badge.svg)](https://semaphoreci.com/university-of-york/homepage-deploy)

## One-off setup
1. __Install NodeJS, Git and PhantomJS__  
If you don't already have them, download them directly or via your favourite package manager.
* __Install Grunt__  
To install Grunt, type:
`npm install -g grunt-cli`  
*You may find that this is a lot less straightforward than it looks on managed Windows machines.*
* __Clone the respository__  
`git clone https://github.com/university-of-york/homepage-deploy.git homepage-deploy`
* __Install dependencies__  
From your local clone of the repository, run:
`npm install`.
* __Populate login details__  
In the root of the repository, create a file called .ftppass, paste in the code below and replace the username and password values. If you do not know them, please ask someone from the Digital team.

~~~~
{
	"preview": {        
        "username": "USERNAME",  
        "password": "PASSWORD"  
    },
    "live": {  
    	"username": "USERNAME",  
        "password": "PASSWORD"  
    },
    "static": {  
        "username": "USRNAME",  
        "password": "PASSWORD"  
    },  
    "contentful": {  
        "spaceId":"SPACEID",  
        "accessToken":"ACCESSTOKEN"  
    }  
}
~~~~

## Day-to-day usage
### Step 1: Make your changes in Contentful
See the [documentation in the SMDC wiki](https://wiki.york.ac.uk/display/SMDC/Homepage+publishing+with+Contentful) for further details.
### Step 2: Preview your changes

From your local copy of the repository, run `grunt test`.

This will get the current content from Contentful, incorporate it into index.shtml in the 'upload' folder, and SFTP the result to [http://www.york.ac.uk/static/data/homepage/](http://www.york.ac.uk/static/data/homepage/).


### Step 3: Deploy to live
Run `grunt live` to make the changes live. You'll be asked to confirm this step.

Once the changes are live, a screenshot of the homepage will be taken and stored in [http://www.york.ac.uk/np/screenshots](http://www.york.ac.uk/np/screenshots).
