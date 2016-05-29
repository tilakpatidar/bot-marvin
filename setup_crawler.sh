sudo nodejs index.js --reset --force
sudo nodejs lib/db_config.js --force
sudo nodejs index.js --load-config ./config.json --force
sudo nodejs index.js --loadSeedFile seed.json --force
