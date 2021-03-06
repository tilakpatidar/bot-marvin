#!/usr/bin/env node


var fs = require('fs');
var check = require('check-types');
var _ = require("underscore");
var proto = require(__dirname + '/lib/proto.js');
process.getAbsolutePath = proto.getAbsolutePath;
process.setMaxListeners(0); //unlimited listeners
var parent_dir = __dirname; //parent dir path for importing modules safely



var SeedLoader = require(parent_dir + "/lib/seed-reloader.js");
var Message = require(parent_dir + '/lib/message.js');
var ConfigLoader = require(parent_dir + "/lib/config-reloader.js");
var Pool = require(__dirname + '/lib/pool');
var ChildManager = require(parent_dir + '/lib/child_manager.js')
var Logger = require(parent_dir + "/lib/logger.js");
var ArgumentProcesser = require(__dirname + '/lib/argv.js');
var Cluster = require(parent_dir + '/lib/cluster.js')
var Bot = require(parent_dir + '/lib/bot.js');
var Robots = require(__dirname + '/lib/robots.js');
var death = require("death");
var Lock = require(parent_dir + '/lib/lock.js');
var crawler_obj;


/**
 * Class responsible for loading and executing all the crawler components in proper sequence.
 * Responsiblities:
 *      Loads other classes and instantiate them
 *      Supply all the requirements of other classes
 *      Creates singleton objects which are shared along the program
 * @constructor
 * @param {Object} args - object containing cmd line args
 *	@author Tilak Patidar <tilakpatidar@gmail.com>
 */

