var check = require("check-types");
var fs = require("fs");
var request = require("request");
var seed = require(__dirname + "/seed-reloader.js");
var edit = require('string-editor');

/**
	Parses and executes or returns triggers for command line args.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor 
	@param {Object} argv_obj - Arguments processed by minimist
	@param {Config} config_obj
	@param {Seed} seed_obj
	@param {Trigger} trigger_obj
*/
var ArgumentProcesser = function(argv_obj, config_obj, seed_obj, trigger_obj) {

    var proto = require(__dirname + "/proto.js");
    var JSONX = proto.JSONX;
    var parent_dir = proto.getAbsolutePath(__dirname);
    var config = config_obj;
    var seed = seed_obj;
    var args = {};
    var trigger = trigger_obj;
    var argv = argv_obj;
    
    /**
		Updates config in db.
		@param {Object} result - JSON rep of the config.
		@private
    */
    var updateConfig = function(result) {
        config.updateDbConfig(result, function(err) {
            setTimeout(function() {
                if (err) {
                    console.log("Config updated [ERROR]");
                } else {
                    console.log("Config updated [SUCCESS]");
                }
                trigger.set('stop_bot_and_exit');
            }, 2000);

        }); //regex safe json update to db
    };


    /**
		Key-Value pair rep Arg-callback
		@private
    */
    var actions = {
        "verbose": function() {
            var item = JSON.parse(argv["verbose"]);
            args['verbose'] = item;
        },
        "logging": function() {
            var item = JSON.parse(argv["logging"]);
            args['logging'] = item;
        },
        "childs": function() {
            var item = argv["childs"];
            args['childs'] = item;
        },
        "max_concurrent_sockets": function() {
            var item = argv["max_concurrent_sockets"];
            args['max_concurrent_sockets'] = item;
        },
        "batch_size": function() {
            var item = argv["batch_size"];
            args['batch_size'] = item;
        },
        "force": function() {
            trigger.set('force_mode', true);
        },
        "reset": function() {
           trigger.set('reset', true);
        },
        "loadSeedFile": function() {
        	trigger.set('seedFile',argv['loadSeedFile']);
        },
        "editSeedFile": function() {
            trigger.set('editSeedFile', true);
            args["verbose"] = false;
            args["logging"] = false;
            trigger.set('webappOnly', true);
        },
        "removeSeed": function() {
        	trigger.set('removeSeed',{});
        	trigger.get('removeSeed')[argv["removeSeed"]] = true;
        },
        "webapp": function() {
            trigger.set('webappOnly', true);
        },
        "allow_robots": function() {
            var item = JSON.parse(argv["allow_robots"]);
            args['allow_robots'] = item;
        },
        "external_links": function() {
            var item = JSON.parse(argv["external_links"]);
            args['external_links'] = item;
        },
        "parse_sitemaps": function() {
            var item = JSON.parse(argv["parse_sitemaps"]);
            args['parse_sitemaps'] = item;
        },
        "config": function() {
            trigger.set('modifyConfig', true);
            config.getConfigFromDb(function(err, result) {
                if (err || (!check.assigned(err) && !check.assigned(result))) {
                    //config not present in the db user want to set it first time
                    var c = require(parent_dir + "/config/config.js").load();
                    
                    var jsonx_str = new JSONX(c);

                    edit(c.stringify(), "config.json", function(err, result) {
                        // when you are done editing result will contain the string 
                        console.log("Updating config please wait!");
                        //console.log(result)
                        var dic = JSONX.parse(result);
                        updateConfig(JSON.parse(result));

                    });
                } else {
                    //config update
                    var c = result;
                    edit(JSON.stringify(c, null, 2), "config.json", function(err, result) {
                        // when you are done editing result will contain the string 
                        console.log("Updating config please wait!");
                        //console.log(result)
                        var dic = JSONX.parse(result);
                        updateConfig(JSON.parse(result));

                    });
                }
            });
            args["verbose"] = false;
            args["logging"] = false;
            trigger.set('webappOnly', true);
        },
        "dump-config": function() {
            trigger.set('modifyConfig', true);
            var p = require("path");
            var path_json = p.join(argv["dump-config"], "config.json");
            console.log(path_json);
            var config_str;
            config.getConfigFromDb(function(err, result) {
                if (err || (!check.assigned(err) && !check.assigned(result))) {
                    var c = require(parent_dir + "/config/config.js").load();
                    config_str = c;
                } else {
                    var c = result;
                    config_str = c;
                }
                var stream = fs.createWriteStream(path_json);
                stream.write(JSON.stringify(config_str, null, 2));
                stream.end();
                stream.on('finish', function() {
                    trigger.set('stop_bot_and_exit');
                });

            });
            args["verbose"] = false;
            args["logging"] = false;
            trigger.set('webappOnly', true);
        },
        "load-config": function() {
            trigger.set('modifyConfig', true);
            console.log("Updating config please wait!");
            //console.log(result)
            var path_json = argv["load-config"];
            var json_str = fs.readFileSync(path_json).toString();
            updateConfig(JSON.parse(json_str));


            args["verbose"] = false;
            args["logging"] = false;
            trigger.set('webappOnly', true);
        },
        "help": function() {
            console.log("For help options run \"man bot-marvin\"");
            trigger.set('stop_bot_and_exit');
        }
    }

    /**
		Set triggers for supplied args and returns overriden config.
		@public
    */
    this.parse = function() {
    	//console.log("Command line argv recieved "+JSON.stringify(argv), "info");
        for (var key in actions) {
            if (check.assigned(argv[key])) {
                actions[key]();
            }
        }
        //console.log(args);
        return args;
    };
};


module.exports = ArgumentProcesser;

