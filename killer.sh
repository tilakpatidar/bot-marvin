ps aux | grep  nodejs | awk '{print $2}' | xargs kill -9
ps aux | grep  tika\.js | awk '{print $2}' | xargs kill -9
ps aux | grep  spawn\.js | awk '{print $2}' | xargs kill -9
ps aux | grep  tika-server | awk '{print $2}' | xargs kill -9
