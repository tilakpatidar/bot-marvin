var request=require("request");


var app={
	"index":function(arr,fn){
		request.post("http://localhost:8000/index",{form:JSON.stringify(arr)},function(err,httpResponse,body){

			console.log(body);
			fn();
		});

	},
	"search":function(query,field,fn){
		request.get("http://localhost:8000/search",{q:query,field:field},function(err,httpResponse,body){
			console.log(body);
			fn();
		});
		
	}
}
exports.module=app;
