#!/bin/bash
# Build Chrome Web Store zip with real API keys injected
# NEVER commit the output zip or the keys to git

set -e

if [ -z "$OPENROUTER_KEY" ] || [ -z "$KLIPY_KEY" ]; then
  echo "Usage: OPENROUTER_KEY=sk-or-xxx KLIPY_KEY=xxx bash build-store.sh"
  exit 1
fi

rm -rf dist-store
mkdir dist-store

# Copy all extension files
cp manifest.json content.js background.js popup.html popup.js styles.css dist-store/
cp icon16.png icon32.png icon48.png icon128.png dist-store/

# Inject real keys
sed -i "s|const SHARED_OPENROUTER_KEY = \"\"|const SHARED_OPENROUTER_KEY = \"$OPENROUTER_KEY\"|" dist-store/background.js
sed -i "s|const KLIPY_FALLBACK_KEY = \"\"|const KLIPY_FALLBACK_KEY = \"$KLIPY_KEY\"|" dist-store/background.js

# Package
cd dist-store
zip -r ../ai-mime-store.zip .
cd ..

echo "Built: ai-mime-store.zip"
echo "Upload at: https://chrome.google.com/webstore/devconsole"
