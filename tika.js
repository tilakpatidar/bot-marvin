//https://wiki.apache.org/tika/TikaJAXRS
var proto = require(__dirname + '/lib/proto.js');
process.getAbsolutePath = proto.getAbsolutePath;
var exec = require('child_process').exec;
var URLClass = require(__dirname + "/lib/url.js");
var fs = require('fs');
var _ = require('underscore');
//using dnscache
//from now on all the calls made to dns module are wrapped by the cache
//this will provide dns cache in request module
var dns = require('dns'),
dnscache = require('dnscache')({
    "enable" : true,
    "ttl" : 300,
    "cachesize" : 1000
});


var request = require('request');
var Logger = require(__dirname + "/lib/logger.js");
var check = require("check-types");
var log;
var crypto = require('crypto');
var config = require(__dirname + "/lib/spawn_config.js");

var MongoClient = require('mongodb').MongoClient;
var Message = require(__dirname + '/lib/message.js');
var Lock = require(__dirname + '/lib/lock.js');
var message;


/**
    Represents a tika queue object.
    @constructor
    @author Tilak Patidar <tilakpatidar@gmail.com>
    @param {Message} message_obj

*/
var TikaQueue = function(message_obj) {

    var db = message_obj.get('mongodb_pool');
    var config = message_obj.get('config');
    var message = message_obj;

    var tika_queue = db.collection(config.getConfig("bot_name") + "_tika_queue");
    var tika_f_queue = db.collection(config.getConfig("bot_name") + "_tika_f_queue");
    //console.log('obj created');

    /**
        Dequeue tika jobs from db.
        @param {Function} fn - callback
        @param {number} num - no of jobs
        @public
    */
    this.dequeue = function(fn, num) {
        var done = 0;
        var li = [];
        tika_queue.find({
            "status": 0
        }, {
            limit: num
        }).toArray(function(err, docs) {
            if (check.assigned(err) || !check.assigned(docs)) {
                return fn([]);
            }

            if (done === docs.length) {
                return fn(null);
            }

            _.each(docs, function(doc, index) {
                (function(doc) {
                    tika_queue.update({
                        "_id": doc["_id"]
                    }, {
                        "$set": {
                            status: 1
                        }
                    }, function(e) {
                        //console.log(e);
                        if (check.assigned(doc) && check.assigned(doc.fileName) && check.assigned(doc.parseFile) && check.assigned(doc.status) && check.assigned(doc.link_details)) {
                            li.push(doc);
                        }
                        ++done;
                        if (done === docs.length) {
                            return fn(li);
                        }
                    });
                })(doc);
            });
        });

    };


    /**
        Remove a job from the queue
        @public
        @param {String} idd
    */
    this.remove = function(idd) {
        tika_queue.removeOne({
            _id: idd
        }, function() {

        });
    };


};


