#!/bin/bash

echo "📊 Monitoring npm publish status..."
echo ""

while true; do
  clear
  echo "🕐 $(date '+%H:%M:%S')"
  echo ""

  # Check npm version
  echo "📦 npm registry version:"
  NPM_VERSION=$(npm view ccjk version 2>&1)
  if [[ $NPM_VERSION == "12.1.0" ]]; then
    echo "  ✅ v12.1.0 (PUBLISHED!)"
    echo ""
    echo "🎉 Publication successful!"
    echo ""
    echo "Next steps:"
    echo "1. Verify: npx ccjk@latest --version"
    echo "2. Create GitHub Release: https://github.com/miounet11/ccjk/releases/new?tag=v12.1.0"
    break
  else
    echo "  ⏳ $NPM_VERSION (waiting...)"
  fi

  echo ""
  echo "🔄 npm publish process:"
  if ps aux | grep -q '[n]pm publish'; then
    echo "  ⏳ Running"
  else
    echo "  ❌ Not running (may have completed or failed)"
  fi

  echo ""
  echo "🧪 Test process:"
  if ps aux | grep -q '[v]itest'; then
    echo "  ⏳ Running tests"
  else
    echo "  ✅ Tests completed"
  fi

  echo ""
  echo "Press Ctrl+C to stop monitoring"
  sleep 10
done
