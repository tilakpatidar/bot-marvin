var dic={
	"accept":/http(|s):\/\/archive\.org\/details\/.+|http(|s):\/\/archive\.org\/details\/texts\?&sort=-downloads&page=.+/gi,
	"reject":[/^(file|ftp|mailto|javascript):/g,/\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf)$/gi]

};
function load(){
	return dic;
}
exports.load=load;