var Download = require('download');
console.log("Downloading tika server jar please wait !");
new Download({mode: '755'})
    .get('http://apache.spinellicreations.com/tika/tika-server-1.11.jar')
    .dest('./').run();