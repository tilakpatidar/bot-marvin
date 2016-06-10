//global connection to mongodb
//mongodb connection file
var ObjectId = require('mongodb').ObjectId;
var Immutable = require('immutable');
var crypto = require('crypto');
var MongoClient = require('mongodb').MongoClient;
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=process.bot_config;
var mongodb=config.getConfig("mongodb","mongodb_uri");
var child=require('child_process');
var score=require(parent_dir+'/lib/score.js').init;
var proto=require(parent_dir+'/lib/proto.js');
var proxy_cache_class = require(parent_dir + "/lib/bucket_proxy.js");
var proxy_cache;
var JSONX=proto.JSONX;
var old_bot_count = 0;
var first_bot_count = true;
var ObjectX=proto.ObjectX;
var _ = require("underscore");
var check = require('check-types');
var mongodb_collection=config.getConfig("mongodb","mongodb_collection");
var mongodb_collection=config.getConfig("mongodb","mongodb_collection");
var bucket_collection=config.getConfig("mongodb","bucket_collection");
var bot_collection=config.getConfig("mongodb","bot_collection");
var semaphore_collection=config.getConfig("mongodb","semaphore_collection");
var cluster_info_collection=config.getConfig("mongodb","cluster_info_collection");
var parsers_collection=config.getConfig("mongodb","parsers_collection");
var sitemap_collection=config.getConfig("mongodb","sitemap_collection");
var robots_collection=config.getConfig("mongodb","robots_collection");
var graph_collection=config.getConfig("mongodb","graph_collection");
var seed_collection=config.getConfig("mongodb","seed_collection");
var author_collection=config.getConfig("mongodb","author_collection");
var sub_list_collection = config.getConfig("mongodb","sub_list_collection");
var fs=require('fs');
var urllib=require('url');
var sitemap_queue = [];
var cluster;

//read seed file
process.bucket_time_interval = 10000;
process.bucket_creater_locked=true;

function generateMD5(str){

	var md5sum = crypto.createHash('md5');
	md5sum.update(str);
	var hash=md5sum.digest('hex');
	return hash;
}

function lazy_sitemap_updator(){
	var domain = sitemap_queue.splice(0,1)[0];

	if(!check.assigned(domain)){
		msg("Lazy loading finished for all domains","success");
		return;
	}
	



	var abs = urllib.resolve(domain,'sitemap.xml');
	

	msg("Lazy loading sitemaps for "+abs, "info");
	
	pool.sitemap_collection.findOne({"_id": domain},function(err,docs){
		if(check.assigned(err) || !check.assigned(docs)){
			var sitemap = require(parent_dir+'/lib/sitemap_parser');
			var regex_urlfilter = {'accept':config.getConfig('accept_regex'),'reject':config.getConfig('reject_regex')};
			sitemap.init(config, regex_urlfilter);
			sitemap.getSites(abs, function(err, sites) {
			    if(!err) {
			    	
			        pool.updateSiteMap(domain,sites,function(){
			        	setTimeout(function(){lazy_sitemap_updator();},1000);
			        	
			        });
			    }
			    else {
			       	msg("Sitemap could not be downloaded for "+domain,"error");
			        pool.updateSiteMap(domain,[],function(){
			        	setTimeout(function(){lazy_sitemap_updator();},1000);
			        });
			    }
			});
		}
		else{
			setTimeout(function(){lazy_sitemap_updator();},1000);
		}
	});
}

