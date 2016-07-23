var ObjectId = require('mongodb').ObjectId;
var Immutable = require('immutable');
var parent_dir = process.getAbsolutePath(__dirname);
var Score = require(parent_dir + '/lib/score.js');
var proto = require(parent_dir + '/lib/proto.js');
var _ = require("underscore");
var check = require('check-types');
var URL = require(parent_dir + '/lib/url.js');
var proxy_cache_class = require(parent_dir + "/lib/bucket_proxy.js");

/**
    Represents a bucket of urls.
    Responsible for creation of buckets from inlinks and cached urls.
    @constructor
    @author Tilak Patidar<tilakpatidar@gmail.com>
    @param {Message} message_obj

*/
var Bucket = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');
    var log = message.get('logger');
    var pool = message.get('pool');
    var that = this;

    /**
    	time after which bucket creator is called.
    	@private
    	@type {Number}
    */
    var bucket_time_interval = 10000;




    /**
    	Stores interval object for bucket creator.
    	@private
    	@type {boolean}
    */
    var bucket_timer;

    var domain_group = [];
    var bucket_priority = message.get('bucket_priority');
    var links_store = message.get('links_store');
    var score = new Score(message);
    var bot_obj = message.get('bot');


    /**
        @private
        @type {Object}
        Stores the number of remaining urls in each bucket
    */
    var remaining_urls_store = {};
    var cache_calls = {};

    this.dequeue = function bucketoperation_dequeue(domain, count, interval, bucket_id, fn) {

        var li = [];
        var remaining_urls = remaining_urls_store[bucket_id];
        if (!check.assigned(remaining_urls)) {
            remaining_urls_store[bucket_id] = 0;
            remaining_urls = 0;
        }

        if (!check.assigned(message.get('proxy_cache'))) {

            //first initilaization
            message.set('proxy_cache', new proxy_cache_class(config.getConfig('inlink_cache_size')));

        }
        var cache_urls = message.get('proxy_cache').fetchURLs(domain, count + remaining_urls);
        msg('Got ' + cache_urls.length + ' urls from links cache for ' + domain, "success");

        if (cache_urls.length < ((50 / 100) * count)) {

            //load some urls from the db
            //cache_calls is used to avoid reloading the second time of urls
            //we already have 5 times more urls from last call
            if (cache_calls[domain + bucket_id.toString()]) {
                //console.log("skip db second time");
                //console.log("4(count + remaining_urls) - cache_urls.length  ", count, "  +  ", remaining_urls, "  -  ",  cache_urls.length);
                remaining_urls = (count + remaining_urls) - cache_urls.length;
                remaining_urls_store[bucket_id] = remaining_urls;
                return fn(cache_urls);
            } else {
                cache_calls[domain + bucket_id.toString()] = true;
            }

            pool.mongodb_collection.find({
                "domain": domain,
                "bucket_id": null,
                "bucketed": false,
                "fetch_interval": interval,
                "partitionedBy": config.getConfig("bot_name")
            }, {
                limit: count * 5,
                sort: {
                    level: 1
                }
            }).toArray(function loadFromCache(err, object) {
                if (!check.assigned(err)) {
                    msg("Loaded " + object.length + ' items for the cache of ' + domain, 'success');
                }

                for (var index in object) {
                    var doc = object[index];
                    message.get('proxy_cache').pushURL(doc);
                }

                //console.log("1(count + remaining_urls) - cache_urls.length  ", count, "  +  ", remaining_urls, "  -  ",  cache_urls.length);
                cache_urls = cache_urls.concat(message.get('proxy_cache').fetchURLs(domain, count + remaining_urls - cache_urls.length));
                //console.log(cache_urls, "FROM CACHE");
                //console.log("2(count + remaining_urls) - cache_urls.length  ", count, "  +  ", remaining_urls, "  -  ",  cache_urls.length);
                remaining_urls = (count + remaining_urls) - cache_urls.length;
                //console.log("short of ", remaining_urls);
                remaining_urls_store[bucket_id] = remaining_urls;
                fn(cache_urls);


            });
        } else {
            //console.log(cache_urls, "FROM CACHE2");
            cache_calls[domain + bucket_id.toString()] = true;
            //console.log("3(count + remaining_urls) - cache_urls.length  ", count, "  +  ", remaining_urls, "  -  ",  cache_urls.length);
            remaining_urls = (count + remaining_urls) - cache_urls.length;
            remaining_urls_store[bucket_id] = remaining_urls;
            fn(cache_urls);
        }




    };




    this.getCurrentDomain = function bucketoperation_getCurrentDomain(interval) {


        //console.log(that.bucket_priority)
        var domain = that.bucket_priority[interval].splice(0, 1)[0];


        return domain;
    };


    this.creator = function bucketoperation_creator() {

        //console.log("pinging")
        //#debug#console.log(li);
        //#debug#console.log(that.cache)

        //just pinging so that we do not run short of buckets
        //while we have links in our mongodb cache
        //generating new buckets based on refresh interval and uniformity
        if (!check.assigned(links_store)) {
            message.get('bucket_creator_lock').release();
            return;
        }
        //console.log("INININININ");
        var hashes = {};
        var intervals = config.getConfig("recrawl_intervals");

        for (var k in message.get('distinct_fetch_intervals')) {
            //creating hashes for all declared distinct_fetch_intervals
            //console.log(k);
            hashes[k] = {};
            hashes[k]["_id"] = ObjectId();
            hashes[k]["links"] = [];

        }

        var n_domains = _.size(links_store);

        var interval_size = _.size(message.get('distinct_fetch_intervals'));
        var completed = 0;
        var done = 0;
        //console.log(that.domain_group,"that.domain_group");
        var domains = [];
        var tmp = message.get('domain_group');

        var sub_group = tmp.splice(0, 1)[0]; //dequeue


        tmp.push(sub_group); //enqueue
        message.set('domain_group', tmp);

        domains = sub_group["domains"];

        //one domain group at a time

        for (var i = 0; i < domains.length; i++) {
            //#debug#console.log(i)
            (function(dd, limit) {

                var ratio = parseInt(config.getConfig("batch_size") / 100);
                var eachh = ratio * dd["priority"];
                var key = dd["_id"];

                var rounds = 0;
                while (rounds !== 2) {
                    for (var k in message.get('distinct_fetch_intervals')) {
                        //creating buckets for all distinct fetch intervals

                        (function(k) {



                            //#debug#console.log("EACHH "+eachh);
                            var pusher = that.pusher;
                            //console.log(key,eachh,k);
                            that.dequeue(key, eachh, k, hashes[k]["_id"], function(l) {
                                hashes[k]["domain_group_id"] = sub_group["_id"];
                                hashes[k]["links"] = hashes[k]["links"].concat(l);
                                ++done;
                                //console.log(hashes, "done ", done, limit);

                                if (done === limit) {
                                    remaining_urls_store = {};
                                    cache_urls = {};
                                    if (check.emptyObject(hashes)) {
                                        message.get('bucket_creator_lock').release();
                                        return;
                                    }
                                    pusher(hashes, function() {
                                        message.get('bucket_creator_lock').release();
                                    });


                                }
                            });


                        })(k);

                    }

                    rounds += 1;
                }

            })(domains[i], domains.length * Object.keys(message.get('distinct_fetch_intervals')).length * 2);

        };







        return;
    };


    this.pusher = function bucketoperation_pusher(hashes, fn) {
        //console.log(JSON.stringify(hashes,null,2));
        //#debug#console.log(that)
        try {
            hashes = score.getScore(hashes);
        } catch (err) {
            console.log(err);
            fn(true);
            return;
        }
        //console.log(hashes)

        //console.log("herere 2");
        if (!check.assigned(hashes)) {
            fn(false);
            return;
        }
        var done = 0;
        var counter = _.size(hashes);
        //console.log("hashes",hashes);
        for (var key in hashes) {
            (function(key) {
                //first links are added to the db to avoid same links
                //console.log(hashes[key], "HASH KEYS");
                pool.addLinksToDB(hashes[key], key, function(numOfLinks) {
                    //uniform pool of urls are generated
                    //console.log("numOfLinks "+numOfLinks+" "+key);
                    if (!check.assigned(numOfLinks) || numOfLinks === 0) {
                        //fn(false);
                        ++done;
                        if (done === counter) {
                            fn(true);
                            return;
                        }
                        return;

                    }
                    var stamp1 = new Date().getTime();
                    var links_to_be_inserted = _.pluck(hashes[key]["links"], 'url');
                    var domain_id = hashes[key]["domain_group_id"];
                    pool.bucket_collection.insert({
                        "_id": hashes[key]["_id"],
                        "links": links_to_be_inserted,
                        "domains": domain_id,
                        "score": hashes[key]["score"],
                        "recrawlLabel": key,
                        "underProcess": false,
                        "insertedBy": config.getConfig("bot_name"),
                        "recrawlAt": stamp1,
                        "numOfLinks": numOfLinks
                    }, function bucketInsert(err, results) {
                        //console.log(arguments);
                        if (err) {
                            msg(("pool.addToPool" + err), "error");
                            //fn(false);
                            //return;
                        } else {
                            msg(("Updated bucket " + results["ops"][0]["_id"]), "success");
                            bot_obj.updateStats("createdBuckets", 1);
                            //fn(true);
                            //return;
                        }
                        ++done;
                        if (done === counter) {
                            fn(true);
                            return;
                        }


                    });
                });
            })(key);


        }


    };




    bucket_timer = setInterval(function() {
        if (!message.get('webappOnly') && message.get('bucket_creator_lock').enter()) {

            that.creator();
        }

    }, 10000);
    message.get('my_timers').push(bucket_timer);

    function msg() {
        if (!check.assigned(message.get('log'))) {
            console.log(arguments[0]);
            return;
        }
        message.get('log').put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};


module.exports = Bucket;