#!/usr/bin/env bash
# exit on error
set -o errexit

# Puppeteer on Render needs these dependencies installed before starting
# If Render is using Native Environment (not Docker), we can use the following command 
# or use @puppeteer/browsers. Actually Render natively supports this if we install right dependencies

echo "Running Puppeteer build script..."

# Clean up older caches if any
rm -rf ~/.cache/puppeteer

# Use standard npm install to get puppeteer
npm install

# Force Puppeteer to download the browser explicitly
npx puppeteer browsers install chrome

echo "Build script completed successfully."
