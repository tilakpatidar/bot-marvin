//global connection to mongodb
//mongodb connection file


var ObjectId = require('mongodb').ObjectId;
var Immutable = require('immutable');
var crypto = require('crypto');
var mongo = require('mongodb');
var MongoClient = mongo.MongoClient;
var parent_dir=process.getAbsolutePath(__dirname);
var child=require('child_process');
var Score=require(parent_dir+'/lib/score.js');
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var _ = require("underscore");
var check = require('check-types');
var fs=require('fs');
var urllib=require('url');
var URL=require(parent_dir+'/lib/url.js');
var proxy_cache_class = require(parent_dir + '/lib/bucket_proxy.js');
var log;


/**
	Represents db related opertions of various classes.
	@author Tilak Patidar <tilakpatidar@gmail.com>
	@constructor
	@param {Message} message_obj


*/
var MongoDB = function(message_obj){


	var message = message_obj;
	var config = message.get('config');
	/**
		Used for comparing old bot count and new bot count. To message changes in the cluster.
		@private
		@type {Number}
	*/
	var old_bot_count = 0;
	/**
		boolean counter to initialize the old_bot_count in first comparision.
		@private
		@type {boolean}
	*/
	var first_bot_count = true;

	var bot_obj;

	var that = this;

	var proxy_cache;

	this.setBot = function(){
		bot_obj = message.get('bot');
	};
	






	/**
		boolean counter for tika indexer busy.
		@private
		@type {boolean}

	*/	
	var tika_indexer_busy = false;

	var pool = this;


	//collection names
	this.mongodb_name = config.getConfig("mongodb","mongodb_uri");
	this.mongodb_collection_name = config.getConfig("mongodb","mongodb_collection");
	this.mongodb_collection_name = config.getConfig("mongodb","mongodb_collection");
	this.bucket_collection_name = config.getConfig("mongodb","bucket_collection");
	this.bot_collection_name = config.getConfig("mongodb","bot_collection");
	this.semaphore_collection_name = config.getConfig("mongodb","semaphore_collection");
	this.cluster_info_collection_name = config.getConfig("mongodb","cluster_info_collection");
	this.parsers_collection_name = config.getConfig("mongodb","parsers_collection");
	this.sitemap_collection_name = config.getConfig("mongodb","sitemap_collection");
	this.robots_collection_name = config.getConfig("mongodb","robots_collection");
	this.graph_collection_name = config.getConfig("mongodb","graph_collection");
	this.seed_collection_name = config.getConfig("mongodb","seed_collection");
	this.author_collection_name = config.getConfig("mongodb","author_collection");
	this.domain_group_collection_name = config.getConfig("mongodb","domain_group_collection");

	//set bucket creator locked intially
	//will be unlocked by getNextBatch in child_manager
	message.get('bucket_creator_lock').setLocked(true);

		/**
			Generates MD5 hash of any string
			@private
			@param {String} str
		*/
		function generateMD5(str){

			var md5sum = crypto.createHash('md5');
			md5sum.update(str);
			var hash=md5sum.digest('hex');
			return hash;
		}

		



	/**
		Insert author data into db.
		@param {Object} data
		@public
	*/
	this.insertAuthor = function insertAuthor(data){
		
		var author_url = Object.keys(data)[0];
		var page_url = data[author_url];
		that.author_collection.updateOne({"_id": author_url}, {"$push":{"pages": page_url}}, {upsert: true},function(){

		});
	};


	this.insertRssFeed = function insertRssFeed(d){
		
		var url = d[0];
		var rss_links = d[1];
		var domain_group_id = d[2];
		var docs = [];
		for(var index in rss_links){
			var rss_link = rss_links[index];
			docs.push({"_id": rss_link, page: url, nextRefresh: new Date().getTime(), domains: domain_group_id});
			
		}
		that.rss_feeds.insertMany(docs);
		
	};
	this.checkUnCrawled = function checkUnCrawled(links,callback){
		
		links = _.pluck(links, '_id');
		that.mongodb_collection.find({"response":{"$exists":false},"_id":{"$in":links}}).toArray(function(err,docs){
			return callback(err,docs);
		});
	};

	this.createConnection = function createConnection(fn){
		
		var serverOptions = {
		  'auto_reconnect': true,
		  'poolSize': config.getConfig("mongodb","pool_size")
		};
		MongoClient.connect(that.mongodb_name,serverOptions, function(err, db) {
			that.db=db;
			that.GridStore = mongo.GridStore;
			that.mongodb_collection=db.collection(that.mongodb_collection_name);
			that.bucket_collection=db.collection(that.bucket_collection_name);
			that.bot_collection=db.collection(that.bot_collection_name);
			that.semaphore_collection=db.collection(that.semaphore_collection_name);
			that.cluster_info_collection=db.collection(that.cluster_info_collection_name);
			that.parsers_collection=db.collection(that.parsers_collection_name);
			that.sitemap_collection=db.collection(that.sitemap_collection_name);
			that.robots_collection=db.collection(that.robots_collection_name);
			that.graph_collection=db.collection(that.graph_collection_name);
			that.seed_collection=db.collection(that.seed_collection_name);
			that.author_collection = db.collection(that.author_collection_name);
			that.domain_group_collection = db.collection(that.domain_group_collection_name);
			that.mongodb_collection.createIndex( { bucketed: 1, fetch_interval: 1, partitionedBy: 1,domain: 1,bucket_id: 1 } );
			//create partitions for all the cluster bots
			that.mongodb_collection.createIndex({url :1},{unique: true});
			that.mongodb_collection.createIndex({md5 :1},{unique: true});
			that.rss_feeds = db.collection("rss_feeds"); 
			that.bucket_collection.createIndex({level:1},function(err){});//asc order sort for score
			that.tika_f_queue = db.collection(config.getConfig("bot_name")+"_tika_f_queue");
			that.tika_queue = db.collection(config.getConfig("bot_name")+"_tika_queue");
			that.failed_db = db.collection(config.getConfig("bot_name")+"_failed_db");
			that.failed_db.createIndex({count:1,status:1});
			that.tika_queue.createIndex({status: 1});
			that.mongodb_collection.createIndex({"$**":"text"},{"weights": {"data._source.id":5,"data._source.host":5,"data._source.meta_description":5,"data._source.title":5,"data._source.body":1}},function(err){
				//#debug#console.log(err);
			});
			that.graph_collection.createIndex({parent:1});
			that.bucket_collection.createIndex({recrawlAt:1},function(err){});//asc order sort for recrawlAt
			that.bucket_collection.createIndex({score:1},function(err){});//asc order sort for score
			that.stats.activeBots(function(errr,docs){
				//#debug#console.log(docs)
				for (var i = 0; i < docs.length; i++) {
					var obj=docs[i]["_id"];
				};
				
			})
			//console.log(db)
			fn(err,db);
			return;
			
		});
	};
	this.close = function close(fn){
		
		if(!check.assigned(fn)){
			fn=function (argument) {
				// body...
			}
		}
		that.db.close(fn);
	};
	this.insertTikaQueue = function(d,fn){
		//console.log(d, "HEY");
		if(!check.assigned(fn)){
			fn = function(){};
		}
		that.tika_queue.insert(d,function(e,dd){
			//console.log(arguments);
			fn(e,dd);
		});
	};


	this.batchFinished = function batchFinished(hash,refresh_label,fn, updateStats){
		
		var stamp1=new Date().getTime()+config.getConfig("recrawl_intervals",refresh_label);
		var lm=new Date().getTime();
		that.bucket_collection.findAndModify({"_id":ObjectId(hash)},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function markFinished(err,object){
			if(check.assigned(object)){
				if(object.value!==null){
						var hash=object["value"]["_id"];
						msg(("Bucket "+hash+" completed !"),"success");
						

				}
				if(check.assigned(fn)){
					return fn();
				}
			}
				

		});
	};
	this.resetBuckets = function resetBuckets(fn){
		
		var stamp1=new Date().getTime()-2000;//giving less time
		that.bucket_collection.update({"underProcess":true,"processingBot":config.getConfig("bot_name")},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
			that.semaphore_collection.remove({"bot_name":config.getConfig("bot_name")},function resetBuckets1(err,results){
				if(err){
				msg("pool.resetBuckets","error");
				}
				else{
					msg("pool.resetBuckets","success");
					fn();
					return;
				}


			});
			
			
		});

	};
	this.addLinksToDB = function addLinksToDB(hashes_obj,freqType,fn){
		
		var li=hashes_obj["links"];
		if(li.length===0){
			fn(null);
			return;
		}
		var success=0;
		var done = 0;
		var limit = li.length;
		for (var i = 0; i < li.length; i++) {
			(function(url, hash){
				//url has to be updated to urlID
				that.mongodb_collection.updateOne({"_id":ObjectId(url["_id"])},{"$set":{"bucketed":true,"domain":url.domain,"parent":url.parent,"data":"","bucket_id":ObjectId(hash)}},function(err,results){
						//console.log(arguments);
						if(err){
							//#debug#console.log(err);
							//link is already present
							//#debug#console.log("pool.addToPool");
						}
						else{
							success+=1;

						}
						done+=1;
						if(limit === done){
							fn(success);
							return;
						}				
				});
			})(li[i], hashes_obj["_id"]);


			
		};
		
	};
	this.drop = function drop(fn){
		
		that.db.dropDatabase();
		try{
			fs.unlinkSync(parent_dir+'/db/tika_queue');
		}
		finally{
			fn();
			return;
		}
		
	};

	this.insertParseFile = function insertParseFile(filename,fn){
		
		var data=fs.readFileSync(parent_dir+'/parsers/'+filename+".js");
		var hash= generateMD5(data.toString());
		that.parsers_collection.update({"_id":filename},{"$set":{"data":data,"hash":hash}},{upsert:true},function(err,results){
			if(err){
				fn(false);
				return;
			}
			else{
				fn(true);
				return;
			}
		});
	};



	this.checkIfBotActive = function checkIfBotActive(fn){
		
		that.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,result){
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
	};
	this.checkIfNewCrawl = function checkIfNewCrawl(fn){
		var id_name=config.getConfig("cluster_name");
		
		that.cluster_info_collection.findOne({"_id":id_name},function findInCluster(err,results){
			//console.log(err,results)
			if(!results){
				//first time crawl therfore update the cluster info
				that.cluster_info_collection.insert({"_id":id_name,'createdAt':new Date(),'webapp_host':config.getConfig("network_host"),'webapp_port':config.getConfig('network_port'),'initiatedBy':config.getConfig('bot_name')},function insertIntoCluster(err1,results1){

					if(!err){
						msg("Inserted cluster info for fresh crawl ","success");
						fn(true);
						return;
					}
				});
			}
			else{
				msg("An old crawl is already present ","info");
				fn(false,results);
				return;
			}
			
		});
	};
	




	this.setParent = function setParent(){
			this.bot.parent=this;
			this.cluster.parent=this;
			this.stats.parent=this;
			this.config_reloader.parent=this;
			this.bucketOperation.parent=this;
	};

	this.bot = {
		"requestToBecomeMaster": function bot_requestToBecomeMaster(bot_name,fn){
			
			that.semaphore_collection.findOne({"_id":"master"},function(err,doc){
				if(check.assigned(doc)){
					fn(false);
					return;
				}else{
					that.semaphore_collection.insert({"bot_name":config.getConfig("bot_name"),"requestTime":parseInt(new Date().toString())},function(e,d){
						that.semaphore_collection.find({}).sort({"requestTime":1}).toArray(function electMaster(ee,docs){
							if(check.assigned(docs)){
								if(check.assigned(docs[0])){
									if(docs[0]["bot_name"]===config.getConfig("bot_name")){
										msg("Became master","success");
										that.semaphore_collection.insert({"_id":"master","bot_name":config.getConfig("bot_name")},function(eee,ddd){
												that.semaphore_collection.remove({"requestTime":{"$exists":true}},function(){

											
												that.cluster_info_collection.updateOne({"_id":config.getConfig("cluster_name")},{$set:{"master":config.getConfig("bot_name")}},function(eeee,dddd){

													fn(true);
													return;

												});
												
											});

										});//clear the collection
										
										
									}
									else{
										fn(false);
										return;
									}
								}
								else{
										fn(false);
										return;
									}
							}else{
								fn(false);
								return;
							}
						});
						
					})
				}
			});
		},
		"checkIfStillMaster": function bot_checkIfStillMaster(fn){
			
			that.semaphore_collection.findOne({"_id":"master"},function(err,doc){
				if(check.assigned(doc)){
					if(doc.bot_name===config.getConfig("bot_name")){
						//#debug#console.log("still")
						fn(true);
					}else{
						//anyone else is master so then leave
						fn(false);
					}
					
				}
				else{
					//no one is master then try to become one
					//#debug#console.log("trying")
					that.bot.requestToBecomeMaster(config.getConfig("bot_name"),function(st){
						fn(st);
						return;
					});
					
				}
			});
		},
		"startBotGetBotActiveStatus": function bot_startBotGetBotActiveStatus(fn){
			
			that.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,results){
				fn(err,results);
				return;
			});
		},
		"startBotAddNewBot": function bot_startBotAddNewBot(t,fn){
			
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true}},{remove:false,upsert:true},function(err,result){
				fn(err,result);
				return;
			});
		},
		"updateBotInfo": function bot_updateBotInfo(n_dic,fn){
			
			that.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
				fn(err,results);
				return;

			});
		},
		"BotMarkInactive": function bot_BotMarkInactive(fn){
			
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
				fn(err,result);
				return;
			});
		}
	};


	this.cluster = {
		"getMaster": function cluster_getMaster(fn){
			
			that.cluster_info_collection.findOne({"_id":config.getConfig("cluster_name")},function(e,d){
				if(check.assigned(d)){
					fn(d.master);
					return;
				}else{
					fn(null);
					return;
				}
			});
		},
		"getBotConfig":function cluster_getBotConfig(bot_name,fn){
			
			that.bot_collection.findOne({"_id":bot_name},function(err,results){
				fn(err,results);
				return;

			});
		},
		"getSeed":function cluster_getSeed(fn){
			
			that.seed_collection.find({}).toArray(function(err,results){
					var seeds=results;
					fn(err,seeds);
					return;

			});
		}
	};
	this.stats = {
		"getPage":function stats_getPage(url,fn){
			
			//#debug#console.log(url)
			that.mongodb_collection.findOne({"_id":ObjectId(url)},function(err,results){
				
				fn(err,results);
				return;
			});
		},
		"getBucket":function stats_getBucket(url,fn){
			
			//#debug#console.log(url)
			that.bucket_collection.findOne({"_id":ObjectId(url)},function(err,results){
				
				fn(err,results);
				return;
			});
		},
		"cluster_info":function stats_cluster_info(id_name,fn){
			
			that.cluster_info_collection.findOne({"_id":id_name},function(err,results){
				fn(err,results);
				return;
			});
		},
		"activeBots":function stats_activeBots(fn){
			
			
			that.bot_collection.find({},{}).toArray(function(err,docs){
				//this method is called by cluster in some interval which will also update the new added bots for partioning
				//console.log(err,docs);
				if(check.assigned(err)){
					fn(err,[]);
					return;
				}
				var active_bots = [];
				for (var i = 0; i < docs.length; i++) {
						var obj=docs[i]["_id"];
						if(docs[i]["active"]){
							active_bots.push(obj);
						}
				};
				//console.log(active_bots,"hereeee");
				//for starting load balancing
				if(check.assigned(active_bots)){
					if(first_bot_count){
						old_bot_count = active_bots.length;
						//console.log(old_bot_count ,"OLD COUNT");
						first_bot_count = false;
					}else{
						//console.log(active_bots ,"\t", old_bot_count,"CALC");
						if(Math.abs(active_bots.length - old_bot_count)>0 && message.get('cluster_master')){
							

							msg("new bots added, start load balancing" ,"info");
						}
					}					
				}

				


				fn(err,docs);
				return;
			});
		},
		"crawlStats":function stats_crawlStats(fn){
			var dic={};
			
			that.bot_collection.find({},{}).toArray(function(err,docs){
				if(!check.assigned(err) && check.assigned(docs)){
					var processed_buckets = 0;
					var crawled_count = 0;
					var failed_count = 0;
					var created_buckets = 0;
					for(var index in docs){
						var doc = docs[index];
						if(check.assigned(doc['createdBuckets'])){
							created_buckets += doc['createdBuckets'];
						}
						if(check.assigned(doc['processedBuckets'])){
							processed_buckets += doc['processedBuckets'];
						}
						if(check.assigned(doc['crawledPages'])){
							crawled_count += doc['crawledPages'];
						}
						if(check.assigned(doc['failedPages'])){
							failed_count += doc['failedPages'];
						}

					};
					fn({"processed_buckets":processed_buckets, "crawled_count":crawled_count,"failed_count":failed_count,"bucket_count":created_buckets});
					return;
				}else{
					fn({"processed_buckets":0, "crawled_count":0,"failed_count":0,"bucket_count":0});
					return;
				}


			});
		},
		"getCrawledPages":function stats_getCrawledPages(d,len,i,sor,fn){
			
			var cursor=that.mongodb_collection.find(d,{},{});
			cursor.count(function(err,c){
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					//#debug#console.log(c);
					fn(err,docs,c);
					return;
				});
			})
		},
		"getFailedPages":function stats_getFailedPages(d,len,i,sor,fn){
			
			var cursor=that.mongodb_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
					return;
				});
			})
			
		},
		"getTotalPages":function stats_getTotalPages(d,len,i,sor,fn){
			
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
					return;
				});
			})
		},
		"getTotalBuckets":function stats_getTotalBuckets(d,len,i,sor,fn){
			
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
					return;
				});
			})
		},
		"getProcessedBuckets":function stats_getProcessedBuckets(d,len,i,sor,fn){
			
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
					return;
				});
			})
		},
		"updateConfig":function stats_updateConfig(bot_name,js,fn){
			
			that.bot_collection.update({"_id":bot_name},{"$set":{"config":js}},function(err,results){
				//console.log(err)
				fn(err,results);
				return;
			});
		},
		"search":function stats_search(query,i,fn){
			i-=1;
			if(!check.assigned(i)|| i===0 || !check.number(i)){
				i=0;
			}
			i=i*10;
			
			that.mongodb_collection.find({$text: {$search: query}}, {score: {$meta: "textScore"}},{ skip: i, limit: 10 }).sort({score:{$meta:"textScore"}}).toArray(function(err,docs){
				fn(err,docs);
				return;
			});
		}
	};
	this.config_reloader = {
		"pullDbConfig":function stats_pullDbConfig(idd,fn){
			
					that.bot_collection.findOne({"_id":idd},function pullDbConfig1(err,results){
						//console.log(results)
						if(!check.assigned(results)){
							fn(err,null);
							return;
						}
						var c=results.config;
						if(err){
							msg("Error ocurred while pulling bot config from db ","error");
							fn(err,null);
							return;
						}
						else{
							msg("Bot config pulled from db","success");
							fn(err,c);
							return;
						}
					});
		}
	};
	


function msg(){if(!check.assigned(message.get('log'))){console.log(arguments[0]);return;} message.get('log').put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}

};

module.exports = MongoDB;

