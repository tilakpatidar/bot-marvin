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
var tracker = require(parent_dir + "/lib/server.js");
var Graph = require(parent_dir + "/lib/graph.js");
var child = require('child_process');
var fs = require("fs");


/**
    Manages crawling workers owned by the bot and manages 
    the communication and cordination between workers. 
    @author Tilak Patidar <tilakpatidar@gmail.com>
    @constructor
    @param {Config} config_obj
    @param {Cluster} cluster_obj
    @param {Trigger} trigger_obj
    @param {MongoDB} pool_obj
    @param {Object} bots_obj - Robots.txt parsed data
    @param {Logger} logger_obj

*/
var ChildManager = function(config_obj, cluster_obj, trigger_obj, pool_obj, bots_obj, logger_obj){
    
    var cluster = cluster_obj;
    var config = config_obj;
    var trigger = trigger_obj;
    var childs = config.getConfig("childs"); //childs to spawn
    var batchSize = config.getConfig("batch_size");
    var botObjs = bots_obj; //stores the robots.txt data
    var inlinks_pool = [];
    var first_time = true;
    trigger.set('starter_lock', false);
    trigger.set('begin_intervals', true);
    trigger.set('bot_killer_locked', false);
    var active_childs = 0;
    var pool = pool_obj; //global db object in the entire app
    var spawned = {};
    var bot_spawn_time = {};
    var log = logger_obj;
    var that = this;
    var graph = new Graph(config, log, pool);

    /**
        Responsible for allocating vacant childs 
        This function is run continously in an interval to check and 
        realocate workers.
        @private

    */
    function starter() {
       

        if (trigger.get('starter_lock')) {
            msg("starter locked", "info");
            return;
        }
        trigger.set('starter_lock', true);
        msg("Check if new child available", "info");
        msg(("Current active childs " + active_childs), "info");
        var done = childs - active_childs;
        var old_done = done;
        if (done === 0) {
            trigger.set('starter_lock', false);
            return; //no available childs
        }
        var d = 0;
        while (done !== 0) {


            if (!trigger.get('webappOnly')) {
                nextBatch(function nextBatchStarter() {
                    ++d;
                    //console.log("CALLBACK    ",d,"  done  ",old_done);
                    if (d === old_done) {
                        msg("starter lock released", "success");
                        trigger.set('starter_lock', false);
                    }
                }); //call nextBatch to obtain a new bucket and start a worker
            } else {
                trigger.set('starter_lock', false);
            }
            --done;
        }

    }; //end of starter


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
        pool.getNextBatch(function getNextBatch(err, results, hash, refresh_label) {

            if (first_time) {
                
                trigger.set('bucket_creater_locked', false);
                first_time = false;
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
        if (trigger.get('failed_batch_lock')) {
            return;
        }
        trigger.set('failed_batch_lock', true);
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
                trigger.set('failed_batch_lock', false);
                return;
            }

            if (check.assigned(docs)) {
                if (docs.length === 0) {
                    trigger.set('failed_batch_lock', false);
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
        var args = [bucket_links, bucket_links.length, pool.links_store, botObjs, hash, refresh_label, c[0], c[1], c[2], "failed_queue"];
        //not sending args with child process as char length limitation on bash

        //bot waits for this "init" msg which assigns the details of the task
        try {
            bot.send({
                "init": args
            });
        } catch (err) {

        }



        bot.on('close', function BotCloseFailedQueue(code) {
            //pushing the pool to db
            that.flushInlinks(function() {});
            if (code === 0) {
                msg(('Child process ' + botId + ' exited with code ' + code), "success");
            } else {
                msg(('Child process ' + botId + ' exited with code ' + code), "error");
            }
            trigger.set('failed_batch_lock', false);
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
        var args = [bucket_links, bucket_links.length, pool.links_store, botObjs, hash, refresh_label, c[0], c[1], c[2], "normal"];
        //not sending args with child process as char length limitation on bash

        //bot waits for this "init" msg which assigns the details of the task
        try {
            bot.send({
                "init": args
            });
        } catch (err) {

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
        Kills the child processes which are hung from long time.
        @private
    */
    function botKiller() {
        if (trigger.get('bot_killer_locked')) {
            return;
        }
        trigger.set('bot_killer_locked', true);
        var d = 0;
        var c = Object.keys(bot_spawn_time).length;
        if (c === 0) {
            trigger.set('bot_killer_locked', false);
            return;
        }
        for (var botId in bot_spawn_time) {
            if (botId === "tika") {
                ++d;
                if (d === c) {
                    trigger.set('bot_killer_locked', false);
                    return;
                }
                continue
            }
            (function botKiller_it(botId) {
                var bot = bot_spawn_time[botId];
                if ((new Date().getTime() - bot['spawn_time']) >= config.getConfig('child_timeout')) {
                    msg('Timeout in ' + botId + ' shutting down gracefully', 'error');
                    //console.log(bot,"testbot");
                    if (bot['hash'].indexOf('failed_queue') >= 0) {
                        //failed_queue child process
                        //no need to track just 
                        var rows = [];
                        for (var index in bot['bucket_links']) {
                            var link = bot['bucket_links'][index];
                            var failed_id = parseInt(link['bucket_id'].replace('failed_queue_', '').split('_')[1]);
                            rows.push(failed_id);
                        }
                        if (rows.length === 0) {

                            try {
                                msg('No uncrawled pages found, still shutting ' + botId, 'success');
                                spawned[botId].kill();
                                delete bot_spawn_time[botId];
                                delete spawned[botId]; //delete from our record 
                            } catch (err) {

                            }
                            ++d;
                            if (d === c) {
                                trigger.set('bot_killer_locked', false);
                            }
                            return;
                        }
                        (function(rows) {


                            failed_db.parallelize(function() {
                                failed_db.run("UPDATE q SET status=0 WHERE id IN " + '(' + rows.toString() + ')', [], function uncrawled_found(e, r) {
                                    //console.log(e,r);
                                    try {
                                        msg('uncrawled pages found, and were added to failed_queue - shutting ' + botId, 'success');
                                        spawned[botId].kill();
                                        delete bot_spawn_time[botId];
                                        delete spawned[botId]; //delete from our record 
                                    } catch (err) {

                                    }

                                });
                            });

                        })(rows);
                        ++d;
                        if (d === c) {
                            trigger.set('bot_killer_locked', false);
                        }
                    } else {

                        pool.checkUnCrawled(bot['bucket_links'], function checkUnCrawled(err, links) {
                            //console.log(err,links.length,"testbotlength");
                            //console.log(links);
                            if (links.length === 0) {
                                try {
                                    msg('no uncrawled pages found, still shutting ' + botId, 'success');
                                    active_childs -= 1;
                                    spawned[botId].kill();
                                    delete bot_spawn_time[botId];
                                    delete spawned[botId]; //delete from our record 
                                } catch (e) {

                                }
                                ++d;
                                if (d === c) {
                                    trigger.set('bot_killer_locked', false);
                                }
                            }
                            (function(links) {
                                failed_db.parallelize(function() {
                                    var done = 0;
                                    var count = links.length;
                                    for (var index in links) {
                                        var link = links[index];
                                        (function(link) {
                                            var link_details = JSON.stringify(link);
                                            failed_db.run("INSERT OR IGNORE INTO q(failed_url,failed_info,status,count) VALUES(?,?,0,0)", [link['_id'], link_details], function(err, row) {
                                                pool.batchFinished(link['bucket_id'], link['fetch_interval'], function batchFinished() {

                                                    ++done;
                                                    if (done === count) {
                                                        ++d;
                                                        if (d === c) {
                                                            trigger.set('bot_killer_locked', false);
                                                        }
                                                        try {
                                                            msg('uncrawled pages found, and were added to failed_queue - shutting ' + botId, 'success');
                                                            active_childs -= 1;
                                                            spawned[botId].kill();
                                                            delete bot_spawn_time[botId];
                                                            delete spawned[botId]; //delete from our record 
                                                        } catch (e) {

                                                        }
                                                    }
                                                }, true);
                                            });

                                        })(link);
                                    }
                                });

                            })(links);
                        });


                    }

                } else {
                    ++d;
                    if (d === c) {
                        trigger.set('bot_killer_locked', false);
                    }
                }
            })(botId);
        }
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
                pool.setCrawled(t); //mark as crawled


                break;
            case "addToPool":
                inlinks_pool.push(data["addToPool"]);
                if (inlinks_pool.length > batchSize) {
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
                trigger.set('tikaPID', data["tikaPID"]);
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
        Launches a child process for pdf requests
        @private
    */
    function startTika() {
        if (config.getConfig("tika")) {
            var tika = child.fork(parent_dir + "/tika.js", []);
            msg("Tika server forked", "success");
            var c = config.getGlobals();
            tika.send({
                "init": [c[0], c[1], c[2]]
            });
            spawned["tika"] = tika;
            tika.on("message", childFeedback);
            tika.on('close', function tika_close(code) {
                if (code !== 0) {

                    msg("Tika port occupied maybe an instance is already running ", "error");

                }
            });
        }
    }


    if (!trigger.get('webappOnly')) {
        //starting child process for tika

        startTika();
        var restarter_locked = false;
        var tika_restarter = setInterval(function tika_restarter() {
            if (restarter_locked) {
                return;
            }
            restarter_locked = true;
            if (spawned["tika"]) {
                try {
                    msg("Check if tika server alive", 'info');
                    spawned["tika"].send({
                        "ping": true
                    });
                    msg("Tika server alive", 'success');
                } catch (e) {
                    //could be dead
                    //restart
                    msg("Tika server could be dead", 'error');
                    try {
                        spawned["tika"].kill();
                    } catch (ee) {

                    } finally {
                        process.nextTick(startTika);
                    }

                }

            }
            restarter_locked = false;
        }, 20000);
        var a = setInterval(starter, 2000);
        var b = setInterval(nextFailedBatch, 15000);
        //var c1 = setInterval(botKiller,config.getConfig('child_timeout'));
        trigger.set('my_timers', trigger.get('my_timers').concat([a, b, tika_restarter]));

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

        return trigger.get('starter_lock');
    };

    /**
        Locks or unlocks the interval running starter function.
        @param {boolean} state - true/false the lock
    */
    this.setManagerLocked = function setManagerLocked(state) {
        return trigger.set('starter_lock', state);
    };


    /**
        In case of clean up,flushInlinks into the db.
        @public
        @param {Function} fn - callback
    */
    this.flushInlinks = function flushInlinks(fn) {

        var k = inlinks_pool;
        inlinks_pool = [];
        //console.log(k);
        return pool.addToPool(k, fn);

    };

    /**
        Flushes all inlinks in the cache
        @public
        @param {Function} fn - callback
    */
    this.flushAllInlinks = function flushInlinks(fn) {
            return pool.addToPool(inlinks_pool, fn);
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
        pool.failed_db.update({"status": 1}, {"status": 0}, function() {
           
            pool.tika_queue.update({"status": 1}, {"status": 0}, function() {
                 
                for (var key in spawned) {
                    spawned[key].kill(); //kill the childs before exit
                }
                return fn();
            });
        });





    };

    
    /**
        Used to call Logger object with the caller function name.
        @private
    */
    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};









module.exports = ChildManager;

