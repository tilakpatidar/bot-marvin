var help={
	"--dbtype= ":"DataBase backend to use (mongodb|mysql|elasticsearch)",
	"--parseFile= ":"website name should same as the parser file you copied in parsers folder",
	"--domain= ":"Actual seed link ex: http://www.google.com",
	"--regex= ":"regex used to filter inlinks",
    "--childs= ":"Number of child processes to use",
    "--batchSize= ":"Number of urls crawled by on child process",
    "--help ":"For help."

}
console.log("Following command line arguments are supported:");
for (var key in help) {
	console.log(key+"   "+help[key]);
};
console.log("DataBase connectivity parameters can be set in config.js");
process.exit(0);

    
 
