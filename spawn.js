var request=require("request");
var cheerio=require("cheerio");
var done=0;
var queued=0;
function req(url){
			(function(url){
				request(url,function(err,response,html){
					//console.log("[INFO] Data fetched  "+url);
					var dic=parser.init.parse(html,url);//pluggable parser
					//dic[0] is cheerio object
					//dic[1] is dic to be inserted
					grabInlinks(dic[0],url);
					process.send({"setCrawled":[url,dic[1]]});
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
function grabInlinks($,url){
		var a=$("a").each(function(){
			var href=$(this).attr("href");
			if(href!==undefined){
				if(href[0]==="/" || href.indexOf("http://")<0 || href.indexOf("https://")<0 ){
					//relative link
					if(href[0]==="/"){
						process.send({"addToPool":domain+href});
					}
					else{
						process.send({"addToPool":domain+"/"+href});
					}
					
				}
				else if(href.indexOf(domain)>=0){
					process.send({"addToPool":href});
				}
			}

		});
		console.log("[INFO] Got "+a.length+" links from "+url)
	

}
var batch=JSON.parse(process.argv[2]);
var batchSize=process.argv[3];
var parseFile=process.argv[4];
var parser=require("./parsers/"+parseFile);
var website=process.argv[5];
var domain=website.replace("://","###").split("/")[0].replace("###","://");
console.log(domain);
crawl(batch);