var pool={
	"distinct_fetch_intervals" : {}, //keeps track of distinct fetch intervals
	"seed":function seed(fn){
		//this method runs first when crawler starts
		
		var that=this;
		that.mongodb_collection.createIndex({"$**":"text"},{"weights": {"data._source.id":5,"data._source.host":5,"data._source.meta_description":5,"data._source.title":5,"data._source.body":1}},function(err){
				//#debug#console.log(err);
			});
		that.bucket_collection.createIndex({recrawlAt:1},function(err){});//asc order sort for recrawlAt
		that.bucket_collection.createIndex({score:1},function(err){});//asc order sort for score
					that.getParsers(function(){
								var done=0;
								var success=0;
								var stamp1=new Date().getTime()-2000;//giving less time
								
								//generate seed buckets from sub_lists

								var mul_buckets = [];
								for(var ind in that.sub_list){
									var sub_group = that.sub_list[ind];
									var domains = sub_group["_id"];
									var links = _.pluck(sub_group["domains"],"_id");
									var fetch_interval = sub_group["fetch_interval"];
									mul_buckets.push({"_id": ObjectId(), "domains":domains,"links":links,"score":1,"recrawlLabel": fetch_interval,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":links.length});
								}


 								that.bucket_collection.insertMany(mul_buckets ,function(err,doc){
										var successfull = doc['insertedIds'];
										if(!check.assigned(successfull)){
											var successfull = _.pluck(doc.getInsertedIds(), '_id');
										}			
										var inserted_docs = [];
										var sitemap_urls = [];
										mul_buckets = _.indexBy( mul_buckets, "_id");

										//now check how many sub groups buckets were successfully inserted
										//and the insert urls from those buckets
										for(var ind in successfull){
											var sub_list_id = successfull[ind];
											var sub_group = mul_buckets[sub_list_id];
											console.log(sub_group);
											if(check.assigned(sub_group)){
												var links = sub_group["links"];
												console.log(links);
												var fetch_interval = sub_group["recrawlLabel"];

												for (var i = 0; i < links.length; i++) {
											
													var anon=(function(domain, fetch_interval, stamp){
														
														var md5 = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
														inserted_docs.push({"url":domain,"bucket_id":ObjectId(stamp),"domain":domain,"partitionedBy":config.getConfig("bot_name"),"bucketed":true,"fetch_interval":fetch_interval,"level":1, "md5": md5});				
														
														//for $in in sitemap collection
														

													});

													anon(links[i], fetch_interval, sub_list_id);
			
												};
											}
										}

										

										that.getLinksFromSiteMap(links);
										if(inserted_docs.length === 0){
											
											return fn(false);
										}

										that.mongodb_collection.insertMany(inserted_docs,function initBySeed(err,doc){
											
										
											
											if(err){
												msg("pool.init maybe seed is already added","error");
											}
											
											var successfull = doc['insertedIds'];
											if(!check.assigned(successfull)){
												var successfull = _.pluck(doc.getInsertedIds(), '_id');
											}
											
											msg(("Added seeds to initialize pool"),"success");

											if(successfull.length === 0){
												that.bucket_collection.remove({"_id":{"$in":ObjectId(Object.keys(mul_buckets))}},function(){
														//if urls are not inserted due to duplicate reason then remove all buckets
														fn(true);
														return;	

												});
											}else{
												fn(true);
												return;
											}
											
											fn(false);
											return;


											
	
											});
					
								});
							
						
			
			

					

			});

	},
	"getLinksFromSiteMap":function getLinksFromSiteMap(domain_urls, fn){
		if(!config.getConfig('parse_sitemaps') || process.webappOnly){
			if(check.assigned(fn)){
				return fn();
			}else{
				return;
			}
			
		}
		
		var that=this;
		var TOTAL = new Immutable.Set(domain_urls);
		that.sitemap_collection.find({"_id":{"$in":domain_urls}}).toArray(function sitemap_findMany(err,docs){
			if(check.assigned(err) || !check.assigned(docs)){
				msg("Sitemap not present in db",'error');
				if(check.assigned(fn)){
					return fn(false);
				}else{
					return;
				}
			}
			else{
				
				var existing = new Immutable.Set(_.pluck(docs, '_id'));

				var queued = TOTAL.subtract(existing);

				sitemap_queue = queued.toArray();

				msg('Sitemap domains pushed into queue' , 'success');
				

				setTimeout(function(){lazy_sitemap_updator();},1000);
				//insert sitemap urls
				
				if(check.assigned(fn)){
					return fn(true);
				}else{
					return;
				}
				
			}

		});
	},
	"updateSiteMap":function updateSiteMap(domain,sites,fn){
		var that=this;
		that.sitemap_collection.insert({"_id":domain,"sites": sites},function updateSiteMapInsert(err,results){
			msg("Updated sitemap file for "+domain+"in db","info");

			that.addToPool(sites,function(){
				fn();

			})
			

		});
		
	},
	"insertLinksInDB":function insertLinksInDB(li,fn){
			var that=this; 
			var inserted_docs = [];
			var urlMap = {};
			for (var i = 0; i < li.length; i++) {
				//inserting new links in cache
				var domain=li[i][1];
				var url=li[i][0];
				var parent=li[i][2];
				var refresh_time;
				if(check.assigned(li[i][3])){
					refresh_time=li[i][3];
				}
				else{
					refresh_time=that.links[domain]["fetch_interval"];
				}
				//overriding default fetch_interval with the domain specified interval
				//#debug#console.log(refresh_time);
				if(!check.assigned(refresh_time)){
					refresh_time=config.getConfig("default_recrawl_interval");
				}
				
				
				
				
				var unique_id = ObjectId();
				var level = url.replace('http://','').split('/').length;
				var md5 = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
				var doc = {'_id':unique_id ,"url":url,"bucketed":false,"partitionedBy": config.getConfig('bot_name'),"domain":domain,"parent":parent,"data":"","bucket_id":null,"fetch_interval":refresh_time, "level":level, "md5": md5};
				urlMap[unique_id] = doc; 
				inserted_docs.push(doc);
				
			
				
				
			};

			that.mongodb_collection.insertMany(inserted_docs,function insertLinksMany(err, doc){
							//console.log(arguments);

							if(check.assigned(err)){
								msg("error in insertMany","error");
								fn();
							}
							else{
								msg("Inlinks flushed in db","success");
							}
							var successfull = doc['insertedIds'];
							if(!check.assigned(successfull)){
								var successfull = _.pluck(doc.getInsertedIds(), '_id');
							}
							for(var index in successfull){
								var success = successfull[index];
								var url_obj = urlMap[success];
								if(!check.assigned(proxy_cache)){
									proxy_cache = new proxy_cache_class(config.getConfig('inlink_cache_size'));
								}
								proxy_cache.pushURL(url_obj);
								fn();
							}
							
							
							
					
											
			});
	},
	"insertAuthor": function insertAuthor(data){
		var that = this;
		var author_url = Object.keys(data)[0];
		var page_url = data[author_url];
		that.author_collection.updateOne({"_id": author_url}, {"$push":{"pages": page_url}}, {upsert: true},function(){

		});
	},
	"addToPool":function addToPool(li,fn){
		var that=this;
		//urls we will be getting will be absolute
		if(li.length===0){
			//buckets with empty links will not be inserted
			fn(false);
			return;
		}
		that.insertLinksInDB(li,function(){
			//#debug#console.log("heree")
			fn(true);
			return;
		}); //links will be inserted in the links collection
		//#debug#console.log("herere 1");

		
			
	},
	"getNextBatch":function getNextBatch(result,batchSize){
		var that=this;
			var stamp1=new Date().getTime();
			
				that.bucket_collection.findAndModify({"domains":{"$in":that.alloted_domain_groups},"underProcess":false,"recrawlAt":{$lte:stamp1}},[['recrawlAt',1],['score',1]],{"$set":{"underProcess":true,"processingBot":config.getConfig("bot_name")}},{"remove":false},function getNextBatchFM(err1,object){
					//#debug#console.log(object,err1)
					if( check.assigned(object) && check.assigned(object.value)){
							var hash=object["value"]["_id"];
							//#debug#console.log(hash);
							var refresh_label=object["value"]["recrawlLabel"];
							that.mongodb_collection.find({"bucket_id":hash,"abandoned":{"$exists":false} },{},{}).toArray(function getNextBatchFind(err,docs){
								//console.log(err,docs);
								if(!check.assigned(err) && docs.length === 0){
									//we got empty bucket remove it 
									//every time seed bucket is readded if seeds are already added
									//this could lead to empty bucket
									//remove it if you encouter an empty bucket

									//fixed from seed but still removing any empty bucket

									that.bucket_collection.removeOne({"_id":ObjectId(hash)},function(){

										msg("empty bucket removed ",'success');
									});
								}
									if(err){

										msg("pool.getNextBatch","error");
										result(null,[],null,null);
										return;
									}
									else{
										process.bot.updateStats("processedBuckets",1);	
										//#debug#console.log(docs);
										msg(("Got "+docs.length+" for next Batch"),"success");
										result(err,docs,(hash+""),refresh_label);		
									}


								});
					}
					else{
						result(null,[],null);
						return;
						}
					});	
				
		

	},
	"insertRssFeed":function insertRssFeed(d){
		var that = this;
		var url = d[0];
		var rss_links = d[1];
		var docs = [];
		for(var index in rss_links){
			var rss_link = rss_links[index];
			docs.push({"_id": rss_link, page: url});
			
		}
		that.rss_feeds.insertMany(docs);
		
	},
	"checkUnCrawled":function checkUnCrawled(links,callback){
		var that =this;
		links = _.pluck(links, '_id');
		that.mongodb_collection.find({"response":{"$exists":false},"_id":{"$in":links}}).toArray(function(err,docs){
			return callback(err,docs);
		});
	},
	"setCrawled":function setCrawled(link_details,fn){
		if(!check.assigned(fn)){
			fn = function(){};
		}
		var that = this;
		var url = link_details.url;
		var urlID = link_details.urlID;
		var data = link_details.parsed_content;
		var status = link_details.status_code;
		//console.log("############# RESPONSE STATUS ########### ",status);
		var stamp1 = new Date().getTime();
		var redirect_url = link_details.redirect;
		var response_time = link_details.response_time;
		var canonical_url = link_details.canonical_url;
		var alternate_urls = link_details.alternate_urls;
		var header_content_type = link_details.header_content_type;
		var md5 = link_details.content_md5;
		//console.log(link_details,"############FOR UPDATE#############");
		if(!check.assigned(data)){

			data="";
		}
		//#debug#console.log(status)
		if(!check.assigned(status)){
			status="0";//no error
		}

		var add_docs = [];

		var dict = {"bucketed":true,"url":url,"data":data,"response":status, "lastModified":stamp1,"updatedBy":config.getConfig("bot_name")};
		var from_failed_queue = false;
		var abandoned = false;
		var failed_count = 0;
		var failed_id = 0;

		if(check.assigned(md5)){
			dict["md5"] = md5;
		}

		if(check.assigned(header_content_type)){
			dict["header_content_type"] = header_content_type;
		}

		if(check.assigned(alternate_urls) && !check.emptyObject(alternate_urls)){
			dict["alternate_urls_lang"] = alternate_urls;

		}


		if(check.assigned(response_time)){

			dict["response_time"] = response_time;
		}

		
		if(check.assigned(link_details.bucket_id) && !link_details['normal_queue']){
			
			from_failed_queue = true;
			failed_count = parseInt(link_details.bucket_id.replace('failed_queue_','').split('_').pop()) + 1;
			failed_id = parseInt(link_details.bucket_id.replace('failed_queue_','').split('_')[1]);
			//console.log(link_details.url+' from failed_queue',failed_id,'\t',failed_count);
		}


		if(data === "" || status ==='ETIMEDOUT_CALLBACK' || status ==='ETIMEDOUT_CONNECTION' || status ==='ETIMEDOUT_READ' || status === -1){
			//if 4xx or 5XX series status code then add to failed queue
			if(from_failed_queue){
				//then check the count
				if(failed_count >= config.getConfig("retry_times_failed_pages")){
					dict["abandoned"] = true;
					abandoned = true;
					//if so mark abandoned and delete from queue
					(function(failed_id, url){
						/*
						failed_db.parallelize(function() {
							failed_db.run("DELETE FROM q WHERE id=?",[failed_id],function delete_from_failed_queue(e,r){
									
									
									//console.log(e,failed_id,'marked abandoned');
									msg('Deleted from failed queue and abandoned'+url,'info');

							});
						});
						*/
						that.failed_db.removeOne({"_id":failed_id},function delete_from_failed_queue(e,r){
									//console.log(e,failed_id,'marked abandoned');
									msg('Deleted from failed queue and abandoned'+url,'info');

						})
					})(failed_id, link_details.url);

				}
				else{
					//inc by one and status = 0
					(function(url, failed_id){

						/*
							failed_db.parallelize(function() {
								failed_db.run("UPDATE q SET count = count+1, status=0 WHERE id=?",[failed_id],function failed_retry_pushed(e,r){
									//console.log('counter increased ',failed_id);
									msg('Pushed again to retry in failed queue '+url,'info');
								});	
							});
						*/
						that.failed_db.updateOne({"_id":failed_id},{"$set":{"status":0}, "$inc":{"count":1}},function failed_retry_pushed(e,r){
							//console.log('counter increased ',failed_id);
							msg('Pushed again to retry in failed queue '+url,'info');
						});

					})(link_details.url,failed_id);					

				}
			}else{

					dict['abandoned'] = false;
					(function(link_details){
						/*
						failed_db.parallelize(function() {
							failed_db.run("INSERT OR IGNORE INTO q(failed_url,failed_info,status,count) VALUES(?,?,0,0)",[link_details.url,JSON.stringify(link_details)],function insertFailed(err,row){
								//console.log(err,row);
								msg("Inserted failed url "+link_details.url+" into failed queue", 'success');
							});
						});
						*/
						that.failed_db.insert({"failed_url":link_details.url, "failed_info": link_details, "status":0, "count":0},function insertFailed(err,row){
								//console.log(err,row);
								msg("Inserted failed url "+link_details.url+" into failed queue", 'success');
						});
					})(link_details);
					return fn();
			}
		}else if((status+"").indexOf("EMPTY_RESPONSE")>=0){
			//do not retry reject 
			dict["abandoned"] = true;
			dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
			abandoned = true;
			delete dict["response_time"];

			//if so mark abandoned 
			process.bot.updateStats("failedPages",1);
			msg('Abandoned due to empty response '+url,'info');
		}
		else if(status === "MimeTypeRejected"){
			//do not retry reject 
			dict["abandoned"] = true;
			abandoned = true;
			dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
			delete dict["response_time"];

			//if so mark abandoned 
			process.bot.updateStats("failedPages",1);
			msg('Abandoned due to mime type rejection '+url,'info');
		}
		else if((status+"").indexOf("NOINDEX")>=0){
			//do not retry reject 
			dict["abandoned"] = true;
			abandoned = true;
			delete dict["response_time"];
			dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
			//if so mark abandoned 
			process.bot.updateStats("failedPages",1);
			msg('Abandoned due to no INDEX from meta '+url,'info');
		}
		else if(status === "ContentTypeRejected"){
			//do not retry reject 
			dict["abandoned"] = true;
			abandoned = true;
			dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
			delete dict["response_time"];
			//if so mark abandoned 
			process.bot.updateStats("failedPages",1);
			msg('Abandoned due to content type rejection '+url,'info');
		}
		else if(status === "ContentLangRejected"){
			//do not retry reject 
			dict["abandoned"] = true;
			abandoned = true;
			dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
			delete dict["response_time"];
			//if so mark abandoned 
			process.bot.updateStats("failedPages",1);
			msg('Abandoned due to content lang rejection '+url,'info');
		}
		else{
			
				//link is from failed_queue and is successfull now
				if(from_failed_queue){
					(function(url, failed_id){
						/*
							failed_db.parallelize(function() {
								failed_db.run("DELETE FROM q WHERE id=?",[failed_id],function failed_success(err,row){
									
									msg(url+' from failed_queue is successfull now','info');
								});

							});
						*/
						that.failed_db.removeOne({"_id":failed_id},function failed_success(err,row){
									
									msg(url+' from failed_queue is successfull now','info');
						});

					})(link_details.url,failed_id);
				}


				dict["crawled"] = true; //final marker for crawled page


			
		}
		
		
		if(check.assigned(redirect_url)){
			dict["redirect_url"] = redirect_url;
		}
		//console.log(dict);

		if(check.assigned(canonical_url) && canonical_url !== url){
			    	//if both urls are same then no need to mark abandoned
				
				//if we are getting canonical_url val this means page was successfull and was parsed
				var new_dict = JSON.parse(JSON.stringify(dict));
				delete dict["crawled"]; //remove crawled marker
				dict["md5"] = ObjectId().toString()+"fake"+parseInt(Math.random()*10000);
				new_dict['url'] = canonical_url;
				new_dict["alternate_urls"] = [url];
				new_dict["bucket_id"] = link_details.bucket_id;
				that.mongodb_collection.findOne({"url":canonical_url},function(err,doc){
					//console.log("Find canonical_url ",err,doc," find canonical_url");
					if(check.assigned(err) || !check.assigned(doc)){
						//canonical url not present
					//	console.log("canonical not present");
						that.mongodb_collection.insert(new_dict,function(err1,res1){
						//	console.log(arguments);
							//insert the new canonical url in the same bucket
							//console.log("Insert canonical_url ",err1,res1," insert canonical_url");

						});
					}
					else{
						//url already present update it
						var aul = [];
						if(check.assigned(alternate_urls) && !check.emptyObject(alternate_urls)){
							aul = alternate_urls;
						}
						that.mongodb_collection.updateOne({"_id":doc["_id"]}, {"$push":{"alternate_urls":url}, "$pushAll":{"alternate_urls_lang": alternate_urls}}, function(e,r){
						//	console.log("update canonical_url ",e,r," update canonical_url");


						});
					}
				});


				//now changes to this page
				dict["data"] = "";
				dict["abandoned"] = true;
				abandoned = true;
				dict["response"] = dict["response"] + "_CANONICAL_PAGE_EXISTS";
				dict["canonical_url"] = canonical_url;
	 		}



		that.mongodb_collection.updateOne({"_id":ObjectId(urlID)},{$set:dict},function updateDoc(err,results){
			
			if(err){
				if(err.code === 11000){
					if(err.errmsg.indexOf("$md5_1 dup key")>=0){
						
						if(link_details.status_code === 404){
							process.bot.updateStats("failedPages",1);
							msg("Duplicate page found but 404 thus skipping .",'info');
							dict["abandoned"] = true;
							delete dict["crawled"];
							delete dict["data"];
							dict["response"] = "404_SAME_MD5_PAGE_EXISTS";
							dict["md5"] = md5 + "md5#random#"+parseInt(Math.random()*10000)+""+parseInt(new Date().getTime());
							that.mongodb_collection.updateOne({"_id":ObjectId(urlID)},{$set:dict},function(err,results){

							});
						}else{
							msg("Duplicate page found","info");
							//a similar page exists
							//then update this link into it and abondon this by setting a canonial link

							that.mongodb_collection.updateOne({"md5": md5}, {"$push":{"alternate_urls":url}, "$pushAll":{"alternate_urls_lang": alternate_urls}}, function(e,r){
							//	console.log("update canonical_url ",e,r," update canonical_url");


							});
							process.bot.updateStats("failedPages",1);
							dict["abandoned"] = true;
							delete dict["crawled"];
							delete dict["data"];
							dict["response"] = "SAME_MD5_PAGE_EXISTS";
							dict["md5"] = md5 + "md5#random#"+parseInt(Math.random()*10000)+""+parseInt(new Date().getTime());
							that.mongodb_collection.updateOne({"_id":ObjectId(urlID)},{$set:dict},function(err,results){

							});
						}
						
					}
				}else{
					msg("pool.setCrawled","error");
				}
				
			}
			else{
				if( !abandoned && dict["response"] !=="inTikaQueue"){
					process.bot.updateStats("crawledPages",1);
					msg(("Updated "+url),"success");
				}
				if(abandoned){
					process.bot.updateStats("failedPages",1);
				}
				
				
			}
			
		});
	return fn();
	},
	"createConnection":function createConnection(fn){
		var that=this;
		var serverOptions = {
		  'auto_reconnect': true,
		  'poolSize': config.getConfig("mongodb","pool_size")
		};
		process.mongo=MongoClient.connect(mongodb,serverOptions, function(err, db) {
			that.db=db;
			//#debug#console.log(err,db)
			that.mongodb_collection=db.collection(mongodb_collection);
			that.bucket_collection=db.collection(bucket_collection);
			that.bot_collection=db.collection(bot_collection);
			that.semaphore_collection=db.collection(semaphore_collection);
			that.cluster_info_collection=db.collection(cluster_info_collection);
			that.parsers_collection=db.collection(parsers_collection);
			that.sitemap_collection=db.collection(sitemap_collection);
			that.robots_collection=db.collection(robots_collection);
			that.graph_collection=db.collection(graph_collection);
			that.seed_collection=db.collection(seed_collection);
			that.author_collection = db.collection(author_collection);
			that.sub_list_collection = db.collection(sub_list_collection);
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
	},
	close:function close(fn){
		var that=this;
		if(!check.assigned(fn)){
			fn=function (argument) {
				// body...
			}
		}
		that.db.close(fn);
	},
	"insertTikaQueue":function(d,fn){
		var that = this;
		if(!check.assigned(fn)){
			fn = function(){};
		}
		that.tika_queue.insert(d,function(e,dd){

			fn(e,dd);
		});
	},
	"readSeedFile":function readSeedFile(fn){
		var URL=require(parent_dir+'/lib/url.js');
		var regex_urlfilter = {};
		regex_urlfilter["accept"]=config.getConfig("accept_regex");
		regex_urlfilter["reject"]=config.getConfig("reject_regex");
		URL.init(config, regex_urlfilter);
		var that=this;
		that.sub_list_collection.find({"bot_name": config.getConfig("bot_name")}).toArray(function readSeedCol(err,results){
			
			that.sub_list = _.clone(results);
			if(results.length===0){
				//empty seed file
				msg("Empty seed file","error");
				process.bot.stopBot(function(){
						process.exit(0);
				});
				fn([],[]);
				return;
			}
			that.alloted_domain_groups = _.flatten(_.pluck(results, '_id'));
			console.log(that.alloted_domain_groups);
			results = _.flatten(_.pluck(results, "domains"));
			var intervals = _.pluck(results, 'fetch_interval');
			intervals = _.uniq(intervals);
			results = _.indexBy(results, '_id');
			

			
			var hash= generateMD5(JSON.stringify(results));

			that.seed_db_copy = hash;//stored for future comparision now hash comparision


			var dict = {};

			for (var i = 0; i < intervals.length; i++) {
				
				that.distinct_fetch_intervals[intervals[i]] = true; //mark the fetch interval for bucket creation
				dict[intervals[i]] = [];

			};

			
			
			
			
			that["links"] = results;
			that["seedCount"] = results.length;


			// that.links is json with domains as keys
			// that.bucket_priority is list of seed jsons

			fn(results);
			return;
		});
		
		
		
	},
	"batchFinished":function batchFinished(hash,refresh_label,fn, updateStats){
		var that=this;
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
	},
	"resetBuckets":function resetBuckets(fn){
		var that=this;
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

	},
	"addLinksToDB":function addLinksToDB(hashes_obj,freqType,fn){
		var that=this;
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
		
	},
	"drop":function drop(fn){
		var that=this;
		that.db.dropDatabase();
		try{
			fs.unlinkSync(parent_dir+'/db/tika_queue');
		}
		finally{
			fn();
			return;
		}
		
		
		
	},
	"insertParseFile":function insertParseFile(filename,fn){
		var that=this;
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
	},
	"removeSeed":function removeSeed(url,fn){
		var that=this;
		var cluster_name=config.getConfig("cluster_name");
		var org_url=url;
		that.seed_collection.removeOne({"_id":url},function(err,result){
			if(err){
				fn(false);
				return;
			}
			else{
				delete that.links[org_url];
				fn(true);
				return;
			}
		});
	},
	"clearSeed":function clearSeed(fn){
		var that=this;
		that.seed_collection.remove({},function(err,result){
			if(err){
				fn(false);
				return;
			}
			else{
				that.links={};
				fn(true);
				return;
			}
		});
	},
	"isSeedPresent":function isSeedPresent(url,fn){
		var that=this;
		that.seed_collection.findOne({"_id":url},function(err,doc){
			if(check.assigned(doc)){
				fn(true);
			}else{
				fn(false);
			}

		});
	},
	"moveSeedCollection":function moveSeedCollection(fn){
		var that = this;
		that.seed_collection.rename("seed_tmp",function(){
			that.sub_list_collection.rename("sub_lists_tmp",function(){
				that.seed_collection=that.db.collection(config.getConfig("mongodb","seed_collection"));
				that.sub_list_collection = that.db.collection(sub_list_collection);
				fn();
			});
		})
	},
	"restoreSeedCollection":function restoreSeedCollection(fn){
		var that = this;
		that.db.collection(config.getConfig("mongodb","seed_collection")).drop(function(){
			that.db.collection("seed_tmp").rename(config.getConfig("mongodb","seed_collection"),function(){
				that.seed_collection=that.db.collection(config.getConfig("mongodb","seed_collection"));
					that.db.collection("seed_tmp").drop(function(){
						that.db.collection(sub_list_collection).drop(function(){
							that.db.collection("sub_lists_tmp").rename(sub_list_collection,function(){
								that.sub_list_collection = db.collection(sub_list_collection);
									that.db.collection("sub_lists_tmp").drop(function(){
										fn();
									});
								});
							});
						});
					});
				});
				
			
	},
	"successSeedCollection":function successSeedCollection(fn){
		var that = this;
		that.db.collection("seed_tmp").drop(function(){
			that.db.collection("sub_lists_tmp").drop(function(){
				fn();
			});
		});
	},
	"insertSeed":function insertSeed(url,parseFile,priority,fetch_interval,fn){

		var URL=require(parent_dir+'/lib/url.js');
		var regex_urlfilter = {};
		regex_urlfilter["accept"]=config.getConfig("accept_regex");
		regex_urlfilter["reject"]=config.getConfig("reject_regex");
		URL.init(config, regex_urlfilter);

		priority = parseInt(priority);

		if( !check.number(priority) || priority>10){
			fn([false,{}]);
			return;
		}
		var that=this;
		//console.log(url);
		var url=URL.url(url).details.url;
		if(!check.assigned(fetch_interval)){
			fetch_interval=config.getConfig("default_recrawl_interval");
		}
		if(!check.assigned(priority) || !check.assigned(parseFile)){
			fn([false,{}]);
			return;
		}
		var d={"_id":url,"parseFile":parseFile,"priority": priority,"fetch_interval": fetch_interval};
		//console.log(d);
		return fn([true, d]);

		
		
		
	},
	"checkIfBotActive":function checkIfBotActive(fn){
		var that=this;
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
	},
	"checkIfNewCrawl":function checkIfNewCrawl(fn){
		var id_name=config.getConfig("cluster_name");
		var that=this;
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
	},
	
	"getParsers":function getParsers(fn){
		var that=this;
		that.parsers_collection.find({},{}).toArray(function(err,docs){
			for (var i = 0; i < docs.length; i++) {
				var d=docs[i];
				if(fs.existsSync(parent_dir+"/parsers/"+d["_id"]+".js")){
					//exists now chech the hash
					var data=d["data"].value();
					var hash=generateMD5(data);
					if(hash!==d["hash"]){
						//#debug#console.log("thre");
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
	"pullSeedLinks":function pullSeedLinks(fn){
		var that=this;
		that.sub_list_collection.find({"bot_name":config.getConfig("bot_name")}).toArray(function(err,results){
			if(check.emptyArray(results)){
				fn(err,null);
				return;
			}
			var seeds=results;
			if(check.emptyObject(seeds)){
				fn(err,null);
				return;
			}
			if(!err){
				process.domain_range = _.pluck(seeds, '_id');
				fn(err,_.flatten(_.pluck(seeds, "domains")));
				return;
			}
			else{
				fn(err,null);
				return;
			}

		});
	},
	"seedReloader":function seedReloader(){
		var that=this;
		that.pullSeedLinks(function(new_config){
			if(check.assigned(new_config)){
				fs.writeFile(parent_dir+"/config/seed.json",JSON.stringify(new_config,null,2),function writeSeedFile(){
					if(!ObjectX.isEquivalent(new_config,that.seed_db_copy)){
						
							msg("Seed Links changed from db ","info");
							process.emit("restart");//will be caught by death and it will cause to restart

						

					}
					else{
						msg("No change in seed links","info");
					}
				});
			}
		});
	},
	"parserReloader":function parserReloader(){
		var that=this;
		that.parsers_collection.find({}).toArray(function getNewParsers(err,results){
			for (var i = 0; i < results.length; i++) {
				var doc=results[i];
				var data=fs.readFileSync(parent_dir+'/parsers/'+doc["_id"]+".js");
				var hash =  generateMD5(data.toString());
				if(hash!==doc["hash"]){
					msg("Parsers changed from server restarting . . .","info");
					process.emit("restart");
				}
			};
		});
	},
	'setParent':function setParent(){
			this.bot.parent=this;
			this.cluster.parent=this;
			this.stats.parent=this;
			this.config_reloader.parent=this;
			this.bucketOperation.parent=this;
	},
	"bot":{
		"requestToBecomeMaster":function bot_requestToBecomeMaster(bot_name,fn){
			var that=this.parent;
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
		"checkIfStillMaster":function bot_checkIfStillMaster(fn){
			var that=this.parent;
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
		"startBotGetBotActiveStatus":function bot_startBotGetBotActiveStatus(fn){
			var that=this.parent;
			that.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,results){
				fn(err,results);
				return;
			});
		},
		"startBotAddNewBot":function bot_startBotAddNewBot(t,fn){
			var that=this.parent;
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true}},{remove:false,upsert:true},function(err,result){
				fn(err,result);
				return;
			});
		},
		"updateBotInfo":function bot_updateBotInfo(n_dic,fn){
			var that=this.parent;
			that.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
				fn(err,results);
				return;

			});
		},
		"BotMarkInactive":function bot_BotMarkInactive(fn){
			var that=this.parent;
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
				fn(err,result);
				return;
			});
		}
	},
	"cluster":{
		"getMaster":function cluster_getMaster(fn){
			var that=this.parent;
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
			var that=this.parent;
			that.bot_collection.findOne({"_id":bot_name},function(err,results){
				fn(err,results);
				return;

			});
		},
		"getSeed":function cluster_getSeed(fn){
			var that=this.parent;
			that.seed_collection.find({}).toArray(function(err,results){
					var seeds=results;
					fn(err,seeds);
					return;

			});
		}
	},
	"stats":{
		"getPage":function stats_getPage(url,fn){
			var that=this.parent;
			//#debug#console.log(url)
			that.mongodb_collection.findOne({"_id":ObjectId(url)},function(err,results){
				
				fn(err,results);
				return;
			});
		},
		"getBucket":function stats_getBucket(url,fn){
			var that=this.parent;
			//#debug#console.log(url)
			that.bucket_collection.findOne({"_id":ObjectId(url)},function(err,results){
				
				fn(err,results);
				return;
			});
		},
		"cluster_info":function stats_cluster_info(id_name,fn){
			var that=this.parent;
			that.cluster_info_collection.findOne({"_id":id_name},function(err,results){
				fn(err,results);
				return;
			});
		},
		"activeBots":function stats_activeBots(fn){
			var that=this.parent;
			
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
						if(Math.abs(active_bots.length - old_bot_count)>0 && process.cluster_master){
							

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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
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
			var that=this.parent;
			that.mongodb_collection.find({$text: {$search: query}}, {score: {$meta: "textScore"}},{ skip: i, limit: 10 }).sort({score:{$meta:"textScore"}}).toArray(function(err,docs){
				fn(err,docs);
				return;
			});
		}
	},
	"config_reloader":{
		"pullDbConfig":function stats_pullDbConfig(idd,fn){
			var that=this.parent;
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
	},
	"bucketOperation":{
		/*var descriptions
		that.bucket_priority type->list when seed file is read it is stored with dicts of each seed info
		that.bucket_pointer just an int counter to iterate on that.bucket_priority
		

		*/
		"generateSubLists":function generateSubLists(results, fn){
			var that =this.parent;
			//create bot_priority array from results
			_.sortBy(results, "priority", this).reverse();//descending order


			var intervals = _.pluck(results, 'fetch_interval');

			intervals = _.uniq(intervals);

			var dict = {};

			for (var i = 0; i < intervals.length; i++) {
				
				dict[intervals[i]] = [];

			};

			for(var index in results){
				var res = results[index];

				dict[res['fetch_interval']].push(res);

			}

			delete results;

			that.bucket_priority = dict;
			//console.log("RES START",that.bucket_priority,"RES");
			


			var sub_list = [];
			//list is nested list with each list having domains and last element having md5 hash of domains concataneated
			//each sublist priority sums to 10 and all of them having same fetch_interval
			

			var n_domains=_.size(that.links);
					
			var interval_size=_.size(intervals);
			//console.log(intervals,n_domains, interval_size);
			var completed=0;
			that.bot_collection.find({}).toArray(function(err,docs){
				var bots;
				if(check.assigned(docs)){
					bots = _.pluck(docs, '_id');
				}
				

				

				var bot_count = bots.length;
				//console.log("INTERVALS START",intervals,"INTERVALS");
				for(var ind in intervals){
					var k = intervals[ind];
					
					msg('Generating sublist for '+k+' interval','info');
					while(true){
						var domains=[];
						var summer=0;
						var continue_flag=false;
						var iterations = 0;
						while(summer<10){
							that.bucket_priority[k].push("begin"); //marker element
							var d=that.bucketOperation.getCurrentDomain(k);
							iterations +=1;
							//console.log(d)
							if(d === "begin"){
								//when round is complete
								if(domains.length===0){
									//entire round is complete and still we got zero domains
									continue_flag=true; //got nothing skip this fetch_interval
								}
								else{
									continue_flag=false; //was not able to add up to 10 
								}
								that.bucket_priority[k].splice(0,1)[0];
								that.bucket_priority[k].push("begin"); //marker element
								break;
							}
							
							if(d["fetch_interval"]!==k){
									//if fetched domain does not have the fetch interval we are looking for
									that.bucket_priority[k].push(d); //not req thus push in queue again
									continue;
							}


							summer+=d["priority"];
							domains.push(d);


							if(summer===10){
								//when ratio is complete break
								break;
							}
							else if(summer>10){
								//retrace if sum > 10
								summer-=d["priority"];
								
								
								that.bucket_priority[k] = [d].concat(that.bucket_priority[k]);

								domains.pop();
								break;
							}
						}
						//console.log(domains,k)
						if(continue_flag || domains.length===0){
							interval_size-=1;
							//#debug#console.log("skip");
							break;
						}

						
						
						var domains_str = _.pluck(domains, '_id');
						domains_str = domains_str.join();
						//console.log(domains_str,"domains_str");
						var hash= generateMD5(domains_str);

						msg('Got domains '+hash+' for fetch_interval '+k+' for bucket creator','info');
						//#debug#console.log("heree")
						
						sub_list.push({"_id": hash, "domains": domains, "fetch_interval": k});

					}
					
				}
				//delete that.bucket_priority;
				//console.log(that.sub_list.length, "SUBLIST LEN");
				var docs_temp = [];
				var n = sub_list.length / bots.length;
				_.range(bots.length).map(function(i){
					var arr = sub_list.slice(i*n,(i+1)*n);
					// console.log(arr);
					for(var index in arr){
						arr[index]["bot_name"] = bots[i];
					}					
					docs_temp = docs_temp.concat(arr);
					

				});
				


				//console.log(docs_temp ,"docs_temp");
				//return fn();
				that.sub_list_collection.insertMany(docs_temp,function bulkInsertSublist(){
					msg("Sub list dumped in db", 'success');
					return fn();
				});
			});
		},
		"getCurrentDomain":function bucketoperation_getCurrentDomain(interval){

			var that=this.parent;
			//console.log(that.bucket_priority)
			var domain=that.bucket_priority[interval].splice(0,1)[0];
			

			return domain;
		},
		'new_creator':function bucketoperation_new_creator(is_first, fetch_interval){
			/*
			var that = this.parent;
			process.bucket_creater_locked=true;
			//just pinging so that we do not run short of buckets
			//while we have links in our mongodb cache
			//generating new buckets based on refresh interval and uniformity
			if(!check.assigned(that.cache)){
				process.bucket_creater_locked=false;
				return;
			}
			var d=that.bucketOperation.getCurrentDomain();
			if(process.first_pointer===that.bucket_pointer){
				//when round is complete
				//process.bucket_domains[[domain,len],]
				if(process.bucket_domains.length===0){
					//entire round is complete and still we got zero domains
					return; //got nothing skip this fetch_interval
				}
				else{
					 //was not able to add up to 10 
					 // so let us push
				}
				
				return;
			}
			if(d["fetch_interval"]!==fetch_interval){
				//if fetched domain does not have the fetch interval we are looking for
				continue;
			}
			var first_pointer;
			if(is_first){
				process.first_pointer=that.bucket_pointer;
				process.summer = 0;
			}
			that.bucketOperation.getElgibleCount(d,function(length){
				var batchSize = config.getConfig("batch_size");
				var req = int( batchSize / 10 )*d['priority'];
				if(length>=req){
					process.summer+=req;
				}else{
					process.summer+=length;
				}

				if(process.summer === batchSize ){

				}else if(process.summer > batchSize){
					process.bucket_domains.pop();
				}else{
					process.nextTick(function(){that.new_creator(false, fetch_interval);});
				}


			});
			*/
		},
		"creator":function bucketoperation_creator(){
			var that=this.parent;
			//#debug#console.log("pinging")
			//#debug#console.log(li);
			//#debug#console.log(that.cache)
			process.bucket_creater_locked=true;
			//just pinging so that we do not run short of buckets
			//while we have links in our mongodb cache
			//generating new buckets based on refresh interval and uniformity
			if(!check.assigned(that.links)){
				process.bucket_creater_locked=false;
				return;
			}
					var hashes={};
					var intervals=config.getConfig("recrawl_intervals");

					for(var k in that.distinct_fetch_intervals){
						//console.log(k);
						hashes[k]={};
						hashes[k]["_id"] = ObjectId();
						hashes[k]["links"]=[];
						
					}

					var n_domains=_.size(that.links);
					
					var interval_size=_.size(that.distinct_fetch_intervals);
					var completed=0;
					var done = 0;
					//console.log(that.sub_list,"that.sub_list");
					var domains = [];
					var sub_group = that.sub_list.splice(0,1)[0]; //dequeue

					that.sub_list.push(sub_group); //enqueue

					domains = sub_group["domains"];
					for (var i = 0; i < domains.length; i++) { 
						//#debug#console.log(i)
						(function(dd,limit){

								var ratio=parseInt(config.getConfig("batch_size")/10);
								var eachh=ratio*dd["priority"];
								var key=dd["_id"];
								var k=dd["fetch_interval"];
								//#debug#console.log("EACHH "+eachh);
								var pusher=that.bucketOperation.pusher;
								//console.log(key,eachh,k);
								that.bucketOperation.dequeue(key,eachh,k,function(l){
										hashes[k]["domain_group_id"] = sub_group["_id"];
										hashes[k]["links"] = hashes[k]["links"].concat(l);
										//console.log(hashes);
										++done;
										if(done===limit){
											if(check.emptyObject(hashes)){
												process.bucket_creater_locked=false;
												return;
											}
												pusher(hashes,function(){
													process.bucket_creater_locked=false;
												});
											
											
										}
								});	

						})(domains[i],domains.length);
						
					};


					
			
					
		
		
				return;
		},
		"pusher":function bucketoperation_pusher(hashes,fn){
			//console.log(JSON.stringify(hashes,null,2));
			var that=pool;
			//#debug#console.log(that)
			try{
				hashes=score.getScore(hashes,that.links);
			}catch(err){
				fn(true);
				return;
			}
			
			//#debug#console.log("herere 2");
			if(!check.assigned(hashes)){
				fn(false);
				return;
			}
			var done=0;
			var counter=_.size(hashes);
			//#debug#console.log("hashes",hashes);
			for(var key in hashes){
				(function(key){
					//first links are added to the db to avoid same links
					//console.log(hashes[key], "HASH KEYS");
					that.addLinksToDB(hashes[key],key,function(numOfLinks){
						//uniform pool of urls are generated
						//console.log("numOfLinks "+numOfLinks+" "+key);
						if(!check.assigned(numOfLinks)|| numOfLinks===0){
							//fn(false);
							++done;
							if(done===counter){
								fn(true);
								return;
							}
							return;
							
						}
							var stamp1=new Date().getTime();
							var links_to_be_inserted=_.pluck(hashes[key]["links"],'url');
							var domain_id = hashes[key]["domain_group_id"];
							that.bucket_collection.insert({"_id":hashes[key]["_id"],"links":links_to_be_inserted, "domains":domain_id, "score":hashes[key]["score"],"recrawlLabel":key,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks},function bucketInsert(err,results){
								//console.log(arguments);
								if(err){
									msg(("pool.addToPool"+err),"error");
									//fn(false);
									//return;
								}
								else{
									msg(("Updated bucket "+results["ops"][0]["_id"]),"success");
									process.bot.updateStats("createdBuckets",1);
									//fn(true);
									//return;
								}
								++done;
								if(done===counter){
									fn(true);
									return;
								}
													
													
							});
					});		
				})(key);
					

			}
			

		},
		"enqueue":function bucketoperation_enqueue(){
			var that=this.parent;
		},
		"dequeue":function bucketoperation_dequeue(domain,count,interval,fn){
			var that=this.parent;
			var li=[];
			if(!check.assigned(proxy_cache)){
				proxy_cache = new proxy_cache_class(config.getConfig('inlink_cache_size'));
			}
			var cache_urls = proxy_cache.fetchURLs(domain, count);
			msg('Got '+cache_urls.length+' urls from links cache for '+domain,"success");
			//console.log(cache_urls, "FROM CACHE");
			if(cache_urls.length < ((50/100)*count)){
				//load some urls from the db
				that.mongodb_collection.find({"domain":domain,"bucket_id":null,"bucketed":false,"fetch_interval":interval,"partitionedBy":config.getConfig("bot_name")},{limit:count*5,sort:{level:1}}).toArray(function loadFromCache(err,object){
					if(!check.assigned(err)){
						msg("Loaded "+object.length+' items for the cache of '+domain, 'success');
					}

					for(var index in object){
						var doc = object[index];
						proxy_cache.pushURL(doc);
					}

					fn(cache_urls);

					
				});
			}else{
				fn(cache_urls);
			}
			
				
					
			
		}
	},
	"seedCount":0,
	"cache":{},
	"links":{}
};
pool.setParent();//setting the parent reference

var tika_indexer_busy = false;
function indexTikaDocs(){
	try{
		if(tika_indexer_busy){
			return;
		}
		tika_indexer_busy = true;
		pool.tika_f_queue.find({},{limit: 100}).toArray(function(err,docs){
			//console.log(err,docs);
			if(!check.assigned(err) && check.assigned(docs) && docs.length !==0){
				var done = 0;
				for(var index in docs){
					try{
						var doc = docs[index];
						(function(doc){
							fs.readFile(doc["content"],function(err,data){
								//if file is not written yet to the cache race condition
								if(!check.assigned(data) || check.assigned(err)){
									++done;
									if(done === docs.length){
										tika_indexer_busy = false;
									}
									return;
								}
								try{
									var link_details = JSON.parse(data.toString());
								}catch(ee){
									
									return pool.mongodb_collection.updateOne({"_id":ObjectId(doc["urlID"])},{$set:{"response":"JSON_PARSE_ERROR","abandoned":true, "crawled":false}},function FailedTikaUpdateDoc(err,results){
										pool.tika_f_queue.remove({_id: doc["_id"]},function(e,d){
										//console.log(e,d,2);
											fs.unlink(doc["content"],function tika_doc_indexer(){

												msg("Tika doc parse error "+doc["urlID"], "error");
												process.bot.updateStats("failedPages",1);
												++done;
												if(done === docs.length){
													tika_indexer_busy = false;
												}

											});
										

										});

									});
								}
								
								pool.setCrawled(link_details,function(){
									pool.tika_f_queue.remove({_id: doc["_id"]},function(e,d){
										//console.log(e,d,2);
										fs.unlink(doc["content"],function tika_doc_indexer(){

											msg('Tika doc indexed','success');
											++done;
											if(done === docs.length){
												tika_indexer_busy = false;
											}
										});
										

									});

								});
							});
						})(doc);
					}catch(ee){
						++done;
						if(done === docs.length){
							tika_indexer_busy = false;
						}	
					}

				}
			}
			

		});
	}catch(errr){
		tika_indexer_busy = false;
	}
}


process.lock_speed_bucket = false;

function speedUpBucketCreation(){

	if(process.lock_speed_bucket){
		return;
	}
	process.lock_speed_bucket = true;
	try{
		pool.stats.crawlStats(function bucket_speed(dic){

			var processed_buckets = dic["processed_buckets"];
			var created_buckets = dic["bucket_count"];
			if(check.assigned(processed_buckets) && check.assigned(created_buckets)){
				var ratio = processed_buckets/created_buckets;
				if(ratio > 0.4){
					process.bucket_time_interval = 2000;
					msg("Speed up the process of bucket creation","info");
					//speed up bucket creation
				}else{
					process.bucket_time_interval = 10000;
					msg("Slow up the process of bucket creation","info");
					//slow up bucket creation
				}
			}else{
					process.bucket_time_interval = 2000;
					msg("Speed up the process of bucket creation","info");	
					//speed up bucket creation		
			}
			process.lock_speed_bucket = false;
			clearInterval(process.bucket_timer);
			process.bucket_timer=setInterval(function(){
				if(!process.webappOnly && !process.bucket_creater_locked){
					
					pool.bucketOperation.creator();
				}
				
			}, process.bucket_time_interval);
			process.my_timers.push(process.bucket_timer);


		});
	}catch(err){
			process.lock_speed_bucket = false;
			clearInterval(process.bucket_timer);
			process.bucket_timer=setInterval(function(){
				if(!process.webappOnly && !process.bucket_creater_locked){
					
					pool.bucketOperation.creator();
				}
				
			}, process.bucket_time_interval);
			process.my_timers.push(process.bucket_timer);		
	}


}


process.pool_check_mode=setInterval(function(){
	if(!process.tika_setup && process.begin_intervals){
		var d=setInterval(function(){
			pool.parserReloader();

		},10000);
		process.my_timers.push(d);
		process.bucket_timer=setInterval(function(){
			if(!process.webappOnly && !process.bucket_creater_locked){
				
				pool.bucketOperation.creator();
			}
			
		},10000);
		process.my_timers.push(process.bucket_timer);
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
		
		var sb = setInterval(function(){
			speedUpBucketCreation();
		},10000);

		process.my_timers.push(sb);
		if(!process.webappOnly){
			var tika_indexer = setInterval(indexTikaDocs,1000);
			process.my_timers.push(tika_indexer);
		}	
	}
},5000);




//prototype



function init(){
	return pool;
}
exports.init=init;

exports.getDic=function(){
	return pool;
};
function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
