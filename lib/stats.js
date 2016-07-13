var parent_dir = process.getAbsolutePath(__dirname);
var proto = require(parent_dir + '/lib/proto.js');
JSONX = proto["JSONX"]; //JSON for regex support in .json files
process.getAbsolutePath = proto.getAbsolutePath;
var check = require("check-types")

/**
	Used for cluster stats for the web app.
	@constructor
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@param {Message} message_obj

*/

var Stats = function(message_obj) {
    var message = message_obj;
    var pool = message.get('pool');
    var config = message.get('config');
    var cluster = message.get('cluster');

    /**
    	Returns cluster info.
    	@public
    	@param {Function} fn - callback

    */
    this.clusterInfo = function(fn) {

        var id_name = config.getConfig('cluster_name');
        pool.stats.cluster_info(id_name, function(err, results) {
            return fn(err, results);
        });
    };
    /**
    	Returns active bots info.
    	@public
    	@param {Function} fn - callback

    */
    this.activeBots = function(fn) {
        var d = {};
        d['db_type'] = config.getConfig('db_type');
        d['db'] = config.getConfig(config.getConfig('db_type'));
        pool.stats.activeBots(function(err, docs) {
            return fn([docs, d]);
        });
    };

    /**
    	Returns crawled stats info.
    	@public
    	@param {Function} fn - callback

    */
    this.crawlStats = function(fn) {

        pool.stats.crawlStats(function(dic) {
            return fn(dic);
        });

    };

    /**
    	Returns log data.
    	@public
    	@param {String} bot_name
    	@param {String} type
    	@param {Number} lines
    	@param {Function} fn - callback

    */
    this.readLog = function(bot_name, type, lines, fn) {

        cluster.send(bot_name, {
            "readLog": {
                "type": type,
                "n": lines
            }
        }, function(status, response) {
            return fn(status, response);
        });
    };


    /**
    	Returns terminal data.
    	@public
    	@param {String} bot_name
    	@param {Function} fn - callback

    */
    this.readTerminal = function(bot_name, fn) {
        cluster.send(bot_name, {
            "readTerminal": true
        }, function(status, response) {
            return fn(status, response);
        });
    };


    /**
    	Returns config of particular bot in the cluster.
    	@public
    	@param {String} bot_name
    	@param {Function} fn - callback

    */
    this.getConfig = function(bot_name, fn) {
        pool.cluster.getBotConfig(bot_name, function(err, results) {

            try {

                return fn(err, results.config);
            } catch (err) {

                return fn(err, {});
            }
        });
    };


    /**
    	Returns seed data from cluster.
    	@public
    	@param {Function} fn - callback

    */
    this.getSeed = function(fn) {
        pool.cluster.getSeed(function(err, results) {
            try {
                return fn(err, results);
            } catch (err) {

                return fn(err, {});
            }
        });
    };


    /**
    	Returns crawled pages for API.
    	@public
    	@param {String} bot_name
    	@param {Number} i - offset
    	@param {Number} len - length
    	@param {String} sort_key
    	@param {String} sort_type
    	@param {Function} fn - callback

    */
    this.getCrawledPages = function(bot_name, i, len, sort_key, sort_type, fn) {
        if (bot_name === "master") {
            var d = {
                "crawled": {
                    $exists: true
                }
            };
        } else {
            var d = {
                "updatedBy": bot_name,
                "crawled": {
                    $exists: true
                }
            };
        }
        var sor = {};
        if (!check.assigned(sort_key)) {
            sor['lastModified'] = -1;
        } else {
            sor[sort_key] = sort_type;
        }
        pool.stats.getCrawledPages(d, len, i, sor, function(err, results, c) {
            try {

                return fn(err, results, c);
            } catch (err) {

                return fn(err, {});
            }
        });
    };

    /**
    	Returns failed pages for API.
    	@public
    	@param {String} bot_name
    	@param {Number} i - offset
    	@param {Number} len - length
    	@param {String} sort_key
    	@param {String} sort_type
    	@param {Function} fn - callback

    */
    this.getFailedPages = function(bot_name, i, len, sort_key, sort_type, fn) {
        if (bot_name === "master") {
            var d = {
                "abandoned": true
            };
        } else {
            var d = {
                "updatedBy": bot_name,
                "abandoned": true
            };
        }
        var sor = {};
        if (!check.assigned(sort_key)) {
            sor['lastModified'] = -1;
        } else {
            sor[sort_key] = sort_type;
        }
        pool.stats.getFailedPages(d, len, i, sor, function(err, results, c) {
            try {

                return fn(err, results, c);
            } catch (err) {

                return fn(err, {});
            }
        });
    };


    /**
    	Returns total buckets for API.
    	@public
    	@param {String} bot_name
    	@param {Number} i - offset
    	@param {Number} len - length
    	@param {String} sort_key
    	@param {String} sort_type
    	@param {Function} fn - callback

    */
    this.getTotalBuckets = function(bot_name, i, len, sort_key, sort_type, fn) {
        if (bot_name === "master") {
            var d = {};
        } else {
            var d = {
                "insertedBy": bot_name
            }
        }
        var sor = {};
        if (!check.assigned(sort_key)) {
            sor['lastModified'] = -1;
        } else {
            sor[sort_key] = sort_type;
        }
        pool.stats.getTotalBuckets(d, len, i, sor, function(err, results, c) {
            try {

                return fn(err, results, c);
            } catch (err) {

                return fn(err, {});
            }
        });
    };


    /**
    	Returns processed buckets for API.
    	@public
    	@param {String} bot_name
    	@param {Number} i - offset
    	@param {Number} len - length
    	@param {String} sort_key
    	@param {String} sort_type
    	@param {Function} fn - callback

    */
    this.getProcessedBuckets = function(bot_name, i, len, sort_key, sort_type, fn) {
        if (bot_name === "master") {
            var d = {
                "processingBot": {
                    $exists: true
                }
            };
        } else {
            var d = {
                "processingBot": bot_name
            }
        }
        var sor = {};
        if (!check.assigned(sort_key)) {
            sor['lastModified'] = -1;
        } else {
            sor[sort_key] = sort_type;
        }
        pool.stats.getProcessedBuckets(d, len, i, sor, function(err, results, c) {
            try {

                return fn(err, results, c);
            } catch (err) {

                return fn(err, {});
            }
        });
    };


    /**
    	Creates mongodb index for certain collection.
    	@public
    	@param {String} collection_name
    	@param {String} index_name
    	@param {Function} fn - callback

    */
    this.indexField = function indexField(collection_name, index_name, fn) {
        var d = {};
        d[index_name] = "text";
        pool[collection_name].createIndex(d, function(err, results) {
            try {

                return fn(err, results);
            } catch (err) {

                return fn(err, {});
            }
        });
    };

    /**
    	Set config for particular bot in the cluster.
    	@param {String} bot_name
    	@param {Object} js
    	@param {Function} fn
    	@public
    */
    this.setConfig = function(bot_name, js, fn) {
        //updates the config changes done from local machine to db
        //console.log(bot_name);
        //console.log(js);
        pool.stats.updateConfig(bot_name, js, function setConfig(err, results) {
            return fn(err, results);
        });
    };
    /**
    	Set seed file for cluster.
    	@param {Object} js
    	@param {Function} fn
    	@public
    */
    this.setSeed = function setSeed(js, fn) {
        //updates the seed changes done from local machine to db

        pool.stats.updateSeed(js, function(err, results) {
            return fn(err, results);
        });
    };

    /**
    	Get certain  crawled/uncrawled page for API.
    	@param {String} url
    	@param {Function} fn
    	@public
    */
    this.getPage = function getpage(url, fn) {
        pool.stats.getPage(url, function(err, data) {
            return fn(err, data);
        });
    };

    /**
    	Get certain bucket for API.
    	@param {String} url
    	@param {Function} fn
    	@public
    */
    this.getBucket = function getBucket(url, fn) {
        pool.stats.getBucket(url, function(err, data) {
            return fn(err, data);
        });
    };

    /**
    	Text search on crawled data for API.
    	@param {String} query
    	@param {Number} i - length
    	@param {Function} fn
    	@public
    */
    this.search = function search(query, i, fn) {
        pool.stats.search(query, i, function(err, results) {
            return fn(err, results);
        })
    };

    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};

module.exports = Stats;