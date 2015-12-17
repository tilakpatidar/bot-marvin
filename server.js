var log=require(__dirname+"/lib/logger.js");
var d = new Date();
var n = d.getTime();
var url=require('url');
function init(pool){
  var static = require('node-static');
 
  var fileServer = new static.Server('./server');
 
var server = require('http').createServer(function (request, response) {
    var urlparts=url.parse(request.url.toString(),true);

  if (urlparts.path.indexOf("/ask")>=0) {
      switch(urlparts.query[""]){
        case "main-stats":
                 pool.stats.crawlStats(function(dic){
                    response.write(JSON.stringify(dic));
                    response.end();
                });
          break;
        case "active-bots":
                pool.stats.activeBots(function(dic){
                  response.write(JSON.stringify(dic));
                  response.end(); 
                });
                break;
        case "read-log":
            var type=urlparts["query"]["type"];
            var n=urlparts['query']['n'];
            pool.stats.readLog(type,n,function(data){
              response.write(data);
              response.end();
            });
            break;
        case "cluster-info":
            pool.stats.clusterInfo(function(err,results){
                response.write(JSON.stringify(results));
                response.end();
            });
            break;
      };

       


  }
  else{
    //important method do not remove
    request.addListener('end', function () {
          fileServer.serve(request, response);
      }).resume();
   }
});

  server.listen(2020);
  server.on("listening",function(){
    log.put("Server is listening","success");
  });
  server.on("error",function(e){
  if(e.code==="EADDRINUSE"){
    log.put("Web app occupied maybe an instance is already running ","error");
  }

});
  
}

exports.init=init;
