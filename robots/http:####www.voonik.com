{"entries":[],"sitemaps":[],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fcheckouts","allowance":false},{"path":"%2Forders","allowance":false},{"path":"%2Fcountries","allowance":false},{"path":"%2Fline_items","allowance":false},{"path":"%2Fpassword_resets","allowance":false},{"path":"%2Fstates","allowance":false},{"path":"%2Fuser_sessions","allowance":false},{"path":"%2Fusers","allowance":false},{"path":"%2Fyou-may-like*","allowance":false},{"path":"%2Fshopping_cart%2F*","allowance":false},{"path":"%2Fproducts%2F*","allowance":false},{"path":"%2Fstore%2F*","allowance":false},{"path":"%2Ftopics%2Fnew%2F*","allowance":false},{"path":"%2Fdummy","allowance":false},{"path":"%2F*term%3D*","allowance":false},{"path":"%2F*page%3D*","allowance":false},{"path":"%2Fonline-store%2F*%3Fpage%3D1%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D2%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D3%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D4%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D5%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D6%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D7%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D8%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D9%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D10%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D11%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D12%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D13%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D14%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D15%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D16%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D17%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D18%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D19%24","allowance":true},{"path":"%2Fonline-store%2F*%3Fpage%3D20%24","allowance":true}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.voonik.com/robots.txt","chunks":["# See http://www.robotstxt.org/wc/norobots.html for documentation on how to use the robots.txt file\n#\n# To ban all spiders from the entire site uncomment the next two lines:\n# User-Agent: *\n# Disallow: /\nUser-agent: *\nDisallow: /checkouts\nDisallow: /orders\nDisallow: /countries\nDisallow: /line_items\nDisallow: /password_resets\nDisallow: /states\nDisallow: /user_sessions\nDisallow: /users\nDisallow: /you-may-like*\nDisallow: /shopping_cart/*\nDisallow: /products/*\nDisallow: /store/*\nDisallow: /topics/new/*\nDisallow: /dummy\n#Allow pagination only on brand/category\nDisallow: /*term=*\nDisallow: /*page=*\nAllow:\t/online-store/*?page=1$\nAllow:\t/online-store/*?page=2$\nAllow:\t/online-store/*?page=3$\nAllow:\t/online-store/*?page=4$\nAllow:\t/online-store/*?page=5$\nAllow:\t/online-store/*?page=6$\nAllow:\t/online-store/*?page=7$\nAllow:\t/online-store/*?page=8$\nAllow:\t/online-store/*?page=9$\nAllow:\t/online-store/*?page=10$\nAllow:\t/online-store/*?page=11$\nAllow:\t/online-store/*?page=12$\nAllow:\t/online-store/*?page=13$\nAllow:\t/online-store/*?page=14$\nAllow:\t/online-store/*?page=15$\nAllow:\t/online-store/*?page=16$\nAllow:\t/online-store/*?page=17$\nAllow:\t/online-store/*?page=18$\nAllow:\t/online-store/*?page=19$\nAllow:\t/online-store/*?page=20$\n\nAllow:\t/latest/*?page=1$\nAllow:\t/latest/*?page=2$\nAllow:\t/latest/*?page=3$\nAllow:\t/latest/*?page=4$\nAllow:\t/latest/*?page=5$\nAllow:\t/latest/*?page=6$\nAllow:\t/latest/*?page=7$\nAllow:\t/latest/*?page=8$\nAllow:\t/latest/*?page=9$\nAllow:\t/latest/*?page=10$\nAllow:\t/latest/*?page=11$\nAllow:\t/latest/*?page=12$\nAllow:\t/latest/*?page=13$\nAllow:\t/latest/*?page=14$\nAllow:\t/latest/*?page=15$\nAllow:\t/latest/*?page=16$\nAllow:\t/latest/*?page=17$\nAllow:\t/latest/*?page=18$\nAllow:\t/latest/*?page=19$\nAllow:\t/latest/*?page=20$\n",null]}