/**
    Tika wrapper class for processing and downloading documents.
    @constructor
    @param {Message} message_obj
    @author Tilak Patidar<tilakpatidar@gmail.com>

*/
var Tika = function(message_obj) {

    /**
        Tika queue object
        @type {TikaQueue}
        @private
    */
    var tika_queue_obj;

    /**
        Locks the processNext while current operations are still running.
        @type {Lock}
        @private

    */
    var tika_queue_lock = new Lock();
    var config = message_obj.get('config');
    var URL = new URLClass(message_obj);
    var message = message_obj;
    var tika_queue;
    var tika_f_queue;

    var that = this;
    var color_debug;

    var co = config.getConfig("tika_debug");
    if (co) {
        color_debug = "error";
    } else {
        color_debug = "no_verbose";
    }

    //set proxy 
    process.http_proxy = config.getConfig("http", "http_proxy");
    process.https_proxy = config.getConfig("http", "https_proxy");

    //clear pdf-store because of old corrupted downloads
    var files = fs.readdirSync(__dirname + '/pdf-store/');
    for (var i = 0; i < files.length; i++) {
        if (files[i].indexOf(".") === 0) {
            //do not take hidden files
            continue;
        }
        var data = fs.unlinkSync(__dirname + '/pdf-store/' + files[i]);
    };
    msg("pdf-store cache reset", "success");


    var serverOptions = {
        'auto_reconnect': true,
        'poolSize': config.getConfig("pool-size")
    };

    var mongodb = config.getConfig("mongodb", "mongodb_uri");


    var mongo = MongoClient.connect(mongodb, serverOptions, function(err, db1) {

        var db = db1;
        message.set("mongodb_pool", db);
        //#debug#console.log(err,db)
        var tika_queue = db.collection(config.getConfig("bot_name") + "_tika_queue");
        tika_queue.update({
            "status": 1
        }, {
            "status": 0
        }, function revert_queue() {
            msg("pdf-store queue reverted", "success");
            tika_queue = db.collection(config.getConfig("bot_name") + "_tika_queue");
            tika_f_queue = db.collection(config.getConfig("bot_name") + "_tika_f_queue");
            that.startServer();
            tika_queue_obj = new TikaQueue(message_obj);


        });

    });

    /**
        Starts tika-server.jar as spawned process.
        @public
    */
    this.startServer = function startServer() {
        //first kill an old instance of tika if exists
        var pid = "";
        try {
            pid = fs.readFileSync(__dirname + "/db/pids/tikaPID.txt").toString();
            msg("Trying to kill an old instance of tika if active", "info");
        } catch (err) {
            //if file not exists
            //touch file if not exists
            var stream = fs.createWriteStream(__dirname + "/db/pids/tikaPID.txt");
            stream.write("");
            stream.end();
        }


        try {
            if (pid !== "") {
                process.kill(parseInt(pid));
            }

        } catch (err) {
            if (err.code === "ESRCH") {
                //cannot reach the process by the pid
                //maybe process is already killed
                msg("Old tika instance was already killed", "info");
                msg("Reset tika pid file", "info");
                var stream = fs.createWriteStream(__dirname + "/db/pids/tikaPID.txt");
                stream.write("");
                stream.end();
            } else {
                msg(err.stack, color_debug, err.type);
            }

        }
        var d = exec('java -jar ' + __dirname + '/lib/tika-server-1.11.jar -h ' + config.getConfig("tika_host"), function tika_jar_exec(error, stdout, stderr) {
            msg("[SUCCESS] Tika server started", "success");
            if (check.assigned(error)) {
                msg(error.stack, color_debug);
                msg('Server is already running', "info");
            }
        });
        try {
            process.send({
                "tikaPID": d.pid
            });
        } catch (e) {
            msg(e.stack, color_debug);
        }

    };

    /**
        Submit a file for download and parsing.
        @param {String} url
        @param {Function} callback
        @public
    */
    this.submitFile = function submitFile(url, callback) {
        var err;
        //main function of the module
        //console.log("1", url);
        that.addFileToStore(url, function addFileToStore1(err1) {

            if (err1) {
                if (err1 === "error") {
                    err = "tikaDownloadFailed";
                } else {
                    err = err1;
                }

                return callback(err, null);
            }
            msg(("[SUCCESS] File " + url + " added to store"), "success");
            that.extractText(url, function extractText1(err2, body) {
                //console.log(err2);
                if (err2) {
                    err = "tikaExtractFailed";
                    return callback(err, null);
                }
                that.removeFile(url, function removeFile1(err3) {
                    //console.log(err3);
                    if (err3) {
                        err = "tikaRemoveDownloadedFailed";
                        return callback(err, null);
                    }
                    msg(("[SUCCESS] File " + url + " removed from store"), "success");
                    callback(err, body);
                });
            })

        });



    };


    /**
        To start download a file.
        @param {String} url
        @param {Function} callback
        @public
    */
    this.addFileToStore = function addFileToStore(url, callback) {
        //console.log("2");
        //console.log(url, 'addFileToStore');
        var st = fs.createWriteStream(that.getFileName(url)).on('error', function fsstream_addfilestore(err) {
            msg(err.stack, color_debug);
            return callback("TikeFileStreamError");
        });
        //console.log(url,"tika");
        var separateReqPool = {
            maxSockets: config.getConfig("tika_max_sockets_per_host")
        };

        var req = request({
            uri: url,
            pool: separateReqPool,
            headers: config.getConfig("tika_headers")
        });
        var done_len = 0;
        var init_time = new Date().getTime();
        req.on("response", function res_on_response(res) {
            var len = parseInt(res.headers['content-length'], 10);
            if (!check.assigned(len) || !check.number(len)) {
                len = 0;
            }
            if (len > config.getConfig("tika_content_length")) {
                msg("content-length is more than specified", "error");
                res.emit('error', "TikaContentOverflow");
            }
            res.on("data", function res_on_data(chunk) {
                done_len += chunk.length;
                var t = new Date().getTime();
                if ((t - init_time) > config.getConfig("tika_timeout")) {
                    //console.log((t-init_time)+"ContentTimeOut");
                    msg("Connection timedout change tika_timeout setting in config", "error");
                    res.emit('error', "TikaContentTimeout");
                }
                if (done_len > config.getConfig("tika_content_length")) {
                    //console.log(done_len+"ContentOverflowTka");
                    msg("content-length is more than specified", "error");
                    res.emit('error', "TikaContentOverflow");
                }
            });
            res.on('error', function res_on_error(err) {
                var msg = err;
                if (msg === "TikaContentOverflow" || msg === "TikaContentTimeout") {
                    return callback(err);
                } else {
                    msg(err.stack, color_debug);
                    return callback("TikaDownloadFailed");
                }



            }).pipe(st).on('error', function res_pipe_on_error(err) {
                msg(err.stack, color_debug);
                return callback("TikaFileStoreWriteError");
            }).on('close', function res_on_close(err) {
                if (!err) {
                    return callback(null);
                } else {
                    msg(err.stack, color_debug);
                    return callback(err);
                }

            });
        });




    };


    /**
        Removes a file from pdf-store
        @param {String} url
        @param {Function} callback
        @public
    */
    this.removeFile = function removeFile(url, cal) {

        fs.unlink(that.getFileName(url), function(err) {

            if (err) {
                cal("TikaStoreRemoveError");
            } else {
                cal(null);
            }
        });



    };


    /**
        Extracts text from downloaded document in pdf-store. Using tika-server.jar api.
        @param {String} url
        @param {Function} callback
        @public

    */
    this.extractText = function extractText(url, callback) {
        var errr;
        try {
            var source = fs.createReadStream(that.getFileName(url));
            source.on('error', function source_on_error1(err) {
                msg(err.stack, color_debug);
                callback("TikaFileStoreReadError", {});
            });
            var dic = {};
            source.pipe(request.put({
                url: 'http://' + config.getConfig("tika_host") + ':' + config.getConfig('tika_port') + '/tika',
                headers: {
                    'Accept': 'text/plain'
                }
            }, function(err, httpResponse, body) {
                //console.log(body)
                //for testing 
                dic["text"] = body + "" + parseInt(Math.random() * 1000000) + "" + new Date().getTime();
                //dic["text"] = body;
                source = fs.createReadStream(that.getFileName(url)).on('error', function source_create(err) {
                    msg(err.stack, color_debug);
                    callback("TikaFileStoreReadError", {});
                });

                //console.log('http://' + config.getConfig("tika_host") + ':' + config.getConfig('tika_port') + '/meta');
                source.pipe(request.put({
                    url: 'http://' + config.getConfig("tika_host") + ':' + config.getConfig('tika_port') + '/meta',
                    headers: {
                        'Accept': 'application/json'
                    }
                }, function source_response(err1, httpResponse1, body1) {
                    var err = null;
                    try {
                        msg("tika.extractText for " + url, "success");
                        //unexpected end of input error here check it please
                        //console.log(body1)
                        dic["meta"] = JSON.parse(body1);
                        callback(err, dic);
                    } catch (err) {
                        msg(err.stack, color_debug);
                        err = "TikaServerResponseError";
                        msg("tika.extractText for " + url, "error");
                        callback(err, dic);
                    }

                }));
            })).on('error', function source_on_error(err) {
                msg(err.stack, color_debug);
                callback("TikaServerResponseError", {});
            });
        } catch (err) {
            msg(err.stack, color_debug);
            callback("TikaExtractFailed", {});
        }



    };


    /**

        Dumps the job file for indexing.
        @param {String} url
        @public

    */
    this.indexTikaDoc = function(link) {
        var filename = that.getParsedFileName(link.details.urlID);
        tika_f_queue.insert({
            "content": filename,
            "urlID": link.details.urlID
        }, function() {
            var stream = fs.createWriteStream(filename);
            stream.write(JSON.stringify(link.details));
            stream.on("end", function tika_doc_index() {
                msg('Tika doc dumped for indexing', 'info');
            });
        });
    };


    /**
        Dequeues jobs from tika queue and process them. Runs in a setInterval.
        @private
    */
    var processNext = function processNext() {
        //console.log("here processNext");
        if (!tika_queue_lock.enter()) {
            return;
        }



        try {

            tika_queue_obj.dequeue(function tika_dequeue(li) {

                if (!check.assigned(li)) {
                    tika_queue_lock.release();
                    return;
                }
                if (check.assigned(li) && li.length === 0) {
                    tika_queue_lock.release();
                    return;
                }

                var done = 0;
                _.each(li, function(obj, i) {
                    (function(fileName, parseFile, uniqueId, link_details) {

                        try {
                            that.submitFile(fileName, function tika_submit_file(err, body) {
                                //console.log(err);
                                //console.log(body);
                                if (err) {
                                    msg("error from fetchFile for " + fileName, "error");
                                    try {
                                        var link = URL.url(fileName);
                                        link.setUrlId(link_details.urlID);
                                        link.setStatusCode(err);
                                        link.setParsed({});
                                        link.setResponseTime(0);
                                        link.setContent({});
                                        that.indexTikaDoc(link);
                                    } catch (errr) {
                                        msg(errr.stack, color_debug);
                                    }

                                } else {
                                    //console.log(body);
                                    var Parser = require(__dirname + "/parsers/" + parseFile);
                                    var parser_obj = new Parser(config);
                                    parser_obj.parse(body, fileName, function(dic) {


                                        //pluggable parser
                                        msg("fetchFile for " + fileName, "success");
                                        try {
                                            var link = URL.url(fileName);
                                            link.setUrlId(link_details.urlID);
                                            link.setStatusCode(200);
                                            link.setParsed(dic[1]);
                                            link.setResponseTime(0);
                                            link.setContent(dic[3]);
                                            if (check.assigned(body) && check.assigned(body["text"])) {
                                                var md5sum = crypto.createHash('md5');
                                                md5sum.update(body["text"]);
                                                var hash = md5sum.digest('hex');
                                                link.setContentMd5(hash);
                                            }

                                            that.indexTikaDoc(link);
                                        } catch (e) {
                                            msg(e.stack, color_debug);
                                        }
                                    });

                                }
                                ++done;
                                if (done === li.length) {
                                    msg("Tika batch completed", 'success');
                                    tika_queue_lock.release();
                                }

                                tika_queue_obj.remove(uniqueId);


                            });
                        } catch (err) {
                            //console.log(err, "IN error block");
                            msg("error from fetchFile for " + fileName, "error");
                            try {
                                var link = URL.url(fileName);
                                link.setStatusCode("tikaUnknownError");
                                link.setUrlId(link_details.urlID);
                                link.setParsed({});
                                link.setResponseTime(0);
                                link.setContent({});
                                that.indexTikaDoc(link);


                            } catch (e) {
                                msg(e.stack, color_debug);
                            } finally {
                                ++done;
                                if (done === li.length) {
                                    msg("Tika batch completed", 'success');
                                    tika_queue_lock.release();
                                }

                                tika_queue_obj.remove(uniqueId);
                            }


                        }


                    })(obj.fileName, obj.parseFile, obj.link_details.urlID, obj.link_details);
                });

            }, config.getConfig("tika_batch_size")); //[[],[]]
        } catch (e) {

            console.log(e, "error");
            tika_queue_lock.release();
        }









    };

    /**
        Converts url into pdf-store file location.
        @param {String} url

    */
    this.getFileName = function getFileName(url) {
        return __dirname + "/pdf-store/" + url.replace(/\//gi, "##");
    };

    /**
        Converts url into pdf-store-parsed file location.
        @param {String} url

    */
    this.getParsedFileName = function getParsedFileName(url) {
        return __dirname + "/pdf-store-parsed/" + url.replace(/\//gi, "##") + ".json";
    };


    /**
        Runs in setInterval if processNext is locked from long time. Then recovers the lock.
        @private
    */
    function failSafe() {

        if (tika_queue_lock.getLastLockTime() == null) {
            //has'nt been locked yet
            return;
        }
        if ((new Date().getTime() - tika_queue_lock.getLastLockTime()) >= (1000 * 60 * 10)) { //10 min check
            msg("Unlocking tika queue", 'info');
            tika_queue_lock.release();

        }

    }


    setInterval(processNext, 1000);
    setInterval(failSafe, 1000);

};









module.exports = Tika;


if (require.main === module) {

    /**

        Initializes message obj. Gets job details.

    */
    process.on("message", function process_on_msg(data) {
        //console.log(data);
        var key = Object.keys(data)[0];

        if (key === "init") {
            message = new Message();
            //making init ready
            var o = data[key];
            //console.log(o);
            config = config.init(o[0], o[1], o[2]);
            regex_urlfilter = {};
            regex_urlfilter["accept"] = config.getConfig("accept_regex");
            regex_urlfilter["reject"] = config.getConfig("reject_regex");
            message.set('config', config);
            message.set('regex_urlfilter', regex_urlfilter);
            message.set('links_store', o[3]);
            log = new Logger(message);
            message.set('log', log);

            tika_obj = new Tika(message);

        }


    });



}

function msg() {
    log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
}