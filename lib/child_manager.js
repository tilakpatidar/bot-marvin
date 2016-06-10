/*
Child_manager.js
@author Tilak Patidar

Manages crawling workers owned by the bot and manages 
the communication and cordination between workers. 

	*starter_lock
	*locks the starter to avoid running 
	*the same function due to setInterval 
	*when old starter instance has not finished

	*active_childs
	keep the count of current active_childs
*/
var parent_dir = process.getAbsolutePath(__dirname);
var config = process.bot_config;
var log = require(parent_dir + "/lib/logger.js");
var childs = config.getConfig("childs"); //childs to spawn
var batchSize = config.getConfig("batch_size");
var active_childs = 0;
var _ = require("underscore");
var cluster;
var check = require("check-types");
var botObjs = {}; //stores the robots.txt data
var tracker = require(parent_dir + "/lib/server.js");
var graph = require(parent_dir + "/lib/graph.js");
var child = require('child_process');
var inlinks_pool = [];
var fs = require("fs");
var first_time = true;
process.starter_lock = false;
process.begin_intervals = true;
process.failed_batch_lock = false;
process.bot_killer_locked = false;
var pool; //global db object in the entire app
var spawned = {};
var bot_spawn_time = {};

function starter() {
    /*
    	encapsulated function responsible for allocating vacant childs 
    	This function is run continously in an interval to check and 
    	realocate workers.
    */

    if (process.starter_lock) {
        msg("starter locked", "info");
        return;
    }
    process.starter_lock = true;
    msg("Check if new child available", "info");
    msg(("Current active childs " + active_childs), "info");
    var done = childs - active_childs;
    var old_done = done;
    if (done === 0) {
        process.starter_lock = false;
        return; //no available childs
    }
    var d = 0;
    while (done !== 0) {


        if (!process.webappOnly) {
            nextBatch(function nextBatchStarter() {
                ++d;
                //console.log("CALLBACK    ",d,"  done  ",old_done);
                if (d === old_done) {
                    msg("starter lock released", "success");
                    process.starter_lock = false;
                }
            }); //call nextBatch to obtain a new bucket and start a worker
        } else {
            process.starter_lock = false;
        }
        --done;
    }

}; //end of starter

function nextBatch(fn) {
    active_childs += 1;
    /*

    	encapsulated function which checks for an available 
    	bucket and starts a new worker
    */
    pool.getNextBatch(function getNextBatch(err, results, hash, refresh_label) {

        if (first_time) {
            
            process.bucket_creater_locked = false;
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
            app.flushInlinks(function() {});
        }
        fn();

    }, batchSize);
}

function nextFailedBatch() {
    if (process.failed_batch_lock) {
        return;
    }
    process.failed_batch_lock = true;
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
            process.failed_batch_lock = false;
            return;
        }

        if (check.assigned(docs)) {
            if (docs.length === 0) {
                process.failed_batch_lock = false;
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
    /*
	failed_db.parallelize(function(){
		
		failed_db.parallelize(function() {
				failed_db.each("SELECT * FROM q WHERE count<"+config.getConfig("retry_times_failed_pages")+" AND status=0 ORDER BY id ASC LIMIT 0,"+config.getConfig('failed_queue_size'),function(err,row){
					//console.log(err,row.id,'added to child');
					
					failed_db.run("UPDATE q SET status=1 WHERE id=?",[row.id],function nextFailedBatch(e,r){
						//console.log(e,row.id,'status updated');
						msg('Retry in failed queue '+row.failed_url,'info');
					});					
					
					var failed_info = JSON.parse(row.failed_info);
					//bucket_id for failed pages is failed_queue_(row.id)_(count)
					failed_info['bucket_id'] = 'failed_queue_'+failed_info['bucket_id']+'_'+row.id+'_'+row.count;
					li.push(failed_info);
					
					
				},function(){

					//all callbacks were successfull
					
					createChild_for_failed_queue(li,'failed_queue', 'failed_queue');// sending failed_queue string instead of bucket hash
					//it will not be reported to finishedBatch
					//see below in childFeedBack
				});

		});



	});
*/


}

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
    var args = [bucket_links, bucket_links.length, pool.links, botObjs, hash, refresh_label, c[0], c[1], c[2], "failed_queue"];
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
        app.flushInlinks(function() {});
        if (code === 0) {
            msg(('Child process ' + botId + ' exited with code ' + code), "success");
        } else {
            msg(('Child process ' + botId + ' exited with code ' + code), "error");
        }
        process.failed_batch_lock = false;
        delete bot_spawn_time[botId];
        delete spawned[botId]; //delete from our record
        nextFailedBatch();

    });

    bot.on("message", childFeedback);
}



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
    var args = [bucket_links, bucket_links.length, pool.links, botObjs, hash, refresh_label, c[0], c[1], c[2], "normal"];
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
        app.flushInlinks(function() {});

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

