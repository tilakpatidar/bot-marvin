var request=require("request");
var urllib = require('url');
var regex_urlfilter=require("./config/regex-urlfilter.js").load();
var config=require("./config/config").load();
if(!config["external_links"]){
	//build regex for it

}
var done=0;
function req(url,domain){
	var req_url=url;
		if(links[domain]["phantomjs"]){
			req_url="http://192.168.101.5:9000/?q="+req_url;
		}
			(function(url,domain,req_url){
				
				request(req_url,function(err,response,html){
					var parser=require("./parsers/"+links[domain]["parseFile"]);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					grabInlinks(dic[0],url,domain);
					process.send({"setCrawled":[url,dic[1]]});
					
				});



			})(url,domain,req_url);
					


}
function crawl(pools){
	done=0;
	queued=0;
	for (var i = 0; i < batchSize; i++) {
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
			var href=$(this).attr("href");
			if(href!==undefined){
				var abs=urllib.resolve(domain,url);
				var temp;
				if(regex_urlfilter.accept.test(abs)){
							temp=false;

				}
				else{
					temp=true;
				}
				for (var i = 0; i < regex_urlfilter.reject.length; i++) {
					if(regex_urlfilter.reject[i].test(abs)){
							temp=true;//reject
							continue;

					}
					else{
						temp=false;
						
					}
					
				};
				if(temp){
					console.log("[INFO] "+href+" rejected by filters");
					return true;
				}
				process.send({"addToPool":[abs,domain]});
			}

		});
		//console.log("[INFO] Got "+a.length+" links from "+url)
	

}
var batch;
var batchSize;
var links;
process.on('message',function(data){
	var k=data["init"];
	if(k){
		batch=k[0];
		batchSize=k[1];
		links=k[2];
		crawl(batch);		
	}
});
