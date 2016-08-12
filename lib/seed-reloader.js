var fs = require("fs");
var path = require('path');
var parent_dir = process.getAbsolutePath(__dirname);
var _ = require("underscore");
var proto = require(parent_dir + '/lib/proto.js');
var JSONX = proto.JSONX;
var ObjectX = proto.ObjectX;
var check = require("check-types");
var edit = require('string-editor');
var crypto = require('crypto');
var ObjectId = require('mongodb').ObjectId;
var Sitemap = require(parent_dir + '/lib/sitemap_parser');
var Bucket = require(parent_dir + '/lib/bucket.js');
/**
	Represent crawler seed loader.
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Message} message_obj

*/


var SeedLoader = function SeedReloader(message_obj) {
    var seed = {};
    var that = this;
    var message = message_obj;
    var config = message.get('config');
    var pool;
    var log;
    var URL = require(parent_dir + '/lib/url.js');

    /**
    	Injecting Logger obj
    	@public
    	@param {Logger} l
    */
    this.setLogger = function setLogger(l) {
        log = l;
    };

    /**
    	Injecting MongoDB obj
    	@public
    	@param {MongoDB} pool_obj
    */
    this.setDB = function setDB() {
        pool = message.get('pool');
    };

    /**
    	Stores seed info for all the domains. "{'http://www.googl.com':{'parseFile':'nutch', 'fetch_interval': 'monthly'}}""
    	@private
    	@type {Object}
    */
    message.set('links_store', {});


    /**
    		Generates MD5 hash of any string
    		@private
    		@param {String} str
    	*/
    function generateMD5(str) {

        var md5sum = crypto.createHash('md5');
        md5sum.update(str);
        var hash = md5sum.digest('hex');
        return hash;
    }


    /**
    	Return seed info.
    	@param [Array] var_args - accepts var_args for domain names
    	@public

    */
    this.getSeed = function gs() {
        var val = seed;
        if (!check.assigned(arguments[0])) {
            return seed;
        } else {
            return seed[arguments[0]];
        }
        return val;
    };

    /**
    	Updates local copy of the seed file
    	@public
    	@param {Object} dic - JSON representation of the seed file

    */
    this.updateLocalSeed = function uls(dic) {

        fs.writeFileSync(parent_dir + "/config/seed.json", JSON.stringify(dic, null, 2));
        //console.log("RESTSRT")
        message.set("restart"); //will be caught by death and it will cause to restart

    };

    /**
    	Pulls updated copy from db.
    	@public
    	@param {Function} fn - callback

    */
    this.pullSeedFromDB = function pullSeedFromDB(fn) {
        pullSeedLinks(function pullDbSeed_pullSeedLinks(err, results) {
            //console.log(err,results)
            return fn(err, results);
        });
    };

    /**
    	Removes a seed by domain name
    	@public
    	@param {String} host
    */
    this.removeSeed = function removeSeed(host) {
        var cluster_name = config.getConfig("cluster_name");
        pool.seed_collection.removeOne({
            "_id": host
        }, function(err, result) {
            message.set("stop_bot_and_exit");
        });
    };




    var getCurrentDomain = function bucketoperation_getCurrentDomain(interval) {


        //console.log(that.bucket_priority)
        var domain = message.get('bucket_priority')[interval].splice(0, 1)[0];


        return domain;
    };

    this.getParsers = function getParsers(fn) {

        pool.parsers_collection.find({}, {}).toArray(function(err, docs) {
            for (var i = 0; i < docs.length; i++) {
                var d = docs[i];
                if (fs.existsSync(parent_dir + "/parsers/" + d["_id"] + ".js")) {
                    //exists now chech the hash
                    var data = d["data"].value();
                    var hash = generateMD5(data);
                    if (hash !== d["hash"]) {
                        //#debug#console.log("thre");
                        fs.writeFileSync(parent_dir + "/parsers/" + d["_id"] + ".js", d["data"].value());
                    }
                } else {
                    //file not exists
                    fs.writeFileSync(parent_dir + "/parsers/" + d["_id"] + ".js", d["data"].value());
                }
            };
            fn();
            return;

        });
    };
    /**
    		Seeds the crawler
    		@param {Function} - fn
    		@public
    */
    this.seed = function seed(fn) {
        var sitemap_links = [];
        that.getParsers(function() {
            var done = 0;
            var success = 0;
            var stamp1 = new Date().getTime() - 2000; //giving less time

            //generate seed buckets from domain_groups
            //console.log(message.get('domain_group'));
            var mul_buckets = [];
            _.each(message.get('domain_group'),function(sub_group) {
               
                var domains = sub_group["_id"];
                var links = _.pluck(sub_group["domains"], "_id");
                if (sub_group["bot_name"] === config.getConfig("bot_name")) {
                    sitemap_links = sitemap_links.concat(links);
                }
                var fetch_interval = sub_group["fetch_interval"];
                mul_buckets.push({
                    "_id": ObjectId(),
                    "domains": domains,
                    "links": links,
                    "score": 1,
                    "recrawlLabel": fetch_interval,
                    "underProcess": false,
                    "insertedBy": config.getConfig("bot_name"),
                    "recrawlAt": stamp1,
                    "numOfLinks": links.length
                });
            });

            try {
                pool.bucket_collection.insertMany(mul_buckets, {
                    ordered: false
                }, function(err, doc) {
                    var successfull = doc['insertedIds'];
                    if (!check.assigned(successfull)) {
                        var successfull = _.pluck(doc.getInsertedIds(), '_id');
                    }
                    var inserted_docs = [];
                    mul_buckets = _.indexBy(mul_buckets, "_id");

                    //now check how many sub groups buckets were successfully inserted
                    //and the insert urls from those buckets
                    _.each(successfull, function(domain_group_id){

                        var sub_group = mul_buckets[domain_group_id];
                        //console.log(sub_group);
                        if (check.assigned(sub_group)) {
                            var links = sub_group["links"];
                            //console.log(links);
                            var fetch_interval = sub_group["recrawlLabel"];

                            for (var i = 0; i < links.length; i++) {

                                var anon = (function(domain, fetch_interval, stamp) {

                                    var md5 = ObjectId().toString() + "fake" + parseInt(Math.random() * 10000);
                                    inserted_docs.push({
                                        "url": domain,
                                        "bucket_id": ObjectId(stamp),
                                        "domain": domain,
                                        "partitionedBy": config.getConfig("bot_name"),
                                        "bucketed": true,
                                        "fetch_interval": fetch_interval,
                                        "level": 1,
                                        "md5": md5
                                    });

                                    //for $in in sitemap collection


                                });

                                anon(links[i], fetch_interval, domain_group_id);

                            };
                        }
                    });

                    var regex_urlfilter = {
                        'accept': config.getConfig('accept_regex'),
                        'reject': config.getConfig('reject_regex')
                    };
                    //console.log(regex_urlfilter)
                    var sitemap = new Sitemap(message_obj);
                    sitemap.queueSitemaps(sitemap_links);

                    if (inserted_docs.length === 0) {

                        return fn(false);
                    }

                    pool.mongodb_collection.insertMany(inserted_docs, {
                        ordered: false
                    }, function initBySeed(err, doc) {



                        if (err) {
                            msg("pool.init maybe seed is already added", "error");
                        }

                        var successfull = doc['insertedIds'];
                        if (!check.assigned(successfull)) {
                            var successfull = _.pluck(doc.getInsertedIds(), '_id');
                        }

                        msg(("Added seeds to initialize pool"), "success");

                        if (successfull.length === 0) {
                            that.bucket_collection.remove({
                                "_id": {
                                    "$in": ObjectId(Object.keys(mul_buckets))
                                }
                            }, function() {
                                //if urls are not inserted due to duplicate reason then remove all buckets
                                fn(true);
                                return;

                            });
                        } else {
                            fn(true);
                            return;
                        }

                        fn(false);
                        return;




                    });

                });
            } catch (e) {
                console.log(e);
            }







        });
    };


    this.generateSubLists = function generateSubLists(results, fn) {

        //create bot_priority array from results
        _.sortBy(results, "priority", this).reverse(); //descending order


        var intervals = _.pluck(results, 'fetch_interval');

        intervals = _.uniq(intervals);

        var dict = {};

        for (var i = 0; i < intervals.length; i++) {

            dict[intervals[i]] = [];

        };

        _.each(results, function(res) {
            dict[res['fetch_interval']].push(res);
        });

        //delete results;

        message.set('bucket_priority', dict);
        //console.log("RES START",that.bucket_priority,"RES");



        var domain_group = [];
        //list is nested list with each list having domains and last element having md5 hash of domains concataneated
        //each sublist priority sums to 100 and all of them having same fetch_interval


        var n_domains = _.size(message.get('links_store'));

        var interval_size = _.size(intervals);
        //console.log(intervals,n_domains, interval_size);
        var completed = 0;
        pool.bot_collection.find({}).toArray(function(err, docs) {
            var bots;
            if (check.assigned(docs)) {
                bots = _.pluck(docs, '_id');
            }




            var bot_count = bots.length;
            //console.log("INTERVALS START",intervals,"INTERVALS");
            _.each(intervals, function(k) {

                msg('Generating sublist for ' + k + ' interval', 'info');
                while (true) {
                    var domains = [];
                    var summer = 0;
                    var continue_flag = false;
                    var iterations = 0;
                    while (summer < 100) {
                        message.get('bucket_priority')[k].push("begin"); //marker element
                        var d = getCurrentDomain(k);
                        iterations += 1;
                        //console.log(d)
                        if (d === "begin") {
                            //when round is complete
                            if (domains.length === 0) {
                                //entire round is complete and still we got zero domains
                                continue_flag = true; //got nothing skip this fetch_interval
                            } else {
                                continue_flag = false; //was not able to add up to 100 
                            }
                            message.get('bucket_priority')[k].splice(0, 1)[0];
                            message.get('bucket_priority')[k].push("begin"); //marker element
                            break;
                        }

                        if (d["fetch_interval"] !== k) {
                            //if fetched domain does not have the fetch interval we are looking for
                            message.get('bucket_priority')[k].push(d); //not req thus push in queue again
                            continue;
                        }


                        summer += d["priority"];
                        domains.push(d);


                        if (summer === 100) {
                            //when ratio is complete break
                            break;
                        } else if (summer > 100) {
                            //retrace if sum > 100
                            summer -= d["priority"];


                            message.get('bucket_priority')[k] = [d].concat(message.get('bucket_priority')[k]);

                            domains.pop();
                            break;
                        }
                    }
                    //console.log(domains,k)

                    if (continue_flag || domains.length === 0) {
                        //breaks the main while true loop
                        interval_size -= 1;
                        //#debug#console.log("skip");
                        break;
                    }



                    var domains_str = _.pluck(domains, '_id');
                    domains_str = domains_str.join();
                    //console.log(domains_str,"domains_str");
                    var hash = generateMD5(domains_str);

                    msg('Got domains ' + hash + ' for fetch_interval ' + k + ' for bucket creator', 'info');
                    //#debug#console.log("heree")

                    domain_group.push({
                        "_id": hash,
                        "domains": domains,
                        "fetch_interval": k
                    });

                }

            });
            //delete that.bucket_priority;
            //console.log(that.domain_group.length, "SUBLIST LEN");
            var docs_temp = [];
            var n = domain_group.length / bots.length;
            _.range(bots.length).map(function(i) {
                var arr = domain_group.slice(i * n, (i + 1) * n);
                // console.log(arr);
                _.each(arr, function(elem, index) {
                    arr[index]["bot_name"] = bots[i];
                });

                docs_temp = docs_temp.concat(arr);


            });



            //console.log(docs_temp, "docs_temp");
            //return fn();
            pool.domain_group_collection.insertMany(docs_temp, {
                ordered: false
            }, function bulkInsertSublist() {
                msg("Sub list dumped in db", 'success');
                return fn();
            });
        });
    };

    /**
    	Reads, parses and inserts seed file into db.
    	@public
    	@param {String} path - path to seed.json
    	@param {Object} seed_data - if you do not have path, and want to insert already parsed data
    	@param {Function} fn - callback
    */
    this.seedFile = function seedFile(path, seed_data, fn) {
        //will seed the bot and exit gracefully
        var json;
        if (check.assigned(path)) {
            //data is not provided
            check.assert.assigned(path, "file path cannot be undefined")
                // \n$ to remove extra \n at end
            var data = fs.readFileSync(path).toString().replace(/\t{2,}/gi, "\t").replace(/\n{2,}/gi, "\n").replace(/\n$/gi, "");
            json = JSON.parse(data);
        } else {
            //data is provided
            json = seed_data;
        }

        var done = 0;
        var limit = _.size(json);
        var parsers = _.uniq(_.pluck(json, 'parseFile'));
        //backup old seed collection
        moveSeedCollection(function() {
            try {
                if (limit === 0) {
                    //empty obj means just clear the seed file
                    return successSeedCollection(function() {
                        fn();
                    });
                }
                var inserted_docs = [];

                _.each(json, function(obj) {
                    
                    (function(a, b, dd, ee, ff) {


                        that.insertSeed(a, b, dd, ee, ff, function insertSeed(status) {
                            //console.log(arguments);
                            if (status[0]) {

                                inserted_docs.push(status[1]);
                            } else {
                                msg("Failed to seed url " + a, "error");
                            }
                            done += 1;
                            if (done === limit) {
                                pool.seed_collection.insertMany(inserted_docs, function seedInsertMany(e, doc) {

                                    var successfull = doc['insertedIds'];
                                    if (!check.assigned(successfull)) {
                                        var successfull = _.pluck(doc.getInsertedIds(), '_id');
                                    }
                                    var s = [];

                                    //only taking successfull inserted seeds for sublist creation
                                    var dd = _.indexBy(inserted_docs, '_id');
                                    //console.log("32@",dd,"21@");

                                    for (var i = 0; i < successfull.length; i++) {
                                        var id = successfull[i].toString();
                                        //000000msg("Seeded " + id,"success");
                                        s.push(dd[id]);
                                    };
                                    //console.log(s,"35@");
                                    //delete inserted_docs;
                                    //console.log("TILAK1",s,"TILAK");
                                    //drop tmp seed collections
                                    msg("Partioning seed list", "info");
                                    //console.log(s);
                                    that.generateSubLists(s, function() {
                                        var size = _.size(parsers);
                                        var counter = 0;
                                        //console.log(parsers);
                                        _.each(parsers, function(parseFile){
                                            (function(parseFile) {
                                                pool.insertParseFile(parseFile, function(parseFileUpdated) {

                                                    ++counter;
                                                    //console.log(counter,'\t',size);
                                                    if (counter === size) {
                                                        //console.log(inserted_docs);

                                                        successSeedCollection(function() {
                                                            if (!check.assigned(fn)) {
                                                                message.set("stop_bot_and_exit");

                                                            } else {
                                                                fn();
                                                            }
                                                        });


                                                        return;
                                                    }

                                                });

                                            })(parseFile);

                                        });


                                    });
                                });
                            }
                        });
                    })(obj["_id"], obj["parseFile"], obj["priority"], obj["fetch_interval"], obj["limit_depth"]);
                });
            } catch (err) {
                //restore from old collection
                console.log(err);
                restoreSeedCollection(function restoreSeedCollection() {
                    msg("Exception occured while updating seed file", "error");
                    msg("Restoring old seed file", "info");
                });
            }


        });





    };

    function moveSeedCollection(fn) {

        pool.seed_collection.rename("seed_tmp", function() {
            pool.domain_group_collection.rename("domain_groups_tmp", function() {
                pool.seed_collection = pool.db.collection(config.getConfig("mongodb", "seed_collection"));
                pool.domain_group_collection = pool.db.collection(pool.domain_group_collection_name);
                fn();
            });
        })
    };

    function restoreSeedCollection(fn) {

        pool.db.collection(config.getConfig("mongodb", "seed_collection")).drop(function() {
            pool.db.collection("seed_tmp").rename(config.getConfig("mongodb", "seed_collection"), function() {
                that.seed_collection = pool.db.collection(config.getConfig("mongodb", "seed_collection"));
                pool.db.collection("seed_tmp").drop(function() {
                    pool.db.collection(pool.domain_group_collection_name).drop(function() {
                        pool.db.collection("domain_groups_tmp").rename(domain_group_collection, function() {
                            that.domain_group_collection = pool.db.collection(pool.domain_group_collection_name);
                            pool.db.collection("domain_groups_tmp").drop(function() {
                                fn();
                            });
                        });
                    });
                });
            });
        });


    };

    function successSeedCollection(fn) {

        pool.db.collection("seed_tmp").drop(function() {
            pool.db.collection("domain_groups_tmp").drop(function() {
                fn();
            });
        });
    };

    var pullSeedLinks = function pullSeedLinks(fn) {

        pool.domain_group_collection.find({
            "bot_name": config.getConfig("bot_name")
        }).toArray(function(err, results) {
            if (check.emptyArray(results)) {
                fn(err, null);
                return;
            }
            var seeds = results;
            if (check.emptyObject(seeds)) {
                fn(err, null);
                return;
            }
            if (!err) {
                fn(err, _.flatten(_.pluck(seeds, "domains")));
                return;
            } else {
                fn(err, null);
                return;
            }

        });
    };


    var seedReloader = function seedReloader() {

        pool.pullSeedLinks(function(new_config) {
            if (check.assigned(new_config)) {
                fs.writeFile(parent_dir + "/config/seed.json", JSON.stringify(new_config, null, 2), function writeSeedFile() {
                    if (!ObjectX.isEquivalent(new_config, that.seed_db_copy)) {

                        msg("Seed Links changed from db ", "info");
                        message.set("restart"); //will be caught by death and it will cause to restart



                    } else {
                        msg("No change in seed links", "info");
                    }
                });
            }
        });
    };


    var parserReloader = function parserReloader() {
        msg("Checking parsers for recent commits", "info");
        pool.parsers_collection.find({}).toArray(function getNewParsers(err, results) {
            for (var i = 0; i < results.length; i++) {
                var doc = results[i];
                var data = fs.readFileSync(parent_dir + '/parsers/' + doc["_id"] + ".js");
                var hash = generateMD5(data.toString());
                if (hash !== doc["hash"]) {
                    msg("Parsers changed from server restarting . . .", "info");
                    message.set("restart", true);
                }
            };
        });
    };

    /**
    	Pulls updated seed copy and if not exists stops the crawler.
    	@public
    	@param {Function} fn - callback

    */
    this.pull = function pull(fn) {
        that.pullSeedFromDB(function pullDbSeed(err, results) {
            //console.log(err,results)
            if (err || (!check.assigned(err) && !check.assigned(results))) {
                console.log("You have to seed the crawler.\nUse bot-marvin --loadSeedFile <file_path>")
                console.log("Or use bot-marvin --editSeedFile to edit seed file here.");
                message.set("stop_bot_and_exit");
                return fn();
            } else {
                seed = results;
                return fn();
            }
        });
    };



    this.insertSeed = function insertSeed(url, parseFile, priority, fetch_interval, limit_depth, fn) {

        try {
            //this initialization is placed at readseedfile and insertseedfile
            //because on --loadseedfile readseedfile is not called
            var regex_urlfilter = {};
            regex_urlfilter["accept"] = config.getConfig("accept_regex");
            regex_urlfilter["reject"] = config.getConfig("reject_regex");
            message.set('regex_urlfilter', regex_urlfilter);

            //console.log(regex_urlfilter);
            /**
            	Represent URL object.
            	@private
            	@type {URL}

            */
            URL = new URL(message);
        } catch (err) {
            //console.log(err);
        }


        priority = parseInt(priority);

        if (!check.number(priority) || priority > 100) {
            fn([false, {}]);
            return;
        }

        //console.log(url);
        var url = URL.url(url).details.url;
        if (!check.assigned(fetch_interval)) {
            fetch_interval = config.getConfig("default_recrawl_interval");
        }
        if (!check.assigned(priority) || !check.assigned(parseFile)) {
            fn([false, {}]);
            return;
        }
        var d = {
            "_id": url,
            "parseFile": parseFile,
            "priority": priority,
            "fetch_interval": fetch_interval,
            "limit_depth": limit_depth
        };
        //console.log(d);
        return fn([true, d]);




    };

    this.readSeedFile = function readSeedFile(fn) {

        try {
            //this initialization is placed at readseedfile and insertseedfile
            //because on --loadseedfile readseedfile is not called
            var regex_urlfilter = {};
            regex_urlfilter["accept"] = config.getConfig("accept_regex");
            regex_urlfilter["reject"] = config.getConfig("reject_regex");
            message.set('regex_urlfilter', regex_urlfilter);
            //console.log(regex_urlfilter);
            /**
            	Represent URL object.
            	@private
            	@type {URL}

            */
            URL = new URL(message);

            var bucket_obj = new Bucket(message);

        } catch (err) {
            //console.log(err);
        }



        pool.domain_group_collection.find({
            "bot_name": config.getConfig("bot_name")
        }).toArray(function readSeedCol(err, results) {

            message.set('domain_group', _.clone(results));
            //console.log(message.get('domain_group'), "domain_group");
            if (results.length === 0) {
                //empty seed file
                msg("Empty seed file", "error");
                message_obj.set("stop_bot_and_exit");
                fn([], []);
                return;
            }
            message.set('alloted_domain_groups', _.flatten(_.pluck(results, '_id')));
            //console.log(message.get('alloted_domain_groups'), 'alloted_domain_groups');
            results = _.flatten(_.pluck(results, "domains"));
            var intervals = _.pluck(results, 'fetch_interval');
            intervals = _.uniq(intervals);
            results = _.indexBy(results, '_id');



            var hash = generateMD5(JSON.stringify(results));

            that.seed_db_copy = hash; //stored for future comparision now hash comparision


            var dict = {};

            for (var i = 0; i < intervals.length; i++) {

                var tmp = message.get('distinct_fetch_intervals')
                tmp[intervals[i]] = true; //mark the fetch interval for bucket creation
                message.set('distinct_fetch_intervals', tmp);
                dict[intervals[i]] = [];

            };





            message.set('links_store', results);
            //console.log(message.get('links_store'), 'links_store');

            // links_store is json with domains as keys
            // that.bucket_priority is list of seed jsons

            fn(results);
            return;
        });



    };

    /**
    	Opens a nano like editor for editing seed file.
    	@public
    	@param {Function} fn

    */
    this.editSeedFile = function editSeedFile(fn) {
        that.pullSeedFromDB(function editSeedFile_pullDbSeed(err, results) {
            if (err || (!check.assigned(err) && !check.assigned(results))) {
                var execSeedFile = false;
                edit("[]", "seed.json", function edit1(err, result) {
                    // when you are done editing result will contain the string 
                    console.log("Updating seed please wait!");
                    //console.log(result)
                    try {
                        var seed_data = JSON.parse(result);
                        execSeedFile = true;
                    } catch (err) {
                        result = result.replace(/\s/gi, '');
                        if (result === "" || result === "{}" || result === "[]") {
                            seed_data = {};
                        } else {
                            msg("JSON format error", "error");
                            message.set("stop_bot_and_exit");
                            return fn();
                        }
                    }
                    if (execSeedFile) {
                        seedFile(null, seed_data, function() {
                            console.log("Seed updated [SUCCESS]");
                            message.set("stop_bot_and_exit");
                            return fn();

                        });
                    }

                });
            } else {
                var con = results;
                var execSeedFile = false;
                edit(JSON.stringify(con, null, 2), "seed.json", function edit(err, result) {
                    // when you are done editing result will contain the string 
                    console.log("Updating seed please wait!");
                    try {
                        var seed_data = JSON.parse(result);
                        execSeedFile = true;
                    } catch (err) {
                        result = result.replace(/\s/gi, '');
                        if (result === "" || result === "{}" || result === "[]") {
                            seed_data = {};
                        } else {
                            msg("JSON format error", "error");
                            message.set("stop_bot_and_exit");
                            return fn();
                        }
                    }
                    if (execSeedFile) {
                        seedFile(null, seed_data, function() {
                            console.log("Seed updated [SUCCESS]");
                            message.set("stop_bot_and_exit");
                            return fn();

                        });
                    }


                });
            }

        });


    };









    (function(self, message, msg) {

        var b = setInterval(function() {
            if (message.get('begin_intervals')) {
                self.pullSeedFromDB(function sr_pull(new_seed) {
                    if (check.assigned(new_seed)) {
                        //console.log(new_seed);
                        //console.log(JSON.parse(JSONX.stringify(gc())));
                        if (!ObjectX.isEquivalent(new_seed, seed)) {
                            msg("Seed File changed from db ", "info");
                            //if local and db copy unmatches
                            //means seed has been changed from db
                            uls(JSONX.parse(JSON.stringify(new_seed)));
                        } else {
                            msg("No change in seed", "info");
                        }
                    }
                });
            }

        }, 10000);
        message.get('my_timers').push(b);

        var check_mode = setInterval(function() {
            if (!message.get('tika_setup') && message.get('begin_intervals')) {
                clearInterval(check_mode);
                var d = setInterval(function() {
                    parserReloader();

                }, 10000);

                message.get('my_timers').push(d);

            }
        });



    })(this, message, msg);







    function msg() {
        if (!check.assigned(message.get('log'))) {
            console.log(arguments[0]);
            return;
        }
        message.get('log').put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }


};

module.exports = SeedLoader;