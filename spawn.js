var proto=require(__dirname+"/lib/proto.js");
process.getAbsolutePath=proto.getAbsolutePath;
var request = require("request");
var colors = require('colors');
var urllib = require('url');
var config=require(__dirname+"/lib/config-reloader.js");
var log=require(__dirname+"/lib/logger.js");
var regex_urlfilter={};
regex_urlfilter["accept"]=config.getConfig("accept_regex");
regex_urlfilter["reject"]=config.getConfig("reject_regex");
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
				//prepare regexes
				
				fn(bot.batch);
			}
		});
	},
	"queueLinks":function(pools){
		bot.queued=0;
		for (var i = 0; i < pools.length; i++) {
			if(pools!==null && pools[i]!==undefined){
				var url=pools[i]['_id'];
				var domain=pools[i]['domain'];
				(function(url,domain){
					setTimeout(function(){ bot.processLink(url,domain); }, 100); //to avoid recursion
				})(url,domain);
				
			}
			else{
				break;
			}

		};

	},
	"processLink":function(url,domain){
		var bot=this;//inside setTimeout no global access
		if(bot.active_sockets>config.getConfig("max_concurrent_sockets")){
			//pooling to avoid socket hanging
			(function(url,domain){
					setTimeout(function(){ bot.processLink(url,domain); }, 1000); //to avoid recursion
			})(url,domain);
			return;
		}

		
		if(bot.botObjs!==null){
			//if robots is enabled
			//check if access is given to the crawler for requested resource
			var robot=bot.botObjs[domain];
			if(!robot["NO_ROBOTS"]){
				robot=bot.addProto(robot);
				 robot.canFetch(config.getConfig("robot_agent"),url, function (access,crawl_delay) {
				      if (!access) {
				      	log.put(("Cannot access "+url),"error");
				        // access not given exit 
							
							try{
								process.send({"bot":"spawn","setCrawled":[url,{},403]});
							}
							catch(err){
							log.put("Child killed","error")
							}
							bot.isLinksFetched();
							return;
					    }
					    else{
					    	//console.log("access "+url+" crawl_delay "+crawl_delay);
					    	 bot.scheduler(url,domain,crawl_delay);
							
					    }
				  });
			
			}
			else{
				//no robots file for asked domain
				bot.fetch(url,domain);//constraints are met let's fetch the page
			}
			
		}
		else{
			bot.fetch(url,domain);//constraints are met let's fetch the page
		}

	},
	"fetch":function(url,domain){
		if(!config.getConfig("verbose")){
			log.put(url,"no_verbose");
		}
		if(config.getConfig("tika")){
			if(url.match(config.getConfig("tika_supported_files"))!==null){
				//file type matched use tika instead
				bot.fetchFile(url,domain);
			}
			else{
				bot.fetchWebPage(url,domain);
			}
		}
		else{
			bot.fetchWebPage(url,domain);
		}

		
	},
	"grabInlinks":function($,url,domain,linksFromParsers){
		for (var i = 0; i < linksFromParsers.length; i++) {
			var q=linksFromParsers[i];
			try{
			process.send({"bot":"spawn","addToPool":[q,q,url,config.getConfig("default_recrawl_interval")]});
			}
							catch(err){
							log.put("Child killed","error")
							}
		};
			var a=$("a")
			var count=a.length;
			a.each(function(){
				function reject(r){
					count-=1;
					//console.log(r+"rule");
					//console.log("domain "+domain);
					//console.log("abs "+abs);
					//log.put((""+abs+" rejected by filters"),"error");
					return true;
					
				}
				var href=$(this).attr("href");
				if(href!==undefined){
					href=href.replace("https://","http://");//std form
					//console.log("url "+href);
					var abs=urllib.resolve(domain,href);
					if(abs===domain+"/"){
						//reject http://www.youtube.com http://www.youtube.com/
						return reject("0");
					}
					if(abs.match(regex_urlfilter.accept)===null){ //user give acceptance
						if(!config.getConfig("external_links")){
							if(abs.indexOf(domain)<0){
								return reject("1");
							}
						}
					}
					
					for (var i = 0; i < regex_urlfilter.reject.length; i++) {
						if(abs.match(regex_urlfilter.reject[i])!==null){
								if(abs.match(config.getConfig("tika_supported_files"))!==null){
									if(!config.getConfig("tika")){
										return reject("3");
									}

								}
								else{
									return reject("2");
									
									}
							}
						
					};
					
									try{
											process.send({"bot":"spawn","addToPool":[abs,domain,url,config.getConfig("default_recrawl_interval")]});
										}catch(err){
											log.put("Child killed","error")
										}
											
						}

			});
			log.put(("Got "+count+" links from "+url),"info");
	},
	"isLinksFetched":function(){
				bot.queued+=1;
				if(bot.queued===bot.batch.length){
					try{
								process.send({"bot":"spawn","finishedBatch":[bot.batchId,bot.refresh_label]});
								setTimeout(function(){process.exit(0);},2000);
						}catch(err){
											log.put("Child killed","error")
						}
				
					
				}

	},
	"addProto":function(robot){
		robot.canFetch=function(user_agent,url,allowed){
			var crawl_delay=parseInt(this.defaultEntry["crawl_delay"])*1000;//into milliseconds
			if(isNaN(crawl_delay)){
				crawl_delay=0;
			}
			if(this.allowAll){
				allowed(true,crawl_delay);
				return;
			}
			else if(this.disallowAll){
				allowed(false,crawl_delay);
				return;
			}
			var rules=this.defaultEntry["rules"];
			if(rules===undefined){
				allowed(true,crawl_delay);
				return;
			}

			for (var i = 0; i < rules.length; i++) {
				var path=decodeURIComponent(rules[i].path);
				var isallowed=rules[i].allowance;

				var given_path="/"+url.replace("http://","").replace("https://","").split("/").slice(1).join("/");
				if(given_path===path && isallowed){
					allowed(true,crawl_delay);
					return;
				}
				else if(given_path===path && !isallowed){
					allowed(false,crawl_delay);
					return;
				}
			};
			//if no match then simply allow
			allowed(true,crawl_delay);
		};
		return robot;
	},
	"scheduler":function(url,domain,time){
		if(time===0){
			//queue immediately
			bot.fetch(url,domain);
			return;
		}
		else{
			var lastTime=bot.lastAccess[domain];
			if(lastTime===undefined){
				//first time visit,set time
				bot.lastAccess[domain]=new Date().getTime();
				bot.fetch(url,domain);
			}
			else{
				bot.queueWait(url,domain,time);
			}
		}

	},
	"queueWait":function(url,domain,time){
		var lastTime=bot.lastAccess[domain];
			var current_time=new Date().getTime();
				if(current_time<(lastTime+time)){
					bot.lastAccess[domain]=current_time;
					bot.fetch(url,domain);
				}
				else{
					(function(url,domain,time){
						setTimeout(function(){ bot.queueWait(url,domain,time); },Math.abs(current_time-(lastTime+time)));
					})(url,domain,time);
				}
	},
	"fetchWebPage":function(url,domain){
		var req_url=url;
		if(bot.links[domain]["phantomjs"]){
			//new url if phantomjs is being used
			req_url=config.getConfig("phantomjs_url")+req_url;
		}
		bot.active_sockets+=1;
		request({uri:req_url,pool:{maxSockets: Infinity}},function(err,response,html){
			bot.active_sockets-=1;
			if(html===undefined){
				//some error with the request return silently
				log.put("Max sockets reached read docs/maxSockets.txt","error");
				try{
					process.send({"bot":"spawn","setCrawled":[url,{},-1]});
				}catch(err){
					log.put("Child killed","error")
				}
				
				bot.isLinksFetched();
				return;
			}
					var parser=require(__dirname+"/parsers/"+bot.links[domain]["parseFile"]);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					//dic[2] inlinks suggested by custom parser
					bot.grabInlinks(dic[0],url,domain,dic[2]);
					var code=response.statusCode;
					try{
					process.send({"bot":"spawn","setCrawled":[url,dic[1],code]});
					}catch(err){
					log.put("Child killed","error")
					}
					bot.isLinksFetched();
					
					
				});
	},
	"fetchFile":function(url,domain){
		//files will be downloaded by seperate process
		var p=bot.links[domain]["parseFile"];
		process.send({"bot":"spawn","tika":[url,p]});
		bot.isLinksFetched();
					

	}


};


bot.getTask(function(links){

	bot.queueLinks(links);

});

