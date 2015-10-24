//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var config=require('../config.js').load()["mongodb"];
var mongodb=config["mongodb_uri"];
var collection=config["mongodb_collection"];
var pool={
	"init":function(fn,domain){
		process.collection.insert({"_id":domain,"done":false},function(err,results){
			if(err){
				console.log("[ERROR] pool.init maybe seed is already added");
			}
			
				console.log("[INFO] Added  "+domain+" to initialize pool");
				fn(results);
			
			
		});
	},
	"addToPool":function(url){
		process.collection.insert({"_id":url,"done":false,"data":""},function(err,results){
			if(err){
				//console.log("[ERROR] pool.addToPool");
			}
			else{
				console.log("[INFO] Discovered "+url);
			}
			
			
		});
	},
	"getNextBatch":function(result,batchSize){
		process.collection.find({"done":false},{},{limit:batchSize}).toArray(function(err,docs){
			if(err){
				console.log("[ERROR] pool.getNextBatch");
			}
			else{
				console.log("[INFO] Got "+docs.length+" for next Batch");
				result(err,docs);		
			}


		});
		
	},
	"setCrawled":function(url,data){
		if(data===undefined || data ===null){
			data="";
		}
		process.collection.updateOne({"_id":url},{"done":true,"data":data},function(err,results){
			if(err){
				console.log("[ERROR] pool.setCrawled");
			}
			else{
				console.log("[INFO] Updated "+url);
			}
			
		});
	},
	"crawlStats":function(fn){
		process.collection.find({"done":false}).count(function(err,count){
					process.collection.find({"done":true}).count(function(err1,count1){
						fn(count,count1);

					});

		});
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.collection=db.collection(collection);
			fn(err,db);

		});
	}
};
function init(){
	return pool;
}
exports.init=init;