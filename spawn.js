var request=require("request");
var urllib = require('url');
var regex_urlfilter=require("./config/regex-urlfilter.js").load();
var config=require("./config/config").load();
var done=0;
function req(url,domain){
	var req_url=url;
		if(links[domain]["phantomjs"]){
			req_url="http://192.168.101.5:9000/?q="+req_url;
		}
			(function(url,domain,req_url){
				
				request(req_url.replace("#social#",""),function(err,response,html){
					var parser=require("./parsers/"+links[domain]["parseFile"]);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					if(req_url.indexOf("#social#")<0){
						//only grab inlinks if not social page or brand page of twitter etc
						grabInlinks(dic[0],url,domain);
						
					}
					process.send({"setCrawled":[url,dic[1]]});
					
					
					
				});



			})(url,domain,req_url);
					


}
function crawl(pools){
	done=0;
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

function grabInlinks($,url,domain){
		var a=$("a").each(function(){
			function reject(a){
				console.log(a);
				console.log("[INFO] "+href+" rejected by filters");
				return true;
				
			}
			var href=$(this).attr("href");
			if(href!==undefined){
				//console.log("[INFO] domain "+domain);
				//console.log("[INFO] url "+href);
				var abs=urllib.resolve(domain,href);
				//console.log("[INFO] abs "+abs);
				if(abs.match(regex_urlfilter.accept)===null){ //user give acceptance
							return reject("accept");

				}
				//console.log(re1);
				if(abs.match(re)===null){ //for external links option

					if(config["social_media_sites_allow"]){ //for external links option
						var k=abs.match(re1);
						if(k===null){
							return reject("external social reject");
						}
						else{
							domain=k[0].replace("https://","http://");//change domain as social site
							abs=abs+"#social#";//marking as social
							console.log("[INFO] Social media accepted");
						}

					}
					else{
						return reject("external");
					}
							

				}
				for (var i = 0; i < regex_urlfilter.reject.length; i++) {
					if(abs.match(regex_urlfilter.reject[i])!==null){
							return reject("reject filters");

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
process.on('message',function(data){
	var k=data["init"];
	if(k){
		batch=k[0];
		batchSize=k[1];
		links=k[2];
		buildRegex();
		crawl(batch);

	}
});
function buildRegex(){
	if(!config["external_links"]){
		//build regex for it
		var res=[];
		for (var key in links) {
			res.push("^"+key.replace(/\//g,"\\/").replace(/\./g,"\\."));
			res.push("^"+key.replace("http://","https://").replace(/\//g,"\\/").replace(/\./g,"\\."));
		
		};
		res=res.join("|");
		res=new RegExp(res,'gi');
		re=res;
	}
	else{
		re=/.+/gi;//accept anything
	}
	if(config["social_media_external_links_allow"]){
		//build regex for it
		var res=[];
		for (var i = 0; i < config["social_media_sites_allow"].length; i++) {
			var key=config["social_media_sites_allow"][i];
			res.push("^"+key.replace(/\//g,"\\/").replace(/\./g,"\\."));
			res.push("^"+key.replace("http://","https://").replace(/\//g,"\\/").replace(/\./g,"\\."));
		
		};
		res=res.join("|");
		res=new RegExp(res,'gi');
		re1=res;
	}
}