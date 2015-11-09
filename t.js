var tika = require('tika');

var options = {

    // Hint the content-type. This is optional but would help Tika choose a parser in some cases.
    contentType: 'application/pdf'
};

tika.text('https://training.github.com/kit/downloads/github-git-cheat-sheet.pdf', options, function(err, text) {
    console.log(text);
});