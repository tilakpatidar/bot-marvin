var dic={
	"accept":[/./g],
	"reject":[/^(file|ftp|mailto):/g,/\.(gif|GIF|jpg|JPG|png|PNG|ico|ICO|css|CSS|sit|SIT|eps|EPS|wmf|WMF|zip|ZIP|ppt|PPT|mpg|MPG|xls|XLS|gz|GZ|rpm|RPM|tgz|TGZ|mov|MOV|exe|EXE|jpeg|JPEG|bmp|BMP|js|JS|swf|SWF)$/g]

};
function load(){
	return dic;
}
exports.load=load;