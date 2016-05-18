ps aux | grep  bot | awk '{print $2}' | xargs kill -9
