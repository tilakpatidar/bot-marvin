var log=require(__dirname+"/lib/logger.js");
var d = new Date();
var n = d.getTime();
function init(pool){
  var http = require("http");
  var server = http.createServer(function(request, response) {
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

  });

  server.listen(2020);
  log.put("Server is listening","success");
}

exports.init=init;
