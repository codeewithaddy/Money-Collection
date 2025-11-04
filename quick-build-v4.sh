#!/bin/bash
# Quick build script for Version 4.0.0

echo "⚠️  Before running this, make sure you updated:"
echo "   1. src/config/updateConfig.js → CURRENT_VERSION: '4.0.0'"
echo "   2. android/app/build.gradle → versionCode 400, versionName '4.0.0'"
echo ""
read -p "Press Enter to continue or Ctrl+C to cancel..."

echo ""
echo "🏗️  Building Version 4.0.0..."
echo ""

cd android
./gradlew clean
./gradlew assembleRelease

echo ""
echo "✅ Build complete!"
echo ""
echo "📦 APK Location:"
echo "   android/app/build/outputs/apk/release/app-release.apk"
echo ""
echo "📋 Next steps:"
echo "   1. Copy APK to Desktop and rename: MoneyCollection-v4.0.0.apk"
echo "   2. Go to: https://github.com/codeewithaddy/Money-Collection/releases/new"
echo "   3. Tag: v4.0.0"
echo "   4. Upload APK"
echo "   5. Publish release"
echo "   6. Open app with v3.0.0 → See update popup! 🎉"
echo ""
