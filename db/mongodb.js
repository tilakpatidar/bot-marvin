//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var mongodb=config.getConfig("mongodb","mongodb_uri");
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.init;
var collection=config.getConfig("mongodb","mongodb_collection");
var collection1=config.getConfig("mongodb","bucket_collection");
var collection2=config.getConfig("mongodb","bot_collection");
var collection3=config.getConfig("mongodb","semaphore_collection");
var collection4=config.getConfig("mongodb","cluster_info_collection");
var collection5=config.getConfig("mongodb","parsers_collection");
var bot=require(parent_dir+"/lib/bot.js");
var fs=require('fs');
//read seed file


var pool={
	"seed":function(links,fn){
		//this method runs first when crawler starts
		pool.startBot(function(){
			pool.checkIfNewCrawl(function(isNewCrawl){
					pool.getParsers(function(){
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
									
									anon(links[i],stamp);
									
									
								};
								
							
						});
			
			});

					

			});
				



					
		});


		
	},
	"addToPool":function(li){
		//urls we will be getting will be absolute
		
		pool.addLinksToDB(li,function(hash){
			//first links are added to the db to avoid same links
			pool.generatePool(function(numOfLinks){
				//uniform pool of urls are generated
					var stamp1=new Date().getTime();
					process.bucket_collection.insert({"_id":hash,"underProcess":false,"bot":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks},function(err,results){
						if(err){

							log.put(("pool.addToPool"+err),"error");
						}
						else{
							log.put(("Updated bucket "+hash),"success");
							bot.update("createdBuckets",1);
						}
											
											
					});
			});
		});
		
			
	

		
	},
	"requestAccess":function(fn){
		var k=new Date();
		process.semaphore_collection.insert({"bot_name":config.getConfig("bot_name"),"requestTime":k},function(err,results){
			var reqId=results["ops"][0]["_id"];

			if(!err){
				log.put("Request generated "+reqId,"info");
				fn(true,reqId);
			}
			else{
				log.put("Unable to request","err");
				fn(false,null);
			}
		});
	},
	"verifyAccess":function(reqId,fn){
		process.semaphore_collection.find({}, {"sort" : [['requestTime', 'asc']]}).each(function (err, docs) {
			
			if(docs && docs["_id"].toString()===reqId.toString() && docs["bot_name"].toString()===config.getConfig("bot_name")){
				log.put("Got access to queue reqId :"+reqId,"success");
				fn(true);
			}
			else{
				log.put("No access for now","info");
				fn(false);
			}
			return false;

		});

	},
	"removeRequest":function(reqId,fn){
		process.semaphore_collection.remove({"_id":reqId},function(err,results){
			if(err){
				log.put("Unable to remove request_id "+reqId,"error");
				fn(false);
			}
			else{
				log.put("Request id removed "+reqId,"success");
				fn(true);
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
													process.bucket_collection.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"bot":config.getConfig("bot_name")}},{"remove":false},function(err,object){
														if(object.value!==null){
																var hash=object["value"]["_id"];
																pool.removeRequest(reqId,function(removed){
																			if(removed){
																				//console.log(hash);
																					process.links_collection.find({"hash":hash},{},{}).toArray(function(err,docs){
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
		process.links_collection.updateOne({"_id":url},{$set:{"done":true,"data":data,"response":status,"lastModified":stamp1}},function(err,results){
			if(status!==200){
				bot.update("failedPages",1);
			}
			if(err){
				log.put("pool.setCrawled","error");
			}
			else{
				log.put(("Updated "+url),"success");
				bot.update("crawledPages",1);
			}
			
		});
	},
	"stats":{
		"clusterInfo":function(fn){
			var id_name=config.getConfig('mongodb','mongodb_uri').split('/').pop();
			process.cluster_info.findOne({"_id":id_name},function(err,results){
				fn(err,results);
			});
		},
		"activeBots":function(fn){
			var d={};
			d['db_type']=config.getConfig('db_type');
			d['db']=config.getConfig(config.getConfig('db_type'));
			process.bot_collection.find({}).toArray(function(err,docs){
				fn([docs,d]);
			});
		},
		"crawlStats":function(fn){
			var dic={};
			process.bucket_collection.find({}).count(function(err,bucket_count){
				dic["bucket_count"]=bucket_count;
				process.bucket_collection.find({"lastModified":{"$exists":true}}).count(function(err,lm){
					dic["processed_buckets"]=lm;
						process.links_collection.find({"done":true}).count(function(err,crawled_count){
							dic["crawled_count"]=crawled_count;
							process.links_collection.find({"done":true,"response":{"$ne":200}}).count(function(err,failed_count){
								dic["failed_count"]=failed_count;
								fn(dic);

							});

						});
				});


			});

		}
	},
	"createConnection":function(fn){
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			process.db=db;
			process.links_collection=db.collection(collection);
			process.bucket_collection=db.collection(collection1);
			process.bot_collection=db.collection(collection2);
			process.semaphore_collection=db.collection(collection3);
			process.cluster_info=db.collection(collection4);
			process.parsers_collection=db.collection(collection5);
			fn(err,db);
			
		});
	},
	close:function(){
		process.db.close();
	},
	"readSeedFile":function(fn){
		process.cluster_info.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
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
		});
		
		
		
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config.getConfig("recrawl_interval");
		var lm=new Date().getTime();
		process.bucket_collection.findAndModify({"_id":hash},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					log.put(("Bucket "+hash+"completed !"),"success");
					bot.update("processedBuckets",1);
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		process.bucket_collection.update({"underProcess":true,"bot":config.getConfig("bot_name")},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
			process.semaphore_collection.remove({"bot_name":config.getConfig("bot_name")},function(err,results){
				if(err){
				log.put("pool.resetBuckets","error");
				}
				else{
					log.put("pool.resetBuckets","success");
					fn();
				}


			});
			
			
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

	},
	"drop":function(fn){
		process.db.dropDatabase();
		fn();
	},
	"insertParseFile":function(filename,fn){
	var data=fs.readFileSync(parent_dir+'/parsers/'+filename+".js");
	var crypto = require('crypto');
	var md5sum = crypto.createHash('md5');
	md5sum.update(data.toString());
	var hash=md5sum.digest('hex');
	process.parsers_collection.update({"_id":filename},{"$set":{"data":data,"hash":hash}},{upsert:true},function(err,results){
		if(err){
			fn(false);
		}
		else{
			fn(true);
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
		process.cluster_info.updateOne({"_id":cluster_name},{"$unset":d},function(err,result){
			if(err){
				fn(false);
			}
			else{
				delete pool.links[org_url];
				fn(true);
			}
		});
	},
	"clearSeed":function(fn){
		process.cluster_info.updateOne({"_id":config.getConfig("cluster_name")},{"$set":{"seedFile":{}}},function(err,result){
			if(err){
				fn(false);
			}
			else{
				pool.links={};
				fn(true);
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
				process.cluster_info.update({"_id":cluster_name},{"$set":k},function(err,result){
			
					if(err){
						fn(false);
					}
					else{
						pool.links[org_url]={"phantomjs":phantomjs,"parseFile":parseFile};
						fn(true);
					}
				});
			}else{
				fn(false);
			}
		});
		
	},
	"checkIfBotActive":function(fn){
		process.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,result){
			if(err){
				fn(true);

			}
			if(result){
				fn(true);
			}
			else{
				fn(false);
			}

		});
	},
	"startBot":function(fn){
		//to check if bot_name is unique
		var t=new Date().getTime();
		
			process.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,result){
				
				if(result){
					log.put("A bot with same is name is still active in cluster","error");
							process.exit(0);
					
				}
				else{
					process.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true,"config":JSON.parse(JSONX.stringify(config.getConfig()))}},{remove:false,upsert:true},function(err,result){

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
			process.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
			if(err){
				log.put("Bot was not found something fishy ","error");
				fn(false);
			}
			else{
				pool.botInfoUpdater(false,function(updated){
					if(updated){
						log.put("Bot cleaned up ","success");
						fn(true);
					}
					else{
						log.put("Bot cleaned up ","error");
					}
				});
				
			}

			});


		});
		
	},
	'botInfoUpdater':function(updateConfig,fn){
		var dic=bot.getBotData();//data is pulled and reseted
		var n_dic={};
		for(var key in dic){
			if(typeof dic[key]==="number"){
				if(!n_dic['$inc']){
					n_dic['$inc']={};
				}
				n_dic['$inc'][key]=dic[key];
			}
		}
		if(updateConfig){
			n_dic['config']=JSON.parse(JSONX.stringify(config.getConfig()));
		}
		//console.log(n_dic);
		process.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
			//console.log(results);
			//console.log(err);
			if(err){
				log.put("Error ocurred while updating bot info ","error");
				if(fn!==undefined){
					fn(false);
				}
			}
			else{

				log.put("Bot info updated","success");
				if(fn!==undefined){
					fn(true);
				}
			}
		});
	},
	"checkIfNewCrawl":function(fn){
		var id_name=config.getConfig("cluster_name");
		
		process.cluster_info.findOne({"_id":id_name},function(err,results){
			if(!results){
				//first time crawl therfore update the cluster info
				process.cluster_info.insert({"_id":id_name,'createdAt':new Date(),'initiatedBy':config.getConfig('bot_name'),"seedFile":{}},function(err1,results1){

					if(!err){
						log.put("Inserted cluster info for fresh crawl ","success");
						fn(true);
					}
				});
			}
			else{
				log.put("An old crawl is already present ","info");
				fn(false,results);
			}
			
		});
	},
	"updateDbConfig":function(dic){
		//updates the config changes done from local machine to db
		process.bot_collection.update({"_id":config.getConfig('bot_name')},{"$set":{"config":dic}},function(err,results){
			//console.log(results);
			//console.log(err);
			if(err){
				log.put("Error ocurred while updating bot config ","error");
			}
			else{
				log.put("Bot config updated","success");
			}
		});
	},
	"pullDbConfig":function(fn){
		process.bot_collection.findOne({"_id":config.getConfig('bot_name')},function(err,results){

			var c=results.config;
			if(err){
				log.put("Error ocurred while pulling bot config from db ","error");
				fn(null);
			}
			else{
				log.put("Bot config pulled from db","success");
				fn(c);
			}
		});
	},
	"configReloader":function(){
		pool.pullDbConfig(function(new_config){
			if(new_config!==null){
				//console.log(new_config);
				//console.log(JSON.parse(JSONX.stringify(config.getConfig())));
				if(!pool.isEquivalent(new_config,JSON.parse(JSONX.stringify(config.getConfig())))){
					log.put("Config changed from db ","info");
					//if local and db copy unmatches
					//means config has been changed from db
					config.updateLocalConfig(JSONX.parse(JSON.stringify(new_config)));
				}
				else{
					log.put("No change in config","info");
				}
			}
		});
	},
	"getParsers":function(fn){
		process.parsers_collection.find({}).toArray(function(err,docs){
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
				
		});
	},
	"pullSeedLinks":function(fn){
		process.cluster_info.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
			var seeds=results[0].seedFile;
			if(!err){
				fn(seeds);
			}
			else{
				fn(null);
			}

		});
	},
	"seedReloader":function(){
		pool.pullSeedLinks(function(new_config){
			if(new_config!==null){
				if(!pool.isEquivalent(new_config,pool.seed_db_copy)){
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
		process.parsers_collection.find({}).toArray(function(err,results){
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
	"seedCount":0,
	"cache":{},
	"links":{}
};

process.pool_check_mode=setInterval(function(){
	if(process.MODE==='exec'){
		setInterval(function(){
		pool.botInfoUpdater(false);

		},10000);
		setInterval(function(){
			pool.configReloader();

		},10000);
		setInterval(function(){
			pool.seedReloader();

		},10000);
		setInterval(function(){
			pool.parserReloader();

		},10000);
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
	}
},5000);




//prototype

pool.isEquivalent=function(a, b) {
	if (typeof a !== typeof b){
		return false;
	}
	if(typeof a==="number"){
		if(a===b){
			return true;
		}
		else{
			return false;
		}
	}
	else if(typeof a ==="string"){
		if(a===b){
			return true;
		}
		else{
			return false;
		}
	}
    // Create arrays of property names
    var aProps = Object.getOwnPropertyNames(a);
    var bProps = Object.getOwnPropertyNames(b);

    // If number of properties is different,
    // objects are not equivalent
    if (aProps.length != bProps.length) {
        return false;
    }

    for (var i = 0; i < aProps.length; i++) {
        var propName = aProps[i];

        // If values of same property are not equal,
        // objects are not equivalent
        if(typeof a[propName] ==="object"){
        	if (!pool.isEquivalent(a[propName],b[propName])){
        		return false;
        	}
        }
        else{
        	if (a[propName] !== b[propName]) {
	            return false;
	        }
        }
        
    }

    // If we made it this far, objects
    // are considered equivalent
    return true;
};

function init(){
	return pool;
}
exports.init=init;

