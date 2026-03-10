#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Running Puppeteer build script..."

# Ensure we're cleaning up any previous cache attempts
rm -rf .cache/puppeteer

# Use standard npm install to get dependencies
npm install

# Force the @puppeteer/browsers library to install Chrome in the local project cache
npx @puppeteer/browsers install chrome@stable --path .cache/puppeteer

echo "Build script completed successfully."
