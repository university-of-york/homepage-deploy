
'use strict';

// --------------------------------------------------

var Fs = require('fs');
var Path = require('path');
var Mkdirp = require('mkdirp');
var Moment = require('moment');
var Marked = require('marked');
var RequestPromise = require('request-promise');
var Request = require('request');
var Bluebird = require('bluebird');
var Handlebars = require('handlebars');

var homepageImageDir = "https://www.york.ac.uk/static/data/homepage/images/"

// --------------------------------------------------
// Handlebars helpers

// format an ISO date using Moment.js
// usage: {{dateFormat dateString format="MMMM YYYY"}}
Handlebars.registerHelper('dateFormat', function(context, block)
{
    var f = block.hash.format || "D MMMM YYYY";
    return Moment(context).format(f);
});

// Get icon name from category
// usage: {{iconify categoryName}}
Handlebars.registerHelper('iconify', function(context)
{
    switch (context)
    {
        case 'Podcast'           : return 'podcast';
        case 'News'              : return 'newspaper-o';
        case 'Brexit'            : return 'info';
        case 'Event'             : return 'calendar';
        case 'Comment'           : return 'comment-o';
        case 'York life'         : return 'heart-o';
        case 'Festival of Ideas' : return 'lightbulb-o';
        default : return 'null';
    }
});

// --------------------------------------------------

