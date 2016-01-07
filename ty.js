var sitemap = require('sitemapper'); console.log(process.argv[2]); 
sitemap.getSites(process.argv[2], function(err, sites,freq,lastmod,priority) {
	if(!err) {
		console.log(sites);
console.log(freq);
	}
	else {
		console.log(err);
	}
});
function e(){}
setInterval(e,5000);
