#!/bin/sh
echo "sudo -E nodejs index.js --reset --force" &&
sudo -E nodejs index.js --reset --force &&
echo "sudo -E nodejs lib/db_config.js --force" &&
sudo -E nodejs lib/db_config.js --force &&
echo "sudo -E nodejs index.js --config --force " &&
sudo -E nodejs index.js --config --force &&
echo "sudo -E nodejs index.js --loadSeedFile seed.json --force" &&
sudo -E nodejs index.js --loadSeedFile seed.json --force 
