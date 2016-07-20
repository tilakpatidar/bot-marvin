#!/bin/sh
echo "sudo nodejs index.js --reset --force" &&
#sudo nodejs index.js --reset --force &&
echo "sudo nodejs lib/db_config.js --force" &&
sudo nodejs lib/db_config.js --force &&
echo "sudo nodejs index.js --load-config ./config.json --force " &&
sudo nodejs index.js --load-config ./config.json --force &&
echo "sudo nodejs index.js --loadSeedFile seedf.json --force" &&
sudo nodejs index.js --loadSeedFile seed.json --force 
