var port=process.argv[2];
var cache={}
var phantom = require('phantom');
phantom.create('--load-images=no', '--local-to-remote-url-access=yes',function (webPage) {
 var service = require('http').createServer(function (request, response) {
	
	var url=request.url.replace('/?q=','');
	(function(url,request,response){
		webPage.createPage(function(page){
		//console.log(page)
		page.onResourceRequested = function(requestData, request) {
		    if ((/(http:\/\/|\/).+?\.(css|png|gif|jpg|jpeg|ico)$/gi).test(requestData['url'])) {
		        console.log('Skipping', requestData['url']);
		        request.abort();
		    }   
		};
				page.open(url, function (status) {  
					var js=page.evaluate((function () {

						return document;
			            
			        }), function(result) {
			        	var d=[];
			        	d.push(url);
			        	d.push(result.all[0].outerHTML)
						console.log("[INFO] Rendered "+url);
				        process.emit("done_render",d);
					


					});
			        

					
				});
				

		});
	})(url,request,response);
	cache[url]=response;	



});
  service.listen(port);
 });
  process.on("done_render",function(d){
  	
  	if(cache[d[0]]){
  		//console.log("dine")
  		var response=cache[d[0]];
	  	response.write(d[1]);
		response.emit('close');
		delete cache[d[0]];
  	}
  	
  });