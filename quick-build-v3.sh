#!/bin/bash
# Quick build script for Version 3.0.0

echo "🏗️  Building Version 3.0.0..."
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
echo "   1. Copy APK to Desktop and rename: MoneyCollection-v3.0.0.apk"
echo "   2. Go to: https://github.com/codeewithaddy/Money-Collection/releases/new"
echo "   3. Tag: v3.0.0"
echo "   4. Upload APK"
echo "   5. Publish release"
echo ""
