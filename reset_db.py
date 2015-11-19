from pymongo import Connection
c = Connection("192.168.101.5")
c.drop_database('crawl')
