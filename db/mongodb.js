//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var mongodb=config.getConfig("mongodb","mongodb_uri");
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var collection=config.getConfig("mongodb","mongodb_collection");
var collection1=config.getConfig("mongodb","bucket_collection");
var collection2=config.getConfig("mongodb","bot_collection");
var collection3=config.getConfig("mongodb","semaphore_collection");
var collection4=config.getConfig("mongodb","cluster_info_collection");
var collection5=config.getConfig("mongodb","parsers_collection");
var fs=require('fs');
var cluster;
//read seed file


var pool={
	"seed":function(links,fn){
		//this method runs first when crawler starts
		
			pool.checkIfNewCrawl(function(isNewCrawl){
					pool.getParsers(function(){
							var stamp1=new Date().getTime()-2000;//giving less time
							var stamp=stamp1+""+parseInt(Math.random()*10000);
							pool.bucket_collection.insert({"_id":stamp,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":links.length},function(err,results){
								var done=0;
								for (var i = 0; i < links.length; i++) {
									var anon=(function(domain,stamp){
										if(domain===""){
											return;
										}
										pool.links_collection.insert({"_id":domain,"hash":stamp,"domain":domain,"done":false},function(err,results){
												if(err){
													log.put("pool.init maybe seed is already added","error");
												}
												else{
													log.put(("Added  "+domain+" to initialize pool"),"success");
												}
												
												done+=1;
												if(done===links.length-1){
													fn(true);
													return;
												}
												
									
										});

									});
									
									anon(links[i],stamp);
									
									
								};
								
							
						});
			
			});

					

			});

	},
	"addToPool":function(li,fn){
		//urls we will be getting will be absolute
		if(li.length===0){
			//buckets with empty links will not be inserted
			fn(false);
			return;
		}
		pool.addLinksToDB(li,function(hash){
			if(hash===null){
				fn(false);
				return;
			}
			//first links are added to the db to avoid same links
			pool.generatePool(function(numOfLinks){
				//uniform pool of urls are generated
				if(numOfLinks===undefined || numOfLinks===0){
					fn(false);
					return;
				}
					var stamp1=new Date().getTime();
					pool.bucket_collection.insert({"_id":hash,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks},function(err,results){
						if(err){

							log.put(("pool.addToPool"+err),"error");
							fn(false);
							return;
						}
						else{
							log.put(("Updated bucket "+hash),"success");
							process.bot.updateStats("createdBuckets",1);
							fn(true);
							return;
						}
											
											
					});
			});
		});
			
	},
	"requestAccess":function(fn){
		var k=new Date();
		pool.semaphore_collection.insert({"bot_name":config.getConfig("bot_name"),"requestTime":k},function(err,results){
			var reqId=results["ops"][0]["_id"];

			if(!err){
				log.put("Request generated "+reqId,"info");
				fn(true,reqId);
				return;
			}
			else{
				log.put("Unable to request","err");
				fn(false,null);
				return;
			}
		});
	},
	"verifyAccess":function(reqId,fn){
		pool.semaphore_collection.find({}, {"sort" : [['requestTime', 'asc']]}).each(function (err, docs) {
			
			if(docs && docs["_id"].toString()===reqId.toString() && docs["bot_name"].toString()===config.getConfig("bot_name")){
				log.put("Got access to queue reqId :"+reqId,"success");
				fn(true);
				return;
			}
			else{
				log.put("No access for now","info");
				fn(false);
				return;
			}
			return false;

		});

	},
	"removeRequest":function(reqId,fn){
		pool.semaphore_collection.remove({"_id":reqId},function(err,results){
			if(err){
				log.put("Unable to remove request_id "+reqId,"error");
				fn(false);
				return;
			}
			else{
				log.put("Request id removed "+reqId,"success");
				fn(true);
				return;
			}
		});
	},
	"getNextBatch":function(result,batchSize){
		
		pool.requestAccess(function(requestRegistered,reqId){

			if(requestRegistered){
				(function(reqId){
					process.semaphore_access=setInterval(function(){
						
										pool.verifyAccess(reqId,function(access){
											if(!access){
												return;
											}
											clearInterval(process.semaphore_access);//clearing the check for verification now
											if(access){
												log.put("Got access to the collection","info");
												var stamp1=new Date().getTime();
													pool.bucket_collection.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"processingBot":config.getConfig("bot_name")}},{"remove":false},function(err,object){
														if(object.value!==null){
																var hash=object["value"]["_id"];
																pool.removeRequest(reqId,function(removed){
																			if(removed){
																				//console.log(hash);
																					pool.links_collection.find({"hash":hash},{},{}).toArray(function(err,docs){
																						if(err){

																							log.put("pool.getNextBatch","error");
																						}
																						else{
																							//console.log(docs);
																							log.put(("Got "+docs.length+" for next Batch"),"success");
																							result(err,docs,hash);		
																						}


																					});
																			}

																});
																
														}
														else{
															pool.removeRequest(reqId,function(removed){
																if(removed){
																	result(null,[],null);
																	return;
																}
																	
															});
															}
															
													});
											}
											else{
												log.put("Unable to get access to the collection","error");
											}

										});

									},1000);




				})(reqId);
				
				

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
		pool.links_collection.updateOne({"_id":url},{$set:{"done":true,"data":data,"response":status,"lastModified":stamp1,"updatedBy":config.getConfig("bot_name")}},function(err,results){
			if(status!==200){
				process.bot.updateStats("failedPages",1);
			}
			if(err){
				log.put("pool.setCrawled","error");
			}
			else{
				log.put(("Updated "+url),"success");
				process.bot.updateStats("crawledPages",1);
			}
			
		});
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			pool.db=db;
			pool.links_collection=db.collection(collection);
			pool.bucket_collection=db.collection(collection1);
			pool.bot_collection=db.collection(collection2);
			pool.semaphore_collection=db.collection(collection3);
			pool.cluster_info=db.collection(collection4);
			pool.parsers_collection=db.collection(collection5);
			fn(err,db);
			return;
			
		});
	},
	close:function(){
		pool.db.close();
	},
	"readSeedFile":function(fn){
		pool.cluster_info.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
			if(results.length===0){
				//empty seed file
				log.put("Empty seed file","error");
				process.bot.stopBot(function(){
						process.exit(0);
				});
				return;
			}
			var dic=results[0].seedFile;
			pool.seed_db_copy=dic;//stored for future comparision
			var links={};
			var links1=[];
			for(var key in dic){
				var k={};
				k["phantomjs"]=dic[key]['phantomjs'];
				k['parseFile']=dic[key]['parseFile'];
				links[key.replace(/#dot#/gi,".")]=k;
				links1.push(key.replace(/#dot#/gi,"."));
			}

			pool["links"]=links;
			pool["seedCount"]=links1.length;
			fn(links1);
			return;
		});
		
		
		
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config.getConfig("recrawl_interval");
		var lm=new Date().getTime();
		pool.bucket_collection.findAndModify({"_id":hash},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					log.put(("Bucket "+hash+" completed !"),"success");
					process.bot.updateStats("processedBuckets",1);
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		pool.bucket_collection.update({"underProcess":true,"processingBot":config.getConfig("bot_name")},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
			pool.semaphore_collection.remove({"bot_name":config.getConfig("bot_name")},function(err,results){
				if(err){
				log.put("pool.resetBuckets","error");
				}
				else{
					log.put("pool.resetBuckets","success");
					fn();
					return;
				}


			});
			
			
		});

	},
	"addLinksToDB":function(li,fn){
		var stamp=new Date().getTime()+""+parseInt(Math.random()*10000);
		var done=0;
		if(li.length===0){
			fn(null);
			return;
		}
		for (var i = 0; i < li.length; i++) {
			var key=li[i][1];
			var item=li[i][0];
			(function(url,domain,hash){
				pool.links_collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
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
							return;
						}				
				});
			})(item,key,stamp);


			
		};
		
	},
	"generatePool":function(fn){
		var re=[];
		var n_domains=Object.keys(pool.cache).length;
		var eachh=config.getConfig("batch_size")/n_domains;
		var len=0;
		for (var key in pool.cache) {
			var l=pool.cache[key].splice(0,eachh);
			len+=l.length;
			for (var i = 0; i < l.length; i++) {
				var url=l[i];
				re.push([url,key]);
			};
		};
		fn(len);
		return;

	},
	"drop":function(fn){
		pool.db.dropDatabase();
		try{
			fs.unlinkSync(parent_dir+'/db/tika_queue');
		}
		finally{
			fn();
			return;
		}
		
		
		
	},
	"insertParseFile":function(filename,fn){
	var data=fs.readFileSync(parent_dir+'/parsers/'+filename+".js");
	var crypto = require('crypto');
	var md5sum = crypto.createHash('md5');
	md5sum.update(data.toString());
	var hash=md5sum.digest('hex');
	pool.parsers_collection.update({"_id":filename},{"$set":{"data":data,"hash":hash}},{upsert:true},function(err,results){
		if(err){
			fn(false);
			return;
		}
		else{
			fn(true);
			return;
		}
	});
	},
	"removeSeed":function(url,fn){
		var cluster_name=config.getConfig("cluster_name");
		var org_url=url;
		var url=url.replace(/\./gi,"#dot#");
		var k="seedFile."+url;
		var d={};
		d[k]="";
		pool.cluster_info.updateOne({"_id":cluster_name},{"$unset":d},function(err,result){
			if(err){
				fn(false);
				return;
			}
			else{
				delete pool.links[org_url];
				fn(true);
				return;
			}
		});
	},
	"clearSeed":function(fn){
		pool.cluster_info.updateOne({"_id":config.getConfig("cluster_name")},{"$set":{"seedFile":{}}},function(err,result){
			if(err){
				fn(false);
				return;
			}
			else{
				pool.links={};
				fn(true);
				return;
			}
		});
	},
	"insertSeed":function(url,parseFile,phantomjs,fn){
		var cluster_name=config.getConfig("cluster_name");
		var d={};
		var org_url=url;
		var url=url.replace(/\./gi,"#dot#");
		d[url]={"phantomjs":phantomjs,"parseFile":parseFile};
		var new_key="seedFile."+url;
		var k={};
		k[new_key]=d[url];
		pool.insertParseFile(parseFile,function(parseFileUpdated){
			if(parseFileUpdated){
				pool.cluster_info.update({"_id":cluster_name},{"$set":k},function(err,result){
			
					if(err){
						fn(false);
						return;
					}
					else{
						pool.links[org_url]={"phantomjs":phantomjs,"parseFile":parseFile};
						fn(true);
						return;
					}
				});
			}else{
				fn(false);
				return;
			}
		});
		
	},
	"checkIfBotActive":function(fn){
		pool.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,result){
			if(err){
				fn(true);
				return;

			}
			if(result){
				fn(true);
				return;
			}
			else{
				fn(false);
				return;
			}

		});
	},
	"checkIfNewCrawl":function(fn){
		var id_name=config.getConfig("cluster_name");
		
		pool.cluster_info.findOne({"_id":id_name},function(err,results){
			if(!results){
				//first time crawl therfore update the cluster info
				pool.cluster_info.insert({"_id":id_name,'createdAt':new Date(),'webapp_host':config.getConfig("network_host"),'webapp_port':config.getConfig('network_port'),'initiatedBy':config.getConfig('bot_name'),"seedFile":{}},function(err1,results1){

					if(!err){
						log.put("Inserted cluster info for fresh crawl ","success");
						fn(true);
						return;
					}
				});
			}
			else{
				log.put("An old crawl is already present ","info");
				fn(false,results);
				return;
			}
			
		});
	},
	
	"getParsers":function(fn){
		pool.parsers_collection.find({}).toArray(function(err,docs){
			for (var i = 0; i < docs.length; i++) {
				var d=docs[i];
				if(fs.existsSync(parent_dir+"/parsers/"+d["_id"]+".js")){
					//exists now chech the hash
					var data=d["data"].value();
					var crypto = require('crypto');
					var md5sum = crypto.createHash('md5');
					md5sum.update(data);
					var hash=md5sum.digest('hex');
					if(hash!==d["hash"]){
						console.log("thre");
						fs.writeFileSync(parent_dir+"/parsers/"+d["_id"]+".js",d["data"].value());
					}
				}else{
					//file not exists
					fs.writeFileSync(parent_dir+"/parsers/"+d["_id"]+".js",d["data"].value());
				}
			};
			fn();
			return;
				
		});
	},
	"pullSeedLinks":function(fn){
		pool.cluster_info.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
			var seeds=results[0].seedFile;
			if(!err){
				fn(seeds);
				return;
			}
			else{
				fn(null);
				return;
			}

		});
	},
	"seedReloader":function(){
		pool.pullSeedLinks(function(new_config){
			if(new_config!==null){
				if(!ObjectX.isEquivalent(new_config,pool.seed_db_copy)){
					log.put("Seed Links changed from db ","info");
					process.emit("restart");//will be caught by death and it will cause to restart
				}
				else{
					log.put("No change in seed links","info");
				}
			}
		});
	},
	"parserReloader":function(){
		pool.parsers_collection.find({}).toArray(function(err,results){
			for (var i = 0; i < results.length; i++) {
				var doc=results[i];
				var data=fs.readFileSync(parent_dir+'/parsers/'+doc["_id"]+".js");
				var crypto = require('crypto');
				var md5sum = crypto.createHash('md5');
				md5sum.update(data.toString());
				var hash=md5sum.digest('hex');
				if(hash!==doc["hash"]){
					process.emit("restart");
				}
			};
		});
	},
	"bot":{
		"startBotGetBotActiveStatus":function(fn){
			pool.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,results){
				fn(err,results);
			});
		},
		startBotAddNewBot:function(t,fn){
			pool.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true,"config":JSON.parse(JSONX.stringify(config.getConfig()))}},{remove:false,upsert:true},function(err,result){
				fn(err,result);
			});
		},
		updateBotInfo:function(n_dic,fn){
			pool.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
				fn(err,results);

			});
		},
		BotMarkInactive:function(fn){
			pool.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
				fn(err,result);
			});
		}
	},
	"cluster":{
		"getBotConfig":function(bot_name,fn){
			pool.bot_collection.findOne({"_id":bot_name},function(err,results){
				fn(err,results);

			});
		}
	},
	"stats":{
		cluster_info:function(id_name,fn){
			pool.cluster_info.findOne({"_id":id_name},function(err,results){
				fn(err,results);
			});
		},
		"activeBots":function(fn){
			pool.bot_collection.find({}).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"crawlStats":function(fn){
			var dic={};
			pool.bucket_collection.find({}).count(function(err,bucket_count){
				dic["bucket_count"]=bucket_count;
				pool.bucket_collection.find({"lastModified":{"$exists":true}}).count(function(err,lm){
					dic["processed_buckets"]=lm;
						pool.links_collection.find({"done":true}).count(function(err,crawled_count){
							dic["crawled_count"]=crawled_count;
							pool.links_collection.find({"done":true,"response":{"$ne":200}}).count(function(err,failed_count){
								dic["failed_count"]=failed_count;
								fn(dic);
								return;


							});

						});
				});


			});
		},
		"getCrawledPages":function(d,len,i,sor,fn){
			pool.links_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"getFailedPages":function(d,len,i,sor,fn){
			pool.links_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"getTotalPages":function(d,len,i,sor,fn){
			pool.bucket_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,results){
				fn(err,results);
			});
		},
		"getProcessedBuckets":function(d,len,i,sor,fn){
			pool.bucket_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"updateConfig":function(bot_name,js,fn){
			pool.bot_collection.update({"_id":bot_name},{"$set":{"config":js}},function(err,results){
				fn(err,results);
			});
		}
	},
	"config_reloader":{
		"pullDbConfig":function(idd,fn){
					pool.bot_collection.findOne({"_id":idd},function(err,results){

						var c=results.config;
						if(err){
							log.put("Error ocurred while pulling bot config from db ","error");
							fn(null);
							return;
						}
						else{
							log.put("Bot config pulled from db","success");
							fn(c);
							return;
						}
					});
		}
	},
	"seedCount":0,
	"cache":{},
	"links":{}
};

process.pool_check_mode=setInterval(function(){
	if(process.MODE==='exec'){
		var c=setInterval(function(){
			pool.seedReloader();

		},10000);
		process.my_timers.push(c);
		var d=setInterval(function(){
			pool.parserReloader();

		},10000);
		process.my_timers.push(d);
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
	}
},5000);




//prototype



function init(){
	return pool;
}
exports.init=init;

