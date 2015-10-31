//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var config=require('../config/config.js').load();
var mongodb=config["mongodb"]["mongodb_uri"];
var collection=config["mongodb"]["mongodb_collection"];
var collection1=config["mongodb"]["bucket_collection"];
//read seed file
var fs  = require("fs");
var dic={};
var links=fs.readFileSync('./'+config["seed_file"]).toString().split('\n');
//parsing seed file
for (var i = 0; i < links.length; i++) {
	var k=links[i].split("\t");
	dic[k[0]]={"phantomjs":JSON.parse(k[2]),"parseFile":k[1]};
};
var pool={
	"init":function(fn){
		var stamp=new Date().getTime()+"";
		process.collection1.insert({"_id":stamp},function(err,results){
			var done=0;
			for (var i = 0; i < links.length; i++) {
				(function(domain,stamp){
					process.collection.insert({"_id":domain,"hash":stamp,"domain":domain,"done":false},function(err,results){
						if(err){
						console.log("[ERROR] pool.init maybe seed is already added");
						}
							console.log("[INFO] Added  "+domain+" to initialize pool");
							done+=1;
							if(done===links.length-1){
								fn(results);
							}
							
				
					});

				})(links[i].split('\t')[0],stamp);
			};
			
			
		});
		
	},
	"addToPool":function(li){
		//urls we will be getting will be absolute
		var done=0;
		var stamp=new Date().getTime()+""+parseInt(Math.random()*10000);
		for (var i = 0; i < li.length; i++) {
			
			(function(url,domain,hash){

					process.collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
									if(err){
										//console.log("[ERROR] pool.addToPool");
									}
									else{
										console.log("[INFO] Discovered "+url);
									}
									done+=1;
									if(done===li.length){
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



				})(li[i][0],li[i][1],stamp);
			
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
pool["links"]=dic;
function init(){
	return pool;
}
exports.init=init;