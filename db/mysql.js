//global connection to mongodb
//mongodb connection file
var MySQLClient = require('mysql');
var temp=__dirname.split("/");
temp.pop();
var parent_dir=temp.join("/");
var log=require(parent_dir+"/lib/logger.js");
var config=require(parent_dir+'/config/config.js').load();
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
var pool={
	"seed":function(links,fn){
		pool.resetBuckets(function(){
			var stamp1=new Date().getTime()-2000;//giving less time
			var stamp=stamp1+""+parseInt(Math.random()*10000);
			var insert="INSERT INTO "+config["mysql"]["bucket_collection"]+"(_id,underProcess,bot,recrawlAt) VALUES ('"+stamp+"',0,'"+config["bot_name"]+"',"+stamp1+")";
			console.log(insert);
			process.mysql_pool.getConnection(function(err,connection){
					connection.query(insert,function(err, rows, fields){
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
											process.mysql_pool.getConnection(function(err,connection1){
												var insert1="INSERT INTO "+config["mysql"]["mysql_collection"]+" (_id,hash,domain,done) VALUES ('"+url+"','"+stamp+"','"+domain+"',0)";
												connection1.query(insert1,function(err, rows, fields){
													if(err){
													log.put("pool.init maybe seed is already added","error");
													}
														log.put(("Added  "+domain+" to initialize pool"),"success");
														done+=1;
														if(done===links.length-1){
															
															fn(rows);
														}
														connection1.release();
														
											
												});
										});

										});
										
										anon(links[i].split('\t')[0],stamp);
										
										
									};
									
									
								});


			});
		
		});

		
	},
	"addToPool":function(li){
		//urls we will be getting will be absolute
		
		pool.addLinksToDB(li,function(hash){
			pool.generatePool(function(){
					var stamp1=new Date().getTime();
					var insert="INSERT INTO "+config["mysql"]["bucket_collection"]+" (_id,underProcess,bot,recrawlAt) VALUES ('"+hash+"',0,'"+config["bot_name"]+"',"+stamp1+")";
					process.mysql_pool.getConnection(function(err,connection){
						connection.query(insert,function(err, rows, fields){
							if(err){

								log.put(("pool.addToPool"+err),"error");
							}
							else{
								log.put(("Updated bucket "+hash),"success");
							}
												
							connection.release();					
						});


					});
					
			});
		});
		
			
	

		
	},
	"getNextBatch":function(result,batchSize){
		var stamp1=new Date().getTime();
		var q="UPDATE "+config["mysql"]["bucket_collection"]+" SET `underProcess`=1,`bot`='"+config["bot_name"]+"' WHERE `underProcess`=0 AND `recrawlAt`<="+stamp1+";SELECT `_id` FROM "+config["mysql"]["bucket_collection"]+" ORDER BY `lastmodified` DESC LIMIT 1;"
		process.mysql_pool.getConnection(function(err,connection){
			connection.query(q,function(err, rows, fields){
				
				if(rows[1][0]["_id"]!==null){
						var hash=rows[1][0]["_id"];
						var q1="SELECT * FROM "+config["mysql"]["mysql_collection"]+" WHERE `hash`='"+hash+"'";
						connection.query(q1,function(err, rows, fields){
							if(err){

								log.pu("pool.getNextBatch","error");
							}
							else{
								//console.log(docs);
								log.put(("Got "+rows.length+" for next Batch"),"success");
								connection.release();
								result(err,rows,hash);		
							}


						});
				}
				else{
						connection.release();
						result(null,[],null);	
					}
					

			});



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
		process.mysql_pool.getConnection(function(err,connection){
			var query="UPDATE "+config["mysql"]["mysql_collection"]+" SET `done`=1,`data`='"+mysql_real_escape_string(JSON.stringify(data))+"',`response`='"+status+"',`lastmodified`='"+stamp1+"' WHERE `_id`='"+url+"'";
			connection.query(query,function(err,rows,fields){
				
				if(err){
					log.put("pool.setCrawled","error");
				}
				else{
					log.put(("Updated "+url),"success");
				}
				connection.release();
				
			});


		});

	},
	"crawlStats":function(fn){
		process.mysql_pool.getConnection(function(err,connection){
			var q="SELECT count(*) AS `count` FROM "+config["mysql"]["mysql_collection"]+" WHERE `done`=0";
			var q1="SELECT count(*) AS `count` FROM "+config["mysql"]["mysql_collection"]+" WHERE `done`=1";
			var q2="SELECT count(*) AS `count` FROM "+config["mysql"]["bucket_collection"]+" WHERE 1";
			connection.query(q,function(err,rows,fields){
						connection.query(q1,function(err1,rows1,fields1){
							connection.query(q2,function(err2,rows2,fields2){
								connection.release();
								fn(rows[0]["count"],rows1[0]["count"],rows2[0]["count"]);

							});
							

						});

			});




		});

	},
	"createConnection":function(fn){
		var err;
		try{
			process.connection = MySQLClient.createConnection({
			  host     : config["mysql"]["mysql_host"],
			  user     : config["mysql"]["mysql_user"],
			  password : config["mysql"]["mysql_password"],
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
		process.connection.query('CREATE DATABASE '+config["mysql"]["mysql_db"], function(err, rows, fields) {
			 
			  process.mysql_pool = MySQLClient.createPool({
			  connectionLimit : config["mysql"]["mysql_connection_pool"],
			  host     : config["mysql"]["mysql_host"],
			  user     : config["mysql"]["mysql_user"],
			  password : config["mysql"]["mysql_password"],
			  database : config["mysql"]["mysql_db"],
			  multipleStatements:true
			});
			process.mysql_pool.getConnection(function(err,connection){
				connection.query("CREATE TABLE "+config["mysql"]["mysql_collection"]+" ( _id VARCHAR(767) PRIMARY KEY,done TINYINT(1),domain VARCHAR(767),data LONGTEXT,hash VARCHAR(25),response VARCHAR(20),lastModified VARCHAR(25))", function(err, rows, fields) {
			  		connection.query("CREATE TABLE "+config["mysql"]["bucket_collection"]+" ( _id VARCHAR(100) PRIMARY KEY,underProcess TINYINT(1),bot VARCHAR(25),recrawlAt BIGINT(25),lastModified TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP)", function(err, rows, fields) {
			  			connection.release();
			  			fn();
			
					});
		
				});

			}); 
			  
		
		});
	},
	"close":function(){
		process.connection.end();
		console.log("1");
		process.mysql_pool.end();
		console.log("11");
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
				process.exit(0);
			}
		pool["links"]=dic;
		pool["seedCount"]=links.length;
		return links;
	},
	"batchFinished":function(hash){
		var stamp1=new Date().getTime()+config["recrawl_interval"];
		var lm=new Date().getTime();
		process.mysql_pool.getConnection(function(err,connection){
			var query="UPDATE "+config["mysql"]["bucket_collection"]+" SET `underProcess`=0,`recrawlAt`="+stamp1+",`lastModified`='"+lm+"' WHERE `_id`='"+hash+"'";
			connection.query(query,function(err,rows,fields){
				if(!err){
						log.put(("Bucket "+hash+"completed !"),"success");
				}
				
				connection.release();

			});


		});
		
	},
	"resetBuckets":function(fn){
		var stamp1=new Date().getTime()-2000;//giving less time
		process.mysql_pool.getConnection(function(err,connection){
			var q="UPDATE "+config["mysql"]["bucket_collection"]+" SET `underProcess`=0,`recrawlAt`="+stamp1+" WHERE `underProcess`=1 AND `bot`='"+config["bot_name"]+"'";
			connection.query(q, function(err, rows, fields) {
				console.log("err "+err+" resetBuckets");
				connection.release();
			  	fn();
			
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
				process.mysql_pool.getConnection(function(err,connection){
					var insert="INSERT INTO "+config["mysql"]["mysql_collection"]+" (_id,done,domain,data,hash) VALUES ('"+url+"',0,'"+domain+"','"+mysql_real_escape_string(JSON.stringify({}))+"','"+hash+"')";
					connection.query(insert,function(err,rows,fields){
							if(err){

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
							connection.release();				
					});
			});
			})(item,key,stamp);


			
		};
		
	},
	"generatePool":function(fn){
		var re=[];
		var n_domains=Object.keys(pool.cache).length;
		var eachh=config["batch_size"]/n_domains;
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
		process.connection.query("DROP DATABASE "+config["mysql"]["mysql_db"],function(err,rows,fields){
			fn();


		});
	},
	"seedCount":0,
	"cache":{}
};


function init(){
	return pool;
}
exports.init=init;