var request = require("request");
var urllib = require('url');
var regex_urlfilter=require("./regex-urlfilter.js").load();
var config=require("./config/config").load();
var queued=0;
var active_sockets=0;
function req(url,domain){
	if(active_sockets>config["max_concurrent_sockets"]){
		//pooling to avoid socket hanging
		(function(url,domain){
				setTimeout(function(){ req(url,domain); }, 1000); //to avoid recursion
		})(url,domain);
		return;
	}
	var req_url=url;
		if(links[domain]["phantomjs"]){
			req_url="http://192.168.101.5:9000/?q="+req_url;
		}
			(function(url,domain,req_url){
				if(botObjs!==null){
					//if robots is enabled
					//check if access is given to the crawler for requested resource
					var bot=botObjs[domain];
					bot.allow(req_url.replace("#social#",""),function(){

					});
					
				}

				
				active_sockets+=1;
				request({uri:req_url,pool:{maxSockets: Infinity}},function(err,res,html){
					active_sockets-=1;
					if(html===undefined){
						//some error with the request return silently
						console.log("[ERROR] Max sockets reached read docs/maxSockets.txt");
						process.send({"setCrawled":[url,{}]});
						queued+=1;
						if(queued===batch.length){
							process.exit(0);//exit 
						}
						return;
					}
					var parser=require("./parsers/"+links[domain]["parseFile"]);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					//dic[2] inlinks suggested by custom parser
					grabInlinks(dic[0],url,domain,dic[2]);
					process.send({"setCrawled":[url,dic[1]]});
					queued+=1;
					if(queued===batch.length){
						process.exit(0);//exit 
					}
					
					
				});



			})(url,domain,req_url);
			


}
function crawl(pools){
	queued=0;
	for (var i = 0; i < pools.length; i++) {
		if(pools!==null && pools[i]!==undefined){
			var url=pools[i]['_id'];
			var domain=pools[i]['domain'];
			(function(url,domain){
				setTimeout(function(){ req(url,domain); }, 100); //to avoid recursion
			})(url,domain);
			
		}
		else{
			break;
		}

	};
	

}

function grabInlinks($,url,domain,linksFromParsers){
	for (var i = 0; i < linksFromParsers.length; i++) {
		var q=linksFromParsers[i];
		process.send({"addToPool":[q,config["counter_domain"]]});
	};
		var a=$("a").each(function(){
			function reject(a){
				//console.log(a+"rule");
				//console.log("[INFO] domain "+domain);
				//console.log("[INFO] abs "+abs);
				//console.log("[INFO] "+href+" rejected by filters");
				return true;
				
			}
			var href=$(this).attr("href");
			if(href!==undefined){
				
				//console.log("[INFO] url "+href);
				var abs=urllib.resolve(domain,href);
				
				if(abs.match(regex_urlfilter.accept)===null){ //user give acceptance
					if(abs.match(regex_urlfilter.getExternalLinksRegex)===null){
						return reject("1");
					}
				}
				
				for (var i = 0; i < regex_urlfilter.reject.length; i++) {
					if(abs.match(regex_urlfilter.reject[i])!==null){
							return reject("2");

					}
					
				};
				
				process.send({"addToPool":[abs,domain]});
			}

		});
		//console.log("[INFO] Got "+a.length+" links from "+url)
	

}
var batch;
var batchSize;
var links;
var re;//for external link check
var botObjs;
process.on('message',function(data){
	//recieving instructions from parent
	var k=data["init"];
	if(k){
		batch=k[0];
		batchSize=k[1];
		links=k[2];
		botObjs=k[3];
		//prepare regexes
		regex_urlfilter.setExternalLinksRegex(links);
		crawl(batch);

	}

});
