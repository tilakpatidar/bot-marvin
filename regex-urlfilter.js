var config=require("./config/config").load();
var dic={
	"accept":/http(|s):\/\/archive\.org\/details\/.+|http(|s):\/\/archive\.org\/details\/texts\?&sort=-downloads&page=.+/gi,
	"reject":[/^(file|ftp|mailto|javascript|whatsapp|tel):/g,/\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|doc|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf)$/gi],
	"setExternalLinksRegex":function(links){
		
		if(!config["external_links"]){
			//build regex for it
			var re;
			var res=[];
			for (var key in links) {
				res.push("^"+key.replace(/\//g,"\\/").replace(/\./g,"\\."));
				res.push("^"+key.replace("http://","https://").replace(/\//g,"\\/").replace(/\./g,"\\."));
			
			};
			res=res.join("|");
			re=res;
			this.getExternalLinksRegex=re;
		}
		
		

	}

};
function load(){
	return dic;
}
exports.load=load;