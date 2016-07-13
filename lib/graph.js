var fs = require("fs");
var parent_dir = process.getAbsolutePath(__dirname);
var proto = require(parent_dir + '/lib/proto.js');
var JSONX = proto.JSONX;
var check = require("check-types");
/**
	Represents a Graph
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Message} message_obj
*/

var Graph = function(message_obj) {
    var message = message_obj;
    var config = message.get('config');
    var log = message.get('log');
    var pool = message.get('pool');


    this.insert = function insert(url, parent_url) {
        pool.graph_collection.insert({
            "url": url,
            "parent": parent_url
        }, function insert() {

        });
    };

    this.fetchNode = function fetchNode(url, fn) {
        var li = []
        pool.graph_collection.find({
            "url": url
        }).toArray(function fetchNode(err, docs) {
            for (var i = 0; i < docs.length; i++) {
                var parent = docs[i]["parent"];
                li.push(parent);
            };
            return fn(err, {
                "url": url,
                "parents": li
            });
        })
    };

    this.fetchChildNodes = function fetchChildNodes(url, fn) {
        pool.graph_collection.find({
            "parent": url
        }).toArray(function fetchChildNodes(err, docs) {
            return fn(err, docs);
        });
    };

    if (config.getConfig("web_graph")) {
        msg("Web graph started.", "success");
    } else {
        msg("Web graph not selected in config.", "info");
        this.insert = function() {};
        this.fetchNode = function(url, fn) {
            return fn(new Error(), null);
        };
        this.fetchChildNodes = function(url, fn) {
            return fn(new Error(), null);
        }

    }

    function msg() {
        log.put(arguments[0], arguments[1], __filename.split('/').pop(), arguments.callee.caller.name.toString());
    }

};


module.exports = Graph;