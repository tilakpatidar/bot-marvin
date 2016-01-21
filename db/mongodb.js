//global connection to mongodb
//mongodb connection file
var MongoClient = require('mongodb').MongoClient;
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var mongodb=config.getConfig("mongodb","mongodb_uri");
var child=require('child_process');
var score=require(parent_dir+'/lib/score.js').init;
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var URL=proto.URL;
var ObjectX=proto.ObjectX;
var _ = require("underscore");
var check = require('check-types');
var StringX=proto.StringX;
var mongodb_collection=config.getConfig("mongodb","mongodb_collection");
var bucket_collection=config.getConfig("mongodb","bucket_collection");
var bot_collection=config.getConfig("mongodb","bot_collection");
var semaphore_collection=config.getConfig("mongodb","semaphore_collection");
var cluster_info_collection=config.getConfig("mongodb","cluster_info_collection");
var parsers_collection=config.getConfig("mongodb","parsers_collection");
var sitemap_collection=config.getConfig("mongodb","sitemap_collection");
var fs=require('fs');
var urllib=require('url');
var cluster;
var sitemap = require(parent_dir+'/lib/sitemap_parser');
//read seed file
var sqlite3 = require('sqlite3').verbose();
var sqlite_db;


var queue={
	enqueue:function (data,mask,fn){
		
		//console.log(that.db_name)
		//console.log(url,domain,parent);
		sqlite_db.parallelize(function() {
			//console.log(data);
			//console.log("INSERT OR IGNORE INTO links (url,domain,parent,freq) VALUES"+mask);
			sqlite_db.run("INSERT OR IGNORE INTO links (url,domain,parent,freq) VALUES"+mask,data,function(err,row){
			//console.log(err,row);
			//console.log(this.lastID,"insert",StringX.urlHashCode(domain));
				//console.log(JSON.stringify(row)+"pushQ");
				fn(row);
			});
		});

	},
	dequeue:function (domain,num,freq,fn){
		if(!check.assigned(num)){
			num=1;
		}
		var li=[];
		var delIds=[];
		var that=this;
			sqlite_db.parallelize(function() {
				//console.log("SELECT * FROM "+StringX.urlHashCode(domain)+" LIMIT 0,"+num)
				//console.log(sqlite_db);
				sqlite_db.all("SELECT * FROM links WHERE domain=? AND freq=? LIMIT 0,"+num,[domain,freq],function(err,rows){
					//console.log(err,rows.length,"fetched");
					if(!check.assigned(rows) || rows.length===0){
						fn([]);
						return;
					}
					num=rows.length;
					var d=domain;
					var mask=[];
					
					for (var i = 0; i < rows.length; i++) {
						var row=rows[i];
						var id=row.id;
						var parent=row.parent;
						var url=row.url;
						delIds.push(id);
						li.push([url,d,parent]);
						mask.push("?");
							
												
					};
					//console.log(delIds);
					//console.log(li);
					//console.log('remove '+id+" "+d+" "+parent+" "+url);
					that.remove(delIds,mask.join(","),function(){
						
							//++done;
							//console.log(done,"  ",num);
							//if(done===num){
								fn(li);
							//}
					});

					
					
				});
			});
		
		

	},
	remove:function (idd,mask,fn){
		sqlite_db.parallelize(function() {
			sqlite_db.run("DELETE FROM links WHERE id IN ("+mask+")",idd,function(err,row){
					//console.log(err+"QLength");
					//console.log(JSON.stringify(row)+"QLength");
					fn(err,row);
				});
			});
	},
	length:function (domain,freq,fn){
		sqlite_db.parallelize(function() {
			sqlite_db.each("SELECT COUNT(*) AS `c` FROM links WHERE domain=? AND freq=?",[domain,freq],function(err,row){
				//console.log(err+"QLength");
				//console.log(JSON.stringify(row)+"QLength");
				fn(row.c);
			});
		});
	}

};
function createSQLiteDB(){
	sqlite_db=new sqlite3.Database(parent_dir+'/db/sqlite/links_queue');
}

