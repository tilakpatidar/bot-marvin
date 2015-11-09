var robots = require('robots')
  , parser = new robots.RobotsParser();
  console.log(robots);
parser.setUrl('https://www.wikihow.com/robots.txt', function(parse, success) {
  if(success) {
  	
    parser.canFetch('*', '/doc/dailyjs-nodepad/', function (access) {
      if (access) {
        console.log("yes");
        console.log(parser.defaultEntry);
      }
    });
  }
});