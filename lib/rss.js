var _ = require("underscore");
var request = require('request');
var FeedParser = require('feedparser');
var Iconv = require('iconv').Iconv;
/**
	Parses RSS feeds and updates inlinks in the crawler.
	Links are provided from rss collection of the crawler.
	@constructor
	@author Tilak Patidar<tilakpatidar@gmail.com>
	@param {Message} message_obj
*/

var RSSFetcher = function(message_obj) {

    var message = message_obj;

    /**
    	Returns links of all the articles from the rss.
    	@public
    	@param {String} rss_link
    */
    this.getLinks = function(rss_link, fn) {
        try{
            fetch(rss_link, function(err, articles) {
                
                if (err) {
                    return fn([]);
                }

                return fn(_.pluck(articles, "link"));
            });
        }catch(err){
            return fn([]);
        }


    };


    /**
    	Returns links of all the articles from the rss.
    	@public
    	@param {String} rss_link
    */
    this.getRssContent = function(rss_link, fn) {

        fetch(rss_link, function(err, articles) {

            if (err) {
                return fn([]);
            }

            return fn(articles);
        });
    };



    function fetch(feed, callback) {
          // Define our streams
          var once = false;
          var posts = [];

          var req = request(feed, {timeout: 10000, pool: false});
          req.setMaxListeners(50);
          // Some feeds do not respond without user-agent and accept headers.
          req.setHeader('user-agent', 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_8_5) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/31.0.1650.63 Safari/537.36');
          req.setHeader('accept', 'text/html,application/xhtml+xml');

          var feedparser = new FeedParser();

          // Define our handlers
          req.on('error', function(){
            if(!once){
                once = true;
                return callback(new Error("Request error"), posts);
            }
            
          });


          req.on('response', function(res) {

            if (res.statusCode != 200) return this.emit('error', new Error('Bad status code'));
            var charset = getParams(res.headers['content-type'] || '').charset;
            res = maybeTranslate(res, charset);
            // And boom goes the dynamite
            res.pipe(feedparser);

            res.on('error', function(){
                if(!once){
                    once = true;
                    return callback(new Error("response error"), posts);
                }
            });

          });

          feedparser.on('error', function(){
            if(!once){
                once = true;
                return callback(new Error("feedparser error"), posts);
            }
          });


          feedparser.on('end', function(){
                if(!once){
                    once = true;
                    return callback(null, posts);
                }
          });
          
          feedparser.on('readable', function() {
            var post;
            while (post = this.read()) {
                posts.push(post);
            }
          });
    }

    function maybeTranslate (res, charset) {
      var iconv;
      // Use iconv if its not utf8 already.
      if (!iconv && charset && !/utf-*8/i.test(charset)) {
        try {
          iconv = new Iconv(charset, 'utf-8');
          console.log('Converting from charset %s to utf-8', charset);
          iconv.on('error', function(){
            res.emit('error', err);
          });
          // If we're using iconv, stream will be the output of iconv
          // otherwise it will remain the output of request
          res = res.pipe(iconv);
        } catch(err) {
          
        }
      }
      return res;
    }

    function getParams(str) {
      var params = str.split(';').reduce(function (params, param) {
        var parts = param.split('=').map(function (part) { return part.trim(); });
        if (parts.length === 2) {
          params[parts[0]] = parts[1];
        }
        return params;
      }, {});
      return params;
    }

    

};

module.exports = RSSFetcher;




