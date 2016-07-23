var feed = require("feed-read");
var _ = require("underscore");

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

        feed(rss_link, function(err, articles) {
            //console.log(arguments);
            if (err) {
                return fn([]);
            }

            return fn(_.pluck(articles, "link"));
        });

    };


    /**
    	Returns links of all the articles from the rss.
    	@public
    	@param {String} rss_link
    */
    this.getRssContent = function(rss_link) {

        feed(rss_link, function(err, articles) {

            if (err) {
                return fn([]);
            }

            return articles;
        });
    };

};

module.exports = RSSFetcher;