module.exports = function(grunt)
{
    grunt.registerMultiTask( 'get' , 'Get data from (Contentful) API' , function()
    {
        // --------------------------------------------------

        var options = this.options(
        {
            layoutDir: 'layouts',
            targetDir: 'download',
            uploadDir: 'upload'
        } );

        var done = this.async();

        // --------------------------------------------------

        var credentials = grunt.file.readJSON( '.ftppass' );
        var spaceId = credentials.contentful.spaceId;
        var accessToken = credentials.contentful.accessToken;
        var apiUrl = 'https://cdn.contentful.com/spaces/'+spaceId+'/entries?access_token='+accessToken;
        var contentTypes = [ 'homepageLayout' , 'homepagePlusFoILayout' ];

        // --------------------------------------------------
        // We'll call this if it all goes wrong

        function fail( err )
        {
            grunt.log.error( err );
            done( new Error( err ) );
        }

        // --------------------------------------------------
        // Write 'html' to 'path'

        function writeFile( path , html )
        {
            return new Bluebird( function( resolve , reject )
            {
                var thisDir = Path.dirname( path );
                
                // Create directory if it doesn't exist yet
                Mkdirp( thisDir , function ( err )
                {
                    if( err ) reject( 'Directory '+thisDir+' could not be created' );
                    
                    // Write the file
                    Fs.writeFile( path , html , function( err )
                    {
                        if( err ) reject( 'File '+path+' could not be created' );
                        resolve();
                    } );
                } );
            } );
        }

        // --------------------------------------------------
        // Precompile a Handlebars template

        function compileTemplate( templateName )
        {
            return new Bluebird( function( resolve , reject )
            {
                var templatePath = Path.resolve( options.layoutDir , templateName );
                Fs.readFile( templatePath , 'utf-8' , function( err , data )
                {
                    if( err ) reject( templatePath+' could not be read' );
                    
                    var template = Handlebars.compile( data );
                    
                    resolve( template );
                } );
            } );
        }

        // --------------------------------------------------
        // gets image from assets array

        function getAsset( imageField , assets )
        {
            if( typeof imageField == 'undefined' ) return false;

            var imageMeta = imageField.sys;
            var thisAsset = assets.filter( function( asset , j )
            {
                return asset.sys.id === imageMeta.id;
            } )[ 0 ];
            
            // Add York URL to asset object
            thisAsset.fields.file.uoyurl = homepageImageDir + thisAsset.fields.file.fileName;

            return thisAsset;
        }

        // --------------------------------------------------
        // Save remote image locally

        function saveAsset( thisAsset )
        {
            return new Bluebird( function( resolve , reject )
            {
                if( typeof thisAsset == 'undefined' ) resolve();
                if( thisAsset === false ) resolve();
                
                var savePath = Path.resolve( options.uploadDir , 'images' , thisAsset.fields.file.fileName );
                var saveTarget = thisAsset.fields.file.url;

                if( saveTarget.indexOf( '//' ) === 0 ) saveTarget = 'https:'+saveTarget;

                RequestPromise( saveTarget , { encoding: 'binary' } , function( err , response , body )
                {
                    if( err ) reject( saveTarget+' could not be read' );
                    
                    grunt.file.write( savePath , body , { encoding: 'binary' } );
                    grunt.verbose.ok( 'Image saved to '+savePath );
                    resolve();
                } );
            } );
        }

        // --------------------------------------------------
        // gets specific entry from entries array

        function getEntry( entryField , entries )
        {
            if( !entryField ) return false;
            
            var entryMeta = entryField.sys;
            var thisEntry = entries.filter( function( entry , j )
            {
                return entry.sys.id === entryMeta.id;
            } )[ 0 ];

            return thisEntry;
        }

        // --------------------------------------------------
        // Returns a function that renders optional sections

        function renderSection( layout , templatePath , outputPath , condition )
        {
            var sectionPath = Path.resolve( options.targetDir , outputPath );

            // Render an empty section if condition returns false
            if( !condition( layout ) )
            {
                return writeFile( sectionPath , '' );
            }


            var compiledTemplate = compileTemplate( templatePath );
            
            return compiledTemplate.then( function( renderTemplate )
            {
                var output = renderTemplate( {} );
                return writeFile( sectionPath , output );
            } );
        }

        // --------------------------------------------------
        // Returns a function that renders item partials 
        // from the fetched content data

        function renderPartials( templatePath , itemField , outputPath )
        {
        	var compiledTemplate = compileTemplate( templatePath );
        	var images = [];

        	var categoryUrl = apiUrl + '&content_type=category';
        	var categoryRequest = RequestPromise( categoryUrl );

        	return function( layout )
        	{
        		return Bluebird.all( [ compiledTemplate , categoryRequest ] )
        		.spread( function( renderTemplate , categoryData )
        		{
        			// Pick out our categories
        			var categories = JSON.parse( categoryData ).items;
                    
        			// Extract items to render
        			var items = layout.items[ 0 ].fields[ itemField ];
                    
                    // Abandon if there are no items to render
                    if( typeof items == 'undefined' ) return;

        			var assets = layout.includes.Asset;
        			
        			function makeItem( i )
        			{
        				var entry = getEntry( items[ i ] , layout.includes.Entry );
        				var output = '<!-- no item '+i+' -->';

        				if( typeof entry != 'undefined' && typeof entry.fields != 'undefined' )
        				{
                            var entryData = {};

                            if( entry.fields.image )
                            {
                                images[ i ] = getAsset( entry.fields.image , assets );
                                var thisImage = images[ i ] === false ? false : images[ i ].fields.file.uoyurl;
                                var thisImageAlt = images[ i ] === false ? false : images[ i ].fields.description;
                                
                                entryData.image = thisImage;
                                entryData.imageAlt = thisImageAlt;
                            }
                            
                            if( entry.fields.category )
                            {
        					    var thisCategoryEntry = getEntry( entry.fields.category , categories );
        					    var thisCategoryName = thisCategoryEntry ? thisCategoryEntry.fields.name : false;

                                entryData.category = thisCategoryName;
                            }

        					entryData.title = entry.fields.title;
        					entryData.excerpt = Marked( entry.fields.excerpt );
        					entryData.link = entry.fields.link;
        					entryData.publishDate = entry.fields.publishDate;

        					output = renderTemplate( entryData );
        				}
        				var path = Path.resolve( options.targetDir , outputPath+'item'+i+'.html' );
        				return writeFile( path , output );
        			}

        			// Make HTML snippets and save images locally
        			var itemsArray = [];
        			for( var i = 0 ; i < 6 ; i++ )
        			{
        				itemsArray.push( makeItem( i ) );
        				itemsArray.push( saveAsset( images[ i ] ) );
        			}
        			return Bluebird.all( itemsArray );
        		} ).then( function()
        		{
        			grunt.log.ok( itemField+' completed' );
        			return Bluebird.resolve( true );
        		} ).catch( function( err )
        		{
        			fail( err );
        		} );
        	};
        }

        // --------------------------------------------------
        // Fetch the current homepage layout

        function fetchLayout()
        {
            // Make an array of Requests for all our content types
            var requests = contentTypes.reduce( function( allRequests , contentType )
            {
                var layoutUrl = apiUrl + '&content_type=' + contentType + '&fields.current=true';
                var layoutRequest = RequestPromise( layoutUrl );
               
                allRequests.push( layoutRequest );
                
                return allRequests;
            } , [] );

            // Retrieve our content
            return Bluebird.all( requests ).spread( function( ...responses )
            {
                // Empty placeholder
                var layout = { items: [] , includes: { Entry: [] , Asset: [] } };

                // Concatenate relevant fields into our placeholder
                responses.map( function( response )
                {
                    var responseLayout = JSON.parse( response );
                    if( responseLayout.items.length > 0 )
                    {
                        layout.items = layout.items.concat( responseLayout.items );
                        if( responseLayout.includes.Entry.length > 0 ) layout.includes.Entry = layout.includes.Entry.concat( responseLayout.includes.Entry );
                        if( responseLayout.includes.Asset.length > 0 ) layout.includes.Asset = layout.includes.Asset.concat( responseLayout.includes.Asset );
                    }
                } );

                if( layout.items.length === 0 ) return Bluebird.reject( 'There are no current layouts' );
                if( layout.items.length > 1 ) return Bluebird.reject( 'There are too many current layouts' );

                layout.contentType = layout.items[ 0 ].sys.contentType.sys.id;
                
                grunt.log.ok( 'Current layout fetched ('+layout.contentType+')' );

                return Bluebird.resolve( layout );
                
            } ).catch( function( err )
            {
                fail( err );
            } );
        }

        // --------------------------------------------------

        var bannerCompileSingle = compileTemplate( 'banners/single.hbs' );
        var bannerCompileDouble = compileTemplate( 'banners/double.hbs' );

        var bannerVariants =
        {
            'Big banner': compileTemplate( 'banners/big.hbs' ),
        };

        var bannerImages = [];
    
        // Banner creation
        function createBanner( layout , outputPath )
        {
            // Force double banner if 2 items present
            if( layout.items[ 0 ].fields.banners.length > 1 )
            {
                return createBannerType( layout , bannerCompileDouble , outputPath );
            }

            // Check for any alternative banner options
            if( layout.items[ 0 ].fields.bannerVariant != undefined && bannerVariants[ layout.items[ 0 ].fields.bannerVariant ] != undefined )
            {
                return createBannerType( layout , bannerVariants[ layout.items[ 0 ].fields.bannerVariant ] , outputPath );
            }

            // Fall back to single banner 
            return createBannerType( layout , bannerCompileSingle , outputPath );
        }

        // --------------------------------------------------

        function createBannerType( layout , bannerCompile , outputPath )
        {
            return bannerCompile.then( function( bannerTemplate )
            {
                var bannerContext = { banners:[] };

                // Get content for each banner
                layout.items[ 0 ].fields.banners.map( bannerItem =>
                {
                    var bannerEntry = getEntry( bannerItem , layout.includes.Entry );
                    var bannerAssets = layout.includes.Asset;

                    var bannerImage = false;
                    if( bannerEntry.fields.bannerImage )
                    {
                        var bannerImage = getAsset( bannerEntry.fields.bannerImage , bannerAssets );
                        bannerImages.push( bannerImage );
                    }

                    var bannerImageDouble = false;
                    if( bannerEntry.fields.bannerImageDouble )
                    {
                        var bannerImageDouble = getAsset( bannerEntry.fields.bannerImageDouble , bannerAssets );
                        bannerImages.push( bannerImageDouble );
                    }

                    var thisImage = bannerImage === false ? false : bannerImage.fields.file.uoyurl;
                    var thisImageDouble = bannerImageDouble === false ? false : bannerImageDouble.fields.file.uoyurl;
                    var thisImageAlt = bannerImage === false ? false : bannerImage.fields.description;

                    bannerContext.banners.push(
                    {
                        bannerImage: thisImage,
                        bannerImageDouble: thisImageDouble,
                        bannerImageAlt: thisImageAlt,
                        bannerCategory: bannerEntry.fields.category,
                        title: bannerEntry.fields.title,
                        excerpt: Marked( bannerEntry.fields.excerpt ),
                        bannerLink: bannerEntry.fields.buttonLink,
                        buttonText: bannerEntry.fields.buttonText
                    } );
                } );

                return bannerTemplate( bannerContext );

            } ).catch( function( err )
            {
                fail(err);
            } ).then( function( bannerHtml )
            {
                var bannerPath = Path.resolve( options.targetDir , outputPath );
                return writeFile( bannerPath , bannerHtml );
            } ).then( function()
            {
                var saveBannerImages = [];
                for( var i = 0 ; i < bannerImages.length ; i++)
                {
                    saveBannerImages.push( saveAsset( bannerImages[ i ] ) );
                }
                return Bluebird.all( saveBannerImages );
            } ).then( function()
            {
                grunt.log.ok( 'Banner items completed' );
                return Bluebird.resolve( true );
            } ).catch( function( err )
            {
                fail( err );
            });
        }

        // --------------------------------------------------
        // get layout then run build processes simultaneously

        fetchLayout().catch( function( err )
        {
            fail( err );
        } ).then( function( layout )
        {
            return Bluebird.all(
            [
                createBanner( layout , 'banner/index.html' ),
                renderSection( layout , 'sections/foi.hbs' , 'foi/index.html' , function( layout ){ return layout.contentType == 'homepagePlusFoILayout'; } ),
                renderPartials( 'cards/research.hbs' , 'researchItems' , 'research/' )( layout ),
                renderPartials( 'cards/news.hbs' , 'newsStories' , 'news/' )( layout ),
                renderPartials( 'cards/foi.hbs' , 'foiItems' , 'foi/' )( layout ),
            ] );
        } ).spread( function( ...things )
        {
            grunt.log.ok( 'Partials successfully created' );
        } ).catch( function( err )
        {
            fail( err );
        } ).then( function()
        {
            done();
        } );

        // --------------------------------------------------

    } );

};
