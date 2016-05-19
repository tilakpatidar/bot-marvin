ps aux | grep  nodejs | awk '{print $2}' | xargs kill -9
