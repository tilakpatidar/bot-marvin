var cheerio = require('cheerio');
var config=require("../config/config").load();
var app={
	"parse":function(data,url){
		if(data===undefined){
			data="";
		}
		data=data.replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		data=data.replace(/\s+/g," ");
		 $ = cheerio.load(data);
		 //clear dom
		 for (var i = 0; i < config["remove_tags"].length; i++) {
		 	$(config["remove_tags"][i]).remove();
		 };
		 var title=$('title').text();
		 var body=$('body').text();
		 var output=this.getID(url);
		 var id=output[0];
		 var host=output[1];
		 var meta_keywords=$('meta[name="keywords"]').data('content');
		 var description=$('meta[name="description"]').data('content');
		 if(description===undefined || description===""){
		 	description="";
		 }
		 var dic={};
		 dic["_source"]={};
		 dic._source["id"]=id;
		 dic._source["meta_keywords"]=meta_keywords;
		 dic._source["host"]=host;
		 dic._source["meta_description"]=description;
		 dic._source["boost"]="0.0";
		 dic._source["cache"]="content";
		 dic._source["anchor"]="";
		 dic._source["digest"]="";
		 dic._source["body"]=body;
		 dic._source["content_length"]=data.length;
		 dic._source["lastModified"]="2015-10-29T10:58:56.86"
         dic._source["tstamp"]="2015-10-29T10:58:56.86";
         dic._source["date"]="2015-10-29T10:58:56.86";
         dic._source["html"]=data;
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
		//console.log(id);
		return [id,tt];//id host
                        
	}
};

exports.init=app;

