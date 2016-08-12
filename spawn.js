var proto = require(__dirname + "/lib/proto.js");
var URL = require(__dirname + "/lib/url.js");
var child = require('child_process');
process.getAbsolutePath = proto.getAbsolutePath;
var parent_dir = process.getAbsolutePath(__dirname);
var _ = require('underscore');

//using dnscache
//from now on all the calls made to dns module are wrapped by the cache
//this will provide dns cache in request module
var dns = require('dns'),
dnscache = require('dnscache')({
    "enable" : true,
    "ttl" : 300,
    "cachesize" : 1000
});

var request = require("request");
var check = require("check-types");
var colors = require('colors');
var urllib = require('url');
var crypto = require('crypto');
var Logger = require(__dirname + "/lib/logger.js");
var Message = require(__dirname + "/lib/message.js");
var Lock = require(__dirname + "/lib/lock.js");
/**
    Represents a spawned fetcher process.
    @constructor
    @author Tilak Patidar <tilakpatidar@gmail.com>

*/
var Spawn = function() {
    var message;
    var that = this;
    var log;
    /**
        Stores the fetch queue.
        @private
        @type {Array}

    */
    var GLOBAL_QUEUE = [];
    /**
        http request pool
        @private
    */
    var separateReqPool;
    var regex_urlfilter = {};
    var config = require(__dirname + "/lib/spawn_config.js");

    /**
        Global counter to store number of urls queued.
        @private
        @type {Number}
    */
    this.queued = 0;
    this.active_sockets = 0;
    this.batch = {};
    this.batchSize = 0;
    this.batchId = 0;
    this.refresh_label = null;
    this.links = [];
    this.botObjs = {};
    this.lastAccess = {};
    this.bot_type;
    this.domain_group_id = null;

    this.getTask = function getTask(fn) {
        process.on('message', function process_on_msg(data) {
            //recieving instructions from parent
            var k = data["init"];
            if (k) {
                that.batch = k[0];
                that.batchSize = k[1];
                that.links = k[2];
                that.botObjs = k[3];
                that.batchId = k[4];
                that.refresh_label = k[5];
                config = config.init(k[6], k[7], k[8]);
                message = new Message();
                message.set('config', config);
                message.set('links_store', that.links);
                that.bot_type = k[9];
                that.domain_group_id = k[10];
                log = new Logger(message);
                message.set('log', log);
                separateReqPool = {
                    maxSockets: config.getConfig("http", "max_sockets_per_host")
                };
                regex_urlfilter["accept"] = config.getConfig("accept_regex");
                regex_urlfilter["reject"] = config.getConfig("reject_regex");
                message.set('regex_urlfilter', regex_urlfilter);
                //prepare regexes
                URL = new URL(message);
                process.http_proxy = config.getConfig("http", "http_proxy");
                process.https_proxy = config.getConfig("http", "https_proxy");
                that.refresh_label = config.getConfig("default_recrawl_interval");
                return fn(that.batch);
            }
        });
    };

    this.queueLinks = function queueLinks(pools) {
        that.queued = 0;
        for (var i = 0; i < pools.length; i++) {
            if (check.assigned(pools)) {
                if (that.bot_type === "normal") {
                    var url = pools[i]['url'];
                    var domain = pools[i]['domain'];
                    try {
                        var link = URL.url(url, domain);
                        link.setNormalQueue();

                        link.setBucketId(pools[i]['bucket_id']);
                        link.setUrlId(pools[i]['_id']);
                        (function(link) {
                            setTimeout(function() {
                                that.processLink(link);
                            }, 100); //to avoid recursion
                        })(link);
                    } catch (err) {
                        console.log(err);
                    }
                } else if (that.bot_type === "failed_queue") {
                    var url = pools[i]['url'];
                    var domain = pools[i]['domain'];
                    var parent = pools[i]['parent'];
                    try {
                        var link = URL.url(url, domain, parent);
                        link.setFailedQueue();

                        link.setBucketId(pools[i]['bucket_id']);
                        link.setUrlId(pools[i]['_id']);
                        (function(link) {
                            setTimeout(function() {
                                that.processLink(link);
                            }, 100); //to avoid recursion
                        })(link);
                    } catch (err) {
                        console.log(err);
                    }
                }


            } else {
                break;
            }

        };

    };

    this.processLink = function processLink(link) {
        var bot = this; //inside setTimeout no global access
        //console.log(bot.batchId,"   ",link.details.url , 'ask access');
        //console.log(bot.batchId,"   ",bot.active_sockets, "    ",config.getConfig("http","max_concurrent_sockets"));
        if (!check.assigned(link)) {
            return;
        }
        if (that.active_sockets >= config.getConfig("http", "max_concurrent_sockets")) {
            //pooling to avoid socket hanging
            GLOBAL_QUEUE.push(link);
            return;

        }
        that.active_sockets += 1;


        if (check.assigned(that.botObjs)) {
            //if robots is enabled
            //check if access is given to the crawler for requested resource
            var robot = that.botObjs[link.details.domain];
            if (check.assigned(robot) && !robot["NO_ROBOTS"]) {
                robot = that.addProto(robot);
                robot.canFetch(config.getConfig("robot_agent"), link.details.url, function canFetch1(access, crawl_delay) {
                    if (!access) {
                        msg(("Cannot access " + link.details.url), "error");
                        // access not given exit 

                        try {
                            link.setStatusCode(403);
                            link.setResponseTime(0);
                            link.setParsed({});
                            link.setContent({});
                            process.send({
                                "bot": "spawn",
                                "setCrawled": link.details
                            });

                        } catch (err) {
                            //msg("Child killed","error")
                        } finally {
                            that.active_sockets -= 1;
                        }
                        return that.isLinksFetched();

                    } else {
                        //#debug#("access "+url+" crawl_delay "+crawl_delay);
                        that.scheduler(link, crawl_delay);

                    }
                });

            } else {
                //no robots file for asked domain
                that.fetch(link); //constraints are met let's fetch the page
            }

        } else {
            that.fetch(link); //constraints are met let's fetch the page
        }

    };

    this.fetch = function fetch(link) {
        if (!config.getConfig("verbose")) {
            msg(link.details.url, "no_verbose");
        }
        if (link.details.file_type === "file") {
            that.fetchFile(link);
        } else if (link.details.file_type === "webpage") {
            that.fetchWebPage(link);
        }


    };

    this.grabInlinks = function grabInlinks($, url, domain, linksFromParsers) {
        for (var i = 0; i < linksFromParsers.length; i++) {
            var q = linksFromParsers[i];
            try {
                process.send({
                    "bot": "spawn",
                    "addToPool": [q, q, url, config.getConfig("default_recrawl_interval")]
                });
            } catch (err) {
                //msg("Child killed","error")
            }
        };
        var a = $("a")
            //console.log(a);
        var count = a.length;
        url = URL.url(url, domain);

        a.each(function grabInlinks_each() {

            //do not follow links with rel = 'nofollow'
            var rel = $(this).attr('rel');
            if (check.assigned(rel) && rel === "nofollow") {
                --count;
                return;
            }

            var href = $(this).attr("href");
            //console.log(href);
            if (check.assigned(href)) {
                //#debug#("url "+href);

                //console.log(abs);
                var link = URL.url(href, domain);

                if (config.getConfig("web_graph")) {
                    try {
                        if (url.details.nutch_key.split(":")[0] !== link.details.nutch_key.split(":")[0]) {
                            //storing just outlink relations
                            process.send({
                                "bot": "spawn",
                                "graph": [link.details.url, url.details.url]
                            });
                        }

                    } catch (errr) {

                    }
                }
                if (!link.details.accepted) {
                    --count;
                    return;
                }
                //console.log(link.details.url);

                try {
                    process.send({
                        "bot": "spawn",
                        "addToPool": [link.details.url, link.details.domain, url.details.url, config.getConfig("default_recrawl_interval")]
                    });

                } catch (err) {
                    msg("Child killed", "error")
                }

            }

        });
        msg(("Got " + count + " links from " + url.details.url), "info");
    };

    this.isLinksFetched = function isLinksFetched() {
        that.queued += 1;
        if (that.queued >= that.batch.length) {
            try {
                process.send({
                    "bot": "spawn",
                    "finishedBatch": [that.batchId, that.refresh_label, that.bot_type]
                });
                setTimeout(function() {
                    process.exit(0);
                }, 5000);
            } catch (err) {
                //  msg("Child killed","error")
            }


        }

    };

    this.addProto = function addProto(robot) {
        robot.canFetch = function canFetch(user_agent, url, allowed) {
            var crawl_delay = parseInt(this.defaultEntry["crawl_delay"]) * 1000; //into milliseconds
            if (isNaN(crawl_delay) || !check.assigned(crawl_delay)) {

                crawl_delay = config.getConfig("http", "delay_request_same_host");
            }
            if (this.allowAll) {
                return allowed(true, crawl_delay);

            } else if (this.disallowAll) {
                return allowed(false, crawl_delay);

            }
            var rules = this.defaultEntry["rules"];
            if (!check.assigned(rules)) {
                return allowed(true, crawl_delay);
            }

            for (var i = 0; i < rules.length; i++) {
                var path = decodeURIComponent(rules[i].path);
                var isallowed = rules[i].allowance;

                var given_path = "/" + url.replace("http://", "").replace("https://", "").split("/").slice(1).join("/");
                if (given_path === path && isallowed) {
                    return allowed(true, crawl_delay);
                } else if (given_path === path && !isallowed) {
                    return allowed(false, crawl_delay);
                }
            };
            //if no match then simply allow
            return allowed(true, crawl_delay);
        };
        return robot;
    };

    this.scheduler = function scheduler(link, time) {
        if (time === 0) {
            //queue immediately
            return that.fetch(link);
        } else {
            var lastTime = that.lastAccess[link.details.domain];
            if (!check.assigned(lastTime)) {
                //first time visit,set time
                that.lastAccess[link.details.domain] = new Date().getTime();
                that.fetch(link);
            } else {
                that.queueWait(link, time);
            }
        }

    };

    this.queueWait = function queueWait(link, time) {
        var lastTime = that.lastAccess[link.details.domain];
        var current_time = new Date().getTime();
        if (current_time < (lastTime + time)) {
            that.lastAccess[link.details.domain] = current_time;
            that.fetch(link);
        } else {
            (function(link, time) {
                setTimeout(function() {
                    that.queueWait(link, time);
                }, Math.abs(current_time - (lastTime + time)));
            })(link, time);
        }
    };

    this.fetchWebPage = function fetchWebPage(link) {
        var req_url = link.details.url;
        //console.log(bot.links, link.details.domain);

        //console.log(req_url);
        var req = request({
            uri: req_url,
            followRedirect: true,
            pool: separateReqPool,
            timeout: config.getConfig("http", "timeout")
        });
        var html = [];
        var done_len = 0;
        var init_time = new Date().getTime();
        var sent = false;
        req.on("response", function req_on_response(res) {

            if (check.assigned(res) && check.assigned(res.headers.location) && res.headers.location !== req_url) {
                //if page is redirect
                msg(req_url + " redirected to " + res.headers.location, 'info');
                link.setRedirectedURL(res.headers.location);

            }
            if (check.assigned(res) && check.assigned(res.headers['content-type'])) {
                link.setHeaderContentType(res.headers['content-type']);
                var allowed = config.getConfig('http', 'accepted_mime_types');
                var tika_allowed = config.getConfig("tika_supported_mime");
                var match = false;
                var tika_match = false;

                _.each(allowed, function(e, index) {
                    if (res.headers['content-type'].indexOf(allowed[index]) >= 0) {
                        match = true;
                    }

                });


                _.each(tika_allowed, function(e, index) {
                    if (res.headers['content-type'].indexOf(tika_allowed[index]) >= 0) {
                        tika_match = true;
                    }
                });

                if (!match && !tika_match) {
                    req.emit('error', "MimeTypeRejected");
                }
                if (tika_match) {
                    msg("Tika mime type found transfer to tika queue " + link.details.url, 'info');
                    that.fetchFile(link);
                    req.emit('error', 'TikaMimeTypeFound');
                }

            }


            var len = parseInt(res.headers['content-length'], 10);
            if (!check.assigned(len) || !check.number(len)) {
                len = 0;
            }
            if (len > config.getConfig("http", "max_content_length")) {
                req.emit('error', "ContentOverflow");

            }
            res.on("data", function res_on_data(chunk) {
                done_len += chunk.length;
                var c = chunk.toString();
                //console.log(c,"c");
                html.push(c);
                var t = new Date().getTime();
                if ((t - init_time) > config.getConfig("http", "callback_timeout")) {
                    req.emit('error', "ETIMEDOUT_CALLBACK");
                }
                if (done_len > config.getConfig("http", "max_content_length")) {
                    req.emit('error', "ContentOverflow");
                }
            });
            res.on("error", function res_on_error(err) {
                //#debug#(err )
                //console.log(err,err.type)
                req.emit("error", err);

            });
            res.on("end", function res_on_end() {

                html = html.join("");
                //console.log(html);
                if (html.length === 0) {
                    //zero content recieved
                    //raise error bec otherwise it will create a md5 to which all the other empty urls will become canonical to
                    try {
                        link.setStatusCode(res.statusCode + "_EMPTY_RESPONSE");
                        link.setParsed({});
                        link.setResponseTime(0);
                        link.setContent({});
                        if (!sent) {
                            process.send({
                                "bot": "spawn",
                                "setCrawled": link.details
                            });

                        }
                    } catch (err) {
                        //  msg("Child killed","error")
                    } finally {
                        if (!sent) {
                            sent = true;
                            that.active_sockets -= 1;
                        }
                    }

                    return that.isLinksFetched();
                }
                var t = new Date().getTime();
                var response_time = t - init_time;
                if (!check.assigned(html)) {
                    //some error with the request return silently
                    msg("Max sockets reached read docs/maxSockets.txt", "error");
                    try {
                        link.setStatusCode(-1);
                        link.setParsed({});
                        link.setResponseTime(0);
                        link.setContent({});
                        if (!sent) {
                            process.send({
                                "bot": "spawn",
                                "setCrawled": link.details
                            });

                        }
                    } catch (err) {
                        //  msg("Child killed","error")
                    } finally {
                        if (!sent) {
                            sent = true;
                            that.active_sockets -= 1;
                        }
                    }

                    return that.isLinksFetched();
                }
                try {
                    var md5sum = crypto.createHash('md5');
                    md5sum.update(html);
                    var hash = md5sum.digest('hex');
                    link.setContent(html);
                    link.setContentMd5(hash);
                } catch (err_md) {

                }

                var Parser = require(__dirname + "/parsers/" + that.links[link.details.domain]["parseFile"]);
                var parser_obj = new Parser(config);
                parser_obj.parse(html, link.details.url, function(dic) {

                    //pluggable parser
                    var inlinksGrabbed = 1;
                    var parser_msgs = dic[4];
                    var default_opt = false;
                    var special_opt = false;
                    //check rss feeds
                    var feeds = dic[1]._source["rss_feeds"];
                    if (check.assigned(feeds) && feeds.length !== 0) {
                        try {
                            process.send({
                                "bot": "spawn",
                                "insertRssFeed": [link.details.url, feeds, that.domain_group_id]
                            });
                        } catch (err) {
                            console.log(err);
                        } finally {}


                    }
                    //check for author tag
                    if (check.assigned(dic[1]._source["author"])) {
                        try {
                            var d = {};
                            var author_link = URL.url(dic[1]._source["author"], link.details.domain);
                            d[author_link.details.url] = link.details.url;
                            process.send({
                                "bot": "spawn",
                                "insertAuthor": d
                            });
                        } finally {

                        }
                    }

                    //DEFAULTS
                    link.setStatusCode(res.statusCode);
                    link.setParsed(dic[1]);
                    link.setResponseTime(response_time);
                    link.setContent(html);
                    if (check.assigned(parser_msgs) && !check.emptyObject(parser_msgs)) {
                        //link.setStatusCode("META_BOT"); //bec going to concat status
                        _.each(parser_msgs, function(e, parser_msg_key) {

                            var parser_msg = parser_msgs[parser_msg_key];
                            //console.log("############## PARSER MSG ############",parser_msg_key,parser_msg);
                            switch (parser_msg_key) {
                                case "noindex":
                                    special_opt = true;
                                    try {
                                        link.setStatusCode(link.getStatusCode() + "_NOINDEX");
                                        link.setParsed({});
                                        link.setContent({});
                                        //no index but follow links from this page
                                        ++inlinksGrabbed;
                                    } catch (error) {

                                    }
                                    break;
                                case "nofollow":
                                    special_opt = true;
                                    try {
                                        link.setStatusCode(link.getStatusCode() + "_NOFOLLOW");
                                        inlinksGrabbed = -1000;
                                        //do not grab links from this page
                                    } catch (error) {

                                    }
                                    break;
                                case "canonical":
                                    special_opt = true;
                                    //console.log("############## HERE canonical################");
                                    try {
                                        var clink = URL.url(parser_msg);
                                        if (clink.details.url !== link.details.url) {
                                            //if canonical url and this url is not same
                                            link.setCanonicalUrl(parser_msg);
                                        }
                                        ++inlinksGrabbed;

                                        //do not grab links from this page
                                    } catch (error) {}
                                    break;
                                case "alternate":
                                    special_opt = true;
                                    _.each(parser_msg, function(e, ind) {
                                        link.addAlternateUrl(parser_msg[ind]);
                                    });

                                    ++inlinksGrabbed;
                                    //do not grab links from this page

                                    break;
                                case "content-type-reject":
                                    special_opt = true;

                                    link.setStatusCode("ContentTypeRejected");
                                    link.setParsed({});
                                    link.setContent({});
                                    //do not grab links from this page
                                    inlinksGrabbed = -1000;

                                    break;
                                case "content-lang-reject":
                                    special_opt = true;

                                    link.setStatusCode("ContentLangRejected");
                                    link.setParsed({});
                                    link.setContent({});
                                    //do not grab links from this page
                                    inlinksGrabbed = -1000;
                                    break;
                                case "none":
                                    special_opt = true;
                                    try {
                                        link.setStatusCode(link.getStatusCode() + "_NOFOLLOW_NOINDEX");
                                        link.setParsed({});
                                        link.setContent({});
                                        inlinksGrabbed = -1000;
                                    } catch (error) {

                                    }
                                    break;
                                default:
                                    default_opt = true;


                            };
                        });
                    }

                    if ((check.assigned(parser_msgs) && !check.emptyObject(parser_msgs)) && special_opt) {
                        //means one of the above cases met just send the response to setCrawled
                        if (inlinksGrabbed > 0) {
                            that.grabInlinks(dic[0], link.details.url, link.details.domain, dic[2]);
                        }

                        try {
                            if (!sent) {
                                process.send({
                                    "bot": "spawn",
                                    "setCrawled": link.details
                                });


                            }
                        } catch (err) {
                            //msg("Child killed","error")
                        } finally {
                            if (!sent) {
                                sent = true;
                                that.active_sockets -= 1;
                            }
                        }
                        return that.isLinksFetched();
                    } else {
                        //no msg recieved or no cases matched
                        //go for default send
                        //if((!check.assigned(parser_msgs) || check.emptyObject(parser_msgs)) || default_opt){  
                        //dic[0] is cheerio object
                        //dic[1] is dic to be inserted
                        //dic[2] inlinks suggested by custom parser
                        that.grabInlinks(dic[0], link.details.url, link.details.domain, dic[2]);

                        var code = res.statusCode;
                        //console.log(code,"code")
                        try {
                            //console.log("Coming here ",link.details.url);
                            link.setStatusCode(code);
                            link.setParsed(dic[1]);
                            link.setResponseTime(response_time);
                            link.setContent(html);
                            if (!sent) {
                                process.send({
                                    "bot": "spawn",
                                    "setCrawled": link.details
                                });


                            }
                        } catch (err) {
                            //msg("Child killed","error")
                        } finally {
                            if (!sent) {
                                sent = true;
                                that.active_sockets -= 1;
                            }

                        }


                        return that.isLinksFetched();
                        //} 
                    }

                });
            });
        });
        req.on("error", function req_on_error(err) {
            //#debug#(err)
            //console.log("req  ",err,err.type)
            var message = err;
            if (message === "ETIMEDOUT_CALLBACK") {
                msg("Connection timedout change http.callback_timeout setting in config", "error");
                try {
                    link.setStatusCode("ETIMEDOUT_CALLBACK");
                    link.setParsed({});
                    link.setResponseTime(0);
                    link.setContent({});
                    if (!sent) {
                        process.send({
                            "bot": "spawn",
                            "setCrawled": link.details
                        });
                    }
                } catch (err) {
                    //msg("Child killed","error")
                } finally {
                    if (!sent) {
                        sent = true;
                        that.active_sockets -= 1;
                    }
                }

                return that.isLinksFetched();
            } else if (message === "ContentOverflow") {
                msg("content-length is more than specified", "error");
                try {
                    link.setStatusCode("ContentOverflow");
                    link.setParsed({});
                    link.setResponseTime(0);
                    link.setContent({});
                    if (!sent) {
                        process.send({
                            "bot": "spawn",
                            "setCrawled": link.details
                        });

                    }
                } catch (err) {
                    //msg("Child killed","error")
                } finally {
                    if (!sent) {
                        sent = true;
                        that.active_sockets -= 1;
                    }
                }

                return that.isLinksFetched();

            } else if (message === "MimeTypeRejected") {
                msg("mime type rejected for " + link.details.url, "error");
                try {
                    link.setStatusCode("MimeTypeRejected");
                    link.setParsed({});
                    link.setResponseTime(0);
                    link.setContent({});
                    if (!sent) {
                        process.send({
                            "bot": "spawn",
                            "setCrawled": link.details
                        });

                    }
                } catch (err) {
                    //msg("Child killed","error")
                } finally {
                    if (!sent) {
                        sent = true;
                        that.active_sockets -= 1;
                    }
                }

                return that.isLinksFetched();

            } else if (message === "'TikaMimeTypeFound'") {
                //we already called fetch file just pass 
            } else {
                try {
                    var code;
                    if (err.code === 'ETIMEDOUT') {
                        msg(err, "error");
                        if (err.connect === true) {
                            code = 'ETIMEDOUT_CONNECTION'
                        } else {
                            code = 'ETIMEDOUT_READ'
                        }
                    } else {
                        code = err.code;
                    }
                    link.setStatusCode(code);
                    link.setParsed({});
                    link.setResponseTime(0);
                    link.setContent({});
                    if (!sent) {
                        process.send({
                            "bot": "spawn",
                            "setCrawled": link.details
                        });

                    }
                } catch (errr) {

                } finally {
                    if (!sent) {
                        sent = true;
                        //console.log(that.active_sockets, "before");
                        that.active_sockets -= 1;
                        //console.log(that.active_sockets, "after");
                    }
                }
                return that.isLinksFetched();
            }


        });


    };

    this.fetchFile = function fetchFile(link) {
        //files will be downloaded by seperate process
        //console.log("files    "+link.details.url)
        var p = that.links[link.details.domain]["parseFile"];
        code = "inTikaQueue";
        try {
            link.setStatusCode(code);
            link.setParsed({});
            link.setResponseTime(0);
            link.setContent({});
            process.send({
                "bot": "spawn",
                "setCrawled": link.details
            });
            var dict = {
                fileName: link.details.url,
                parseFile: p,
                status: 0,
                link_details: link.details
            };
            process.send({
                "bot": "spawn",
                "insertTikaQueue": dict
            });
        } catch (err) {
            console.log(err);
        } finally {
            that.active_sockets -= 1;
        }

        return that.isLinksFetched();


    };




    var global_queue_lock = new Lock();

    this.getTask(function getTask(links) {
        //console.log(links, "for fetch");
        that.queueLinks(links);

        setInterval(function global_queue_pusher() {

            if (!global_queue_lock.enter()) {
                return;
            }


            var len = GLOBAL_QUEUE.length;
            //console.log(len, "GLOBAL_QUEUE.length");

            for (var i = 0; i < len; i++) {
                that.processLink(GLOBAL_QUEUE.pop());
            };

            global_queue_lock.release();

            log.put(that.batchId + " <- bot id     " + that.queued + " <-  queued urls   " + that.batch.length + " <- batch length  " + that.active_sockets + " <- active_sockets", 'info');
        }, 5000);

    });

    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }
};

var spawn_obj = new Spawn();