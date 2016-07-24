/*
Child_manager.js
@author Tilak Patidar



	*starter_lock
	*locks the starter to avoid running 
	*the same function due to setInterval 
	*when old starter instance has not finished

	*active_childs
	keep the count of current active_childs
*/
var parent_dir = process.getAbsolutePath(__dirname);
var _ = require("underscore");
var check = require("check-types");
var Server = require(parent_dir + "/lib/server.js");
var Graph = require(parent_dir + "/lib/graph.js");
var child = require('child_process');
var fs = require("fs");
var ObjectId = require('mongodb').ObjectId;
var proxy_cache_class = require(parent_dir + '/lib/bucket_proxy.js');
var Lock = require(parent_dir + '/lib/lock.js');
var RSSFetcher = require(parent_dir + '/lib/rss.js');
var URL = require(parent_dir + "/lib/url.js");
var proto = require(parent_dir + '/lib/proto.js');
var JSONX = proto.JSONX;
var ObjectX = proto.ObjectX;
var BloomFilter = require('bloomfilter').BloomFilter;


/**
    Manages workers owned by the bot and manages 
    the communication and cordination between workers. 
    @author Tilak Patidar <tilakpatidar@gmail.com>
    @constructor
    @param {Message} message_obj

*/
var ChildManager = function(message_obj) {
    var message = message_obj;
    var cluster = message.get('cluster');
    var config = message.get('config');
    var childs = config.getConfig("childs"); //childs to spawn
    var batchSize = config.getConfig("batch_size");
    var botObjs = message.get('botsObj'); //stores the robots.txt data


    /**

        Bloom filter is used to reduce duplicate error from db for url seen test.
        n = 10000000 no of urls expecting => 10lakhs
        m = 100000000 size of bloom filter in bits => 11mb
        k = (n/m) ln(2) number of hash function to use 6.97 ~= 7

        http://prakhar.me/articles/bloom-filters-for-dummies/

        t = n (bits in the array are the targets)
        d = k x (n/10) (outputs from the hash functions are the darts)
        P(no dart hits the target) = e^(-d/t)
        Hence the density of 0s in the bit array = e^(-d/t) or density of 1s in the bit array = 1 - e^(-d/t)

        The probability of a false positive = Probablity of all k hash functions to a index that has 1 in the bit array = ( 1 - e^(-d/t) )^5

        Probablity of false positives for this bloom filter is 0.008193722065862401
    */

    var bloom = new BloomFilter(
          100000000, // number of bits to allocate. //11 mb
          7        // number of hash functions.
    );


    message.set('inlinks_pool', []);

    var first_time_lock = new Lock();
    /**
        Used as a queue, so that different domain group buckets are fetched from db for crawling.
        @private
    */
    var prev_domain_grp = [];


    message.set('begin_intervals', true);
    var active_childs = 0;
    var pool = message.get('pool'); //global db object in the entire app
    var spawned = {};
    var bot_spawn_time = {};
    var log = message.get('log');
    var bot_obj = message.get('bot');
    var that = this;
    var graph = new Graph(message);
    var server = new Server(message);
    server.start();
    URL = new URL(message);
    var rss_fetcher_obj = new RSSFetcher(message);

    /**
        Responsible for allocating vacant childs 
        This function is run continously in an interval to check and 
        realocate workers.
        @private

    */
    function starter() {


        if (!message.get('starter_lock').enter()) {
            msg("starter locked", "info");
            return;
        }

        msg("Check if new child available", "info");
        msg(("Current active childs " + active_childs), "info");
        var done = childs - active_childs;
        var old_done = done;
        if (done === 0) {
            message.get('starter_lock').release();
            return; //no available childs
        }
        var d = 0;
        while (done !== 0) {


            if (!message.get('webappOnly')) {
                nextBatch(function nextBatchStarter() {
                    ++d;
                    //console.log("CALLBACK    ",d,"  done  ",old_done);
                    if (d === old_done) {
                        msg("starter lock released", "success");
                        message.get('starter_lock').release();
                    }
                }); //call nextBatch to obtain a new bucket and start a worker
            } else {
                message.get('starter_lock').release();
            }
            --done;
        }

    }; //end of starter


    var first_clone = true;
    var getNextBatch = function getNextBatch(result, batchSize) {

        if (first_clone) {
            prev_domain_grp = ObjectX.clone(message.get('alloted_domain_groups'));
            first_clone = false;
        }

        var grp = prev_domain_grp.splice(0, 1)[0];
        prev_domain_grp.push(grp);
        //console.log(grp);
        var stamp1 = new Date().getTime();
        pool.bucket_collection.findAndModify({
            "domains": {
                "$in": [grp]
            },
            "underProcess": false,
            "recrawlAt": {
                $lte: stamp1
            }
        }, [
            ['recrawlAt', 1],
            ['score', 1]
        ], {
            "$set": {
                "underProcess": true,
                "processingBot": config.getConfig("bot_name")
            }
        }, {
            "remove": false
        }, function getNextBatchFM(err1, object) {
            //console.log(object,err1)

            if (check.assigned(object) && check.assigned(object.value)) {
                var hash = object["value"]["_id"];
                //console.log(hash);
                var refresh_label = object["value"]["recrawlLabel"];
                pool.mongodb_collection.find({
                    "bucket_id": hash,
                    "abandoned": {
                        "$exists": false
                    }
                }, {}, {}).toArray(function getNextBatchFind(err, docs) {
                    //console.log(err,docs);
                    if (!check.assigned(err) && docs.length === 0) {

                        //we got empty bucket remove it 
                        //every time seed bucket is readded if seeds are already added
                        //this could lead to empty bucket
                        //remove it if you encouter an empty bucket

                        //fixed from seed but still removing any empty bucket

                        pool.bucket_collection.removeOne({
                            "_id": ObjectId(hash)
                        }, function() {

                            msg("empty bucket removed ", 'success');
                        });
                    }
                    if (err) {

                        msg("getNextBatch", "error");
                        result(null, [], null, null);
                        return;
                    } else {
                        bot_obj.updateStats("processedBuckets", 1);
                        //#debug#console.log(docs);
                        msg(("Got " + docs.length + " for next Batch"), "success");
                        result(err, docs, (hash + ""), refresh_label);
                    }


                });
            } else {
                result(null, [], null);
                return;
            }
        });



    };

    /**
        Called by starter to fetch next batch from db.
        @private
        @param {Function} fn - callback
    */
    function nextBatch(fn) {
        active_childs += 1;
        /*

            encapsulated function which checks for an available 
            bucket and starts a new worker
        */
        getNextBatch(function getNextBatch(err, results, hash, refresh_label) {

            if (first_time_lock.enter()) {

                message.get('bucket_creator_lock').release();
                //will unlock the bucker_creator for first time
            }

            if (results.length !== 0 && check.assigned(hash)) {
                //if bucket is not empty 

                msg("Got bucket " + hash, "info");
                createChild(results, hash, refresh_label);
            } else {
                active_childs -= 1;
                //inlinks_pool into db as childs are available but no buckets
                that.flushInlinks(function() {});
            }
            fn();

        }, batchSize);
    }


    /**
        Fetches a batch from failed queue.
        @private
    */
    function nextFailedBatch() {
        if (!message.get('failed_batch_lock').enter()) {
            return;
        }


        var li = [];
        pool.failed_db.find({
            "status": 0,
            "count": {
                "$lt": config.getConfig("retry_times_failed_pages")
            }
        }, {
            "limit": config.getConfig('failed_queue_size')
        }).toArray(function(err, docs) {
            //console.log(err,docs);
            if (check.assigned(err)) {
                message.get('failed_batch_lock').release();
                return;
            }

            if (check.assigned(docs)) {
                if (docs.length === 0) {
                    message.get('failed_batch_lock').release();
                    return;
                }
                var ids = _.pluck(docs, '_id');
                var idss = [];
                for (var i in ids) {
                    idss.push(ids[i].toString());
                }
                //console.log(idss,"############################## IDS");
                pool.failed_db.update({
                    "_id": {
                        "$in": idss
                    }
                }, {
                    "$set": {
                        "status": 1
                    }
                }, function(e, r) {
                    //console.log(e,r,"updateeeeeeddeed #########################");
                    for (var index in docs) {
                        var doc = docs[index];
                        doc["failed_info"]['bucket_id'] = 'failed_queue_' + doc["failed_info"]['bucket_id'] + '_' + doc["_id"] + '_' + doc["count"];
                        li.push(doc["failed_info"]);
                    }
                    //console.log(li);
                    createChild_for_failed_queue(li, 'failed_queue', 'failed_queue'); // sending failed_queue string instead of bucket hash
                });
            }


        });



    }


    /**
        
        Spawns a new child process for the failed queue.
        @private
        @param {Object} bucket_links - Fetched batch by getNextBatch
        @param {String} hash - Batch hash id
        @param {String} refresh_label - Fetch Interval of the batch

    */
    function createChild_for_failed_queue(bucket_links, hash, refresh_label) {
        msg('Starting failed_queue', 'info');
        var botId = new Date().getTime() + "" + parseInt(Math.random() * 10000); //generate a random bot id
        var bot = child.fork(parent_dir + "/spawn.js", []);
        spawned[botId] = bot; //saving child process for killing later in case of cleanup
        bot_spawn_time[botId] = {
            'bot': bot,
            'spawn_time': new Date().getTime(),
            'bucket_links': bucket_links,
            'hash': hash
        };
        msg('Child process started ' + botId, "success");
        var c = config.getGlobals(); // tuple of config,overriden_config,db_config
        var args = [bucket_links, bucket_links.length, message.get('links_store'), botObjs, hash, refresh_label, c[0], c[1], c[2], "failed_queue"];
        //not sending args with child process as char length limitation on bash

        //bot waits for this "init" msg which assigns the details of the task
        try {
            bot.send({
                "init": args
            });
        } catch (err) {
            console.log(err);
        }



        bot.on('close', function BotCloseFailedQueue(code) {
            //pushing the pool to db
            that.flushInlinks(function() {});
            if (code === 0) {
                msg(('Child process ' + botId + ' exited with code ' + code), "success");
            } else {
                msg(('Child process ' + botId + ' exited with code ' + code), "error");
            }
            message.get('failed_batch_lock').release();
            delete bot_spawn_time[botId];
            delete spawned[botId]; //delete from our record
            nextFailedBatch();

        });

        bot.on("message", childFeedback);
    }


    /**
        
        Spawns a new child process for the normal queue.
        @private
        @param {Object} bucket_links - Fetched batch by getNextBatch
        @param {String} hash - Batch hash id
        @param {String} refresh_label - Fetch Interval of the batch

    */
    function createChild(bucket_links, hash, refresh_label) {


        var botId = new Date().getTime() + "" + parseInt(Math.random() * 10000); //generate a random bot id
        var bot = child.fork(parent_dir + "/spawn.js", []);
        spawned[botId] = bot; //saving child process for killing later in case of cleanup
        bot_spawn_time[botId] = {
            'bot': bot,
            'spawn_time': new Date().getTime(),
            'bucket_links': bucket_links,
            'hash': hash
        };
        msg('Child process started ' + botId, "success");
        var c = config.getGlobals(); // tuple of config,overriden_config,db_config
        var args = [bucket_links, bucket_links.length, message.get('links_store'), botObjs, hash, refresh_label, c[0], c[1], c[2], "normal"];
        //not sending args with child process as char length limitation on bash

        //bot waits for this "init" msg which assigns the details of the task
        try {
            bot.send({
                "init": args
            });
        } catch (err) {
            console.log(err);
        }



        bot.on('close', function botClose(code) {
            //pushing the pool to db
            that.flushInlinks(function() {});

            if (code === 0) {
                msg(('Child process ' + botId + ' exited with code ' + code), "success");
            } else {
                msg(('Child process ' + botId + ' exited with code ' + code), "error");
            }


            active_childs -= 1;
            delete bot_spawn_time[botId];
            delete spawned[botId]; //delete from our record 
            starter();

        });

        bot.on("message", childFeedback);

    }




    /**
        Recieves message from all the workers.
        @private
        @param {Object} data - {"bot": "spawn", "insertRssFeed": [link.details.url, feeds]}
    */
    function childFeedback(data) {
        var sender = data["bot"];
        var l = Object.keys(data).join(" ").replace("bot", "").trim();
        switch (l) {
            case "insertTikaQueue":
                //console.log("recieved",sender);
                if (sender === "spawn") {
                    var d = data["insertTikaQueue"];
                    //console.log(d);
                    pool.insertTikaQueue(d);
                }
                break;
            case "insertRssFeed":
                var d = data["insertRssFeed"];
                pool.insertRssFeed(d);
                break;
            case "insertAuthor":
                var d = data["insertAuthor"];
                pool.insertAuthor(d);
                break;
            case "setCrawled":
                var t = data["setCrawled"];
                //console.log(t)
                that.setCrawled(t); //mark as crawled


                break;
            case "addToPool":
                
                

                var u = data["addToPool"][0];

                if(!bloom.test(u)){
                    bloom.add(u);
                    message.get('inlinks_pool').push(data["addToPool"]);
                }else{
                    console.log(u, "  found in bloom filter");
                }

                


                if (message.get('inlinks_pool').length > batchSize) {
                    that.flushInlinks(function() {

                    });
                }

                break;
            case "finishedBatch":
                var g = data["finishedBatch"];
                if (g[2] === "failed_queue") { //bot type failed queue
                    break; //ignore
                }
                pool.batchFinished(g[0], g[1], function() {}, true); //set batch finished
                break;
            case "tikaPID":
                message.set('tikaPID', data["tikaPID"]);
                //log the pid so that if bot is started again it can kill a old instance of tika server
                fs.writeFileSync(parent_dir + "/db/pids/tikaPID.txt", data["tikaPID"] + "");
                break;
            case "graph":
                var url = data["graph"][0];
                var parent = data["graph"][1];
                graph.insert(url, parent);
                break;

        }

    }

    /**
        Fetches rss files and updates links from it.
        Rss file links are provided from the rss collection of crawler.
        This function is run in a setInterval.
        @private
    */

    function rss_links_updator() {

        if (!message.get("rss_updator_lock").enter()) {
            return;
        }

        try {
            pool.rss_feeds.findOne({
                "nextRefresh": {
                    "$lt": new Date().getTime()
                }
            }, function(err, doc) {

                if (check.assigned(err) || !check.assigned(doc)) {
                    message.get("rss_updator_lock").release();
                    return;
                }

                
                rss_fetcher_obj.getLinks(doc["_id"], function(li) {

                    pool.rss_feeds.updateOne({
                        "_id": doc["_id"]
                    }, {
                        "$set": {
                            "nextRefresh": new Date().getTime() + 86400000
                        }
                    }, function() {

                        var l = [];

                        for (var index in li) {
                            var item = li[index];
                            var url = URL.url(item);
                            if (url.isAccepted()) {
                                var format = [];
                                format.push(url.details.url);
                                format.push(url.details.domain);
                                format.push(doc["_id"]);
                                l.push(format);
                            }
                        }


                        message.set('inlinks_pool', message.get('inlinks_pool').concat(l));

                        msg("links " + l.length + " obtained from rss " + doc["_id"], "success");
                        message.get("rss_updator_lock").release();

                    });
                });
            });
        } catch (e) {
            console.log(e, "rss_links_updator");
            message.get("rss_updator_lock").release();
        }


    }

    /**
        Launches a child process for pdf requests
        @private
    */
    function startTika() {
        if (config.getConfig("tika")) {
            var tika = child.fork(parent_dir + "/tika.js", []);
            msg("Tika server forked", "success");
            var c = config.getGlobals();
            tika.send({
                "init": [c[0], c[1], c[2], message.get('links_store')]
            });
            spawned["tika"] = tika;
            tika.on("message", childFeedback);
            tika.on("error", function() {
                console.log(arguments);
            });
            tika.on('close', function tika_close(code) {
                if (code !== 0) {

                    msg("Tika port occupied maybe an instance is already running ", "error");

                }
            });
        }
    }


    if (!message.get('webappOnly')) {
        //starting child process for tika

        startTika();
        var restarter_locked = new Lock();
        var tika_restarter = setInterval(function tika_restarter() {
            if (!restarter_locked.enter()) {
                return;
            }

            if (spawned["tika"]) {
                try {
                    msg("Check if tika server alive", 'info');
                    spawned["tika"].send({
                        "ping": true
                    });
                    msg("Tika server alive", 'success');
                } catch (e) {
                    console.log(e);
                    //could be dead
                    //restart
                    msg("Tika server could be dead", 'error');
                    try {
                        spawned["tika"].kill();
                    } catch (ee) {
                        console.log(ee);
                    } finally {
                        process.nextTick(startTika);
                    }

                }

            }
            restarter_locked.release();
        }, 20000);
        var a = setInterval(starter, 2000);
        var b = setInterval(nextFailedBatch, 15000);
        var rss = setInterval(rss_links_updator, 1000);
        //var c1 = setInterval(botKiller,config.getConfig('child_timeout'));
        message.set('my_timers', message.get('my_timers').concat([a, b, tika_restarter]));

    }


    /**
        Get the number of active childs in the manager
        @public
    */
    this.getActiveChilds = function getActiveChilds() {

        return active_childs;
    };

    /**
        Returns the state of the starter function
        @public
    */
    this.isManagerLocked = function isManagerLocked() {

        return message.get('starter_lock').isLocked();
    };

    /**
        Locks or unlocks the interval running starter function.
        @param {boolean} state - true/false the lock
    */
    this.setManagerLocked = function setManagerLocked(state) {
        return message.get('starter_lock').setLocked(state);
    };


    /**
        In case of clean up,flushInlinks into the db.
        @public
        @param {Function} fn - callback
    */
    this.flushInlinks = function flushInlinks(fn) {
        if (!check.assigned(fn)) {
            fn = () => {};
        }
        var li = message.get('inlinks_pool');
        message.set('inlinks_pool', []);


        if (li.length === 0) {
            //buckets with empty links will not be inserted
            fn(false);
            return;
        }

        var inserted_docs = [];
        for (var i = 0; i < li.length; i++) {
            //inserting new links in cache
            var domain = li[i][1];
            var url = li[i][0];
            var parent = li[i][2];
            var refresh_time;
            try {
                if (check.assigned(li[i][3])) {
                    refresh_time = li[i][3];
                } else {
                    refresh_time = message.get('links_store')[domain]["fetch_interval"];
                }
            } catch (err) {
                //console.log(err, domain);
                //refresh time not found in seed list, maybe other domain links from rss module
                continue;
            }

            if (!check.assigned(refresh_time)) {
                refresh_time = config.getConfig("default_recrawl_interval");
            }




            var unique_id = ObjectId();
            var level = url.replace('http://', '').split('/').length;
            var md5 = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            var doc = {
                '_id': unique_id,
                "url": url,
                "bucketed": false,
                "partitionedBy": config.getConfig('bot_name'),
                "domain": domain,
                "parent": parent,
                "data": "",
                "bucket_id": null,
                "fetch_interval": refresh_time,
                "level": level,
                "md5": md5
            };
            inserted_docs.push(doc);




        };

        if (inserted_docs.length === 0) {

            return fn();
        }

        pool.mongodb_collection.insertMany(inserted_docs, {
            ordered: false
        }, function insertLinksMany(err, doc) {
            //console.log(arguments);
            //console.log(err);
            if (check.assigned(err)) {

                msg("error in insertMany, may be some duplicate urls discovered", "error");

            } else {

                msg("Inlinks flushed in db", "success");

            }
            fn();


        });



    };


    this.setCrawled = function setCrawled(link_details, fn) {
        if (!check.assigned(fn)) {
            fn = function() {};
        }

        var url = link_details.url;
        var urlID = link_details.urlID;
        var data = link_details.parsed_content;
        var status = link_details.status_code;
        //console.log("############# RESPONSE STATUS ########### ",status);
        var stamp1 = new Date().getTime();
        var redirect_url = link_details.redirect;
        var response_time = link_details.response_time;
        var canonical_url = link_details.canonical_url;
        var alternate_urls = link_details.alternate_urls;
        var header_content_type = link_details.header_content_type;
        var md5 = link_details.content_md5;
        //console.log(link_details,"############FOR UPDATE#############");
        if (!check.assigned(data)) {

            data = "";
        }
        //#debug#console.log(status)
        if (!check.assigned(status)) {
            status = "0"; //no error
        }

        var add_docs = [];

        var dict = {
            "bucketed": true,
            "url": url,
            "data": data,
            "response": status,
            "lastModified": stamp1,
            "updatedBy": config.getConfig("bot_name")
        };
        var from_failed_queue = false;
        var abandoned = false;
        var failed_count = 0;
        var failed_id = 0;

        if (check.assigned(md5)) {
            dict["md5"] = md5;
        }

        if (check.assigned(header_content_type)) {
            dict["header_content_type"] = header_content_type;
        }

        if (check.assigned(alternate_urls) && !check.emptyObject(alternate_urls)) {
            dict["alternate_urls_lang"] = alternate_urls;

        }


        if (check.assigned(response_time)) {

            dict["response_time"] = response_time;
        }


        if (check.assigned(link_details.bucket_id) && !link_details['normal_queue']) {

            from_failed_queue = true;
            failed_count = parseInt(link_details.bucket_id.replace('failed_queue_', '').split('_').pop()) + 1;
            failed_id = parseInt(link_details.bucket_id.replace('failed_queue_', '').split('_')[1]);
            //console.log(link_details.url+' from failed_queue',failed_id,'\t',failed_count);
        }


        if (data === "" || status === 'ETIMEDOUT_CALLBACK' || status === 'ETIMEDOUT_CONNECTION' || status === 'ETIMEDOUT_READ' || status === -1) {
            //if 4xx or 5XX series status code then add to failed queue
            if (from_failed_queue) {
                //then check the count
                if (failed_count >= config.getConfig("retry_times_failed_pages")) {
                    dict["abandoned"] = true;
                    abandoned = true;
                    //if so mark abandoned and delete from queue
                    (function(failed_id, url) {
                        /*
                        failed_db.parallelize(function() {
                            failed_db.run("DELETE FROM q WHERE id=?",[failed_id],function delete_from_failed_queue(e,r){
                                    
                                    
                                    //console.log(e,failed_id,'marked abandoned');
                                    msg('Deleted from failed queue and abandoned'+url,'info');

                            });
                        });
                        */
                        pool.failed_db.removeOne({
                            "_id": failed_id
                        }, function delete_from_failed_queue(e, r) {
                            //console.log(e,failed_id,'marked abandoned');
                            msg('Deleted from failed queue and abandoned' + url, 'info');

                        })
                    })(failed_id, link_details.url);

                } else {
                    //inc by one and status = 0
                    (function(url, failed_id) {

                        /*
                            failed_db.parallelize(function() {
                                failed_db.run("UPDATE q SET count = count+1, status=0 WHERE id=?",[failed_id],function failed_retry_pushed(e,r){
                                    //console.log('counter increased ',failed_id);
                                    msg('Pushed again to retry in failed queue '+url,'info');
                                }); 
                            });
                        */
                        pool.failed_db.updateOne({
                            "_id": failed_id
                        }, {
                            "$set": {
                                "status": 0
                            },
                            "$inc": {
                                "count": 1
                            }
                        }, function failed_retry_pushed(e, r) {
                            //console.log('counter increased ',failed_id);
                            msg('Pushed again to retry in failed queue ' + url, 'info');
                        });

                    })(link_details.url, failed_id);

                }
            } else {

                dict['abandoned'] = false;
                (function(link_details) {
                    /*
                    failed_db.parallelize(function() {
                        failed_db.run("INSERT OR IGNORE INTO q(failed_url,failed_info,status,count) VALUES(?,?,0,0)",[link_details.url,JSON.stringify(link_details)],function insertFailed(err,row){
                            //console.log(err,row);
                            msg("Inserted failed url "+link_details.url+" into failed queue", 'success');
                        });
                    });
                    */
                    pool.failed_db.insert({
                        "failed_url": link_details.url,
                        "failed_info": link_details,
                        "status": 0,
                        "count": 0
                    }, function insertFailed(err, row) {
                        //console.log(err,row);
                        msg("Inserted failed url " + link_details.url + " into failed queue", 'success');
                    });
                })(link_details);
                return fn();
            }
        } else if ((status + "").indexOf("EMPTY_RESPONSE") >= 0) {
            //do not retry reject 
            dict["abandoned"] = true;
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            abandoned = true;
            delete dict["response_time"];

            //if so mark abandoned 
            bot_obj.updateStats("failedPages", 1);
            msg('Abandoned due to empty response ' + url, 'info');
        } else if (status === "MimeTypeRejected") {
            //do not retry reject 
            dict["abandoned"] = true;
            abandoned = true;
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            delete dict["response_time"];

            //if so mark abandoned 
            bot_obj.updateStats("failedPages", 1);
            msg('Abandoned due to mime type rejection ' + url, 'info');
        } else if ((status + "").indexOf("NOINDEX") >= 0) {
            //do not retry reject 
            dict["abandoned"] = true;
            abandoned = true;
            delete dict["response_time"];
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            //if so mark abandoned 
            bot_obj.updateStats("failedPages", 1);
            msg('Abandoned due to no INDEX from meta ' + url, 'info');
        } else if (status === "ContentTypeRejected") {
            //do not retry reject 
            dict["abandoned"] = true;
            abandoned = true;
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            delete dict["response_time"];
            //if so mark abandoned 
            bot_obj.updateStats("failedPages", 1);
            msg('Abandoned due to content type rejection ' + url, 'info');
        } else if (status === "ContentLangRejected") {
            //do not retry reject 
            dict["abandoned"] = true;
            abandoned = true;
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            delete dict["response_time"];
            //if so mark abandoned 
            bot_obj.updateStats("failedPages", 1);
            msg('Abandoned due to content lang rejection ' + url, 'info');
        } else {

            //link is from failed_queue and is successfull now
            if (from_failed_queue) {
                (function(url, failed_id) {
                    /*
                        failed_db.parallelize(function() {
                            failed_db.run("DELETE FROM q WHERE id=?",[failed_id],function failed_success(err,row){
                                
                                msg(url+' from failed_queue is successfull now','info');
                            });

                        });
                    */
                    pool.failed_db.removeOne({
                        "_id": failed_id
                    }, function failed_success(err, row) {

                        msg(url + ' from failed_queue is successfull now', 'info');
                    });

                })(link_details.url, failed_id);
            }


            dict["crawled"] = true; //final marker for crawled page



        }


        if (check.assigned(redirect_url)) {
            dict["redirect_url"] = redirect_url;
        }
        //console.log(dict);

        if (check.assigned(canonical_url) && canonical_url !== url) {
            //if both urls are same then no need to mark abandoned

            //if we are getting canonical_url val this means page was successfull and was parsed
            var new_dict = JSON.parse(JSON.stringify(dict));
            delete dict["crawled"]; //remove crawled marker
            dict["md5"] = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
            new_dict['url'] = canonical_url;
            new_dict["alternate_urls"] = [url];
            new_dict["bucket_id"] = link_details.bucket_id;
            pool.mongodb_collection.findOne({
                "url": canonical_url
            }, function(err, doc) {
                //console.log("Find canonical_url ",err,doc," find canonical_url");
                if (check.assigned(err) || !check.assigned(doc)) {
                    //canonical url not present
                    //  console.log("canonical not present");
                    pool.mongodb_collection.insert(new_dict, function(err1, res1) {
                        //  console.log(arguments);
                        //insert the new canonical url in the same bucket
                        //console.log("Insert canonical_url ",err1,res1," insert canonical_url");

                    });
                } else {
                    //url already present update it
                    var aul = [];
                    if (check.assigned(alternate_urls) && !check.emptyObject(alternate_urls)) {
                        aul = alternate_urls;
                    }
                    pool.mongodb_collection.updateOne({
                        "_id": doc["_id"]
                    }, {
                        "$push": {
                            "alternate_urls": url
                        },
                        "$pushAll": {
                            "alternate_urls_lang": alternate_urls
                        }
                    }, function(e, r) {
                        //  console.log("update canonical_url ",e,r," update canonical_url");


                    });
                }
            });


            //now changes to this page
            dict["data"] = "";
            dict["abandoned"] = true;
            abandoned = true;
            dict["response"] = dict["response"] + "_CANONICAL_PAGE_EXISTS";
            dict["canonical_url"] = canonical_url;
        }

        //console.log(dict);
        try {
            var html_data = link_details.content;
        } catch (err) {
            var html_data = "";
        }
        try {
            delete dict['data']['_source']['html'];

        } catch (err) {

        }

        pool.mongodb_collection.updateOne({
            "_id": ObjectId(urlID)
        }, {
            $set: dict
        }, function updateDoc(err, results) {

            if (err) {
                if (err.code === 11000) {
                    if (err.errmsg.indexOf("$md5_1 dup key") >= 0) {

                        if (link_details.status_code === 404) {
                            bot_obj.updateStats("failedPages", 1);
                            msg("Duplicate page found but 404 thus skipping .", 'info');
                            dict["abandoned"] = true;
                            delete dict["crawled"];
                            delete dict["data"];
                            dict["response"] = "404_SAME_MD5_PAGE_EXISTS";
                            dict["md5"] = md5 + "md5#random#" + parseInt(Math.random() * 10000) + "" + parseInt(new Date().getTime());
                            pool.mongodb_collection.updateOne({
                                "_id": ObjectId(urlID)
                            }, {
                                $set: dict
                            }, function(err, results) {

                            });
                        } else {
                            msg("Duplicate page found", "info");
                            //a similar page exists
                            //then update this link into it and abondon this by setting a canonial link

                            pool.mongodb_collection.updateOne({
                                "md5": md5
                            }, {
                                "$push": {
                                    "alternate_urls": url
                                },
                                "$pushAll": {
                                    "alternate_urls_lang": alternate_urls
                                }
                            }, function(e, r) {
                                //  console.log("update canonical_url ",e,r," update canonical_url");


                            });
                            bot_obj.updateStats("failedPages", 1);
                            dict["abandoned"] = true;
                            delete dict["crawled"];
                            delete dict["data"];
                            dict["response"] = "SAME_MD5_PAGE_EXISTS";
                            dict["md5"] = md5 + "md5#random#" + parseInt(Math.random() * 10000) + "" + parseInt(new Date().getTime());
                            pool.mongodb_collection.updateOne({
                                "_id": ObjectId(urlID)
                            }, {
                                $set: dict
                            }, function(err, results) {

                            });
                        }

                    }
                } else {
                    msg("pool.setCrawled", "error");
                }

            } else {
                if (!abandoned && dict["response"] !== "inTikaQueue") {
                    //console.log(html_data, typeof html_data);
                    if (typeof html_data !== 'string') {
                        //this is the case due to some errors
                        //in this case skip the page
                        html_data = "";
                    }


                    //var crypto = require('crypto');
                    //var md5sum = crypto.createHash('md5');
                    //md5sum.update(html_data);
                    //var hash = md5sum.digest('hex');
                    //console.log(ObjectId(urlID), "   ", hash);

                    if (html_data.length !== 0) {

                        var gridStore = new pool.GridStore(pool.db, ObjectId(urlID), ObjectId(urlID) + "_data.html", "w");
                        gridStore.open(function(err, gridStore) {
                            gridStore.write(html_data, function(err, gridStore) {
                                gridStore.close(function(err, fileData) {
                                    bot_obj.updateStats("crawledPages", 1);
                                    msg(("Updated " + url), "success");
                                });
                            });
                        });

                    } else {
                        bot_obj.updateStats("crawledPages", 1);
                        msg(("Updated " + url), "success");
                    }

                }
                if (abandoned) {
                    bot_obj.updateStats("failedPages", 1);
                }


            }

        });
        return fn();
    };
    /**
        Kill the workers spawned by the child manager.
        @public
        @param {Function} fn - callback
    */
    this.killWorkers = function killWorker(fn) {
        /*
            Kill all the workers before clean up
        */
        pool.failed_db.update({
            "status": 1
        }, {
            "status": 0
        }, function() {

            pool.tika_queue.update({
                "status": 1
            }, {
                "status": 0
            }, function() {

                for (var key in spawned) {
                    spawned[key].kill(); //kill the childs before exit
                }
                return fn();
            });
        });





    };

    function indexTikaDocs() {
        try {


            if (!message.get("tika_indexer_busy").enter()) {
                return;
            }

            pool.tika_f_queue.find({}, {
                limit: 100
            }).toArray(function(err, docs) {

                if (!check.assigned(err) && check.assigned(docs) && docs.length !== 0) {

                    var done = 0;

                    for (var index in docs) {

                        try {
                            var doc = docs[index];
                            (function(doc) {

                                fs.readFile(doc["content"], function(err, data) {
                                    //if file is not written yet to the cache race condition
                                    //console.log(arguments);
                                    if (!check.assigned(data) || check.assigned(err)) {
                                        ++done;
                                        if (done === docs.length) {
                                            message.get("tika_indexer_busy").release();
                                        }

                                        return;

                                    }


                                    try {
                                        var link_details = JSON.parse(data.toString());
                                    } catch (ee) {
                                        //console.log(ee);
                                        return pool.mongodb_collection.updateOne({
                                            "_id": ObjectId(doc["urlID"])
                                        }, {
                                            $set: {
                                                "response": "JSON_PARSE_ERROR",
                                                "abandoned": true,
                                                "crawled": false
                                            }
                                        }, function FailedTikaUpdateDoc(err, results) {
                                            pool.tika_f_queue.remove({
                                                _id: doc["_id"]
                                            }, function(e, d) {
                                                //console.log(e,d,2);
                                                fs.unlink(doc["content"], function tika_doc_indexer() {

                                                    msg("Tika doc parse error " + doc["urlID"], "error");
                                                    bot_obj.updateStats("failedPages", 1);
                                                    ++done;
                                                    if (done === docs.length) {
                                                        message.get("tika_indexer_busy").release();
                                                    }

                                                });


                                            });

                                        });
                                    }

                                    that.setCrawled(link_details, function() {
                                        pool.tika_f_queue.remove({
                                            _id: doc["_id"]
                                        }, function(e, d) {
                                            //console.log(e,d,2);
                                            fs.unlink(doc["content"], function tika_doc_indexer() {

                                                msg('Tika doc indexed', 'success');
                                                ++done;
                                                if (done === docs.length) {
                                                    message.get("tika_indexer_busy").release();
                                                    return;
                                                }
                                            });


                                        });

                                    });
                                });
                            })(doc);
                        } catch (ee) {
                            ++done;
                            if (done === docs.length) {
                                message.get("tika_indexer_busy").release();
                                return;
                            }
                        }

                    }
                } else {
                    message.get("tika_indexer_busy").release();
                    return;
                }






            });
        } catch (errr) {
            console.log(errr, "err");
            message.get("tika_indexer_busy").release();
        }
    }




    var pool_check_mode = setInterval(function() {
        if (!message.get('tika_setup') && message.get('begin_intervals')) {

            clearInterval(pool_check_mode); //once intervals are set clear the main interval

            if (!message.get('webappOnly')) {
                var tika_indexer = setInterval(indexTikaDocs, 1000);
                message.get('my_timers').push(tika_indexer);
            }
        }
    }, 5000);
    /**
        Used to call Logger object with the caller function name.
        @private
    */
    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};









module.exports = ChildManager;