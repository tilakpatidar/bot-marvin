var check=require("check-types")
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(parent_dir+"/lib/config-reloader.js");
var app={
	"getScore":function(hashes,domain_priorities){
		for(var key in hashes){
			var obj=hashes[key];
			var links=obj["links"];
			var numOfLinks=links.length;
			if(!check.assigned(links)){
				hashes[key]["score"]=parseInt(0);
				continue;
			}
			var len=links.length;
			var added=0;
			for (var i = 0; i < links.length; i++) {
				var link=links[i]['url'];
				//console.log(links[i]);
				var splits=link.replace('http://','').replace("https://","").split("/");
				if(check.emptyString(splits[splits.length-1])){
					splits.pop();
				}
				var new_mul=11-domain_priorities[links[i]['domain']]["priority"];
				if(!check.assigned(new_mul) || !check.number(new_mul)){
					new_mul=10;//lowest priority 1
				}


				
				added+=(splits.length*new_mul);

			};
			var nLinks=config.getConfig("batch_size")/len;
			hashes[key]["score"]=parseInt((added/len)*nLinks);
			if(!check.number(hashes[key]["score"])){
				hashes[key]["score"]=0;
			}
		}
		return hashes;
	}
}
exports.init=app;
