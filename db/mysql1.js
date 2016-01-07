//global connection to mongodb
//https://github.com/DrBenton/Node-DBI
//mongodb connection file
var MySQLClient = require('mysql');
var parent_dir=process.getAbsolutePath(__dirname);
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+"/lib/config-reloader.js");
var fs=require('fs');
var cluster;
var proto=require(parent_dir+'/lib/proto.js');
var JSONX=proto.JSONX;
var ObjectX=proto.ObjectX;
var mysql_collection=config.getConfig("mysql","mysql_collection");
var bucket_collection=config.getConfig("mysql","bucket_collection");
var bot_collection=config.getConfig("mysql","bot_collection");
var semaphore_collection=config.getConfig("mysql","semaphore_collection");
var cluster_info_collection=config.getConfig("mysql","cluster_info_collection");
var parsers_collection=config.getConfig("mysql","parsers_collection");

//read seed file

function mysql_real_escape_string (str) {
    return str.replace(/[\0\x08\x09\x1a\n\r"'\\\%]/g, function (char) {
        switch (char) {
            case "\0":
                return "\\0";
            case "\x08":
                return "\\b";
            case "\x09":
                return "\\t";
            case "\x1a":
                return "\\z";
            case "\n":
                return "\\n";
            case "\r":
                return "\\r";
            case "\"":
            case "'":
            case "\\":
            case "%":
                return "\\"+char; // prepends a backslash to backslash, percent,
                                  // and double/single quotes
        }
    });
}


