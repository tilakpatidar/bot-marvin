/*
 * Sitemap Parser
 *
 *
 *
 */


var Buffer = require('buffer').Buffer;
var Immutable = require('immutable');
var zlib = require('zlib');
var xmlParse = require("xml2js").parseString;
var request = require('request');
var fs = require("fs");
var _ = require('underscore');
var check = require("check-types")
var ProgressBar = require('progress');
var urllib = require("url");
var parent_dir = process.getAbsolutePath(__dirname);
var proto = require(parent_dir + "/lib/proto.js");



/**
	Represents sitemap parser
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@param {Message} message_obj

*/

var Sitemap = function(message_obj) {
    var message = message_obj;
    var that = this;
    var config = message.get('config');
    var regex_urlfilter = message.get('regex_urlfilter');
    var URL = require(parent_dir + "/lib/url.js");
    URL = new URL(message);
    var pool = message.get('pool');
    var log = message.get('log');

    /**
    	List of urls for which sitemap have to parsed.
    	@private
    	@type {Array}
    */
    var sitemap_queue = [];


    /**
    	Fetches given sitemap url
    	@public
    	@param {String} url
    	@param {Function} callback
    */
    this.fetch = function(url, callback) {

        that.url = url;
        var gzip = false;
        var input = [];
        if (url.indexOf(".gz") >= 0) {
            //gz file will require uncompressing
            gzip = true;

        }
        var prog = 0;
        var bar;
        var self = that;
        var body = "";
        var curr_time = (new Date()).getTime();
        var timer = setInterval(function() {

            if (check.assigned(bar)) {
                bar.tick(prog);
                console.log("\n")
                if (bar.complete) {
                    console.log('\ncomplete\n');
                    clearInterval(timer);
                }
            }



        }, 1000);


        var req = request.get(self.url, {
            followRedirect: false,
            timeout: config.getConfig("sitemap_parser_timeout")
        });
        req.on('response', function(res) {
            //console.log(res.statusCode);
            if (res.statusCode !== 200) {
                clearInterval(timer);
                //console.log("OLA")
                callback(new Error(), null);
                return;

            }
            var encoding = res.headers['content-encoding'];

            if (encoding == 'gzip') {
                gzip = true;
            }


            var len = parseInt(res.headers['content-length'], 10);
            if (!len) {
                len = 1000000;
            }
            bar = new ProgressBar('  downloading ' + res.request.uri.href + '\n [:bar] :percent :etas', {
                complete: '=',
                incomplete: ' ',
                width: 100,
                total: len
            });

            res.on('data', function(chunk) {
                if (gzip) {
                    input = input.concat(chunk);
                }

                var c = chunk.toString();
                body += c;
                prog = c.length;
            });

            res.on('error', function(err) {
                clearInterval(timer);
                callback(err, null);
                return;
            });

            res.on('end', function(err) {
                clearInterval(timer);
                if (err) {
                    clearInterval(timer);
                    callback(err, null);
                    return;
                }
                bar.tick(len);
                if (gzip) {
                    input = new Buffer(input);
                    //console.log(input,self.url)
                    var out = zlib.gzip(input, function(err, uncompressed) {
                        if (!check.assigned(uncompressed)) {
                            clearInterval(timer);
                            callback(err, null);
                            return;
                        }
                        var d = uncompressed.toString();
                        //console.log(d)
                        try {
                            xmlParse(d, function(err, data) {
                                clearInterval(timer);
                                callback(err, data);
                                return;
                            });
                        } catch (err) {
                            clearInterval(timer);
                            callback(err, null);
                            return;
                        }

                    });

                } else {
                    try {

                        xmlParse(body, function(err, data) {
                            clearInterval(timer);
                            callback(err, data);
                            return;
                        });
                    } catch (err) {
                        clearInterval(timer);
                        callback(err, null);
                        return;
                    }
                }

            });
        });


        req.on('error', function(err) {
            clearInterval(timer);
            callback(err, "Error");
            return;
        });





    };

    /**
    	Parses and returns all the urls from the given sitemap url
    	@param {String} url
    	@param {Function} callback
    */
    this.getSites = function(url, callback) {
        var self = that;
        var js = [];
        var d, s, error;
        var sUrlSize = 1;
        var parseCnt = 0;
        that.fetch(url, function read(err, data) {

            if (!check.assigned(err)) {
                d = data.urlset;
                if (check.assigned(d)) {


                    for (var i = 0; i < d.url.length; i++) {
                        var obj = d.url[i];
                        var k = [];
                        var href = obj["loc"][0];
                        var url_link = URL.url(href, url.split("/").slice(0, 3).join("/"));
                        if (url_link.details.accepted) {
                            var domain = url_link.getDomain();
                            k.push(url_link.getURL())
                            k.push(domain);
                            k.push(url);
                            if (!check.assigned(obj["changefreq"])) {
                                obj["changefreq"] = config.getConfig("default_recrawl_interval");
                            }
                            if (!check.assigned(obj["priority"])) {
                                obj["priority"] = 1;
                            }



                            if (check.assigned(obj["priority"][0])) {
                                obj["priority"] = parseInt(parseFloat(obj["priority"][0] * 10)); //as range of priority is 0.0 to 1.0
                                if (obj["priority"] === 0) {
                                    obj["priority"] = 1;
                                }
                                if (check.number(obj["priority"])) {
                                    //then convert
                                    obj["priority"] = 11 - (obj["priority"]);
                                } else {
                                    obj["priority"] = 1;
                                }


                                //converting to our convention
                            }
                            if (obj["priority"] === 0) {
                                obj["priority"] = 1;
                            }
                            k.push((obj["changefreq"]).toString().toLowerCase());
                            k.push(parseInt(obj["priority"]));

                            js.push(k)
                        }

                    };
                    parseCnt++;
                    //console.log(parseCnt,"parseCnt",sUrlSize)
                    if (parseCnt >= sUrlSize) {
                        callback(error, js);
                        return;
                    }
                } else if (s = data.sitemapindex) {
                	parseCnt++;
                    var sitemapUrls = _.flatten(_.pluck(s.sitemap, "loc"));
                    sUrlSize += _.size(sitemapUrls);
                    _.each(sitemapUrls, function(url) {
                        self.fetch(url, read);

                    });
                } else {
                    error = "no valid xml";
                    parseCnt++;
                    if (parseCnt >= sUrlSize) {
                        callback(error, js);
                        return;
                    }
                }
            } else {
                parseCnt++;
                //console.log(parseCnt,"parseCnt",sUrlSize,"  two")
                if (parseCnt >= sUrlSize) {
                    callback(error, js);
                    return;
                }
            }
        });
    };


    /**
    	Updates sitemap of given domain.
    	@public
    	@param {String} domain
    	@param {Array} sites
    	@param {Function} fn - callback

    */
    this.updateSiteMap = function updateSiteMap(domain, sites, fn) {
    	
    		pool.sitemap_collection.insert({
            "_id": domain
        	}, function updateSiteMapInsert(err, results) {
	            msg("Updated sitemap file for " + domain + "in db", "info");

	            message.set('inlinks_pool', message.get('inlinks_pool').concat(sites));
	            if(check.assigned(fn)){
	            	fn();
	            }else{
	            	return;
	            }

        	});
    	

    };

  
    /**
    	Queues urls for sitemap fetching
    	@public
    	@param {Array} domain_urls
    	@param {Function} fn - callback
    */
    this.queueSitemaps = function queueSitemapsFn(domain_urls, fn) {

        if (!config.getConfig('parse_sitemaps') || message.get('webappOnly')) {
            if (check.assigned(fn)) {
                return fn();
            } else {
                return;
            }

        }


        var TOTAL = new Immutable.Set(domain_urls);
        pool.sitemap_collection.find({
            "_id": {
                "$in": domain_urls
            }
        }).toArray(function sitemap_findMany(err, docs) {
            if (check.assigned(err) || !check.assigned(docs)) {
                msg("Sitemap not present in db", 'error');
                if (check.assigned(fn)) {
                    return fn(false);
                } else {
                    return;
                }
            } else {

                var existing = new Immutable.Set(_.pluck(docs, '_id'));

                var queued = TOTAL.subtract(existing);

                sitemap_queue = queued.toArray();

                msg('Sitemap domains pushed into queue', 'success');


                process.nextTick(function() {
                    lazy_sitemap_updator(sitemap_queue.splice(0, 1)[0]);
                });
                //insert sitemap urls

                if (check.assigned(fn)) {
                    return fn(true);
                } else {
                    return;
                }

            }

        });
    };

    /**
    	It loads sitemap recursively in a queued fashion.
    	Next domain is automatically queued by popping element from sitemap_queue
    	@private
    	@param {String} domain
    */
    var lazy_sitemap_updator = function lazy_sitemap_updator(domain) {


        if (!check.assigned(domain)) {
            msg("Lazy loading finished for all domains", "success");
            return;
        }




        var abs = urllib.resolve(domain, 'sitemap.xml');


        msg("Lazy loading sitemaps for " + abs, "info");

        pool.sitemap_collection.findOne({
            "_id": domain
        }, function(err, docs) {
            if (check.assigned(err) || !check.assigned(docs)) {


                that.getSites(abs, function(err, sites) {
                	//console.log(arguments);
                    if (!err) {

                        that.updateSiteMap(domain, sites, function() {
                            process.nextTick(function() {
                                lazy_sitemap_updator(sitemap_queue.splice(0, 1)[0]);
                            });

                        });
                    } else {
                        msg("Sitemap could not be downloaded for " + domain, "error");
                        that.updateSiteMap(domain, [], function() {
                            process.nextTick(function() {
                                lazy_sitemap_updator(sitemap_queue.splice(0, 1)[0]);
                            });
                        });
                    }
                });
            } else {
                process.nextTick(function() {
                    lazy_sitemap_updator(sitemap_queue.splice(0, 1)[0]);
                });
            }
        });
    };

    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};


module.exports = Sitemap;