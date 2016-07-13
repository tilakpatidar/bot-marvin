#!/bin/sh
jsdoc -p -c ./config/doc_conf.json --verbose --destination ./docs/
rm -rf ../docs
mv ./docs/ ../
git checkout gh-pages
cp -rp ../docs/* ./
git add -A
git commit -m "docs updated"
git push origin gh-pages
git checkout master