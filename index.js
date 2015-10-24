//sys argv

var argv = require('minimist')(process.argv.slice(2));
var website=argv["website"];
var domain=argv["domain"];//http://dmoz.org
var regex=argv["regex"];//regex for inlinks
var mongodb=argv["mongodb"];//mongodb://192.168.101.5:27017/db/collection
var collection;
var childs=parseInt(argv["childs"]);//childs to spawn
var batchSize=parseInt(argv["batchSize"]);

//requires

var MongoClient = require('mongodb').MongoClient;
var tracker=require("./server");
var child=require('child_process');
var config=require("./config").load();

//if mongodb uri is passed
if(!mongodb){
	mongodb=config.mongodb_uri;
	collection=config.mongodb_collection;
}
else{
	var m=mongodb.split("/");
	var ip=m[2];
	var db=m[3];
	collection=m[4];
	mongodb="mongodb://"+ip+"/"+db;
}

//if defaults is selected
var defaults=argv["default"];
if(defaults){
	var childs=2;
	var batchSize=1000;
}



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
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.collection=db.collection(collection);
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


