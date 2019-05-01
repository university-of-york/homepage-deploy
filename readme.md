# Deploying homepage changes

[![Build Status](https://semaphoreci.com/api/v1/university-of-york/homepage-deploy/branches/master/badge.svg)](https://semaphoreci.com/university-of-york/homepage-deploy)

## One-off setup

__Install NodeJS, Git and PhantomJS__  
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

## Making changes to the homepage template

If changes are needed to parts of the homepage which aren't built by the content from Contentful (recent examples included the inclusion of a the _Cookies_ link in the footer and the addition of tabs to the course search box), you should edit the [hompeage layout](./layouts/homepage.html). You should also make the same changes to the alternative homepage layouts below.

#Alternative homepage layouts

Occasionally we want to change the layout of the homepage temporarily (for example, due to an event).

We currently have three alternative homepage layouts: [Festival of Ideas](../../tree/foi), [NHS 70th](../../tree/nhs) and [Big Banner](../../tree/big-banner).

The FoI layout adds a row of Festival of of Ideas events under the research stories, the NHS layout adds a blue banner with the NHS logo (used to celebrate the NHS' 70th birthday in 2018) and the Big Banner layout increases the size of the main banner (when we want to showcase a specific photo e.g. for Open Day).

To switch to an alternative layout, check out the relevant branch (e.g. `git checkout foi`) and run `grunt test` and `grunt live` as usual. Note that the FoI layout uses a different content model in Contentful (called _Homepage plus FoI layout_), as there are additional items to add.

**You should make sure that the homepage layout has been updated with any changes made to the master branch**

To create a new alternative layout, branch the master branch, make changes to the homepage layout, and push the changes back to _origin_. Whoever is on homepage duty will need to `checkout` the new branch.