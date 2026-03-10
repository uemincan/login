#!/usr/bin/env bash
# exit on error
set -o errexit

echo "Running Puppeteer build script..."

# Ensure we're cleaning up any previous cache attempts
rm -rf .cache/puppeteer

# Use standard npm install to get dependencies
npm install

echo "Build script completed successfully."
