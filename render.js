var webPage = require('webpage');

var webserver = require('webserver');
var server = webserver.create();
var service = server.listen(9000, function(request, response) {
	var url=request.url.replace('/?q=','');
	(function(url,request,response){
		var page = webPage.create();
page.settings.userAgent = 'Mozilla/5.0 (Windows NT 6.1; WOW64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/37.0.2062.120 Safari/537.36';
page.settings.loadImages=false;
page.settings.resourceTimeout=10000;
page.settings.localToRemoteUrlAccess=true;
page.onResourceRequested = function(requestData, request) {
    if ((/(http:\/\/|\/).+?\.(css|png|gif|jpg|jpeg|ico)$/gi).test(requestData['url'])) {
        console.log('Skipping', requestData['url']);
        request.abort();
    }   
};
		page.open(url, function (status) {  
			var js=page.evaluate(function () {
				return document;
	            
	        });
	        console.log("[INFO] Rendered "+url);
		        response.write(js.all[0].outerHTML);
				response.close();

			
		});


	})(url,request,response);
		



});