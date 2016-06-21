/**
	Test to check force mode working

*/
process.RUN_ENV = "TEST"; //set env var to testing
var assert = require('chai').assert;
var rewire = require("rewire");
var MongoClient = require('mongodb').MongoClient;
function DbConnectBot(){

	var mongodb = "mongodb://127.0.0.1:27017/crawl_test";
	var serverOptions = {
		  'auto_reconnect': true,
		  'poolSize': config.getConfig("mongodb","pool_size")
		};
		MongoClient.connect(mongodb,serverOptions, function(err, db) {

		});
}

var Crawler = require("../../index.js");
var crawler_obj = new Crawler(['--force']);

describe("Testing force mode of crawler",function(){
	this.timeout(100000);
	it("start and stop bot",function(done){
		crawler_obj.run();
		var once = true;
		setInterval(function(){
			if(crawler_obj.isStarted()){
				if(once){
					crawler_obj.exit();
					once = false;
				}
			};

			if(!once){
				if(crawler_obj.isStopped()){
					assert(true, "unable to start and stop bot");
					done();
				}
				
			}
		},1000);
		
	});

});


