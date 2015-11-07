var request = require("request");
var urllib = require('url');
var regex_urlfilter=require("./config/regex-urlfilter.js").load();
var config=require("./config/config").load();
var queued=0;
var active_sockets=0;
function req(url,domain){
	if(active_sockets>config["max_concurrent_sockets"]){
		//pooling to avoid socket hanging
		(function(url,domain){
				setTimeout(function(){ req(url,domain); }, 100); //to avoid recursion
		})(url,domain);
	}
	var req_url=url;
		if(links[domain]["phantomjs"]){
			req_url="http://192.168.101.5:9000/?q="+req_url;
		}
			(function(url,domain,req_url){
				if(botObjs!==null){
					var bot=botObjs[domain];
					bot.allow(req_url.replace("#social#",""),function(){



					});
					
				}

				var u=urllib.parse(req_url.replace("#social#",""));
				active_sockets+=1;
				request({uri:u,pool:{maxSockets: Infinity}},function(err,res,html){
					active_sockets-=1;
					if(html===undefined){
						console.log("[ERROR] Max sockets reached read docs/maxSockets.txt");
					}
					var parser=require("./parsers/"+links[domain]["parseFile"]);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					if(req_url.indexOf("#social#")<0){
						//only grab inlinks if not social page or brand page of twitter etc
						grabInlinks(dic[0],url,domain,dic[2]);
						
					}
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
				//console.log(a);
				//console.log("[INFO] "+href+" rejected by filters");
				return true;
				
			}
			var href=$(this).attr("href");
			if(href!==undefined){
				//console.log("[INFO] domain "+domain);
				//console.log("[INFO] url "+href);
				var abs=urllib.resolve(domain,href);
				//console.log("[INFO] abs "+abs);
				if(abs.match(regex_urlfilter.accept)===null){ //user give acceptance
							return reject("");

				}
				//console.log(re1);
				if(abs.match(re)===null){ //for external links option

					if(config["social_media_sites_allow"]){ //for external links option
						var k=abs.match(re1);
						if(k===null){
							return reject("");
						}
						else{
							domain=k[0].replace("https://","http://");//change domain as social site
							abs=abs+"#social#";//marking as social
							//console.log("[INFO] Social media accepted");
						}

					}
					else{
						return reject("");
					}
							

				}
				for (var i = 0; i < regex_urlfilter.reject.length; i++) {
					if(abs.match(regex_urlfilter.reject[i])!==null){
							return reject("");

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
var re1;//for external social link check
var botObjs;
process.on('message',function(data){
	//recieving instructions from parent
	var k=data["init"];
	if(k){
		batch=k[0];
		batchSize=k[1];
		links=k[2];
		re=new RegExp(k[3],'gi');
		re1=new RegExp(k[4],'gi');
		botObjs=k[5];
		crawl(batch);

	}

});