var Crawler = function(args) {

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
		@type {SeedLoader}
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
        var Dependency = require(__dirname + "/lib/depcheck.js");
        var dep_obj = new Dependency();
        dep_obj.check();
    };


    /**
		Calls the seed method of MongoDb.
		And loads the ChildManager into child_manager
		@param {Object} botObjs - Robots.txt parsed data
		@private
    */
    function startBotManager(botObjs) {


        //function to start the child_manager
        seed.seed(function(completed) {
            if (completed) {
                //create a child manager

                child_manager = new ChildManager(message_obj);
                //#debug#console.log(process.child_manager,"child_manager")				
            }


        });

    }


    /**
		Calls cleanUp and kill all active_pids on death event. Ctrl^C
		@private
    */
    function deathCleanUp(fn) {
        //console.log("CAUGHT TERMINATION ",message_obj.get('caught_termination'));
        if (message_obj.get('caught_termination')) {
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

        message_obj.set('caught_termination', true);
        msg('Termination request processing', 'info');
        //console.log(crawler_obj, "crawler_obj");
        crawler_obj.cleanUp(function(done) {
            if (done) {
                //console.log(done,"done")
                process.nextTick(function() {
                    var pids = fs.readFileSync(__dirname + "/db/pids/active_pids.txt").toString();
                    
                    try {
                        //#debug#console.log(parseInt(pids[i]))
                        process.kill(parseInt(pids));
                    } catch (err) {
                        //#debug#console.log(err)
                    }
                    fs.unlinkSync(__dirname + "/db/pids/active_pids.txt");
                    if (process.RUN_ENV === "TEST") {
                        message_obj.set("bot_stopped", true);
                    } else {
                        process.exit(0);
                    }


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
        mongo_pool = new DBConnector(message_obj);
        mongo_pool.createConnection(function() {
            message_obj.set('pool', mongo_pool);
            config.setDB();
            seed.setDB();
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
		@param {SeedLoader} s
    */
    this.loadSeed = function loadSeed(s) {
        seed = s;
    };

    /**
		Starts the cluster by creating cluster and bot object.
		@public
    */
    this.startCluster = function startCluster() {

        var interval_locked = new Lock();

        var tmp_interval = setInterval(function() {
            //console.log("in startCluster");
            if (interval_locked.isLocked() || !isDBLoaded || !isLoggerLoaded) {
                return;
            }
            interval_locked.enter();
            //console.log("pass startCluster");


            cluster = new Cluster(message_obj);
            message_obj.set('cluster', cluster);
            bot_obj = new Bot(message_obj);
            message_obj.set('bot', bot_obj);
            mongo_pool.setBot();
            cluster.setBot();
            bot_obj.startBot(message_obj.get('force_mode'), function(status) {

                if (status) {
                    //bot was started successfully
                    isClusterStarted = true;

                } else {
                    //unable to start bot exit gracefully
                    message_obj.set('stop_bot_and_exit');
                }
                clearInterval(tmp_interval);
            });

        }, 1000);

    };

    this.isStopped = function() {
        return message_obj.get('bot_stopped');
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
    this.exit = function exit(fn) {

        that.cleanUp(function(done) {
            if (done) {
                if (process.RUN_ENV === "TEST") {
                    fn();
                } else {
                    fn();
                    process.exit(0);
                }

            }

        });
    }


    /**
        Returns if bot started successfully
        @public
        @return {boolean} status - status from messages
    */
    this.isStarted = function() {
        return message_obj.get('success_start');
    };


    /**
		Parses input and sets overriden config returned by ArgumentParser to Config object.
		@public
		@param {ArgumentProcesser} argv_obj
    */
    this.processInput = function(argv_obj) {
        var interval_locked = new Lock();
        var tmp_interval = setInterval(function() {
            //console.log("process input interval");
            if (interval_locked.isLocked() || !isClusterStarted || !isDBLoaded || !isLoggerLoaded) {
                return;
            }

            interval_locked.enter();

            clearInterval(tmp_interval);
            var new_opts = argv_obj.parse(); //executes the args passed and returns overriden config

            var overriden_config = new_opts; //parses cmd line argv and perform required operations
            config.setOverridenConfig(overriden_config);
            isInputsParsed = true;

        }, 1000);
    };


    /**
        Returns if bot stopped. 
        Default null. When stopped returns true.
        @public
        @return {boolean} status
    */
    this.botStopped = function() {

        return message_obj.get('bot_stopped');
    }

    /**
		When args is parsed this is called to select the action of crawler.
		@public
    */
    this.selectInput = function selectInput() {
        var interval_locked = new Lock();
        var tmp_interval = setInterval(function() {
            //console.log("selectInput interval");
            if (interval_locked.isLocked() || !isInputsParsed || !isDBLoaded || !isClusterStarted || !isLoggerLoaded) {
                return;
            }
            interval_locked.enter();
            clearInterval(tmp_interval);
            if (!message_obj.get('modifyConfig')) { //set to true by argv if --config is selected stops bot from starting if this option is selected

                config.pullConfig(function() {

                    mongo_pool.checkIfNewCrawl(function() {

                        //notify that bot started successfully
                        message_obj.set('success_start', true);


                        if (message_obj.get('editSeedFile')) {
                            seed.editSeedFile();
                        } else if (message_obj.get('removeSeed')) {
                            seed.removeSeed(Object.keys(message_obj.get('removeSeed'))[0]);
                        } else if (message_obj.get('seedFilePath')) {
                            seed.seedFile(message_obj.get('seedFilePath'), null, function() {
                                message_obj.set("stop_bot_and_exit");
                            });
                        } else if (message_obj.get('reset')) {
                            that.reset(function() {
                                message_obj.set('stop_bot_and_exit');
                            });
                        } else {
                            seed.pull(function() {
                                seed.readSeedFile(function readSeedFile() {
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
        var interval_locked = new Lock();
        var tmp_interval = setInterval(function() {
            //console.log("start normal interval");
            if (interval_locked.isLocked() || !isInputsParsed || !isDBLoaded || !isClusterStarted || !isNormalCrawl || !isLoggerLoaded) {

                return;
            }

            interval_locked.enter();
            clearInterval(tmp_interval);
            var botObjs = {}; //will store robots.txt data for seed links

            if (config.getConfig("allow_robots") && !process.webappOnly) {

                /*	
                	if robots.txt has to be followed
                	we have to download all robots.txt files
                */

                msg("downloading robots.txt this could take a while", "info");



                message_obj.set('robots_links', Object.keys(message_obj.get('links_store')));

                var robots = new Robots(message_obj, config.getConfig("robots_parser_threads"));

                robots.parse(function robots_init(err, obj) {

                    if (obj) {
                        msg("robots.txt parsed", "success");
                    } else {
                        msg("robots.txt parsing failed", "error");
                    }
                    message_obj.set('botObjs', obj);
                    startBotManager();


                });
            } else {
                startBotManager();

            }

            if (!process.modifyConfig && !process.editSeedFile) {
                //to disable detection of Ctrl^X if nano editor is on

                (function(crawler_obj, message_obj, msg) {

                    death(deathCleanUp);

                })(this, message_obj, msg);


            }
        }, 1000);
    };


    /**
		Performs clean up operations before closing crawler.
		@public
		@param {Function} fn - Callback
    */
    this.cleanUp = function cleanUp(fn1) {
        msg("Performing cleanUp ", "info");
        bot_obj.stopBot(function() {
            try {
                process.kill(message_obj.get('tikaPID'), "SIGINT");
            } catch (err) {
                //console.log(err);
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
                    if (fn.constructor.name === 'Function') fn();
                };
            }
            // console.log(106);
            if (!check.assigned(child_manager)) {
                child_manager = {};
                child_manager.setManagerLocked = function(fn) {

                    if (fn.constructor.name === 'Function') fn();
                };
                child_manager.killWorkers = function(fn) {

                    if (fn.constructor.name === 'Function') fn();

                };
                child_manager.flushInlinks = function(fn) {
                    if (fn.constructor.name === 'Function') fn();
                };
            }

            //console.log(107);
            child_manager.setManagerLocked(true); //lock the manager so no new childs are spawned
            //#debug#console.log(cluster.cluster_server,cluster.file_server)
            child_manager.flushInlinks(function(status) {
                //console.log(108,child_manager);

                //flush all the inlinks into db before exit
                child_manager.killWorkers(function() {
                    //console.log(109);

                    //clear timers
                    var timers = message_obj.get('my_timers');
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
                                            return fn1(true);
                                        });

                                    });
                                });
                            });





                        });


                    });
                });

            }); //kill all the workers before quiting
        })
    };


    /**
		Restarts the bot.
		@public
    */
    this.restart = function restart(fn) {
        //restart
        that.cleanUp(function(done) {
            if (done) {
                var spawn = require('child_process').spawn;
                var file_path = __dirname + '/index.js';
                var ls = spawn(config.getConfig("env"), [file_path], {
                    stdio: 'inherit'
                });
                fs.writeFileSync(__dirname + "/db/pids/active_pids.txt", ls.pid);
                //ls.stdout.pipe(process.stdout);
                //process.exit(0);			
                ls.on("exit", function() {
                    if (process.RUN_ENV === "TEST") {
                        message_obj.set("bot_stopped", true);
                    } else {
                        process.exit(0)
                    }

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
        var interval_locked = new Lock();
        var tmp_interval = setInterval(function() {
            //console.log("logger interval");
            if (interval_locked.isLocked() || !isDBLoaded) {
                return;
            }

            log = l;

            message_obj.set('log', log);


            interval_locked.enter();

            clearInterval(tmp_interval);
            isLoggerLoaded = true;
        }, 1000);
    };


    checkDependency();

    /**
		Message object which is shared with all the crawler components.
		@private
		@type {Message}
    */
    var message_obj = new Message();
    message_obj.set('crawler', this);


    //some args need to be parsed before
    var argv = require('minimist')(args);
    if (check.assigned(argv["force"])) {
        message_obj.set('force_mode', true);
    }


    /**
    	Main method of the Crawler.
    	Executes the crawler by loading all components.
    	@public
    */
    this.run = function run() {



        fs.writeFileSync(__dirname + "/db/pids/active_pids.txt", process.pid );


        var config_obj = new ConfigLoader(message_obj);
        message_obj.set('config', config_obj);
        var log_obj = new Logger(message_obj);
        var seed_obj = new SeedLoader(message_obj);
        message_obj.set('seed', seed_obj);
        var pool_obj = new Pool(message_obj);
        message_obj.set('argv', argv);
        var argv_obj = new ArgumentProcesser(message_obj);


        that.loadConfig(config_obj);
        that.loadSeed(seed_obj);
        that.loadDB(pool_obj);

        that.setLogger(log_obj);
        that.startCluster();
        that.processInput(argv_obj);
        that.selectInput();
        that.startNormalCrawl();



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
    crawler_obj = new Crawler(process.argv.slice(2));
    crawler_obj.run();

} else {

    module.exports = Crawler;

}