var proto=require(__dirname+"/lib/proto.js");
var URL=require(__dirname+"/lib/url.js");
var child=require('child_process');
process.on("exit",function(){
	//#debug#("KILLED")
})
process.getAbsolutePath=proto.getAbsolutePath;
var parent_dir=process.getAbsolutePath(__dirname);
var request = require("request");
var check=require("check-types");
var colors = require('colors');
var urllib = require('url');
var crypto = require('crypto');
var config=require(__dirname+"/lib/spawn_config.js");
var log;
var GLOBAL_QUEUE = [];
var separateReqPool;
var regex_urlfilter={};
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
	"getTask":function getTask(fn){
		process.on('message',function process_on_msg(data){
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
				process.bot_type = k[9];
				process.bot_config=config;
				separateReqPool = {maxSockets: config.getConfig("http","max_sockets_per_host")};
				regex_urlfilter["accept"]=config.getConfig("accept_regex");
				regex_urlfilter["reject"]=config.getConfig("reject_regex");
				log=require(__dirname+"/lib/logger.js");
				//prepare regexes
				URL.init(config, regex_urlfilter);
				process.http_proxy = config.getConfig("http", "http_proxy");
				process.https_proxy = config.getConfig("http", "https_proxy");
				return fn(bot.batch);
			}
		});
	},
	"queueLinks":function queueLinks(pools){
		bot.queued=0;
		for (var i = 0; i < pools.length; i++) {
			if(check.assigned(pools)){
				if(process.bot_type === "normal"){
					var url=pools[i]['url'];
					var domain=pools[i]['domain'];
					try{
						var link = URL.url(url, domain);
						link.setNormalQueue();
					
						link.setBucketId(pools[i]['bucket_id']);
						link.setUrlId(pools[i]['_id']);
						(function(link){
							setTimeout(function(){ bot.processLink(link); }, 100); //to avoid recursion
						})(link);
					}catch(err){
						
					}
				}else if(process.bot_type === "failed_queue"){
					var url=pools[i]['url'];
					var domain=pools[i]['domain'];
					var parent = pools[i]['parent'];
					try{
						var link = URL.url(url, domain, parent);
						link.setFailedQueue();
					
						link.setBucketId(pools[i]['bucket_id']);
						link.setUrlId(pools[i]['_id']);
						(function(link){
							setTimeout(function(){ bot.processLink(link); }, 100); //to avoid recursion
						})(link);
					}catch(err){
						
					}
				}

				
			}
			else{
				break;
			}

		};

	},
	"processLink":function processLink(link){
		var bot=this;//inside setTimeout no global access
		//console.log(bot.batchId,"   ",link.details.url , 'ask access');
		//console.log(bot.batchId,"   ",bot.active_sockets, "    ",config.getConfig("http","max_concurrent_sockets"));
		if(!check.assigned(link)){
			return;
		}
		if(bot.active_sockets>=config.getConfig("http","max_concurrent_sockets")){
			//pooling to avoid socket hanging
			GLOBAL_QUEUE.push(link);
			return;
			
		}
		bot.active_sockets+=1;

		
		if(check.assigned(bot.botObjs)){
			//if robots is enabled
			//check if access is given to the crawler for requested resource
			var robot=bot.botObjs[link.details.domain];
			if(check.assigned(robot) && !robot["NO_ROBOTS"]){
				robot=bot.addProto(robot);
				 robot.canFetch(config.getConfig("robot_agent"),link.details.url, function canFetch1 (access,crawl_delay) {
				      if (!access) {
				      	msg(("Cannot access "+link.details.url),"error");
				        // access not given exit 
							
							try{
								link.setStatusCode(403);
								link.setResponseTime(0);
								link.setParsed({});
								link.setContent({});
								process.send({"bot":"spawn","setCrawled":link.details});
								
							}
							catch(err){
							//msg("Child killed","error")
							}
							finally{
								bot.active_sockets-=1;
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
	"fetch":function fetch(link){
		if(!config.getConfig("verbose")){
			msg(link.details.url, "no_verbose");
		}
		if(link.details.file_type === "file"){
			bot.fetchFile(link);
		}
		else if(link.details.file_type === "webpage"){
			bot.fetchWebPage(link);
		}

		
	},
	"grabInlinks":function grabInlinks($,url,domain,linksFromParsers){
		for (var i = 0; i < linksFromParsers.length; i++) {
				var q=linksFromParsers[i];
				try{
					process.send({"bot":"spawn","addToPool":[q,q,url,config.getConfig("default_recrawl_interval")]});
				}
				catch(err){
						//msg("Child killed","error")
				}
		};
			var a=$("a")
			//console.log(a);
			var count=a.length;
			url = URL.url(url, domain);

			a.each(function grabInlinks_each(){

				//do not follow links with rel = 'nofollow'
				var rel = $(this).attr('rel');
				if(check.assigned(rel) && rel === "nofollow"){
					--count;
					return;
				}

				var href = $(this).attr("href");
				//console.log(href);
				if(check.assigned(href)){
					//#debug#("url "+href);
					
					//console.log(abs);
					var link = URL.url(href, domain);

					if(config.getConfig("web_graph")){
						try{
							if(url.details.nutch_key.split(":")[0] !== link.details.nutch_key.split(":")[0]){
								//storing just outlink relations
								process.send({"bot":"spawn","graph":[link.details.url, url.details.url]});
							}
							
						}catch(errr){

						}
					}
					if(!link.details.accepted){
						--count;
						return;
					}
					//console.log(link.details.url);
					
					try{
							process.send({"bot":"spawn","addToPool":[link.details.url, link.details.domain, url.details.url, config.getConfig("default_recrawl_interval")]});
							
					}catch(err){
						msg("Child killed","error")
					}
											
				}

			});
			msg(("Got "+count+" links from "+url.details.url ),"info");
	},
	"isLinksFetched":function isLinksFetched(){
				bot.queued+=1;
				if(bot.queued >= bot.batch.length){
					try{
								process.send({"bot":"spawn","finishedBatch":[bot.batchId,bot.refresh_label,process.bot_type]});
								setTimeout(function(){process.exit(0);},5000);
						}catch(err){
										//	msg("Child killed","error")
						}
				
					
				}

	},
	"addProto":function addProto(robot){
		robot.canFetch=function canFetch(user_agent,url,allowed){
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
	"scheduler":function scheduler(link, time){
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
	"queueWait":function queueWait(link, time){
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
	"fetchWebPage":function fetchWebPage(link){
		var req_url=link.details.url;
		//console.log(bot.links, link.details.domain);
		if(bot.links[link.details.domain]["phantomjs"]){
			//new url if phantomjs is being used
			req_url="http://127.0.0.1:"+config.getConfig("phantomjs_port")+"/?q="+req_url;
		}
		
		//console.log(req_url);
		var req=request({uri:req_url,followRedirect:true,pool:separateReqPool,timeout:config.getConfig("http", "timeout")});
		var html=[];
		var done_len=0;
		var init_time=new Date().getTime();
		var sent = false;
		req.on("response",function req_on_response(res){
		
			if(check.assigned(res) && check.assigned(res.headers.location) && res.headers.location !== req_url){
				//if page is redirect
				msg(req_url+" redirected to "+res.headers.location,'info');
				link.setRedirectedURL(res.headers.location);
				
			}
			if(check.assigned(res) && check.assigned(res.headers['content-type'])){
				link.setHeaderContentType(res.headers['content-type']);
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
					msg("Tika mime type found transfer to tika queue "+link.details.url,'info');
					bot.fetchFile(link);
					req.emit('error','TikaMimeTypeFound');
				}

			}
			

			var len = parseInt(res.headers['content-length'], 10);
			if(!check.assigned(len) || !check.number(len)){
				len=0;
			}
			if(len>config.getConfig("http","max_content_length")){
					req.emit('error',"ContentOverflow");
					
			}
			res.on("data",function res_on_data(chunk){
				done_len+=chunk.length;
				var c=chunk.toString();
				//console.log(c,"c");
			 	html.push(c);
			 	var t=new Date().getTime();
			 	if((t-init_time)>config.getConfig("http","callback_timeout")){
					req.emit('error',"ETIMEDOUT_CALLBACK");
			 	}
			 	if(done_len>config.getConfig("http","max_content_length")){
					req.emit('error',"ContentOverflow");
				}
			});
			res.on("error",function res_on_error(err){
				//#debug#(err )
				//console.log(err,err.type)
				req.emit("error",err);
				
			});
			res.on("end",function res_on_end(){
				
				html = html.join("");
				//console.log(html);
				if(html.length === 0 ){
					//zero content recieved
					//raise error bec otherwise it will create a md5 to which all the other empty urls will become canonical to
					try{
						link.setStatusCode(res.statusCode+"_EMPTY_RESPONSE");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							
						}
					}catch(err){
					//	msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							bot.active_sockets-=1;
						}
					}
					
					return bot.isLinksFetched();
				}
				var t=new Date().getTime();
				var response_time = t-init_time;
				if(!check.assigned(html)){
					//some error with the request return silently
					msg("Max sockets reached read docs/maxSockets.txt","error");
					try{
						link.setStatusCode(-1);
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							
						}
					}catch(err){
					//	msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							bot.active_sockets-=1;
						}
					}
					
					return bot.isLinksFetched();
				}
				try{
					var md5sum = crypto.createHash('md5');
					md5sum.update(html);
					var hash=md5sum.digest('hex');
					link.setContentMd5(hash);
				}catch(err_md){

				}
				
				var parser=require(__dirname+"/parsers/"+bot.links[link.details.domain]["parseFile"]);
				parser.init.parse(html,link.details.url,function(dic){

				//pluggable parser
				var inlinksGrabbed = 1;
				var parser_msgs = dic[4];
				var default_opt = false;
				var special_opt = false;

				//check for author tag
				if(check.assigned(dic[1]._source["author"])){
					try{
						var d = {};
						d[dic[1]._source["author"]] = link.details.url;
						process.send({"bot":"spawn","insertAuthor":d });
					}finally{

					}
				}

				//DEFAULTS
				link.setStatusCode(res.statusCode);
				link.setParsed(dic[1]);
				link.setResponseTime(response_time);
				link.setContent(dic[3]);
				if(check.assigned(parser_msgs) && !check.emptyObject(parser_msgs)){
					//link.setStatusCode("META_BOT"); //bec going to concat status
					for (var parser_msg_key in parser_msgs){

						var parser_msg = parser_msgs[parser_msg_key];
						//console.log("############## PARSER MSG ############",parser_msg_key,parser_msg);
						switch(parser_msg_key){
							case "noindex":
								special_opt = true;
								try{
									link.setStatusCode(link.getStatusCode()+"_NOINDEX");
									link.setParsed({});
									link.setContent({});
									//no index but follow links from this page
									++inlinksGrabbed;
								}catch(error){

								}
							break;
							case "nofollow":
								special_opt = true;
								try{
									link.setStatusCode(link.getStatusCode()+"_NOFOLLOW");
									inlinksGrabbed = -1000;
									//do not grab links from this page
								}catch(error){
									
								}
							break;
							case "canonical":
								special_opt = true;
								//console.log("############## HERE canonical################");
								try{
									var clink = URL.url(parser_msg);
									if(clink.details.url !== link.details.url){
										//if canonical url and this url is not same
										link.setCanonicalUrl(parser_msg);
									}
									++inlinksGrabbed;
									
									//do not grab links from this page
								}catch(error){
								}
							break;
							case "alternate":
								special_opt = true;
									for(var ind in parser_msg){
										link.addAlternateUrl(parser_msg[ind]);
									}
									
									++inlinksGrabbed;
									//do not grab links from this page
								
							break;
							case "content-type-reject":
								special_opt = true;
									
									link.setStatusCode("ContentTypeRejected");
									link.setParsed({});
									link.setContent({});
									//do not grab links from this page
									inlinksGrabbed = -1000;
								
							break;
							case "content-lang-reject":
									special_opt = true;
									
									link.setStatusCode("ContentLangRejected");
									link.setParsed({});
									link.setContent({});
									//do not grab links from this page
									inlinksGrabbed = -1000;
							break;
							case "none":
								special_opt = true;
								try{
									link.setStatusCode(link.getStatusCode()+"_NOFOLLOW_NOINDEX");
									link.setParsed({});
									link.setContent({});
									inlinksGrabbed = -1000;
								}catch(error){
									
								}
							break;
							default:
								default_opt = true;


						};
					}
				}

				if((check.assigned(parser_msgs) && !check.emptyObject(parser_msgs)) && special_opt){
					//means one of the above cases met just send the response to setCrawled
					if(inlinksGrabbed>0){
						bot.grabInlinks(dic[0],link.details.url,link.details.domain,dic[2]);				
					}

					try{
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							
							
						}
					}catch(err){
							//msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							bot.active_sockets-=1;
						}	
					}
					return bot.isLinksFetched();
				}else{
					//no msg recieved or no cases matched
					//go for default send
					//if((!check.assigned(parser_msgs) || check.emptyObject(parser_msgs)) || default_opt){	
								//dic[0] is cheerio object
								//dic[1] is dic to be inserted
								//dic[2] inlinks suggested by custom parser
									bot.grabInlinks(dic[0],link.details.url,link.details.domain,dic[2]);
									
								var code=res.statusCode;
								//console.log(code,"code")
								try{
									//console.log("Coming here ",link.details.url);
									link.setStatusCode(code);
									link.setParsed(dic[1]);
									link.setResponseTime(response_time);
									link.setContent(dic[3]);
									if(!sent){
											process.send({"bot":"spawn","setCrawled":link.details});
											
											
									}
								}catch(err){
								//msg("Child killed","error")
								}finally{
									if(!sent){
										sent = true;
										bot.active_sockets-=1;
									}
									
								}


								return bot.isLinksFetched();
						//}	
				}

				});
			});
		});
		req.on("error",function req_on_error(err){
			//#debug#(err)
			//console.log("req  ",err,err.type)
			var message = err;
			if(message === "ETIMEDOUT_CALLBACK"){
					msg("Connection timedout change http.callback_timeout setting in config","error");
					try{
						link.setStatusCode("ETIMEDOUT_CALLBACK");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
						}
					}catch(err){
						//msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							console.log(bot.active_sockets,"before");
							bot.active_sockets-=1;
							console.log(bot.active_sockets,"after");
						}
					}
					
					return bot.isLinksFetched();
			}
			else if(message === "ContentOverflow"){
				msg("content-length is more than specified","error");
					try{
						link.setStatusCode("ContentOverflow");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							
						}
					}catch(err){
						//msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							bot.active_sockets-=1;
						}
					}
					
					 return bot.isLinksFetched();

			}else if(message === "MimeTypeRejected"){
				msg("mime type rejected for "+link.details.url,"error");
					try{
						link.setStatusCode("MimeTypeRejected");
						link.setParsed({});
						link.setResponseTime(0);
						link.setContent({});
						if(!sent){
							process.send({"bot":"spawn","setCrawled":link.details});
							
						}
					}catch(err){
						//msg("Child killed","error")
					}finally{
						if(!sent){
							sent = true;
							bot.active_sockets-=1;
						}
					}
					
					 return bot.isLinksFetched();

			}else if(message === "'TikaMimeTypeFound'"){
				//we already called fetch file just pass 
			}
			else{
					try{
						var code;
						if(err.code === 'ETIMEDOUT'){
							msg(err,"error");
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
						
						}
					}catch(errr){

					}finally{
						if(!sent){
							sent = true;
							console.log(bot.active_sockets,"before");
							bot.active_sockets-=1;
							console.log(bot.active_sockets,"after");
						}
					}
					return bot.isLinksFetched();
			}

			
		});

					
	},
	"fetchFile":function fetchFile(link){
		//files will be downloaded by seperate process
		//console.log("files    "+link.details.url)
		var p=bot.links[link.details.domain]["parseFile"];
		code="inTikaQueue";
		try{
			link.setStatusCode(code);
			link.setParsed({});
			link.setResponseTime(0);
			link.setContent({});
			process.send({"bot":"spawn","setCrawled":link.details});
			var dict = {fileName: link.details.url, parseFile: p, status:0, link_details: link.details};
			process.send({"bot":"spawn","insertTikaQueue":dict});
		}catch(err){
			console.log(err);
		}finally{
			bot.active_sockets-=1;
		}
		
		return bot.isLinksFetched();
					

	}


};


bot.getTask(function getTask(links){
	bot.queueLinks(links);
	setInterval(function(){
		console.log(GLOBAL_QUEUE.length, "in the queue");
		var len = GLOBAL_QUEUE.length;
		for(var i = 0; i<len; i++){
			bot.processLink(GLOBAL_QUEUE.pop());
		};
		
		console.log(bot.batchId," bot id     ",bot.queued,"   bot   ",bot.batch.length,"  active_sockets ",bot.active_sockets);
	},5000);

});


function msg(){log.put(arguments[0],arguments[1],__filename.split('/').pop(), arguments.callee.caller.name.toString());}
