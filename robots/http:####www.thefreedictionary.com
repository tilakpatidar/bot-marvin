{"entries":[{"userAgents":["Mediapartners-Google"],"rules":[{"path":"","allowance":true}]},{"userAgents":["AhrefsBot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Bender"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["MJ12bot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["MSIECrawler"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["NPBot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["msrbot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Open*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Twiceler"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Scooter*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["WebSearch*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["ZyBorg*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Wget*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["TurnitinBot*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["SlySearch*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Seekbot*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["NetResearchServer*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Seekbot*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["mozDex*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Link*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["larbin*"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["ia_archiver"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["Charlotte"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["discobot"],"rules":[{"path":"%2F","allowance":false}]},{"userAgents":["008"],"rules":[{"path":"%2F","allowance":false}]}],"sitemaps":["http://www.thefreedictionary.com/www.thefreedictionary.com.xml.gz"],"defaultEntry":{"userAgents":["*"],"rules":[{"path":"%2Fp%2F","allowance":false},{"path":"%2Fd%2F","allowance":false},{"path":"%2F_%2Fmisc%2F","allowance":false},{"path":"%2F_%2Fsearch%2F","allowance":false},{"path":"%2F_%2Fcite.htm","allowance":false},{"path":"%2F_%2Fgr.aspx","allowance":false},{"path":"%2F_%2Fhp%2FControls%2Fprinter-friendly.aspx","allowance":false}]},"disallowAll":false,"statusCode":200,"allowAll":false,"options":{"headers":{"userAgent":"Mozilla/5.0 (X11; Linux i686; rv:5.0) Gecko/20100101 Firefox/5.0"}},"url":"http://www.thefreedictionary.com/robots.txt","chunks":["\r\nUser-agent: Mediapartners-Google\r\nDisallow:\r\n\r\nUser-Agent: AhrefsBot\r\nDisallow: /\r\n\r\nUser-Agent: Bender\r\nDisallow:/ \r\n\r\nUser-agent: MJ12bot\r\nDisallow: /\r\n\r\nUser-Agent: MSIECrawler\r\nDisallow:/ \r\n\r\nUser-agent: NPBot\r\nDisallow: /\r\n\r\nUser-agent: msrbot\r\nDisallow: /\r\n\r\nUser-Agent: Open*\r\nDisallow: /\r\n\r\nUser-Agent: Twiceler\r\nDisallow: /\r\n\r\nUser-Agent: Scooter*\r\nDisallow: /\r\n\r\nUser-Agent: WebSearch*\r\nDisallow: /\r\n\r\nUser-Agent: ZyBorg*\r\nDisallow: /\r\n\r\nUser-Agent: Wget*\r\nDisallow: /\r\n\r\nUser-Agent: TurnitinBot*\r\nDisallow: /\r\n\r\nUser-Agent: SlySearch*\r\nDisallow: /\r\n\r\nUser-Agent: Seekbot*\r\nDisallow: /\r\n\r\nUser-Agent: NetResearchServer*\r\nDisallow: /\r\n\r\nUser-Agent: Seekbot*\r\nDisallow: /\r\n\r\nUser-Agent: mozDex*\r\nDisallow: /\r\n\r\nUser-Agent: Link*\r\nDisallow: /\r\n\r\nUser-Agent: larbin*\r\nDisallow: /\r\n\r\nUser-Agent: ia_archiver\r\nDisallow: /\r\n\r\nUser-Agent: Charlotte\r\nDisallow: / \r\n\r\nUser-agent: discobot\r\nDisallow: /\r\n\r\nUser-agent: 008\r\nDisallow: /\r\n\r\nUser-agent: *\r\nDisallow: /p/\r\nDisallow: /d/\r\nDisallow: /_/misc/\r\nDisallow: /_/search/\r\nDisallow: /_/cite.htm\r\nDisallow: /_/gr.aspx\r\nDisallow: /_/hp/Controls/printer-friendly.aspx\r\nSitemap: http://www.thefreedictionary.com/www.thefreedictionary.com.xml.gz",null]}