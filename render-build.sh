#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Running Puppeteer build script..."

# Store Puppeteer cache in the project directory instead of the global HOME folder
export PUPPETEER_CACHE_DIR="$PWD/.cache/puppeteer"

# Clean up older caches if any to prevent corrupted binaries
rm -rf .cache/puppeteer

# Use standard npm install to get dependencies
npm install

# Force Puppeteer to download the browser explicitly to our local cache
npx puppeteer browsers install chrome

echo "Build script completed successfully."
