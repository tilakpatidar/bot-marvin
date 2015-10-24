var website=process.argv[2];//dmoz
var domain=process.argv[3];//http://dmoz.org
var regex=process.argv[4];//regex for inlinks
var childs=process.argv[5];//childs to spawn
var MongoClient = require('mongodb').MongoClient;
var tracker=require("./server");
var child=require('child_process');
var batchSize=1000;
//global connection to mongodb
var pool={
	"init":function(fn){
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
	"getNextBatch":function(result){
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
	"createConnection":function(){
		process.mongo=MongoClient.connect("mongodb://192.168.101.5:27017/dmoz", function(err, db) {
			process.collection=db.collection("test");
			pool.init(function(){
				pool.getNextBatch(function(err,results){

							createChild(results);
				});


			});

		});
	}
};
function createChild(results){
	var bot = child.fork("spawn.js", [JSON.stringify(results),batchSize,website,domain]);	
	bot.on('close', function (code) {
	  console.log('[INFO] Child process exited with code ' + code);
	});
	bot.on("message",function(data){
		var t=data["setCrawled"];
		var d=data["addToPool"];
		if(t){
			pool.setCrawled(t[0],t[1]);
		}
		else if(d){
			pool.addToPool(d);
		}

	});

}

pool.createConnection();
tracker.init(pool);//starting crawler webapp


