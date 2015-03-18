#Deploying homepage changes

##One-off setup
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
In the root of the repository, create a file called .ftppass, paste in the code below and replace the username and password values.

		{  
			"key1": {  
  				"username": "USERNAME",  
  				"password": "PASSWORD"  
  			}  
  		}

##Day-to-day usage
### Step 1: Make your changes in the CMS and wait for them to publish
Content needs to have published from the CMS before it can be included in the homepage.
###Step 2: Deploy to wwwtest

From your local copy of the repository, run `grunt test`.

When prompted, enter the path to the published snippets, eg `2015/02/16`.

This will take a copy of the HTML published from the CMS, incorporate it into index.shtml in the 'upload' folder, and FTP the result to [http://wwwtest.york.ac.uk](http://wwwtest.york.ac.uk).
###Step 3: Deploy to live
Run `grunt live` to make the changes live. You'll be asked to confirm this step.

Once the changes are live, a screenshot of the homepage will be taken and stored in [http://www.york.ac.uk/np/screenshots](http://www.york.ac.uk/np/screenshots).
