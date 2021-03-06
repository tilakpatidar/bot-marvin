var cheerio = require('cheerio');
var parent_dir=process.getAbsolutePath(__dirname);
var check = require('check-types');
var _ = require("underscore");
var URL =require("url");



var NutchParser = function(config_obj){
	var config = config_obj;
	var that = this;
	
	function fetchMultipleAttr(selector, attribute){

		var list = [];
		selector.each(function (index, element) {
		  list.push($(element).attr(attribute));
		});

		return _.flatten(list);

	};

	this.parse = function(data,url,fn){
		var indexed = {};

		function afterParse(indexed){
		 var dic={};
		 dic["_source"]={};
		 dic._source["id"]=indexed["id"];
		 dic._source["meta_keywords"]=indexed["meta_keywords"];
		 dic._source["host"]=indexed["host"];
		 dic._source["meta_description"]=indexed["description"];
		 dic._source["body"]=indexed["body"];
		 dic._source["content_length"]=data.length;
         dic._source["html"]=indexed["html"];
         dic._source["title"]=indexed["title"];
         dic._source["file_info"]=indexed["file_info"];
         dic._source["detectors"] = indexed["detectors"];

         if(isWebPage){
         	dic._source["twitter"] = indexed["twitter"];
         	dic._source["author"] = indexed["author"];
         	dic._source["open_graph"] = indexed["open_graph"];
         	dic._source["rss_feeds"] = indexed["rss_feeds"];
         	
         }

         dic._source["tstamp"] = new Date().toISOString(); //indexed tstamp

		 return fn([indexed["dom"],dic,[], indexed["html"], indexed["msg"]]);//cheerio object ,dic to insert ,inlinks to give
		 //for documents indexed["dom"] is null
		 //last element is for special bot meta content
		 //then raw html content
		}

		var isWebPage = false;
		//console.log(data);
		if(data===undefined){
			data="";
		}
		
		if(config.getConfig("tika")){
			if(url.match(config.getConfig("tika_supported_files"))!==null){
				//console.log('web0');
				isWebPage = false;
				indexed=that.parseDocument(data,url,afterParse);
			}
			else{
				//console.log('web1');
				isWebPage = true;
				indexed=that.parseWebPage(data,url,afterParse);
			}
		}
		else{
			//console.log('web2');
			isWebPage = true;
			indexed=that.parseWebPage(data,url,afterParse);
		}

	};

	this.parseDocument = function(data,url,fn){
		//data is a {} with keys text,meta
		data["text"]=data["text"].replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		var ret={};
			
		ret["title"]=url.split("/").pop();
		ret["body"]=data["text"];
		ret["output"]=that.getID(url);
		ret["id"]=ret["output"][0];
		ret["host"]=ret["output"][1];
		ret["meta_keywords"]=data["meta"]["title"];
		ret["description"]=data["text"].substring(0,400);
		if(ret["description"]===undefined || ret["description"]===""){
			ret["description"]="";
		}
		ret["dom"]=null;
		ret["file_info"]=data["meta"];
		ret["html"]=null;
		fn(ret);
	};

	this.parseWebPage = function(data,url,fn){
		var domain = url.split("/").slice(0,3).join("/");
		//data is text
		    data = data.replace(/(<.*?>)/gi,"$1 "); //replace html elemets with html element and space to avoid joined words on .text()
			data=data.replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		 $ = cheerio.load(data, {lowerCaseTags: true, lowerCaseAttributeNames : true });
		 //clear dom
		 for (var i = 0; i < config.getConfig("remove_tags").length; i++) {
		 	$(config.getConfig("remove_tags")[i]).remove();
		 };
		 var ret={};
		 ret["title"]=$('title').text();
		 ret["body"]=$('body').text();
		 ret["body"]=ret["body"].replace(/(\n+)|(\t+)|(\s+)|(\r+)/g,' ');
		 var tmp = ret["body"].replace(/\s+/g," ");
		 
		 data["body"] = tmp;
	 
	
	 
		 ret["output"]=that.getID(url);
		 ret["id"]=ret["output"][0];
		 ret["host"]=ret["output"][1];
		 ret["meta_keywords"]=$('meta[name="keywords" i]').attr('content');
		 ret["description"]=$('meta[name="description" i]').attr('content');

		 //get page author

		 ret["author"] = $('link[rel="author" i]').attr('href');

		 if( !check.assigned(ret["author"])){
		 	ret["author"] = $('a[rel="author" i]').attr('href');
		 }
		 if(!check.assigned(ret["author"])){
		 	ret["author"] = $('a[rel="me" i]').attr('href');
		 }
		 if(!check.assigned(ret["author"])){
		 	ret["author"] = $('link[rel="publisher" i]').attr('href');
		 }

		 if(!check.assigned(ret["author"])){
		 	delete ret["author"];
		 }

		 //facebook open graph data

		 ret['open_graph'] = {};

		 ret['open_graph']['title'] = fetchMultipleAttr($('meta[property="og:title" i]'),'content');
		 ret['open_graph']['type'] = fetchMultipleAttr($('meta[property="og:type" i]'),'content');
		 ret['open_graph']['image'] = fetchMultipleAttr($('meta[property="og:image" i]'),'content');
		 ret['open_graph']['url'] = fetchMultipleAttr($('meta[property="og:url" i]'),'content');
		 ret['open_graph']['description'] = fetchMultipleAttr($('meta[property="og:description" i]'),'content');

		 _.each(ret['open_graph'], function(e, key){
		 	if(!check.assigned(ret['open_graph'][key])){
		 		delete ret['open_graph'][key];
		 	}
		 });


		 //twitter card

		 ret['twitter'] = {};

		 ret['twitter']['title'] = fetchMultipleAttr($('meta[name="twitter:title" i]'),'content');
		 ret['twitter']['card'] =fetchMultipleAttr($('meta[name="twitter:card" i]'),'content');
		 ret['twitter']['image'] = fetchMultipleAttr($('meta[name="twitter:image" i]'),'content');
		 ret['twitter']['image_alt'] = fetchMultipleAttr($('meta[name="twitter:image:alt" i]'),'content');
		 ret['twitter']['description'] = fetchMultipleAttr($('meta[name="twitter:description" i]'),'content');
		 ret['twitter']['domain'] = fetchMultipleAttr($('meta[name="twitter:domain" i]'),'content');
		 ret['twitter']['creator_id'] = fetchMultipleAttr($('meta[name="twitter:creator:id" i]'),'content');
		 ret['twitter']['creator_username'] = fetchMultipleAttr($('meta[name="twitter:creator" i]'),'content');
		 ret['twitter']['site_username'] = fetchMultipleAttr($('meta[name="twitter:site" i]'),'content');
		 ret['twitter']['site_id'] = fetchMultipleAttr($('meta[name="twitter:site:id" i]'),'content');


		 //gather rss feeds from pages

		 ret['rss_feeds'] = fetchMultipleAttr($('link[rel="alternate" i][type="application/rss+xml" i]'),'href');
		 ret['rss_feeds'] = ret['rss_feeds'].concat(fetchMultipleAttr($('link[rel="alternate" i][type="application/atom+xml" i]'),'href'));



		 _.each(ret['twitter'], function(element, key){
		 	if(!check.assigned(ret['twitter'][key])){
		 		delete ret['twitter'][key];
		 	}
		 });


		 var feeds = [];
		 

		 _.each(ret['rss_feeds'], function(element, index){
		 	if(!check.assigned(ret['rss_feeds'][index])){
		 		delete ret['rss_feeds'][index];
		 	}else{
		 		//now make relative feed urls absolute
		 		if(ret['rss_feeds'][index].indexOf("http://") === 0 || ret['rss_feeds'][index].indexOf("https://") === 0){
		 			feeds.push(ret['rss_feeds'][index]);
		 		}else{

		 			feeds.push(URL.resolve(domain, ret['rss_feeds'][index]));
		 		}
		 	}
		 });

		 ret["rss_feeds"] = feeds;

		 ret['msg'] = {};
		 //meta bot msg


		 //check content-type
		 var content_tag = $('meta[http-equiv="content-type" i]');
		 if(check.assigned(content_tag) && content_tag.length!==0){
		 	var content_tag_content = content_tag.attr("content");
		 	if(check.assigned(content_tag_content)){
		 		content_tag_content = content_tag_content.toLowerCase();
		 		var accepted_types = config.getConfig("http","accepted_mime_types");
		 		var accepted = false;

		 		_.each(accepted_types, function(e, index){
		 			var a_t = accepted_types[index];
		 			if(content_tag_content.indexOf(a_t)>=0){
		 				accepted = true;
		 				return {};

			 		}
		 		});

		 		if(!accepted){
		 			ret['msg']['content-type-reject'] = content_tag_content;
		 		}
		 		
		 	}
		 }


		 //check lang type
		 var html_tag = $('html');
		 if(check.assigned(html_tag) && html_tag.length!==0){
		 	var language = html_tag.attr("lang");
		 	if(check.assigned(language)){
		 		var re = new RegExp(config.getConfig("http","html_lang_regex"), "gi");
		 		if(!check.assigned(language.match(re))){
		 			ret["msg"]["content-lang-reject"] = language;
		 		}
		 	}
		 }


		 var bot_meta = $('meta[name="robots" i]');
		 if(!check.assigned(bot_meta) || bot_meta.length === 0){
		 	bot_meta = $('meta[name="googlebot" i]');
		 }
		 if(check.assigned(bot_meta) && bot_meta.length !== 0){
		 	var val = bot_meta.attr("content").replace(/\s/gi,"").split(",");
		 	ret['msg'][val] = true;
		 }

		 var canonical = $('link[rel="canonical" i]');
		 if(check.assigned(canonical) && canonical.length !== 0){
		 	var key = "canonical";
		 	var val = canonical.attr('href');
		 	if(check.assigned(val)){
		 		ret['msg'][key] = val;
		 	}
		 	
		 }

		 var alternate = $('link[rel="alternate" i]');
		 if(check.assigned(alternate) && alternate.length!== 0){
		 	var mul = fetchMultipleAttr(alternate, "href");
		 	if(check.assigned(mul)){
		 		ret["msg"]["alternate"] = mul;
		 	}
		 }

		 if(ret["description"]===undefined || ret["description"]===""){
		 	ret["description"]="";
		 }
		 ret["dom"]=$;
		 ret["html"]=data;
		 fn(ret);
	};

	this.getID = function(url){
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




module.exports = NutchParser;

