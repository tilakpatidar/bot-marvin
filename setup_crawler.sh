#!/bin/sh
echo "sudo nodejs index.js --reset --force" &&
#sudo nodejs index.js --reset --force &&
echo "sudo nodejs lib/db_config.js --force" &&
sudo nodejs lib/db_config.js --force &&
echo "sudo nodejs index.js --config --force " &&
sudo nodejs index.js --config --force &&
echo "sudo nodejs index.js --loadSeedFile seed.json --force" &&
sudo nodejs index.js --loadSeedFile seed.json --force 
