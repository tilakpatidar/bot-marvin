#!/usr/bin/env node

/*
 * @author Tilak Patidar <tilakpatidar@gmail.com>
 */




var fs = require('fs');
var check = require('check-types');
var _ = require("underscore");
var proto = require(__dirname + '/lib/proto.js');
process.getAbsolutePath = proto.getAbsolutePath;
var parent_dir = __dirname; //parent dir path for importing modules safely



var SeedLoader = require(parent_dir + "/lib/seed-reloader.js");
var ConfigLoader = require(parent_dir + "/lib/config-reloader.js");
var Pool = require(__dirname + '/lib/pool');
var ChildManager = require(parent_dir + '/lib/child_manager.js')
var Logger = require(parent_dir + "/lib/logger.js");
var ArgumentProcesser = require(__dirname + '/lib/argv.js');
var Cluster = require(parent_dir + '/lib/cluster.js')
var Bot = require(parent_dir + '/lib/bot.js');
var Robots = require(__dirname + '/lib/robots.js');
var death = require("death");

/**
 * Class represents the various triggers set by other classes for specific events.
 * @constructor
 *	@author Tilak Patidar <tilakpatidar@gmail.com>
 */

var Trigger = function() {

    /** 
    	Stores the bot object 
    	@private
    */
    var bot;

    /** 
    	Stores the crawler instance.
    	@private
    	@type {Crawler}
    */
    var crawler_obj;


    /** 
    	Stores all the trigger values 
    	@private
    */
    var triggers = {
        "caught_termination": false,
        "begin_intervals": false,
        "force_mode": false,
        "my_timers": [],
        "reset": false,
        'seedFile': null,
        "seedFileData": null,
        "removeSeed": null
    }; //these are shared globally to trigger various async events

    /** 
    	Sets the bot object to make bot related triggers work. 
    	@param {Bot} botObject
    	@public
    */
    this.setBot = function setBot(botObject) {

        bot = botObject;
    };


    /** 
    	Sets the crawler object to make crawler related triggers work. 
    	@param {Crawler} crawlerObject
    	@public
    */
    this.setCrawler = function setCrawler(crawlerObject) {
        crawler_obj = crawlerObject;
    };

    /** 
    	Sets the trigger property of private var triggers. 
    	@param {String} key
    	@param {Object} value
    	@public
    */
    this.set = function set(key, value) {

        //first check special triggers
        switch (key) {
            case "stop_bot_and_exit":
                bot.stopBot(function() {
                    process.exit(0);
                });
                break;

            case "grace_exit":
                crawler_obj.exit();
                break;

            case "restart":
                crawler_obj.restart();
                break;
        };

        triggers[k] = value;

    };


	/** 
		Get the trigger value. 
		@param {String} key
		@public
	*/
    this.get = function get(key) {
        return triggers[k];
    };

};

/**
 * Class responsible for loading and executing all the crawler components in proper sequence.
 * @constructor
 *	@author Tilak Patidar <tilakpatidar@gmail.com>
 */