function createSQLiteCache(fn){
	sqlite_db.run("CREATE TABLE IF NOT EXISTS links (id INTEGER PRIMARY KEY AUTOINCREMENT,url TEXT UNIQUE,parent TEXT,status TINYINT DEFAULT(0),domain VARCHAR(100),freq VARCHAR(25))");
	fn()
			
	
}


var pool={
	"seed":function(links,fn){
		//this method runs first when crawler starts
		var that=this;
		that.mongodb_collection.createIndex({"$**":"text"},{"weights": {"data._source.id":5,"data._source.host":5,"data._source.meta_description":5,"data._source.title":5,"data._source.body":1}},function(err){
				//console.log(err);
			});
		that.bucket_collection.createIndex({recrawlAt:1},function(err){});//asc order sort for recrawlAt
		that.bucket_collection.createIndex({score:1},function(err){});//asc order sort for score
		that.checkIfNewCrawl(function(isNewCrawl){
					that.getParsers(function(){

						createSQLiteDB();
							var stamp1=new Date().getTime()-2000;//giving less time
							var stamp=stamp1+""+parseInt(Math.random()*10000);
							that.bucket_collection.insert({"_id":stamp,"score":1,"recrawlLabel":config.getConfig("default_recrawl_interval"),"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":links.length},function(err,results){
								if(err){
									throw err;
								}else{
									//console.log("Inserted "+stamp)
								};
								var done=0;
								for (var i = 0; i < links.length; i++) {
									var anon=(function(domain,stamp){
										if(check.emptyString(domain)){
											return;
										}
										that.cache[domain]=true;
										createSQLiteCache(function(){
										that.getLinksFromSiteMap(domain,function(){
											
											
											that.mongodb_collection.insert({"_id":domain,"hash":stamp,"domain":domain,"done":false},function(err,results){
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
										});
										
										
										

									});
									
									anon(links[i],stamp);
									
									
								};
								
							
						});
			
			});

					

			});

	},
	"getLinksFromSiteMap":function(domain,fn){
		if(!config.getConfig('parse_sitemaps') || process.webappOnly){
			fn();
			return;
		}
		
		var that=this;
		var abs=urllib.resolve(domain,"sitemap.xml");
		var temp=domain.replace(/\./gi,"#dot#");
		that.sitemap_collection.findOne({"_id":temp},function(err,docs){
			if(err || !docs){
				log.put("Sitemap not present for "+domain+" in db",'info');
				log.put("Downloading sitemap index for "+domain,"info");
				log.put("Seeding from sitemap.xml this could take some minutes ","info");
				//insert sitemap urls
				sitemap.getSites(abs, function(err, sites) {
				    if(!err) {
				    	sites=JSON.parse(JSON.stringify(sites).replace(/https:/g,"http:"));
				        that.updateSiteMap(domain,sites,function(){
				        	fn();
				        	return;
				        });
				    }
				    else {
				       	log.put("Sitemap could not be downloaded for "+domain,"error");
				    }
				});
			}

		});
	},
	"updateSiteMap":function(domain,sites,fn){
		var that=this;
		domain=domain;
		var temp=domain.replace(/\./gi,"#dot#");
		var temp1=JSON.parse(JSON.stringify(sites).replace(/\./gi,"#dot#"));
		that.sitemap_collection.insert({"_id":temp,"sites":temp1},function(err,results){
		//console.log(err);
		if(err){
				log.put("Unable to insert sites into sitemap collection","error");
			}else{
				log.put("Sitemap file updated in db for "+domain,"success");
				log.put("Inserting "+_.size(sites)+" records from "+domain+" sitemap file into generator cache","info");
				
				
				var n = 100;
				var lists = _.groupBy(sites, function(element, index){
					  return Math.floor(index/n);
					});
				lists = _.toArray(lists); //Added this to convert the returned object to an array.
				for (var i = 0; i < lists.length; i++) {
					//each subarray
					var sub=lists[i];
					//console.log(sub)
					var mask="";
					var t=[];
					var query="INSERT OR IGNORE INTO links (url,domain,parent,freq) VALUES ";
					var m=[]
					for (var ii = 0; ii < sub.length; ii++) {
						//items of each sub array
						m.push("(?,?,?,?)");
						var url=sub[ii][0];
						t.push(url)
						//console.log(domain)
						that.cache[domain]=true;
						t.push(domain)
						var parent=urllib.resolve(domain,"sitemap.xml");
						t.push(parent)
						var freq=sub[ii][1];
						if(config.getConfig("override_recrawl_interval_of_sitesmap_file")){
								freq=that.links[domain]["fetch_interval"];
								if(!check.assigned(freq)){
									freq=config.getConfig("default_recrawl_interval");
								}

						}
						else{
							if(!check.assigned(freq)){
								freq=config.getConfig("default_recrawl_interval");
							}
						}
						
						t.push(freq)
					};
					query+=(m.join(","));
					(function(query,t){
						sqlite_db.parallelize(function() {
								sqlite_db.run(query,t,function(err,row){
									//console.log(err,row)
								if(!err){
									log.put("Seed from "+domain+" sitemap. Inserted 100 records","info");
								}
								});
						});
					})(query,t)
					

				};
				
				
				fn();
				return;
			}
		})
	},
	"addToPool":function(li,fn){
		//console.log(li);
		var that=this;
		//urls we will be getting will be absolute
		if(li.length===0){
			//buckets with empty links will not be inserted
			fn(false);
			return;
		}
		//console.log("herere 1");
		that.generatePool(li,function(hashes){
			
			hashes=score.getScore(hashes,that.links);
			//console.log(hashes);
			//console.log("herere 2");
			if(!check.assigned(hashes)){
				fn(false);
				return;
			}
			var done=0;
			var counter=_.size(hashes);
			//console.log("hashes",hashes);
			for(var key in hashes){
				(function(key){
					//first links are added to the db to avoid same links
					that.addLinksToDB(hashes[key],key,function(hash,numOfLinks){
						//uniform pool of urls are generated
						//console.log("numOfLinks "+numOfLinks+" "+key);
						if(!check.assigned(numOfLinks)|| numOfLinks===0){
							//fn(false);
							++done;
							if(done===counter){
								fn(true);
							}
							return;
						}
							var stamp1=new Date().getTime();
							//console.log({"_id":hash,"recrawlLabel":key,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks});
							that.bucket_collection.insert({"_id":hash,"score":hashes[key]["score"],"recrawlLabel":key,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks},function(err,results){
								if(err){
									log.put(("pool.addToPool"+err),"error");
									//fn(false);
									//return;
								}
								else{
									log.put(("Updated bucket "+hash),"success");
									process.bot.updateStats("createdBuckets",1);
									//fn(true);
									//return;
								}
								++done;
								if(done===counter){
									fn(true);
								}
													
													
							});
					});		
				})(key);
					

			}
			

		
		});
			
	},
	"requestAccess":function(fn){
		var k=new Date();
		var that=this;
		that.semaphore_collection.insert({"bot_name":config.getConfig("bot_name"),"requestTime":k},function(err,results){
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
	
		var that=this;
		that.semaphore_collection.find({}, {"sort" : [['requestTime', 'asc']]}).each(function (err, docs) {
			
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
		var that=this;
		that.semaphore_collection.remove({"_id":reqId},function(err,results){
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
		var that=this;
		that.requestAccess(function(requestRegistered,reqId){

			if(requestRegistered){
				(function(reqId){
					process.semaphore_access=setInterval(function(){
						
										that.verifyAccess(reqId,function(access){
											//access=false; caution for testing only uncommenting can break the application
											if(!access){
												return;
											}
											clearInterval(process.semaphore_access);//clearing the check for verification now
											if(access){
												log.put("Got access to the collection","info");
												var stamp1=new Date().getTime();
												that.bucket_collection.find({"underProcess":false,"recrawlAt":{$lte:stamp1}}).sort([['recrawlAt',1]]).limit(10).sort([['score',1]]).limit(1).toArray(function(err,docs){
													if(docs!==null && docs!==undefined && docs[0]!==undefined){

														var h=docs[0]["_id"];
													}
													else{
														//console.log("here");
														that.removeRequest(reqId,function(removed){
																if(removed){
																	result(null,[],null);
																	return;
																}
																	
															});
														return;
													}
													that.bucket_collection.findAndModify({"_id":h},[],{"$set":{"underProcess":true,"processingBot":config.getConfig("bot_name")}},{"remove":false},function(err1,object){
														//console.log(object,err1)
														if(object.value!==null){
																var hash=object["value"]["_id"];
																var refresh_label=object["value"]["recrawlLabel"];
																that.removeRequest(reqId,function(removed){
																			if(removed){
																				//console.log(hash);
																					that.mongodb_collection.find({"hash":hash},{},{}).toArray(function(err,docs){
																						if(err){

																							log.put("pool.getNextBatch","error");
																						}
																						else{
																							//console.log(docs);
																							log.put(("Got "+docs.length+" for next Batch"),"success");
																							result(err,docs,hash,refresh_label);		
																						}


																					});
																			}

																});
																
														}
														else{
															that.removeRequest(reqId,function(removed){
																if(removed){
																	result(null,[],null);
																	return;
																}
																	
															});
															}
														});	
													});
											}
											else{
												log.put("Unable to get access to the collection","error");
											}

										});

									},5000);




				})(reqId);
				
				

			}

		});

	},
	"setCrawled":function(url,data,status){
		var that=this;
		var stamp1=new Date().getTime();
		if(!check.assigned(data)){
			data="";
		}
		if(!check.assigned(status)){
			status="0";//no error
		}
		that.mongodb_collection.updateOne({"_id":url},{$set:{"done":true,"data":data,"response":status,"lastModified":stamp1,"updatedBy":config.getConfig("bot_name")}},function(err,results){
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
		var that=this;
		process.mongo=MongoClient.connect(mongodb, function(err, db) {
			that.db=db;
			that.mongodb_collection=db.collection(mongodb_collection);
			that.bucket_collection=db.collection(bucket_collection);
			that.bot_collection=db.collection(bot_collection);
			that.semaphore_collection=db.collection(semaphore_collection);
			that.cluster_info_collection=db.collection(cluster_info_collection);
			that.parsers_collection=db.collection(parsers_collection);
			that.sitemap_collection=db.collection(sitemap_collection);

			fn(err,db);
			return;
			
		});
	},
	close:function(){
		var that=this;
		that.db.close();
	},
	"readSeedFile":function(fn){
		var that=this;
		that.cluster_info_collection.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
			if(results.length===0){
				//empty seed file
				log.put("Empty seed file","error");
				process.bot.stopBot(function(){
						process.exit(0);
				});
				return;
			}
			var dic=results[0].seedFile;
			that.seed_db_copy=dic;//stored for future comparision
			var links={};
			var links1=[];
			for(var key in dic){
				var k={};
				k["phantomjs"]=dic[key]['phantomjs'];
				if(k["phantomjs"]===true){
					//start the phantomjs server
					var bot = child.fork(parent_dir+"/lib/render.js",[config.getConfig("phantomjs_port")]);	
				}
				k['parseFile']=dic[key]['parseFile'];
				k["priority"]=dic[key]['priority'];
				k["fetch_interval"]=dic[key]['fetch_interval'];
				links[URL.normalize(key.replace(/#dot#/gi,"."))]=k;
				links1.push(URL.normalize(key.replace(/#dot#/gi,".")));
			}

			that["links"]=links;
			that["seedCount"]=links1.length;
			fn(links1);
			return;
		});
		
		
		
	},
	"batchFinished":function(hash,refresh_label){
		var that=this;
		var stamp1=new Date().getTime()+config.getConfig("recrawl_intervals",refresh_label);
		var lm=new Date().getTime();
		that.bucket_collection.findAndModify({"_id":hash},[],{$set:{"underProcess":false,"recrawlAt":stamp1,"lastModified":lm}},{"remove":false},function(err,object){
			if(object.value!==null){
					var hash=object["value"]["_id"];
					log.put(("Bucket "+hash+" completed !"),"success");
					process.bot.updateStats("processedBuckets",1);
			}
			
				

		});
	},
	"resetBuckets":function(fn){
		var that=this;
		var stamp1=new Date().getTime()-2000;//giving less time
		that.bucket_collection.update({"underProcess":true,"processingBot":config.getConfig("bot_name")},{$set:{"underProcess":false,"recrawlAt":stamp1}},{multi:true},function(err,results){
		//resetting just buckets processed by this bot
			that.semaphore_collection.remove({"bot_name":config.getConfig("bot_name")},function(err,results){
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
	"addLinksToDB":function(hashes_obj,freqType,fn){
		var that=this;
		var done=0;
		var li=hashes_obj["links"];
		if(li.length===0){
			fn(null);
			return;
		}
		var success=0;
		for (var i = 0; i < li.length; i++) {
			var key=li[i][1];
			var item=li[i][0];
			var parent=li[i][2];
			
			(function(url,domain,parent,hash){
				that.mongodb_collection.updateOne({"_id":url},{$set:{"done":false,"domain":domain,"parent":parent,"data":"","hash":hash}},{upsert:true},function(err,results){
						if(err){
							//console.log(err);
							//link is already present
							//console.log("pool.addToPool");
						}
						else{
							//console.log(sqlite_db[refresh_time]);
							success+=1;

						}
						done+=1;
						if(done===li.length-1){
							fn(hash,success);
							return;
						}				
				});
			})(item,key,parent,hashes_obj["id"]);


			
		};
		
	},
	"generatePool":function(li,fn){
		var that=this;
		var mask=[];
		var data=[];
		//console.log(li);
		//console.log(that.cache)
		if(li[0]==="ping"){
			//just pinging so that we do not run short of buckets
			//while we have links in our sqlite cache
		}else{
			var done=0;
			var success=0;
			for (var i = 0; i < li.length; i++) {
				//inserting new links in cache
				var domain=li[i][1];
				var url=li[i][0];
				var parent=li[i][2];
				

				//overriding default fetch_interval with the domain specified interval
				var refresh_time=that.links[domain]["fetch_interval"];
				//console.log(refresh_time);
				if(!check.assigned(refresh_time)){
					refresh_time=config.getConfig("default_recrawl_interval");
				}
				that.cache[domain]=true;
				
				
				(function(url,domain,parent,hash,i){
						that.mongodb_collection.insert({"_id":url,"done":false,"domain":domain,"parent":parent,"data":"","hash":hash},function(err,results){
							if(err){
								//console.log(err);
								//link is already present
								//console.log("pool.addToPool");
							}
							else{
								//console.log(sqlite_db[refresh_time]);
								success+=1;
								mask.push("(?,?,?,?)");
								data=data.concat(li[i]);

							}
							done+=1;
							if(done===li.length-1){
								queue.enqueue(data,mask.join(","),function(){
										//console.log("INserted enqueue");

									});
							}				
					});
				})(url,domain,parent,null,i);
				

			};

			
		}
		

		//generating new buckets based on refresh interval and uniformity
		var hashes={};
		var intervals=config.getConfig("recrawl_intervals");

		for(var k in intervals){
			
			hashes[k]={};
			hashes[k]["id"]=new Date().getTime()+""+parseInt(Math.random()*10000);
			hashes[k]["links"]=[];
			
		}
		var re=[];
		var n_domains=_.size(that.cache);
		var done=0;
		var limit=n_domains*_.size(intervals);
	
		for(var k in intervals){
			for (var key in that.cache) {
				(function(key,k){
					var eachh=parseInt(config.getConfig("batch_size")/n_domains);
					//console.log("EACHH "+eachh);
					queue.dequeue(key,eachh,k,function(l){
						//console.log(l,"dequeue	"+l);
							for (var i = 0; i < l.length; i++) {
								var urldata=l[i];
								hashes[k]["links"].push(urldata);
							};
							++done;
							if(done===limit){
								//console.log(hashes)
								fn(hashes);
							}
					});						

				})(key,k);

				
			};
		}
		
		return;

	},
	"drop":function(fn){
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
	"insertParseFile":function(filename,fn){
		var that=this;
	var data=fs.readFileSync(parent_dir+'/parsers/'+filename+".js");
	var crypto = require('crypto');
	var md5sum = crypto.createHash('md5');
	md5sum.update(data.toString());
	var hash=md5sum.digest('hex');
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
	"removeSeed":function(url,fn){
		var that=this;
		var cluster_name=config.getConfig("cluster_name");
		var org_url=url;
		var url=url.replace(/\./gi,"#dot#");
		var k="seedFile."+url;
		var d={};
		d[k]="";
		that.cluster_info_collection.updateOne({"_id":cluster_name},{"$unset":d},function(err,result){
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
	"clearSeed":function(fn){
		var that=this;
		that.cluster_info_collection.updateOne({"_id":config.getConfig("cluster_name")},{"$set":{"seedFile":{}}},function(err,result){
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
	"insertSeed":function(url,parseFile,phantomjs,priority,fetch_interval,fn){
		if(priority>10){
			fn(false);
			return;
		}
		var that=this;
		var cluster_name=config.getConfig("cluster_name");
		var d={};
		var org_url=url;
		var url=URL.normalize(url).replace(/\./gi,"#dot#");
		if(!check.assigned(fetch_interval)){
			fetch_interval=config.getConfig("default_recrawl_interval");
		}
		d[url]={"phantomjs":phantomjs,"parseFile":parseFile,"priority":priority,"fetch_interval":fetch_interval};
		var new_key="seedFile."+url;
		var k={};
		k[new_key]=d[url];
		that.insertParseFile(parseFile,function(parseFileUpdated){
			if(parseFileUpdated){
				that.cluster_info_collection.update({"_id":cluster_name},{"$set":k},function(err,result){
			
					if(err){
						fn(false);
						return;
					}
					else{
						that.links[org_url]={"phantomjs":phantomjs,"parseFile":parseFile};
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
	"checkIfNewCrawl":function(fn){
		var id_name=config.getConfig("cluster_name");
		var that=this;
		that.cluster_info_collection.findOne({"_id":id_name},function(err,results){
			if(!results){
				//first time crawl therfore update the cluster info
				that.cluster_info_collection.insert({"_id":id_name,'createdAt':new Date(),'webapp_host':config.getConfig("network_host"),'webapp_port':config.getConfig('network_port'),'initiatedBy':config.getConfig('bot_name'),"seedFile":{}},function(err1,results1){

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
		var that=this;
		that.parsers_collection.find({},{}).toArray(function(err,docs){
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
						//console.log("thre");
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
		var that=this;
		that.cluster_info_collection.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
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
		var that=this;
		that.pullSeedLinks(function(new_config){
			if(check.assigned(new_config)){
				if(!ObjectX.isEquivalent(new_config,that.seed_db_copy)){
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
		var that=this;
		that.parsers_collection.find({},{}).toArray(function(err,results){
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
	'setParent':function(){
			this.bot.parent=this;
			this.cluster.parent=this;
			this.stats.parent=this;
			this.config_reloader.parent=this;
	},
	"bot":{
		"startBotGetBotActiveStatus":function(fn){
			var that=this.parent;
			that.bot_collection.findOne({"_id":config.getConfig("bot_name"),"active":true},function(err,results){
				fn(err,results);
			});
		},
		startBotAddNewBot:function(t,fn){
			var that=this.parent;
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"registerTime":t,"active":true,"config":JSON.parse(JSONX.stringify(config.getConfig()))}},{remove:false,upsert:true},function(err,result){
				fn(err,result);
			});
		},
		updateBotInfo:function(n_dic,fn){
			var that=this.parent;
			that.bot_collection.update({"_id":config.getConfig('bot_name')},n_dic,function(err,results){
				fn(err,results);

			});
		},
		BotMarkInactive:function(fn){
			var that=this.parent;
			that.bot_collection.findAndModify({"_id":config.getConfig("bot_name")},[],{"$set":{"active":false}},{remove:false},function(err,result){
				fn(err,result);
			});
		}
	},
	"cluster":{
		"getBotConfig":function(bot_name,fn){
			var that=this.parent;
			that.bot_collection.findOne({"_id":bot_name},function(err,results){
				fn(err,results);

			});
		},
		"getSeed":function(fn){
			var that=this.parent;
			that.cluster_info_collection.find({"_id":config.getConfig("cluster_name")}).toArray(function(err,results){
					var seeds=results[0].seedFile;
					fn(err,seeds);

			});
		}
	},
	"stats":{
		"getPage":function(url,fn){
			var that=this.parent;
			console.log(url)
			that.mongodb_collection.findOne({"_id":url},function(err,results){
				
				fn(err,results);
			});
		},
		cluster_info:function(id_name,fn){
			var that=this.parent;
			that.cluster_info_collection.findOne({"_id":id_name},function(err,results){
				fn(err,results);
			});
		},
		"activeBots":function(fn){
			var that=this.parent;
			
			that.bot_collection.find({},{}).toArray(function(err,docs){
				
				fn(err,docs);
			});
		},
		"crawlStats":function(fn){
			var dic={};
			var that=this.parent;
			that.bucket_collection.find({},{}).count(function(err,bucket_count){
				dic["bucket_count"]=bucket_count;
				that.bucket_collection.find({"lastModified":{"$exists":true}}).count(function(err,lm){
					dic["processed_buckets"]=lm;
						that.mongodb_collection.find({"done":true}).count(function(err,crawled_count){
							dic["crawled_count"]=crawled_count;
							that.mongodb_collection.find({"done":true,"response":{"$ne":200}}).count(function(err,failed_count){
								dic["failed_count"]=failed_count;
								fn(dic);
								return;


							});

						});
				});


			});
		},
		"getCrawledPages":function(d,len,i,sor,fn){
			var that=this.parent;
			var cursor=that.mongodb_collection.find(d,{},{});
			cursor.count(function(err,c){
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					//console.log(c);
					fn(err,docs,c);
				});
			})
		},
		"getFailedPages":function(d,len,i,sor,fn){
			var that=this.parent;
			var cursor=that.mongodb_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
				});
			})
			
		},
		"getTotalPages":function(d,len,i,sor,fn){
			var that=this.parent;
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
				});
			})
		},
		"getTotalBuckets":function(d,len,i,sor,fn){
			var that=this.parent;
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
				});
			})
		},
		"getProcessedBuckets":function(d,len,i,sor,fn){
			var that=this.parent;
			var cursor=that.bucket_collection.find(d,{},{});
			cursor.count(function(err,c){
				count=c;
				cursor.limit(len).skip(i).sort(sor).toArray(function(err,docs){
					fn(err,docs,c);
				});
			})
		},
		"updateConfig":function(bot_name,js,fn){
			var that=this.parent;
			that.bot_collection.update({"_id":bot_name},{"$set":{"config":js}},function(err,results){
				fn(err,results);
			});
		},
		"updateSeed":function(js,fn){
			var that=this.parent;
			that.cluster_info_collection.update({"_id":config.getConfig("cluster_name")},{"$set":{"seedFile":js}},function(err,results){
				fn(err,results);
			});
		},
		"search":function(query,i,fn){
			i-=1;
			if(!check.assigned(i)|| i===0 || !check.number(i)){
				i=0;
			}
			i=i*10;
			var that=this.parent;
			that.mongodb_collection.find({$text: {$search: query}}, {score: {$meta: "textScore"}},{ skip: i, limit: 10 }).sort({score:{$meta:"textScore"}}).toArray(function(err,docs){
				fn(err,docs);
			});
		}
	},
	"config_reloader":{
		"pullDbConfig":function(idd,fn){
			var that=this.parent;
					that.bot_collection.findOne({"_id":idd},function(err,results){

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
pool.setParent();//setting the parent reference
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
		var e=setInterval(function(){
			if(!process.webappOnly){
				
				pool.addToPool(["ping"],function(){

				});
			}
			
		},5000);
		process.my_timers.push(e);
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
	}
},5000);




//prototype



function init(){
	return pool;
}
exports.init=init;

exports.getDic=function(){
	return pool;
}