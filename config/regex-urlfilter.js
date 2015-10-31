var dic={
	"accept":/.+/gi,
	"reject":[/^(file|ftp|mailto|javascript):/g,/\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf)$/gi]

};
function load(){
	return dic;
}
exports.load=load;