var Crawler = function() {

	/**
		Stores Cluster object 
		@private
		@type {Cluster}
	*/
    var cluster;
    /**
		Stores Logger object;
		@private
		@type {Logger}
	*/
    var log;
    /**
		Stores Config object;
		@private
		@type {Config}
	*/
    var config;
    /**
		Stores Seed object;
		@private
		@type {Seed}
	*/
    var seed;
    /**
		Stores MongoDB object;
		@private
		@type {MongoDB}
	*/
    var mongo_pool;
    /**
		Stores ChildManager object;
		@private
		@type {ChildManager}
	*/
    var child_manager;
    
    /**
		Stores Bot object;
		@private
		@type {Bot}
	*/
    var bot_obj;

    //boolean vars below are created to make use of setInterval and 
    //make async nested callbacks to appear sync for code clearity

    /**
		Set to true when db loaded.
		@private
		@type boolean
	*/
    var isDBLoaded = false;
    /**
		Set to true when cluster started.
		@private
		@type boolean
	*/
    var isClusterStarted = false;
    /**
		Set to true when inputs parsed.
		@private
		@type boolean
	*/
    var isInputsParsed = false;
    /**
		Set to true when normal crawl can continue.
		@private
	*/
    var isNormalCrawl = false;
    /**
		Set to true when logger loaded.
		@private
		@type boolean
	*/
    var isLoggerLoaded = false;
    /**
		Stores current obj context for nested functions.
		@private
		@type boolean
	*/
    var that = this;

    var JSONX = proto["JSONX"]; //JSON for regex support in .json files
    //constructor functions


    /**
		Loads depcheck.js and check dependencies.
		Exits if dependencies not met.
		@private
    */
    function checkDependency() {
        var dependency = require(__dirname + "/lib/depcheck.js");
        dependency.check();
    };


    /**
		Calls the seed method of MongoDb.
		And loads the ChildManager into child_manager
		@param {Object} botObjs - Robots.txt parsed data
		@private
    */
    function startBotManager(botObjs) {


        //function to start the child_manager
        mongo_pool.seed(function(completed) {
            if (completed) {
                //create a child manager
                child_manager = new ChildManager(config, cluster, trigger_obj, mongo_pool, botObjs, log);
                //#debug#console.log(process.child_manager,"child_manager")				
            }


        });

    }


    /**
		Calls cleanUp and kill all active_pids on death event. Ctrl^C
		@private
    */
    function deathCleanUp() {
        //console.log("CAUGHT TERMINATION ",trigger_obj.get('caught_termination'));
        if (trigger_obj.get('caught_termination')) {
            return;
        }

        if (!check.assigned(log)) {
            log = {};
            msg = function(msg, color) {
                console.log(msg)
            };
            log.flush = function() {

            };
        }

        trigger_obj.set('caught_termination', true);
        msg('Termination request processing', 'info');
        //console.log(crawler_obj, "crawler_obj");
        crawler_obj.cleanUp(function(done) {
            if (done) {
                //console.log(done,"done")
                process.nextTick(function() {
                    var pids = fs.readFileSync(__dirname + "/db/pids/active_pids.txt").toString().split("\n");
                    for (var i = 0; i < pids.length; i++) {
                        try {
                            //#debug#console.log(parseInt(pids[i]))
                            process.kill(parseInt(pids[i]));
                        } catch (err) {
                            //#debug#console.log(err)
                        }

                    };
                    fs.unlinkSync(__dirname + "/db/pids/active_pids.txt");
                    process.exit(0);


                });
            }
        });
    }


    /**
		All the process global vars go here
		@private
    */

    function setGlobals() {

        //all the process related code here

        process.setMaxListeners(50);
        if (process.env.EDITOR === undefined) {
            process.env.EDITOR = "/bin/nano";
        }

    }


    /**
		Creates instance of MongoDB.
		Calls createConnection in MongodB and set the DB object 
		in Config, Seed. Marks isDBLoaded to true.

		@public
		@param {Pool} p - Pool object, returns constructor for MongoDB
	
    */
    this.loadDB = function loadDB(p) {

        var DBConnector = p.getDB(); //choosing db type
        mongo_pool = new DBConnector(config, trigger_obj);
        mongo_pool.createConnection(function() {
            config.setDB(mongo_pool);
            seed.setDB(mongo_pool);
            isDBLoaded = true;
        });

    };

    /**
		Sets Config in our private var config,
		@public
		@param {Config} c
    */
    this.loadConfig = function loadConfig(c) {

        config = c; //globals for sharing config and seed file across various modules
    };

    /**
		Sets Seed in our private var seed,
		@public
		@param {Seed} s
    */
    this.loadSeed = function loadSeed(s) {
        seed = s;
    };

    /**
		Starts the cluster by creating cluster and bot object.
		@public
    */
    this.startCluster = function startCluster() {
        var interval_locked = false;
        var tmp_interval = setInterval(function() {
            //console.log("in startCluster");
            if (interval_locked || !isDBLoaded || !isLoggerLoaded) {
                return;
            }
            interval_locked = true;
            //console.log("pass startCluster");


            cluster = new Cluster(config, mongo_pool, trigger_obj, log);
            bot_obj = new Bot(config, mongo_pool, cluster, trigger_obj, log);

            mongo_pool.setBot(bot_obj);

            trigger_obj.setBot(bot_obj);
            cluster.setBot(bot_obj);
            bot_obj.startBot(trigger_obj.get('force_mode'), function(status) {

                if (status) {
                    //bot was started successfully
                    isClusterStarted = true;

                } else {
                    //unable to start bot exit gracefully
                    trigger_obj.set('stop_bot_and_exit');
                }
                clearInterval(tmp_interval);
            });

        }, 1000);

    };


    /**
		Reset the bot when --reset arg passed
		@public
		@param {Function} fn - Callback function
    */
    this.reset = function reset(fn) {
        //drop the db				
        mongo_pool.drop(function reset_pool_drop() {
            msg("db reset", "success");
            msg("robots cache reset", "success");




            //drop pdf store
            var files = fs.readdirSync(__dirname + '/pdf-store/');
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".") === 0) {
                    //do not take hidden files
                    continue;
                }
                var domain = files[i].replace(/##/g, "/");
                var data = fs.unlinkSync(__dirname + '/pdf-store/' + files[i]);
            };
            msg("pdf-store cache reset", "success");

            //drop pdf store-parsed
            var files = fs.readdirSync(__dirname + '/pdf-store-parsed/');
            for (var i = 0; i < files.length; i++) {
                if (files[i].indexOf(".") === 0) {
                    //do not take hidden files
                    continue;
                }
                var domain = files[i].replace(/##/g, "/");
                var data = fs.unlinkSync(__dirname + '/pdf-store-parsed/' + files[i]);
            };
            msg("pdf-store-parsed cache reset", "success");

            try {
                var stream = fs.createWriteStream(__dirname + "/config/db_config.json");
                stream.write("{}");
                stream.close();
                msg("Db config cleared", "success");
            } catch (ee) {
                msg("Db config not cleared not cleared", "error");
            }


            msg("crawler reset", "success");

            return fn();



        });

    };


    /**
		Exits the crawler by calling cleanUp
		@public
    */
    this.exit = function exit() {

        that.cleanUp(function(done) {
            if (done) {
                process.exit(0);
            }

        });
    }


    /**
		Parses input and sets overriden config returned by ArgumentParser to Config object.
		@public
		@param {ArgumentProcesser} argv_obj
    */
    this.processInput = function(argv_obj) {
        var interval_locked = false;
        var tmp_interval = setInterval(function() {
            if (interval_locked || !isClusterStarted || !isDBLoaded || !isLoggerLoaded) {
                return;
            }

            interval_locked = true;
            clearInterval(tmp_interval);
            var new_opts = argv_obj.parse(); //executes the args passed and returns overriden config

            var overriden_config = new_opts; //parses cmd line argv and perform required operations
            config.setOverridenConfig(overriden_config);
            isInputsParsed = true;

        }, 1000);
    };


    /**
		When args is parsed this is called to select the action of crawler.
		@public
    */
    this.selectInput = function selectInput() {
        var interval_locked = false;
        var tmp_interval = setInterval(function() {

            if (interval_locked || !isInputsParsed || !isDBLoaded || !isClusterStarted || !isLoggerLoaded) {
                return;
            }
            interval_locked = true;
            clearInterval(tmp_interval);
            if (!trigger_obj.get('modifyConfig')) { //set to true by argv if --config is selected stops bot from starting if this option is selected

                config.pullConfig(function() {

                    mongo_pool.checkIfNewCrawl(function() {

                        if (trigger_obj.get('editSeedFile')) {
                            seed.editSeedFile();
                        } else if (trigger_obj.get('removeSeed')) {
                            seed.removeSeed(Object.keys(trigger_obj.get('removeSeed'))[0]);
                        } else if (trigger_obj.get('seedFile')) {
                            seed.seedFile(trigger_obj.get('seedFile'), null, function() {
                                trigger_obj.set("stop_bot_and_exit");
                            });
                        } else if (trigger_obj.get('reset')) {
                            that.reset(function() {
                                trigger_obj.set('stop_bot_and_exit');
                            });
                        } else {
                            seed.pull(function() {
                                mongo_pool.readSeedFile(function readSeedFile() {
                                    isNormalCrawl = true;
                                });
                            });
                        }


                    });
                });

            }

        }, 1000);
    };

    /**
		When no special args are given this is called by this.selectInput
		@public
    */
    this.startNormalCrawl = function startNormalCrawl() {
        var interval_locked = false;
        var tmp_interval = setInterval(function() {

            if (interval_locked || !isInputsParsed || !isDBLoaded || !isClusterStarted || !isNormalCrawl || !isLoggerLoaded) {
                return;
            }

            interval_locked = true;
            clearInterval(tmp_interval);
            var botObjs = {}; //will store robots.txt data for seed links

            if (config.getConfig("allow_robots") && !process.webappOnly) {

                /*	
                	if robots.txt has to be followed
                	we have to download all robots.txt files
                */

                msg("downloading robots.txt this could take a while", "info");




                var robots = new Robots(Object.keys(mongo_pool.links_store), log, mongo_pool);

                robots.parse(function robots_init(err, obj) {
                    //#debug#console.log(obj);
                    if (obj) {
                        msg("robots.txt parsed", "success");
                    } else {
                        msg("robots.txt parsing failed", "error");
                    }
                    botObjs = obj;
                    startBotManager(botObjs);


                });
            } else {
                startBotManager(null);

            }

            if (!process.modifyConfig && !process.editSeedFile) {
                //to disable detection of Ctrl^X if nano editor is on

                (function(crawler_obj, trigger_obj, msg) {

                    death(deathCleanUp);

                })(this, trigger_obj, msg);


            }
        }, 1000);
    };


    /**
		Performs clean up operations before closing crawler.
		@public
		@param {Function} fn - Callback
    */
    this.cleanUp = function cleanUp(fn) {
        msg("Performing cleanUp ", "info");

        try {
            process.kill(trigger_obj.get('tikaPID'), "SIGINT");
        } catch (err) {
            console.log(err);
            //trying to kill the tika server jar
        }
        //console.log(1);
        if (!check.assigned(cluster.cluster_server)) {
            cluster.cluster_server = {}
        }
        //console.log(101);
        if (!check.assigned(cluster.file_server)) {
            cluster.file_server = {}
        }
        //console.log(102);
        if (!check.assigned(cluster.fileServer)) {
            cluster.fileServer = {}
        }
        //console.log(103);
        if (!check.assigned(cluster.cluster_server.shutdown)) {
            cluster.cluster_server.shutdown = function(fn) {
                fn();
            };
        }
        //console.log(104);
        if (!check.assigned(cluster.file_server.shutdown)) {
            cluster.file_server.shutdown = function(fn) {
                fn();
            };
        }
        //console.log(105);
        if (!check.assigned(cluster.fileServer.shutdown)) {
            cluster.fileServer.shutdown = function(fn) {
                fn();
            };
        }
        // console.log(106);
        if (!check.assigned(child_manager)) {
            child_manager = {};
            child_manager.setManagerLocked = function() {

                fn();
            };
            child_manager.killWorkers = function() {

                fn();

            };
            child_manager.flushAllInlinks = function(fn) {
                fn();
            };
        }

        //console.log(107);
        child_manager.setManagerLocked(true); //lock the manager so no new childs are spawned
        //#debug#console.log(cluster.cluster_server,cluster.file_server)
        child_manager.flushAllInlinks(function(status) {
            //console.log(108,child_manager);

            //flush all the inlinks into db before exit
            child_manager.killWorkers(function() {
                //console.log(109);

                //clear timers
                var timers = trigger_obj.get('my_timers');
                for (var i = 0; i < timers.length; i++) {
                    clearInterval(timers[i]);
                };
                //console.log(110);

                cluster.cluster_server.shutdown(function() {
                    cluster.file_server.shutdown(function() {
                        cluster.fileServer.shutdown(function() {

                            //console.log(1111);


                            //clear all moduele references
                            //#debug#console.log(process.bot);
                            bot_obj.stopBot(function cleanUp_stopbot(err) {
                                //if (err) throw err;

                                msg("cleanUp done", "success");

                                //flushing the log
                                log.flush(function() {


                                    mongo_pool.close(function() {
                                        return fn(true);
                                    });

                                });
                            });
                        });





                    });


                });
            });

        }); //kill all the workers before quiting

    };


    /**
		Restarts the bot.
		@public
    */
    this.restart = function restart() {
        //restart
        that.cleanUp(function(done) {
            if (done) {
                var spawn = require('child_process').spawn;
                var file_path = __dirname + '/index.js';
                var ls = spawn(config.getConfig("env"), [file_path], {
                    stdio: 'inherit'
                });
                fs.appendFileSync(__dirname + "/db/pids/active_pids.txt", ls.pid + "\n");
                //ls.stdout.pipe(process.stdout);
                //process.exit(0);			
                ls.on("exit", function() {
                    process.exit(0)
                });

            }



        });
    };
    /**
		Sets the Logger object in all Crawler components.
		@public
		@param {Logger} l
    */
    this.setLogger = function setLogger(l) {
        var interval_locked = false;
        var tmp_interval = setInterval(function() {

            if (interval_locked || !isDBLoaded) {
                return;
            }

            log = l;

            config.setLogger(log);
            seed.setLogger(log);
            mongo_pool.setLogger(log);


            interval_locked = true;
            clearInterval(tmp_interval);
            isLoggerLoaded = true;
        }, 1000);
    };


    checkDependency();

     /**
		Trigger object which is shared with all the crawler components.
		@private
		@type {Trigger}
    */
    var trigger_obj = new Trigger();


	/**
		Main method of the Crawler.
		Executes the crawler by loading all components.
		@public
	*/
    this.run = function run() {

        //some args need to be parsed before
        var argv = require('minimist')(process.argv.slice(2));
        if (check.assigned(argv["force"])) {
            trigger_obj.set('force_mode', true);
        }


        fs.appendFileSync(__dirname + "/db/pids/active_pids.txt", process.pid + "\n");


        var config_obj = new ConfigLoader(trigger_obj);
        var log_obj = new Logger(config_obj);
        var seed_obj = new SeedLoader(config_obj, trigger_obj);
        var pool_obj = new Pool(config_obj.getConfig("db_type"));
        var argv_obj = new ArgumentProcesser(argv, config_obj, seed_obj, trigger_obj);


        crawler_obj.loadConfig(config_obj);
        crawler_obj.loadSeed(seed_obj);
        crawler_obj.loadDB(pool_obj);

        crawler_obj.setLogger(log_obj);

        crawler_obj.startCluster();

        crawler_obj.processInput(argv_obj);

        crawler_obj.selectInput();

        crawler_obj.startNormalCrawl();



    };


    /**
		Used to call Logger object with the caller function name.
		@private
	*/
    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }

}



if (require.main === module) {
    var crawler_obj = new Crawler();
    crawler_obj.run();

} else {

    module.exports = Crawler;

}