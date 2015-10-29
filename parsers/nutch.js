var cheerio = require('cheerio');
var app={
	"parse":function(data,url){
		 $ = cheerio.load(data);
		 var title=$('title').text();
		 var body=$('body').text();
		 var output=this.getID(url);
		 var id=output[0];
		 var host=output[1];
		 var meta_keywords=$('meta[name="keywords"]').data('content');
		 var description=$('meta[name="description"]').data('content');
		 if(description===undefined || description===""){
		 	description=body.substr(0,400);
		 }
		 var dic={};
		 dic["id"]=id;
		 dic["meta_keywords"]=meta_keywords;
		 dic["host"]=host;
		 dic["meta_description"]=description;
		 dic["boost"]="0.0";
		 dic["cache"]="content";
		 dic["anchor"]="";
		 dic["digest"]="";
		 dic["body"]=body;
		 dic["content_length"]=data.length;
		 dic["lastModified"]="2015-10-29T10:58:56.86"
         dic["tstamp"]="2015-10-29T10:58:56.86";
         dic["date"]="2015-10-29T10:58:56.86";
		 dic["_source"]=JSON.parse(JSON.stringify(dic));
		 return [$,dic];
	},
	"getID":function(url){
		var type;
		var type1;
		if(url.indexOf("https://")===0){
			type="https://";
			type1=":https";
		}
		if(url.indexOf("http://")===0){
			type="http://";
			type1=":http";
		}
		var domain=url.replace(type,"");
		var temp=domain.split('/')[0].split(".");
		var tt=temp.join(".");
		domain=temp.reverse().join(".");
		var path=url.replace(type,"").replace(tt,"");
		var id=domain+type1+path;
		console.log(id);
		return [id,tt];//id host
                        
	}
};

exports.init=app;

