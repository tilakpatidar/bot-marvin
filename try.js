var request=require("request");
request("http://localhost:9000/?q=http://www.google.com",function(err,response,html){
					console.log(html);
					
					
				});