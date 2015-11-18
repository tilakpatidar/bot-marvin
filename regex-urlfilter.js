var config=require("./config/config").load();
var dic={
	"accept":/http(|s):\/\/archive\.org\/details\/.+|http(|s):\/\/archive\.org\/details\/texts\?&sort=-downloads&page=.+/gi,
	"reject":[/^(file|ftp|mailto|javascript|javascrpt|skype|whatsapp|tel):/g,/\.(gif|jpg|png|ico|css|sit|eps|wmf|zip|ppt|doc|mpg|xls|gz|rpm|tgz|mov|exe|jpeg|bmp|js|swf|pdf)$/gi]

};
function load(){
	return dic;
}
exports.load=load;