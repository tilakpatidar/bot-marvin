var fs = require("fs");
var path = require('path');
var parent_dir = process.getAbsolutePath(__dirname);
var check = require("check-types");

/**
	Represents configuration.
	@constructor
	@param {Message} message_obj
	@author Tilak Patidar <tilakpatidar@gmail.com>

*/
var Config = function(message_obj) {

    var that = this;
    var message = message_obj;
    var proto = require(parent_dir + '/lib/proto.js');
    var JSONX = proto.JSONX;
    var ObjectX = proto.ObjectX;
    var pool;
    var OVERRIDEN_CONFIG = {};
    var DB_CONFIG = {};
    var log = message.get('log');

    /**
    	Sets the db object.
    	@public
    	@param {MongoDB} p
    */
    this.setDB = function setDB() {
        pool = message.get('pool');
    };
    /**
    	Stores config.
    	@private
    	@type Object
    */
    if (process.RUN_ENV === "TEST") {
        var config = {
            "verbose": false,
            "logging": false
        }; //by default will get overidden once config is loaded from db 
    } else {
        var config = {
            "verbose": true,
            "logging": true
        }; //by default will get overidden once config is loaded from db 
    }



    /**
    	Overrides the db and local config with command line arguments.
    	Writes the overriden config to disk.
    	Reloades config for current instance.
    	@public
    	@params {Object} dic - Parsed command line args
    */
    this.setOverridenConfig = function override(dic) {

        for (var k in dic) {
            msg("Overriden config " + k + " for value " + dic[k], "info");
        }
        if (!check.assigned(dic)) {
            //if undefined reload config from disk
            var data;
            try {
                data = fs.readFileSync(parent_dir + '/config/config_override.json').toString();
            } catch (err) {
                var stream = fs.createWriteStream(parent_dir + "/config/config_override.json");
                stream.write("{}");
                stream.end();
                data = "{}"; //JSON parse below
            }

            if (data === "") {
                data = "{}";
            }

            OVERRIDEN_CONFIG = JSON.parse(data);
        } else {
            OVERRIDEN_CONFIG = dic;
            try {
                fs.writeFileSync(parent_dir + '/config/config_override.json', JSON.stringify(dic));
            } catch (err) {
                var stream = fs.createWriteStream(parent_dir + "/config/config_override.json");
                stream.write("{}");
                stream.end();
            }

        }

    };

    /**
    		Adds db config from db_config.json to config var.
    		@private
    		@param {Object} dic - db config
	
    */
    function setDbConfig(dic) {
        if (!check.assigned(dic)) {
            //if undefined reload config from disk
            var data;
            try {
                data = fs.readFileSync(parent_dir + '/config/db_config.json').toString();
            } catch (err) {
                var stream = fs.createWriteStream(parent_dir + "/config/db_config.json");
                stream.write("{}");
                stream.end();
                stream.on("finish", function() {
                    console.log("db config for bot is not set.\nSet using bot-marvin-db");
                    message.set("stop_bot_and_exit");
                });
                return;

            }
            try {
                DB_CONFIG = JSON.parse(data);
                //console.log(DB_CONFIG);
                //file present with no json in it
            } catch (err) {
                var stream = fs.createWriteStream(parent_dir + "/config/db_config.json");
                stream.write("{}");
                stream.end();
                stream.on("finish", function() {
                    console.log("db config for bot is not set.\nSet using bot-marvin-db");
                    message.set("stop_bot_and_exit");
                });
                return;
            }

        } else {
            DB_CONFIG = dic;
            try {
                fs.writeFileSync(parent_dir + '/config/db_config.json', JSON.stringify(dic));
            } catch (err) {
                var stream = fs.createWriteStream(parent_dir + "/config/db_config.json");
                stream.write("{}");
                stream.end();
                stream.on("finish", function() {
                    console.log("db config for bot is not set.\nSet using bot-marvin-db");
                    message.set("stop_bot_and_exit");
                });
                return;
            }

        }

    }


    /**
    	Updates the config in the db for current bot.
    	@param {Object} dic - config
    	@param {Function} fn - callback
    	@public

    */
    this.updateDbConfig = function updateDbConfig(dic, fn) {

        pool.stats.updateConfig(that.getConfig('bot_name'), dic, function updateDbConfig_updateConfig(err, results) {
            var jsonx_str = new JSONX(dic);
            config = JSONX.parse(jsonx_str.stringify()); //update config var so that on bot close changes will appear
            return fn(err, results);
        });
        //updates the config changes done from local machine to db

    }

    /**
    	Fetches latest config copy from db.
    	@public
    	@param {Function} fn - callback
    */
    this.getConfigFromDb = function pullDbConfig(fn) {
        pool.config_reloader.pullDbConfig(that.getConfig('bot_name'), function pullDbConfig_pullDbConfig(err, results) {

            return fn(err, results);
        });

    };

    /**
    	Returns the config value for asked keys.
    	@public
    */
    this.getConfig = function getConfig() {
        //console.log(DB_CONFIG,"WHEN called");
        var val = config;
        if (!check.assigned(arguments[0])) {
            return config;
        }
        for (var i = 0; i < arguments.length; i++) {

            if (check.assigned(OVERRIDEN_CONFIG[arguments[i]])) {
                val = OVERRIDEN_CONFIG[arguments[i]]; //overrides the config with command line arguments
            } else if (check.assigned(DB_CONFIG[arguments[i]])) {
                val = DB_CONFIG[arguments[i]];
            } else {
                val = val[arguments[i]];
            }

        };
        return val;
    };



    /**
    	Returns globals so that new config object can be created on spawned process.
    	@public
    */
    this.getGlobals = function getGlobals() {
        var jsonx_obj = new JSONX(config);
        return [JSON.parse(jsonx_obj.stringify()), OVERRIDEN_CONFIG, DB_CONFIG];
    };

    /**
    	This pulls config from db and if config is not set display warning and stops bot.
    	@param {Function} fn - callback
    */
    this.pullConfig = function pullConfig(fn) {
        that.getConfigFromDb(function pullDbConfig(err, results) {
            if (check.emptyObject(results) || !check.assigned(results)) {
                if (!message.get('modifyConfig')) {
                    console.log("You have to set your bot config.\nRun bot-marvin --config\nRun bot-marvin --load-config <filename>");
                    message.set('stop_bot_and_exit');
                    return fn(null);
                } else {
                    return fn(null);
                }
            } else {
                config = JSONX.parse(JSON.stringify(results));
                return fn(config);
            }

        });
    };

    /**
    	This function is called in an interval to fetch and compare config. If config is changed from db it restart the bot.
    */
    function configReloader() {
        that.getConfigFromDb(function configReloader_pullDbConfig(err, new_config) {
            //console.log(new_config)
            if (check.assigned(new_config)) {
                //console.log(new_config);
                //console.log(JSON.parse(JSONX.stringify(gc())));
                var jsonx_obj = new JSONX(that.getConfig());
                if (!ObjectX.isEquivalent(new_config, JSON.parse(jsonx_obj.stringify()))) {
                    msg("Config changed from db ", "info");
                    //if local and db copy unmatches
                    //means config has been changed from db

                    message.set("restart");
                } else {
                    msg("No change in config", "info");
                }
            }
        });
    };

    var config_check_mode = setInterval(function() {

        var b = setInterval(function() {
            if (message.get('begin_intervals')) {
                configReloader();
            }


        }, 10000);
        message.get('my_timers').push(b);
        clearInterval(config_check_mode); //once intervals are set clear the main interval

    }, 5000);

    this.setOverridenConfig(); //run for first time
    setDbConfig();

    /**
		Used to call Logger object with the caller function name.
		@private
	*/
    function msg() {
        if (!check.assigned(message.get('log'))) {
            console.log(arguments[0]);
            return;
        }
        message.get('log').put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }

};


module.exports = Config;