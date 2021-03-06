var parent_dir = process.getAbsolutePath(__dirname);
var Stats = require(parent_dir + '/lib/stats.js');
var enableGracefulShutdown = require('server-graceful-shutdown');
var request = require("request");
var url = require('url');
var sf = require('slice-file');
var check = require("check-types");


/**
	Represents a cluster. Perform communication between Bots and cluster management.
	@constructor
	@param {Message} message_obj
	@author Tilak Patidar <tilakpatidar@gmail.com>
*/
var Cluster = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');
    var pool = message.get('pool');
    var port_occupied = false;

    var loopback_token;
    var cluster_info;
    var log = message.get('logger');
    var that = this;
    var bot_o;


    /**
    	Sets bot object into the cluster.
    	@public
    	@param {Bot} b
    */
    this.setBot = function setBot() {
        bot_o = message.get('bot');
    };

    var server = require('http').createServer(function(request, response) {
        var urlparts = url.parse(request.url.toString(), true);
        var js = JSON.parse(urlparts.query.msg);
        switch (Object.keys(js)[0]) {

            case "readLog":
                if (js["readLog"]["type"] === "head") {
                    var words = sf(parent_dir + "/log/test.log");
                    words.slice(0, js["readLog"]["n"]).pipe(response);
                } else if (js['readLog']['type'] === "tail") {
                    var words = sf(parent_dir + "/log/test.log");
                    words.slice(js["readLog"]["n"] * (-1)).pipe(response);
                }
                break;
            case "readTerminal":
                response.write(JSON.stringify(log.getTerminalData()));
                response.end();
                break;
            case "active":
                response.write(JSON.stringify({
                    "active": true
                }));
                response.end();
                break;
            case "command":
                if (js["command"] === "exit") {
                    //console.log(js);
                    var dic = {
                        "output": "ack"
                    };
                    if (loopback_token === js["loopback_token"]) {
                        //calling same bot
                        dic["loopback"] = true;
                    }

                    response.write(JSON.stringify(dic));
                    response.end();
                    if (loopback_token !== js["loopback_token"]) {
                        process.nextTick(function() {
                            message.set("grace_exit");
                        });
                    }


                } else if (js["command"] === "isActive") {
                    var dic = {
                        "output": true
                    };
                    response.write(JSON.stringify(dic));
                    response.end();
                }
                break;
        };


    });

    /**
    	Stat object
    	@private
    	@param {Message}
    	@type Stat
    */
    var stats_obj = new Stats(message);
    stats_obj.activeBots(function activeBots(results) {
        msg("Obtained cluster info ", "success");
        cluster_info = {};
        for (var i = 0; i < results[0].length; i++) {
            cluster_info[results[0][i]["_id"]] = results[0][i];
        };

        msg("Joining the cluster ", "info");
        server.listen(config.getConfig('cluster_port'));
        //console.log(config.getConfig('cluster_port'), "HEREE")

        server.on("listening", function server_on_listening() {
            msg("bot listening on port " + config.getConfig('cluster_port'), "success");
            enableGracefulShutdown(server);
            msg("Server is listening Joining the cluster", "success");

        });


        server.on("error", function server_on_error(e) {
            port_occupied = true;
            if (e.code === "EADDRINUSE") {
                msg("cluster client occupied maybe an instance is already running ", "error");
            }


        });
    });


    /**
    	Sends a msg to another bot.
    	@public
    	@param {String} to - bot_name
    	@param {Object} msg
    	@param {Function} fn - callback
    */
    this.send = function send(to, msg, fn) {
        if (config.getConfig("bot_name") === to) {
            //loopback request to same bot which is processing
            var m = Object.keys(msg)[0];
            switch (m) {
                case "readLog":
                    if (msg["readLog"]["type"] === "head") {
                        var words = sf(parent_dir + "/log/test.log");
                        var st = words.slice(0, msg["readLog"]["n"]);
                        var data = "";
                        st.on("data", function(chunk) {
                            data += chunk.toString();
                        });
                        st.on("end", function() {
                            return fn(true, data);

                        });

                    } else if (msg['readLog']['type'] === "tail") {
                        var words = sf(parent_dir + "/log/test.log");
                        var data = "";
                        var st = words.slice(msg["readLog"]["n"] * (-1));
                        st.on("data", function(chunk) {
                            data += chunk.toString();
                        });
                        st.on("end", function() {
                            return fn(true, data);
                        });
                    }
                    break;
                case "readTerminal":
                    return fn(true, JSON.stringify(log.getTerminalData()));
                    break;
                case "active":
                    return fn(true, JSON.stringify({
                        "active": true
                    }))
                    break;
            }

            return;
        }
        if (cluster_info[to]) {
            //bot exists
            var host_name = "http://" + cluster_info[to]["config"]["network_host"] + ":" + cluster_info[to]["config"]["cluster_port"] + "/?msg=" + JSON.stringify(msg);
            //console.log(host_name);
            request(host_name, function(err, response, html) {

                if (!err) {
                    var js = html;
                    return fn(true, js);
                } else {
                    return fn(false, null);
                }
            });
        } else {
            return fn(false, null);
        }
    };


    /**
    	Removes the bot from the cluster.
    	@public
    	@param {String} bot_name
    */
    this.removeBot = function removeBot(bot_name) {
        that.closeBot(bot_name, function closeBot3(closed) {

        });
    };

    /**
    	Sends a msg to another bot by host and port params.
    	@public
    	@param {String} host
    	@param {String} port
    	@param {Object}	msg
    	@param {Function} fn - callback
    */
    this.sendTo = function sendTo(host, port, msg, fn) {
        var host_name = "http://" + host + ":" + port + "/?msg=" + JSON.stringify(msg);
        request(host_name, function(err, response, html) {
            if (!err) {
                var js = response.body;
                return fn(true, js);
            } else {
                return fn(false, null);
            }
        });
    };


    /**
    	
    	Returns bot config of another bot in the cluster.
    	@public
    	@param {String} bot_name
    	@param {Function} fn - callback

    */
    this.getBotConfig = function getBotConfig(bot_name, fn) {
        pool.cluster.getBotConfig(bot_name, function(err, results) {

            if (!err) {
                return fn(results.config);
            } else {
                return fn(null);
            }
        });
    };

    /**
    	Returns info about current cluster master.
    	This method is also called periodically to refetch master and other bot info.
    	@public
    	@param {Function} fn - callback
    */
    this.getMaster = function getMaster(fn) {

        stats_obj.activeBots(function activeBots2(results) {

            msg("Obtained cluster info ", "success");
            cluster_info = {};
            for (var i = 0; i < results[0].length; i++) {
                cluster_info[results[0][i]["_id"]] = results[0][i];
            };
            pool.cluster.getMaster(function getMaster2(res) {
                return fn(res);
            });
        });


    };

    /**
    	Sends close request to the specified bot.
    	@public 
    	@param {String} bot_name
    	@param {Function} fn - callback
    */
    this.closeBot = function closeBot(bot_name, fn) {
        that.getBotConfig(bot_name, function(c) {
            //console.log(c,"cccccc")
            //get the config for the same bot
            loopback_token = parseInt(Math.random() * 100000) + "" + new Date().getTime();
            that.sendTo(c.network_host, c.cluster_port, {
                "command": "exit",
                "loopback_token": loopback_token
            }, function(status, results) {
                var js = JSON.parse(results);
                //console.log(js);
                //if js is null reply that means the cluster server of the bot is shut down

                if (!check.assigned(js) || (js["output"] === "ack" && check.assigned(js["loopback"]))) {
                    //the other bot was on the same system and was not shut gracefully
                    //console.log("tilakksks");
                    bot_o.stopBot(function stopBot1(st) {
                        if (st) {
                            msg('The bot with same bot_name was killed gracefully', 'success');

                            return fn(true);
                        } else {
                            msg("Unable to kill the other bot same bot_name. Kill manually", 'error');
                            return fn(false);
                        }
                    });
                } else if (js["output"] === "ack" && !check.assigned(js["loopback"])) {
                    //this case is for bots running on other systems
                    //or if on same systems both are alive

                    //ack means the other bot has got your command
                    setTimeout(function() {
                        //waiting enough time for the other bot to get killed
                        that.sendTo(c.network_host, c.cluster_port, {
                            "command": "isActive"
                        }, function(status1, results1) {
                            //console.log("status   ! "+status);
                            if (!status || port_occupied) {
                                //no response from other bot this means it is closed
                                bot_o.stopBot(function stopBot1(st) {
                                    if (st) {
                                        msg('The bot with same bot_name was killed gracefully', 'success');
                                        if (port_occupied) {
                                            server.listen(config.getConfig("cluster_port"));
                                            server.on("listening", function server_on_listening1() {
                                                msg("Server is listening Joining the cluster", "success");
                                                return fn(true);
                                            });
                                            server.on("error", function server_on_error_1(e) {
                                                port_occupied = true;
                                                if (e.code === "EADDRINUSE") {
                                                    msg("cluster client occupied maybe an instance is already running ", "error");
                                                }
                                                return fn(false);

                                            });
                                        }
                                        return fn(true);
                                    } else {
                                        msg("Unable to kill the other bot same bot_name. Kill manually", 'error');
                                        return fn(false);
                                    }
                                });
                            } else {
                                msg("Unable to kill the other bot same bot_name. Kill manually", 'error');
                                return fn(false);
                            }
                        });
                    }, 10000);

                } else {
                    msg("Unable to kill the other bot same bot_name. Kill manually", 'error');
                    return fn(false);
                }

            });


        });



    };


    /**
        Used to call Logger object with the caller function name.
        @private
    */
    function msg() {
        message.get('log').put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    };
}


module.exports = Cluster;