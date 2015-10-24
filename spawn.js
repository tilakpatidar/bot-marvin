var request=require("request");
var cheerio=require("cheerio");
var done=0;
var queued=0;
function req(url){
			(function(url){
				request(url,function(err,response,html){
					console.log("[INFO] Data fetched  "+url);
					grabInlinks(html,url);
					var dic=parser.init.parse(html);//pluggable parser
					process.send({"setCrawled":[url,dic]});
					done+=1;
					if(queued===done){
						process.exit(0);//batch done exit silently
					}
				});



			})(url);
			queued+=1;
	
}
function crawl(pools){
	done=0;
	queued=0;
	for (var i = 0; i < batchSize; i++) {
		if(pools!==null && pools[i]!==undefined){
			var url=pools[i]["_id"];
			(function(url){
				setTimeout(function(){ req(url); }, 100); //to avoid recursion
			})(url);
			
		}
		else{
			break;
		}

	};
	

}
function grabInlinks(html,url){
	if(html){
		var $=cheerio.load(html);
		var a=$("a").each(function(){
			var href=$(this).attr("href");
			if(href!==undefined){
				if(href[0]==="/"){
					//relative link
					process.send({"addToPool":domain+href});
				}
				else if(href.indexOf(domain)>=0){
					process.send({"addToPool":href});
				}
			}

		});
		console.log("[INFO] Got "+a.length+"links from "+url)
	}

}
var batch=JSON.parse(process.argv[2]);
var batchSize=process.argv[3];
var website=process.argv[4];
var parser=require("./parsers/"+website);
var domain=process.argv[5];
crawl(batch);