function getConnection(query,values,fn){
	process.mysql_pool.getConnection(function(err,connection){
		connection.query(query,values,function(err, rows, fields){
			fn(err,rows);
		});
				
	});
}
var pool={
	"seed":function(links,fn){
		//this method runs first when crawler starts
		var that=this;
		that.checkIfNewCrawl(function(isNewCrawl){
					that.getParsers(function(){
							var stamp1=new Date().getTime()-2000;//giving less time
							var stamp=stamp1+""+parseInt(Math.random()*10000);
							getConnection("INSERT INTO "+bucket_collection+" SET",{"_id":stamp,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":links.length},function(err,results){
								var done=0;
								for (var i = 0; i < links.length; i++) {
									var anon=(function(domain,stamp){
										if(domain===""){
											return;
										}
										getConnection("INSERT INTO "+mongodb_collection+" SET",{"_id":domain,"hash":stamp,"domain":domain,"done":false},function(err,results){
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
		var that=this;
		//urls we will be getting will be absolute
		if(li.length===0){
			//buckets with empty links will not be inserted
			fn(false);
			return;
		}
		that.addLinksToDB(li,function(hash){
			if(hash===null){
				fn(false);
				return;
			}
			//first links are added to the db to avoid same links
			that.generatePool(function(numOfLinks){
				//uniform pool of urls are generated
				if(numOfLinks===undefined || numOfLinks===0){
					fn(false);
					return;
				}
					var stamp1=new Date().getTime();
					getConnection("INSERT INTO "+bucket_collection+" SET",{"_id":hash,"underProcess":false,"insertedBy":config.getConfig("bot_name"),"recrawlAt":stamp1,"numOfLinks":numOfLinks},function(err,results){
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
		var that=this;
		getConnection("INSERT INTO "+semaphore_collection+" SET",{"bot_name":config.getConfig("bot_name"),"requestTime":k},function(err,results){
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
		getConnection("SELECT * FROM "+semaphore_collection+" ORDER BY requestTime asc",{},function(err,results){
		for (var i = 0; i < results.length; i++) {
			var obj=results[i];
			if(obj && obj["_id"].toString()===reqId.toString() && obj["bot_name"].toString()===config.getConfig("bot_name")){
				log.put("Got access to queue reqId :"+reqId,"success");
				fn(true);
				return;
			}
			else{
				log.put("No access for now","info");
				fn(false);
				return;
			}
			
		};
			fn(false);
			return;
			

		});

	},
	"removeRequest":function(reqId,fn){
		var that=this;
		getConnection("DELETE FROM "+semaphore_collection+" WHERE _id=:id",{id:reqId},function(err,results){
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
											if(!access){
												return;
											}
											clearInterval(process.semaphore_access);//clearing the check for verification now
											if(access){
												log.put("Got access to the collection","info");
												var stamp1=new Date().getTime();
													that.bucket_collection.findAndModify({"underProcess":false,"recrawlAt":{$lte:stamp1}},[],{"$set":{"underProcess":true,"processingBot":config.getConfig("bot_name")}},{"remove":false},function(err,object){
														if(object.value!==null){
																var hash=object["value"]["_id"];
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
																							result(err,docs,hash);		
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
		var that=this;
		var stamp1=new Date().getTime();
		if(data===undefined || data ===null){
			data="";
		}
		if(status===undefined){
			status="0";//no error
		}
		getConnection()
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
				k['parseFile']=dic[key]['parseFile'];
				links[key.replace(/#dot#/gi,".")]=k;
				links1.push(key.replace(/#dot#/gi,"."));
			}

			that["links"]=links;
			that["seedCount"]=links1.length;
			fn(links1);
			return;
		});
		
		
		
	},
	"batchFinished":function(hash){
		var that=this;
		var stamp1=new Date().getTime()+config.getConfig("recrawl_interval");
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
	"addLinksToDB":function(li,fn){
		var that=this;
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
				that.mongodb_collection.insert({"_id":url,"done":false,"domain":domain,"data":"","hash":hash},function(err,results){
						if(err){
							//link is already present
							//console.log("pool.addToPool");
						}
						else{
							//console.log("Discovered "+url);
							if(that.cache[domain]){
								that.cache[domain].push(url);
							}
							else{
								that.cache[domain]=[];
								that.cache[domain].push(url);
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
		var that=this;
		var re=[];
		var n_domains=Object.keys(that.cache).length;
		var eachh=config.getConfig("batch_size")/n_domains;
		var len=0;
		for (var key in that.cache) {
			var l=that.cache[key].splice(0,eachh);
			len+=l.length;
			for (var i = 0; i < l.length; i++) {
				var url=l[i];
				re.push([url,key]);
			};
		};
		fn(len);
		return;

	},
	"insertParseFile":function(filename,fn){
		var that=this;
	var data=fs.readFileSync(parent_dir+'/parsers/'+filename+".js");
	var crypto = require('crypto');
	var md5sum = crypto.createHash('md5');
	md5sum.update(data.toString());
	var hash=md5sum.digest('hex');
	getConnection("UPDATE "+parsers_collection+" SET data="+data+",hash='"+hash+"' WHERE _id='"+filename+"'",function(err,results){
		console.log(err,results);
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
		getConnection("UPDATE "+cluster_info_collection+" SET ? WHERE _id='"+config.getConfig("cluster_name")+"'",{"seedFile":"{}"},function(err,result){
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
	"insertSeed":function(url,parseFile,phantomjs,fn){
		var that=this;
		var cluster_name=config.getConfig("cluster_name");
		var d={};
		var org_url=url;
		var url=url.replace(/\./gi,"#dot#");
		d[url]={"phantomjs":phantomjs,"parseFile":parseFile};
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
			if(new_config!==null){
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
			getConnection("SELECT * FROM "+bot_collection+" WHERE _id=:id",{id:bot_name},function(err,results){
				fn(err,results);
			});
			
		}
	},
	"stats":{
		cluster_info:function(id_name,fn){
			var that=this.parent;
			getConnection("SELECT * FROM "+cluster_info_collection+" WHERE _id=:id",{id:id_name},function(err,results){
				fn(err,results);
			});
		},
		"activeBots":function(fn){
			var that=this.parent;
			getConnection("SELECT * FROM "+bot_collection,{},function(err,docs){
				fn(err,docs);

			});
			
		},
		"crawlStats":function(fn){
			var dic={};
			var that=this.parent;
			getConnection("SELECT count(*) FROM "+bucket_collection,{},function(err,bucket_count){
				dic["bucket_count"]=bucket_count;
				getConnection("SELECT count(*) FROM "+bucket_collection+" WHERE NOT lastModified=:lmm",{lmm:null},function(err,lm){
					dic["processed_buckets"]=lm;
					getConnection("SELECT count(*) FROM "+mongodb_collection+" WHERE done=:done",{done:1},function(err,crawled_count){
							dic["crawled_count"]=crawled_count;
							getConnection("SELECT count(*) FROM "+mongodb_collection+" WHERE done=:done AND NOT response=:res",{done:1,res:200},function(err,failed_count){
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
			that.mongodb_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"getFailedPages":function(d,len,i,sor,fn){
			var that=this.parent;
			that.mongodb_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"getTotalPages":function(d,len,i,sor,fn){
			var that=this.parent;
			that.bucket_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,results){
				fn(err,results);
			});
		},
		"getTotalBuckets":function(d,len,i,sor,fn){
			var that=this.parent;
			that.bucket_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"getProcessedBuckets":function(d,len,i,sor,fn){
			var that=this.parent;
			that.bucket_collection.find(d,{},{limit:len,skip:i}).sort(sor).toArray(function(err,docs){
				fn(err,docs);
			});
		},
		"updateConfig":function(bot_name,js,fn){
			var that=this.parent;
			that.bot_collection.update({"_id":bot_name},{"$set":{"config":js}},function(err,results){
				fn(err,results);
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
	"createConnection":function(fn){
		var err;
		try{
			process.connection = MySQLClient.createConnection({
			  host     : config.getConfig("mysql","mysql_host"),
			  user     : config.getConfig("mysql","mysql_user"),
			  password : config.getConfig("mysql","mysql_password"),
			  multipleStatements:true
			});
			process.connection.connect();
			pool.setupTables(function(){

				
				fn(err,process.mysql_pool);
			});

		}catch(err){
			fn(err,null);
		}
		
		
	
	},
	"setupTables":function(fn){
		process.connection.query('CREATE DATABASE '+config.getConfig("mysql","mysql_db" ),function(err, rows, fields) {
			 
			  process.mysql_pool = MySQLClient.createPool({
			  connectionLimit : config.getConfig("mysql","mysql_pool"),
			  host     : config.getConfig("mysql","mysql_host"),
			  user     : config.getConfig("mysql","mysql_user"),
			  password : config.getConfig("mysql","mysql_password"),
			  database : config.getConfig("mysql","mysql_db"),
			  multipleStatements:true
			});
			process.mysql_pool.getConnection(function(err,connection){
				connection.query("CREATE TABLE "+config.getConfig("mysql","mysql_collection")+" ( _id VARCHAR(767) PRIMARY KEY,done TINYINT(1),domain VARCHAR(767),data LONGTEXT,hash VARCHAR(25),response VARCHAR(20),lastModified VARCHAR(25))", function(err, rows, fields) {
			  		connection.query("CREATE TABLE "+config.getConfig("mysql","bucket_collection")+" ( _id VARCHAR(100) PRIMARY KEY,underProcess TINYINT(1),bot VARCHAR(25),recrawlAt BIGINT(25),lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)", function(err, rows, fields) {
			  			connection.query("CREATE TABLE "+config.getConfig("mysql","semaphore_collection")+" ( _id INT(100) PRIMARY KEY AUTO_INCREMENT,bot_name VARCHAR(25),requestTime DATE)", function(err, rows, fields) {
				  			connection.query("CREATE TABLE "+config.getConfig("mysql","bot_collection")+" ( _id VARCHAR(25) PRIMARY KEY,registerTime INT(20),active TINYINT(1),config LONGTEXT,createdBuckets INT(20),processedBuckets INT(20),crawledPages INT(20),failedPages INT(20))", function(err, rows, fields) {
						  			connection.query("CREATE TABLE "+config.getConfig("mysql","cluster_info_collection")+" ( _id VARCHAR(25) PRIMARY KEY,createdAt DATE,registerTime INT(20),webapp_host VARCHAR(20),webapp_port VARCHAR(20),initiatedBy VARCHAR(20),seedFile LONGTEXT)", function(err, rows, fields) {
							  			
										connection.query("CREATE TABLE "+config.getConfig("mysql","parsers_collection")+" ( _id VARCHAR(25) PRIMARY KEY,data LONGBLOB,hash VARCHAR(100))", function(err, rows, fields) {
							  			
	
								  			connection.release();
								  			fn();
							
										});
						
									});
								});
						});
			
					});
		
				});

			}); 
			  
		
		});
	},
	"close":function(){
		process.connection.end();
		process.mysql_pool.end();
	},
	"drop":function(fn){
		process.connection.query("DROP DATABASE "+config.getConfig("mysql","mysql_db"),function(err,rows,fields){
			fn();


		});
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
		clearInterval(process.pool_check_mode);//once intervals are set clear the main interval
	}
},5000);




function init(){
	return pool;
}
//console.log(pool);
exports.init=init;
