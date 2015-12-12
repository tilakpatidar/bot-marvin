var log=require(__dirname+"/lib/logger.js");
var d = new Date();
var n = d.getTime();
var url=require('url');
function init(pool){
  var http = require("http");
  var server = http.createServer(function(request, response) {
    var urlparts=url.parse(request.url.toString(),true);

    var checkingStatus=urlparts.query.working;
    if(checkingStatus){
      var d={"ack":true};
      response.writeHead(200, {"Content-Type": "text/html"});
      response.write(JSON.stringify(d));
      response.end();
    }
   else{
     pool.crawlStats(function(rem,done,buckets){
          response.writeHead(200, {"Content-Type": "text/html"});
          response.write("<!DOCTYPE \"html\">");
          response.write("<html>");
          response.write("<head>");
          response.write("<title>SRMSE bot</title>");
          response.write("</head>");
          response.write("<body>");
          response.write("<h3>Remaining Documents  "+rem+"</h3><br>");
          response.write("<h3>Crawled Documents  "+done+"</h3><br>");
          response.write("<h3>Batches Remaining  "+buckets+"</h3><br>");
          response.write("<h3>Time Elapsed  "+Math.round((new Date().getTime()-n)/60000)+"min</h3><br>");
          response.write("</body>");
          response.write("</html>");
          response.end();
    });   
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
