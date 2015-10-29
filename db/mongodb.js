//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var config=require('../config/config.js').load()["mongodb"];
var mongodb=config["mongodb_uri"];
var collection=config["mongodb_collection"];
var collection1=config["bucket_collection"];
var pool={
	"init":function(fn,domain){
		var stamp=new Date().getTime()+"";
		process.collection1.insert({"_id":stamp},function(err,results){
			process.collection.insert({"_id":domain,"hash":stamp,"done":false},function(err,results){
			if(err){
				console.log("[ERROR] pool.init maybe seed is already added");
				}
				
					console.log("[INFO] Added  "+domain+" to initialize pool");
					fn(results);
				
				
			});
		});
		
	},
	"addToPool":function(urls){
		var stamp=new Date().getTime()+"";
		var done=0;
		for (var i = 0; i < urls.length; i++) {
			(function(url,hash){
					process.collection.insert({"_id":url,"done":false,"data":"","hash":hash},function(err,results){
									if(err){
										//console.log("[ERROR] pool.addToPool");
									}
									else{
										console.log("[INFO] Discovered "+url);
									}
									done+=1;
									if(done===urls.length){
											process.collection1.insert({"_id":hash},function(err,results){
															if(err){
																//console.log("[ERROR] pool.addToPool");
															}
															else{
																console.log("[INFO] Updated bucket "+hash);
															}
															
															
											});
									}
									
									
					});



				})(urls[i],stamp);
			
		};

		
	},
	"getNextBatch":function(result,batchSize){
		process.collection1.findAndModify({},[],{},{"remove":true},function(err,object){
		
			if(object.value!==null){
					var hash=object["value"]["_id"];
					process.collection.find({"hash":hash},{},{}).toArray(function(err,docs){
						if(err){

							console.log("[ERROR] pool.getNextBatch");
						}
						else{
							console.log("[INFO] Got "+docs.length+" for next Batch");
							result(err,docs);		
						}


					});
			}
			else{
					result(null,[]);	
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
			process.collection1=db.collection(collection1);
			fn(err,db);

		});
	}
};
function init(){
	return pool;
}
exports.init=init;