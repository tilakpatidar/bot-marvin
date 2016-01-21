var cheerio = require('cheerio');
var check=require("check-types")
var parent_dir=process.getAbsolutePath(__dirname);
var config=require(parent_dir+"/lib/config-reloader.js");
var app={
	"parse":function(data,url){
		var indexed={};
		//console.log(data);
		if(!check.assigned(data)){
			data="";
		}
		
		if(config.getConfig("tika")){
			if(check.assigned(url.match(config.getConfig("tika_supported_files")))){
				//console.log('web0');
				indexed=app.parseDocument(data,url);
			}
			else{
				//console.log('web1');
				indexed=app.parseWebPage(data,url);
			}
		}
		else{
			//console.log('web2');
			indexed=app.parseWebPage(data,url);
		}

		
		 var dic={};
		 dic["_source"]={};
		 dic._source["id"]=indexed["id"];
		 dic._source["meta_keywords"]=indexed["meta_keywords"];
		 dic._source["host"]=indexed["host"];
		 dic._source["meta_description"]=indexed["description"];
		 dic._source["boost"]="0.0";
		 dic._source["cache"]="content";
		 dic._source["anchor"]="";
		 dic._source["digest"]="";
		 dic._source["body"]=indexed["body"];
		 dic._source["content_length"]=data.length;
		 var date=new Date();
		 var date_rep=date.getUTCFullYear()+"-"+date.getUTCMonth()+"-"+date.getUTCDate()+"T"+date.getUTCHours()+":"+date.getUTCMinutes()+":"+date.getUTCSeconds();
		 dic._source["lastModified"]=date_rep;
         dic._source["tstamp"]=date_rep;
         dic._source["date"]=date_rep;
         dic._source["html"]=indexed["html"];
         dic._source["mime"]=indexed["mime"];
         dic._source["title"]=indexed["title"];
         dic._source["file_info"]=indexed["file_info"];



		 return [indexed["dom"],dic,[]];//cheerio object ,dic to insert ,inlinks to give
		 //for documents indexed["dom"] is null
	},
	"parseDocument":function(data,url){
		//data is a {} with keys text,meta
		data["text"]=data["text"].replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		data["text"]=data["text"].replace(/\s+/g," ");
		var ret={};
		 ret["title"]=url.split("/").pop();
		 ret["body"]=data["text"];
		 ret["output"]=this.getID(url);
		 ret["id"]=ret["output"][0];
		 ret["host"]=ret["output"][1];
		 ret["meta_keywords"]=data["meta"]["title"];
		 ret["description"]=data["text"].substring(0,400);
		 if(!check.assigned(ret["description"]) || check.emptyString(ret["description"])){
		 	ret["description"]="";
		 }
		 ret["dom"]=null;
		 ret["file_info"]=data["meta"];
		 ret["mime"]=data["meta"]["Content-Type"];
		 ret["html"]="";

		 ###REPLACE_DOC###

		 return ret;
	},
	"parseWebPage":function(data,url){
		//data is text
			data=data.replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
			data=data.replace(/\s+/g," ");
		 $ = cheerio.load(data);
		 //clear dom
		 for (var i = 0; i < config.getConfig("remove_tags").length; i++) {
		 	$(config.getConfig("remove_tags")[i]).remove();
		 };
		 var ret={};
		 ret["title"]=$('title').text();
		 ret["body"]=$('body').text();
		 ret["body"]=ret["body"].replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		 ret["body"]=ret["body"].replace(/\s+/g," ");
		 ret["output"]=this.getID(url);
		 ret["id"]=ret["output"][0];
		 ret["host"]=ret["output"][1];
		 ret["meta_keywords"]=$('meta[name="keywords"]').data('content');
		 ret["description"]=$('meta[name="description"]').data('content');
		 if(!check.assigned(ret["description"]) || check.emptyString(ret["description"])){
		 	ret["description"]="";
		 }
		 ret["dom"]=$;
		 ret["mime"]="text/html";
		 ret["html"]=data;
		 
		 ###REPLACE_HTML###
		 return ret;
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

