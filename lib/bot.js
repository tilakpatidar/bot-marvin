var parent_dir = process.getAbsolutePath(__dirname);
var check = require("check-types");
var fs = require('fs');
var Lock = require(parent_dir + '/lib/lock.js');
var _ = require("underscore");
/**
	Represent a bot in a cluster.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@param {Message} message_obj

*/
var Bot = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');
    var proto = require(parent_dir + "/lib/proto.js");
    var JSONX = proto.JSONX;
    /**
    	Controls the pinging of master
		@type boolean
		@private
    */
    var lock_master_ping = new Lock();

    var cluster = message.get('cluster');
    var pool = message.get('pool');
    var that = this;

    var log = message.get('log');

    this._id = config.getConfig('bot_name');
    this.registerTime = new Date();
    this.createdBuckets = 0;
    this.processedBuckets = 0;
    this.crawledPages = 0;
    this.failedPages = 0;


    /**
		Resets the stats whenever stats are flushed into db.
		@private
    */
    function resetBotStats() {
        that.createdBuckets = 0;
        that.processedBuckets = 0;
        that.crawledPages = 0;
        that.failedPages = 0;
    }


    /**
		Updates the stats in the db
		@private
		@param {boolean} updateConfig - to update config or not
		@param {Function} fn - callback

    */
    function botInfoUpdater(updateConfig, fn) {
        var dic = that.getBotData(); //data is pulled and reseted
        var n_dic = {};
        //console.log(dic);
        _.each(dic, function(elem, i) {

            if (check.number(dic[i])) {
                if (!n_dic['$inc']) {
                    n_dic['$inc'] = {};
                }
                n_dic['$inc'][i] = dic[i];
            }

        });

        //console.log(n_dic, "n_dic");

        if (updateConfig) {
            var jsonx_obj = new JSONX(config.getConfig());
            n_dic['config'] = JSON.parse(jsonx_obj.stringify());
        }
        //#debug#console.log(n_dic);
        pool.bot.updateBotInfo(n_dic, function updateBotInfo(err, results) {
            //#debug#console.log(results);
            //#debug#console.log(err);
            if (err) {
                msg("Error ocurred while updating bot info ", "error");
                if (check.assigned(fn)) {
                    return fn(false);
                }
            } else {

                msg("Bot info updated", "success");
                if (check.assigned(fn)) {
                    return fn(true);
                }
            }
        });
    }

    /**
		Tests if master is active by pinging from cluster network.
		If master fails it clears semaphore collection to start re-elect.
		@private

    */

    function pingMaster() {

        if (!lock_master_ping.enter()) {
            return;
        }

        //#debug#console.log("pingMaster")
        //pings master if master is dead ,clears the semaphore collection so that bots can compete again
        try {
            cluster.getMaster(function(master) {

                cluster.send(master, {
                    "active": 1
                }, function(s, res) {
                    // console.log(s,res)
                    if (s) {
                        if (check.assigned(res)) {
                            if (JSON.parse(res)["active"] === true) {
                                //	//#debug#console.log("still active");
                                //master is still active
                                msg("Master is active", "success");
                                lock_master_ping.release();
                            } else {
                                pool.semaphore_collection.remove({}, function() {
                                    msg("Master is dead", "error");
                                    lock_master_ping.release();
                                });
                            }
                        } else {
                            //#debug#console.log("dead");
                            pool.semaphore_collection.remove({}, function() {
                                msg("Master is dead", "error");
                                lock_master_ping.release();
                            });
                        }
                    } else {
                        //#debug#console.log("dead");
                        pool.semaphore_collection.remove({}, function() {
                            msg("Master is dead", "error");
                            lock_master_ping.release();
                        });
                    }

                });
            });
        } catch (err) {
            console.log(err);
            lock_master_ping.release();
        }

    };

    /**
        	Checks if an active bot with same name is present return true if you can start the bot
        	return false if an instance of the same bot name is running.
        	@private
        	@param {Function} fn
        */
    function checkIfActiveBot(fn) {


        if (message.get('webappOnly')) {
            fn(true); //bypass starting the bot if webapp mode is on
            return;
        }
        var t = new Date().getTime();

        pool.bot.startBotGetBotActiveStatus(function startBotGetBotActiveStatus(err, result) {

            if (result) {
                msg("A bot with same is name is still active in cluster", "error");

                return fn(false);

            } else {
                pool.bot.startBotAddNewBot(t, function startBotAddNewBot(err, result) {

                    if (!err) {
                        msg("Inserted new bot info into cluster", "success");
                        pool.bot.requestToBecomeMaster(config.getConfig("bot_name"), function(status) {
                            if (status) {
                                message.set('cluster_master', true);
                            } else {
                                message.set('cluster_master', false);
                            }
                            return fn(true);
                        });

                    } else {
                        msg("Unable to insert new bot into cluster", "error");
                        return fn(false);
                    }

                });


            }

        });



    }


    /**
		Updates a stat value by given value.
		@public
		@param {String} key
		@param {String} value
    */
    this.updateStats = function updateStats(key, value) {
        if (check.number(value)) {
            //will be incremented by the value given
            that[key] = that[key] + value;
        } else {
            that[key] = value;
        }
    };


    /**
		Fetches and then resets the bot data.
		@public
    */
    this.getBotData = function getBotData() {
        //data is reseted when it is pulled

        var stats = {};
        stats._id = that._id;
        stats.registerTime = that.registerTime;
        stats.createdBuckets = that.createdBuckets;
        stats.processedBuckets = that.processedBuckets;
        stats.crawledPages = that.crawledPages;
        stats.failedPages = that.failedPages;
        resetBotStats();
        return stats;
    };


    /**
		Starts the bot
		@public
		@param {boolean} force_mode - Whether to start bot with force mode or not.

    */
    this.startBot = function startBot(force_mode, fn) {
        pool.resetBuckets(function() {
            checkIfActiveBot(function checkIfActiveBot(success) {
                //#debug#console.log("HEY")
                //start the bot and verify if other bot with same name exists
                if (!success) {
                    if (force_mode) {
                        msg("Force mode enabled", 'info');
                        //try to kill other bot with same name
                        cluster.closeBot(config.getConfig('bot_name'), function(status) {

                            if (status) {
                                checkIfActiveBot(function(status1) {
                                    if (status1) {
                                        return fn(true);
                                    } else {
                                        return fn(false);
                                    }
                                });

                            } else {
                                return fn(false);
                            }
                        });
                    } else {
                        return fn(false);
                    }
                } else {
                    //#debug#console.log("DDD")
                    return fn(true);
                }

            });
        });
    }



    /**
		Stops the bot and resets queues, buckets and cache status.
		@public
		@param {Function} fn - callback

    */
    this.stopBot = function stopBot(fn) {
        var files = fs.readdirSync(parent_dir + '/pdf-store/');
        for (var i = 0; i < files.length; i++) {
            if (files[i].indexOf(".") === 0) {
                //do not take hidden files
                continue;
            }
            var domain = files[i].replace(/##/g, "/");
            var data = fs.unlinkSync(parent_dir + '/pdf-store/' + files[i]);
        };
        pool.resetBuckets(function() {
            pool.bot.BotMarkInactive(function BotMarkInactive(err, results) {
                if (err) {
                    msg("Bot was not found something fishy ", "error");
                    return fn(false);
                } else {
                    botInfoUpdater(false, function botInfoUpdater(updated) {
                        if (updated) {
                            msg("Bot cleaned up ", "success");
                            return fn(true);
                        } else {
                            msg("Bot cleaned up ", "error");
                            fn(false);
                            return;
                        }
                    });

                }

            });


        });
    }

    //intervals

    var b = setInterval(function() {
        if (message.get('begin_intervals')) {
            botInfoUpdater(false);
        }
    }, 10000);
    message.get('my_timers').push(b);
    var c = setInterval(function() {
        if (message.get('begin_intervals')) {
            pool.bot.checkIfStillMaster(function(status) {
                /*					
					This function checks if the bot is still a master and also creates one if do not exist
            	*/
                if (status) {
                    message.set('cluster_master', true);
                } else {
                    message.set('cluster_master', false);
                }
            });
        }

    }, 10000);
    message.get('my_timers').push(c);
    var d = setInterval(function() {
        if (message.get('begin_intervals')) {
            pingMaster();
        }

    }, 10000);
    message.get('my_timers').push(d);

    /**
		Used to call Logger object with the caller function name.
		@private
	*/
    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }

};





module.exports = Bot;