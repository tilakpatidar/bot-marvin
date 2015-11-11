//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var config=require('../config/config.js').load();
var mongodb=config["mongodb"]["mongodb_uri"];
var collection=config["mongodb"]["mongodb_collection"];
var collection1=config["mongodb"]["bucket_collection"];
//read seed file


var pool={
	"seed":function(links,fn){
		pool.resetBuckets(function(){
			var stamp1=new Date().getTime()-2000;//giving less time
			var stamp=stamp1+parseInt(Math.random()*10000);
			process.collection1.insert({"_id":stamp,"underProcess":false,"bot":config["bot_name"],"recrawlAt":stamp1},function(err,results){
				var done=0;
				for (var i = 0; i < links.length; i++) {
					var anon=(function(domain,stamp,url){
						if(domain===""){
							return;
						}
						if(url===undefined){
							//not counter links
							url=domain;
						}
						process.collection.insert({"_id":url,"hash":stamp,"domain":domain,"done":false},function(err,results){
							if(err){
							console.log("[ERROR] pool.init maybe seed is already added");
							}
								console.log("[INFO] Added  "+domain+" to initialize pool");
								done+=1;
								if(done===links.length-1){
									fn(results);
								}
								
					
						});

					});
					
					anon(links[i].split('\t')[0],stamp);
					
					
				};
				
				
			});



		});

		
	},
	"addToPool":function(li){
		//urls we will be getting will be absolute
		var done=0;
		var stamp=new Date().getTime()+""+parseInt(Math.random()*10000);
		li=pool.generatePool(li);
		for (var i = 0; i < li.length; i++) {
			
			(function(url,domain,hash){

					process.collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
									if(err){

										//console.log("[ERROR] pool.addToPool");
									}
									else{
										//console.log("[INFO] Discovered "+url);
									}
									done+=1;
									if(done===li.length){
										var stamp1=new Date().getTime();
											process.collection1.insert({"_id":hash,"underProcess":false,"bot":config["bot_name"],"recrawlAt":stamp1},function(err,results){
															if(err){

																console.log("[ERROR] pool.addToPool"+err);
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
		var stamp1=new Date().getTime();
		process.collection1.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"bot":config["bot_name"]}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					process.collection.find({"hash":hash},{},{}).toArray(function(err,docs){
						if(err){

							//console.log("[ERROR] pool.getNextBatch");
						}
						else{
							//console.log("[INFO] Got "+docs.length+" for next Batch");
							result(err,docs,hash);		
						}


					});
			}
			else{
					result(null,[],null);	
				}
				

		});
			
		
		
	},
	"setCrawled":function(url,data,status){
		var stamp1=new Date().getTime();
		if(data===undefined || data ===null){
			data="";
		}
		if(status===undefined){
			status="0";//no error
		}
		process.collection.updateOne({"_id":url},{"done":true,"data":data,"err":status,"lastModified":stamp1},function(err,results){
			if(err){
				//console.log("[ERROR] pool.setCrawled");
			}
			else{
				console.log("[INFO] Updated "+url);
			}
			
		});
	},
	"crawlStats":function(fn){
		process.collection.find({"done":false}).count(function(err,count){
					process.collection.find({"done":true}).count(function(err1,count1){
						process.collection1.count(function(err,count2){
							fn(count,count1,count2);

						});
						

					});

		});
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.collection=db.collection(collection);
			process.collection1=db.collection(collection1);

			fn(err,db);

		});
	},
	"readSeedFile":function(){
		var fs  = require("fs");
		var dic={};
		var links=[];
		links=fs.readFileSync('./'+config["seed_file"]).toString().split('\n');
			//parsing seed file
			if(links[0]!==""){
				//not if file is empty
				for (var i = 0; i < links.length; i++) {
					var k=links[i].split("\t");
					dic[k[0]]={"phantomjs":JSON.parse(k[2]),"parseFile":k[1]};
				};
			}
			else{
				console.log("[INFO] Empty seed file");
				process.exit(0);
			}
		pool["links"]=dic;
		pool["seedCount"]=links.length;
		return links;
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config["recrawl_interval"];
		process.collection1.findAndModify({"_id":hash},[],{"underProcess":false,"recrawlAt":stamp1},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					console.log("[INFO] Bucket "+hash+"completed !");
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		process.collection1.update({"underProcess":true,"bot":config["bot_name"]},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
			if(err){
				console.log("[ERROR] pool.resetBuckets");
			}
			else{
				fn();
			}
			
		});

	},
	"generatePool":function(li){

		//generates uniform bucket
		var re=[];
		for (var i = 0; i < li.length; i++) {
			var key=li[1];
			var item=li[0];
			if(pool.cache[key]){
				pool.cache[key].push(item);
			}
			else{
				pool.cache[key]=[];
				pool.cache[key].push(item);
			}
		};
		var n_domains=Object.keys(pool.cache).length;
		var eachh=config["batch_size"]/n_domains;
		for (var key in pool.cache) {
			var l=pool.cache[key].splice(0,eachh);
			for (var i = 0; i < l.length; i++) {
				var url=l[i];
				re.push([url,key]);
			};
		};
		return re;
	},
	"seedCount":0,
	"cache":{}
};


function init(){
	return pool;
}
exports.init=init;