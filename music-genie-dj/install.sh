#!/bin/bash

echo "Installing Music Genie DJ Plugin"
echo "Installing dependencies"

# Install npm dependencies
cd /data/plugins/music_service/music-genie-dj
npm install --production

echo "Music Genie DJ plugin installed successfully"

# Required to end the plugin install
echo "plugininstallend"