function botKiller() {
    if (process.bot_killer_locked) {
        return;
    }
    process.bot_killer_locked = true;
    var d = 0;
    var c = Object.keys(bot_spawn_time).length;
    if (c === 0) {
        process.bot_killer_locked = false;
        return;
    }
    for (var botId in bot_spawn_time) {
        if (botId === "tika") {
            ++d;
            if (d === c) {
                process.bot_killer_locked = false;
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
                            process.bot_killer_locked = false;
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
                        process.bot_killer_locked = false;
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
                                process.bot_killer_locked = false;
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
                                                        process.bot_killer_locked = false;
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
                    process.bot_killer_locked = false;
                }
            }
        })(botId);
    }
}


function childFeedback(data) {
    /*
    	encapsulated function called when worker sends 
    	a message to the parent
    */
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
                app.flushInlinks(function() {

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
            process.tikaPID = data["tikaPID"];
            //log the pid so that if bot is started again it can kill a old instance of tika server
            fs.writeFileSync(parent_dir + "/db/sqlite/tikaPID.txt", data["tikaPID"] + "");
            break;
        case "graph":
            var url = data["graph"][0];
            var parent = data["graph"][1];
            graph.insert(url, parent);
            break;

    }

}

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


if (!process.webappOnly) {
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
    process.my_timers = process.my_timers.concat([a, b, tika_restarter]);

}



//starting child process for lucene
/*
var lucene = child.fork(__dirname+"/lucene-indexer.js",[]);
spawned["lucene"]=lucene;
lucene.on('close',function(code){
	if(code!==0){

		msg("Lucene shut down","error");

	}
});
*/




var app = {

    "getActiveChilds": function getActiveChilds() {
        /*
        	Get the number of active childs in the manager
        */
        return active_childs;
    },
    "isManagerLocked": function isManagerLocked() {
        /*
        	Returns the state of the starter function
        */
        return process.starter_lock;
    },
    "setManagerLocked": function setManagerLocked(state) {
        /*
        	Set the state of the starter function
        */
        process.starter_lock = state;
    },
    "flushInlinks": function flushInlinks(fn) {
        /*
        	In case of clean up,flushInlinks into the db
        */
        var k = inlinks_pool;
        inlinks_pool = [];
        //console.log(k);
        return pool.addToPool(k, fn);

    },
    "flushAllInlinks": function flushInlinks(fn) {
        return pool.addToPool(inlinks_pool, fn);
    },
    "killWorkers": function killWorkers(fn) {
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
                fn();
            });
        });





    }
};
module.exports = function(pool_obj, botObjs_obj, clstr) {
    //constructor
    /*
    	pool_obj:     The db pool obj
    	botObjs_obj:  Parsed robots.txt data for workers
    */
    pool = pool_obj;
    graph = graph.init(pool);
    cluster = clstr;
    botObjs = botObjs_obj;
    starter(); //start the child_manager main function
    tracker.init(pool, clstr); //starting crawler webapp
    return app;
};

function msg() {
    log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
}