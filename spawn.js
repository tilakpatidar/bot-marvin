var proto=require(__dirname+"/lib/proto.js");
var URL=require(__dirname+"/lib/url.js");
process.on("exit",function(){
	//#debug#("KILLED")
})
process.getAbsolutePath=proto.getAbsolutePath;
var parent_dir=process.getAbsolutePath(__dirname);
var request = require("request");
var check=require("check-types");
var colors = require('colors');
var urllib = require('url');
var config=require(__dirname+"/lib/spawn_config.js");
var log;
var separateReqPool;
var regex_urlfilter={};
var sqlite3 = require('sqlite3').verbose();
var tika_db = new sqlite3.Database(__dirname+'/db/sqlite/tika_queue');
tika_db.serialize(function() {
	tika_db.run("CREATE TABLE IF NOT EXISTS q (id INTEGER PRIMARY KEY AUTOINCREMENT,fileName TEXT UNIQUE,parseFile TEXT,status INTEGER)");
});
var bot={
	"queued":0,
	"active_sockets":0,
	"batch":{},
	"batchSize":0,
	"batchId":0,
	"refresh_label":"monthly",
	"links":[],
	"botObjs":{},
	"lastAccess":{},
	"getTask":function(fn){
		process.on('message',function(data){
			//recieving instructions from parent
			var k=data["init"];
			if(k){
				bot.batch=k[0];
				bot.batchSize=k[1];
				bot.links=k[2];
				bot.botObjs=k[3];
				bot.batchId=k[4];
				bot.refresh_label=k[5];
				config=config.init(k[6],k[7],k[8]);
				process.bot_config=config;
				separateReqPool = {maxSockets: config.getConfig("http","max_sockets_per_host")};
				regex_urlfilter["accept"]=config.getConfig("accept_regex");
				regex_urlfilter["reject"]=config.getConfig("reject_regex");
				log=require(__dirname+"/lib/logger.js");
				//prepare regexes
				URL.init(config, regex_urlfilter);
				return fn(bot.batch);
			}
		});
	},
	"queueLinks":function(pools){
		bot.queued=0;
		for (var i = 0; i < pools.length; i++) {
			if(check.assigned(pools)){
				var url=pools[i]['_id'];
				var domain=pools[i]['domain'];
				var link = URL.url(url, domain);
				link.setBucketId(pools[i]['bucket_id']);
				(function(link){
					setTimeout(function(){ bot.processLink(link); }, 100); //to avoid recursion
				})(link);
				
			}
			else{
				break;
			}

		};

	},
	"processLink":function(link){
		var bot=this;//inside setTimeout no global access
		if(bot.active_sockets>config.getConfig("http","max_concurrent_sockets")){
			//pooling to avoid socket hanging
			 return (function(link){
					setTimeout(function(){ bot.processLink(link); }, 1000); //to avoid recursion
			})(link);
			
		}

		
		if(check.assigned(bot.botObjs)){
			//if robots is enabled
			//check if access is given to the crawler for requested resource
			var robot=bot.botObjs[link.details.domain];
			if(check.assigned(robot) && !robot["NO_ROBOTS"]){
				robot=bot.addProto(robot);
				 robot.canFetch(config.getConfig("robot_agent"),link.details.url, function (access,crawl_delay) {
				      if (!access) {
				      	log.put(("Cannot access "+link.details.url),"error");
				        // access not given exit 
							
							try{
								link.setStatusCode(403);
								link.setResponseTime(0);
								link.setParsed({});
								link.setContent({});
								process.send({"bot":"spawn","setCrawled":link.details});
							}
							catch(err){
							//log.put("Child killed","error")
							}
							return bot.isLinksFetched();
							
					    }
					    else{
					    	//#debug#("access "+url+" crawl_delay "+crawl_delay);
					    	 bot.scheduler(link, crawl_delay);
							
					    }
				  });
			
			}
			else{
				//no robots file for asked domain
				bot.fetch(link);//constraints are met let's fetch the page
			}
			
		}
		else{
			bot.fetch(link);//constraints are met let's fetch the page
		}

	},
	"fetch":function(link){
		if(!config.getConfig("verbose")){
			log.put(link.details.url, "no_verbose");
		}
		if(link.details.file_type === "file"){
			bot.fetchFile(link);
		}
		else if(link.details.file_type === "webpage"){
			bot.fetchWebPage(link);
		}

		
	},
	"grabInlinks":function($,url,domain,linksFromParsers){
		for (var i = 0; i < linksFromParsers.length; i++) {
				var q=linksFromParsers[i];
				try{
					process.send({"bot":"spawn","addToPool":[q,q,url,config.getConfig("default_recrawl_interval")]});
				}
				catch(err){
						//log.put("Child killed","error")
				}
		};
			var a=$("a")
			var count=a.length;
			url = URL.url(url, domain);
			a.each(function(){
				
				
				var href = $(this).attr("href")
				if(check.assigned(href)){
					//#debug#("url "+href);
					
					//console.log(abs);
					var link = URL.url(href, domain);
					if(!link.details.accepted){
						return;
					}
					
					
					try{
							process.send({"bot":"spawn","addToPool":[link.details.url, link.details.domain, url.details.url, config.getConfig("default_recrawl_interval")]});
							//process.send({"bot":"spawn","graph":[link.details.url, url.details.url]});
					}catch(err){
						//log.put("Child killed","error")
					}
											
				}

			});
			log.put(("Got "+count+" links from "+url.details.url ),"info");
	},
	"isLinksFetched":function(){
				bot.queued+=1;
				if(bot.queued===bot.batch.length){
					try{
								process.send({"bot":"spawn","finishedBatch":[bot.batchId,bot.refresh_label]});
								setTimeout(function(){process.exit(0);},2000);
						}catch(err){
										//	log.put("Child killed","error")
						}
				
					
				}

	},
	"addProto":function(robot){
		robot.canFetch=function(user_agent,url,allowed){
			var crawl_delay=parseInt(this.defaultEntry["crawl_delay"])*1000;//into milliseconds
			if(isNaN(crawl_delay) || !check.assigned(crawl_delay)){

				crawl_delay=config.getConfig("http","delay_request_same_host");
			}
			if(this.allowAll){
				return allowed(true,crawl_delay);
				
			}
			else if(this.disallowAll){
				return allowed(false,crawl_delay);
				
			}
			var rules=this.defaultEntry["rules"];
			if(!check.assigned(rules)){
				return allowed(true,crawl_delay);
			}

			for (var i = 0; i < rules.length; i++) {
				var path=decodeURIComponent(rules[i].path);
				var isallowed=rules[i].allowance;

				var given_path="/"+url.replace("http://","").replace("https://","").split("/").slice(1).join("/");
				if(given_path===path && isallowed){
					return allowed(true,crawl_delay);
				}
				else if(given_path===path && !isallowed){
					return allowed(false,crawl_delay);
				}
			};
			//if no match then simply allow
			return allowed(true,crawl_delay);
		};
		return robot;
	},
	"scheduler":function(link, time){
		if(time===0){
			//queue immediately
			return bot.fetch(link);
		}
		else{
			var lastTime=bot.lastAccess[link.details.domain];
			if(!check.assigned(lastTime)){
				//first time visit,set time
				bot.lastAccess[link.details.domain]=new Date().getTime();
				bot.fetch(link);
			}
			else{
				bot.queueWait(link, time);
			}
		}

	},
	"queueWait":function(link, time){
		var lastTime=bot.lastAccess[link.details.domain];
			var current_time=new Date().getTime();
				if(current_time<(lastTime+time)){
					bot.lastAccess[link.details.domain]=current_time;
					bot.fetch(link);
				}
				else{
					(function(link, time){
						setTimeout(function(){ bot.queueWait(link, time); },Math.abs(current_time-(lastTime+time)));
					})(link, time);
				}
	},
	"fetchWebPage":function(link){
		var req_url=link.details.url;
		if(bot.links[link.details.domain]["phantomjs"]){
			//new url if phantomjs is being used
			req_url="http://127.0.0.1:"+config.getConfig("phantomjs_port")+"/?q="+req_url;
		}
		bot.active_sockets+=1;
		
		var req=request({uri:req_url,followRedirect:true,pool:separateReqPool,timeout:config.getConfig("http", "timeout"),headers:config.getConfig("http","headers")});
		var html=[];
		var done_len=0;
		var init_time=new Date().getTime();
		var sent = false;
		req.on("response",function(res){

			if(check.assigned(res) && check.assigned(res.headers.location) && res.headers.location !== req_url){
				//if page is redirect
				log.put(req_url+" redirected to "+res.headers.location,'info');
				link.setRedirectedURL(res.headers.location);
				
			}
			if(check.assigned(res) && check.assigned(res.headers['content-type'])){
				var allowed = config.getConfig('http','accepted_mime_types');
				var tika_allowed = config.getConfig("tika_supported_mime");
				var match = false;
				var tika_match =false;
				for(var index in allowed){
					if(res.headers['content-type'].indexOf(allowed[index])>=0){
						match = true;
					}

				}
				for(var index in tika_allowed){
					if(res.headers['content-type'].indexOf(tika_allowed[index])>=0){
						tika_match = true;
					}
				}

				if(!match && !tika_match){
					req.emit('error',"MimeTypeRejected");
				}
				if(tika_match){
					log.put("Tika mime type found transfer to tika queue "+link.details.url,'info');
					bot.fetchFile(link);
					req.emit('error','TikaMimeTypeFound');
				}

			}
			
//#debug#(arguments)
			var len = parseInt(res.headers['content-length'], 10);
			if(!check.assigned(len) || !check.number(len)){
				len=0;
			}
			if(len>config.getConfig("http","max_content_length")){
					req.emit('error',"ContentOverflow");
					
			}
			res.on("data",function(chunk){
				done_len+=chunk.length;
				var c=chunk.toString();
			 	html.push(c);
			 	var t=new Date().getTime();
			 	if((t-init_time)>config.getConfig("http","callback_timeout")){
					req.emit('error',"ETIMEDOUT_CALLBACK");
			 	}
			 	if(done_len>config.getConfig("http","max_content_length")){
					req.emit('error',"ContentOverflow");
				}
			});
			res.on("error",function(err){
				//#debug#(err )
				//console.log(err,err.type)
				req.emit("error",err);
				
			});
			res.on("end",function(){
				bot.active_sockets-=1;
				html = html.join("");
				if(!check.assigned(html)){
					//some error with the request return silently
					log.put("Max sockets reached read docs/maxSockets.txt","error");
					try{
						link.setStatusCode(-1);
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
						}
					}catch(err){
					//	log.put("Child killed","error")
					}
					
					return bot.isLinksFetched();
				}
				var parser=require(__dirname+"/parsers/"+bot.links[link.details.domain]["parseFile"]);
				var dic=parser.init.parse(html,link.details.url);//pluggable parser
				//dic[0] is cheerio object
				//dic[1] is dic to be inserted
				//dic[2] inlinks suggested by custom parser
				bot.grabInlinks(dic[0],link.details.url,link.details.domain,dic[2]);
				var code=res.statusCode;
				//console.log(code,"code")
				try{
					link.setStatusCode(code);
					link.setParsed(dic[1]);
					link.setResponseTime(0);
					link.setContent(dic[3]);
					if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
					}
				}catch(err){
				//log.put("Child killed","error")
				}
				bot.isLinksFetched();
					

			});
		});
		req.on("error",function(err){
			//#debug#(err)
			//console.log("req  ",err,err.type)
			var msg = err;
			if(msg === "ETIMEDOUT_CALLBACK"){
					log.put("Connection timedout change http.callback_timeout setting in config","error");
					try{
						link.setStatusCode("ETIMEDOUT_CALLBACK");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
						}
					}catch(err){
						//log.put("Child killed","error")
					}
					
					return bot.isLinksFetched();
			}
			else if(msg === "ContentOverflow"){
				log.put("content-length is more than specified","error");
					try{
						link.setStatusCode("ContentOverflow");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
						}
					}catch(err){
						//log.put("Child killed","error")
					}
					
					 return bot.isLinksFetched();

			}else if(msg === "MimeTypeRejected"){
				log.put("mime type rejected for "+link.details.url,"error");
					try{
						link.setStatusCode("MimeTypeRejected");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
						}
					}catch(err){
						//log.put("Child killed","error")
					}
					
					 return bot.isLinksFetched();

			}else if(msg === "'TikaMimeTypeFound'"){
				//we already called fetch file just pass 
			}
			else{
					try{
						var code;
						if(err.code === 'ETIMEDOUT'){
							console.log(err);
							if(err.connect === true){
								code = 'ETIMEDOUT_CONNECTION'
							}else{
								code = 'ETIMEDOUT_READ'
							}
						}else{
							code = err.code;
						}
						link.setStatusCode(code);
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							sent = true;
						}
					}catch(errr){

					}
					return bot.isLinksFetched();
			}

			
		});

					
	},
	"fetchFile":function(link){
		//files will be downloaded by seperate process
		//console.log("files    "+url)
		var p=bot.links[link.details.domain]["parseFile"];
		code="inTikaQueue";
		try{
			link.setStatusCode(code);
			link.setParsed({});
			link.setResponseTime(0);
			link.setContent({});
			process.send({"bot":"spawn","setCrawled":link.details});
			tika_db.parallelize(function() {
				tika_db.run("INSERT OR IGNORE INTO q(fileName,parseFile,status) VALUES(?,?,0)",[link.details.url,p],function(err,row){
					if(!err){
						log.put('Tika job info inserted '+link.details.url,'success');
					}
					
					//console.log(err+"pushQ");
					//console.log(JSON.stringify(row)+"pushQ");
					
				});
			});
		}catch(err){
			//console.log(err);
		}
		
		bot.isLinksFetched();
					

	}


};


bot.getTask(function(links){
	bot.queueLinks(links);

});

