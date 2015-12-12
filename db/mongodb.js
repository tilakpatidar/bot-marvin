//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var mongodb=config.getConfig("mongodb","mongodb_uri");
var collection=config.getConfig("mongodb","mongodb_collection");
var collection1=config.getConfig("mongodb","bucket_collection");
var collection2=config.getConfig("mongodb","bot_collection");
//read seed file


var pool={
	"seed":function(links,fn){
		//this method runs first when crawler starts
		pool.startBot(function(){

			
				var stamp1=new Date().getTime()-2000;//giving less time
				var stamp=stamp1+""+parseInt(Math.random()*10000);
				process.bucket_collection.insert({"_id":stamp,"underProcess":false,"bot":config.getConfig("bot_name"),"recrawlAt":stamp1},function(err,results){
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
							process.links_collection.insert({"_id":url,"hash":stamp,"domain":domain,"done":false},function(err,results){
								if(err){
								log.put("pool.init maybe seed is already added","error");
								}
									log.put(("Added  "+domain+" to initialize pool"),"success");
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
		
		pool.addLinksToDB(li,function(hash){
			//first links are added to the db to avoid same links
			pool.generatePool(function(){
				//uniform pool of urls are generated
					var stamp1=new Date().getTime();
					process.bucket_collection.insert({"_id":hash,"underProcess":false,"bot":config.getConfig("bot_name"),"recrawlAt":stamp1},function(err,results){
						if(err){

							log.put(("pool.addToPool"+err),"error");
						}
						else{
							log.put(("Updated bucket "+hash),"success");
						}
											
											
					});
			});
		});
		
			
	

		
	},
	"getNextBatch":function(result,batchSize){
		var stamp1=new Date().getTime();
		process.bucket_collection.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"bot":config.getConfig("bot_name")}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					//console.log(hash);
					process.links_collection.find({"hash":hash},{},{}).toArray(function(err,docs){
						if(err){

							log.pu("pool.getNextBatch","error");
						}
						else{
							//console.log(docs);
							log.put(("Got "+docs.length+" for next Batch"),"success");
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
		process.links_collection.updateOne({"_id":url},{$set:{"done":true,"data":data,"response":status,"lastModified":stamp1}},function(err,results){
			if(err){
				log.put("pool.setCrawled","error");
			}
			else{
				log.put(("Updated "+url),"success");
			}
			
		});
	},
	"crawlStats":function(fn){
		process.links_collection.find({"done":false}).count(function(err,count){
					process.links_collection.find({"done":true}).count(function(err1,count1){
						process.bucket_collection.count(function(err,count2){
							fn(count,count1,count2);

						});
						

					});

		});
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.db=db;
			process.links_collection=db.collection(collection);
			process.bucket_collection=db.collection(collection1);
			process.bot_collection=db.collection(collection2);
			fn(err,db);

		});
	},
	close:function(){
		process.db.close();
	},
	"readSeedFile":function(){
		var fs  = require("fs");
		var dic={};
		var links=[];
		links=fs.readFileSync(parent_dir+"/seed").toString().replace(/\n{2,}/gi,"\n").replace(/^\n/gi,"").split('\n');
			//parsing seed file
			if(links[0]!==""){
				//not if file is empty
				for (var i = 0; i < links.length; i++) {
					var k=links[i].split("\t");
					dic[k[0]]={"phantomjs":JSON.parse(k[2]),"parseFile":k[1]};
				};
			}
			else{
				log.put("Empty seed file","error");
				return undefined;
			}
		pool["links"]=dic;
		pool["seedCount"]=links.length;
		return links;
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config.getConfig("recrawl_interval");
		var lm=new Date().getTime();
		process.bucket_collection.findAndModify({"_id":hash},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					log.put(("Bucket "+hash+"completed !"),"success");
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		process.bucket_collection.update({"underProcess":true,"bot":config.getConfig("bot_name")},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
		
			if(err){
				log.put("pool.resetBuckets","error");
			}
			else{
				log.put("pool.resetBuckets","success");
				fn();
			}
			
		});

	},
	"addLinksToDB":function(li,fn){
		var stamp=new Date().getTime()+""+parseInt(Math.random()*10000);
		var done=0;
		for (var i = 0; i < li.length; i++) {
			var key=li[i][1];
			var item=li[i][0];
			(function(url,domain,hash){
				process.links_collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
						if(err){
							//link is already present
							//console.log("pool.addToPool");
						}
						else{
							//console.log("Discovered "+url);
							if(pool.cache[domain]){
								pool.cache[domain].push(url);
							}
							else{
								pool.cache[domain]=[];
								pool.cache[domain].push(url);
							}
						}
						done+=1;
						if(done===li.length-1){
							fn(stamp);
						}				
				});
			})(item,key,stamp);


			
		};
		
	},
	"generatePool":function(fn){
		var re=[];
		var n_domains=Object.keys(pool.cache).length;
		var eachh=config.getConfig("batch_size")/n_domains;
		for (var key in pool.cache) {
			var l=pool.cache[key].splice(0,eachh);
			for (var i = 0; i < l.length; i++) {
				var url=l[i];
				re.push([url,key]);
			};
		};
		fn(re);

	},
	"drop":function(fn){
		process.db.dropDatabase();
		fn();
	},
	"startBot":function(fn){
		//to check if bot_name is unique
		var t=new Date().getTime();
		process.bot_collection.findOne({"_id":config.getConfig("bot_name")},function(err,result){
			
			if(result){
				log.put("A bot with same is name is still active in cluster","error");
						process.exit(0);
				
			}
			else{
				process.bot_collection.insert({"_id":config.getConfig("bot_name"),"registerTime":t},function(err,result){

					if(!err){
						log.put("Inserted new bot info into cluster","success");
						fn();
					}
					else{
						log.put("Unable to insert new bot into cluster","error");
						process.exit(0);
					}

				});
				
				
			}
			
		});

	},
	"stopBot":function(fn){
		pool.resetBuckets(function(){
			process.bot_collection.remove({"_id":config.getConfig("bot_name")},function(err,result){
			if(err){
				log.put("Bot was not found something fishy ","error");
				fn(false);
			}
			else{
				log.put("Bot cleaned up ","success");
				fn(true);
			}

			});


		});
		
	},
	"contactBot":function(ip,fn){
		var request=require("request");
		request.get(ip,function(err,response,html){
			var ans=JSON.parse(html).ack;
			if(ans){
				fn(true);
			}
			else{
				fn(false);
			}
		});
		
	},
	"seedCount":0,
	"cache":{}
};


function init(){
	return pool;
}
exports.init=init;