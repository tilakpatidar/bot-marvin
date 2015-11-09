var robots = require('robots')
  , parser = new robots.RobotsParser();
 
parser.setUrl('http://www.htmlgoodies.com/robots.txt', function(parser, success) {
  if(success) {
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access) {
    console.log(parser);
      if (access) {
        // parse url 
      }
    });
  }
});