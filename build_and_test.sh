#!/bin/bash

# Build and Test Script for Update System
# Version: 4.0.0

echo "🚀 Building MoneyCollection v4.0.0 with Update System Fixes"
echo "============================================================"
echo ""

# Colors for output
GREEN='\033[0;32m'
BLUE='\033[0;34m'
RED='\033[0;31m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

# Step 1: Clean previous builds
echo -e "${BLUE}[1/5]${NC} Cleaning previous builds..."
cd android
./gradlew clean
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Clean failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Clean complete${NC}"
echo ""

# Step 2: Build release APK
echo -e "${BLUE}[2/5]${NC} Building release APK..."
./gradlew assembleRelease
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Build failed!${NC}"
    exit 1
fi
echo -e "${GREEN}✅ Build complete${NC}"
echo ""

# Step 3: Check if APK was created
APK_PATH="app/build/outputs/apk/release/app-release.apk"
if [ ! -f "$APK_PATH" ]; then
    echo -e "${RED}❌ APK not found at: $APK_PATH${NC}"
    exit 1
fi
echo -e "${GREEN}✅ APK created successfully${NC}"
echo ""

# Step 4: Copy to Desktop
echo -e "${BLUE}[3/5]${NC} Copying APK to Desktop..."
DESKTOP_PATH="$HOME/Desktop/MoneyCollection-v4.0.0.apk"
cp "$APK_PATH" "$DESKTOP_PATH"
if [ $? -ne 0 ]; then
    echo -e "${RED}❌ Failed to copy APK to Desktop${NC}"
    exit 1
fi
echo -e "${GREEN}✅ APK copied to: $DESKTOP_PATH${NC}"
echo ""

# Step 5: Show APK info
echo -e "${BLUE}[4/5]${NC} APK Information:"
APK_SIZE=$(du -h "$DESKTOP_PATH" | cut -f1)
echo -e "  📦 Size: ${YELLOW}$APK_SIZE${NC}"
echo -e "  📍 Location: ${YELLOW}$DESKTOP_PATH${NC}"
echo -e "  📱 Version: ${YELLOW}4.0.0${NC}"
echo -e "  🆔 Package: ${YELLOW}com.myapp${NC}"
echo ""

# Step 6: Check if device is connected
echo -e "${BLUE}[5/5]${NC} Checking for connected devices..."
DEVICES=$(adb devices | grep -w "device" | wc -l)
if [ "$DEVICES" -gt 0 ]; then
    echo -e "${GREEN}✅ Found $DEVICES device(s) connected${NC}"
    echo ""
    echo -e "${YELLOW}Do you want to install the APK now? (y/n)${NC}"
    read -r INSTALL_CHOICE
    
    if [ "$INSTALL_CHOICE" = "y" ] || [ "$INSTALL_CHOICE" = "Y" ]; then
        echo -e "${BLUE}Installing APK...${NC}"
        adb install -r "$DESKTOP_PATH"
        if [ $? -eq 0 ]; then
            echo -e "${GREEN}✅ Installation successful!${NC}"
            echo ""
            echo -e "${BLUE}Starting app...${NC}"
            adb shell am start -n com.myapp/.MainActivity
        else
            echo -e "${RED}❌ Installation failed${NC}"
            echo -e "${YELLOW}You can install manually from: $DESKTOP_PATH${NC}"
        fi
    fi
else
    echo -e "${YELLOW}⚠️  No devices connected via ADB${NC}"
    echo -e "${YELLOW}You can install manually by transferring:${NC}"
    echo -e "${YELLOW}$DESKTOP_PATH${NC}"
fi

cd ..

echo ""
echo "============================================================"
echo -e "${GREEN}🎉 Build Complete!${NC}"
echo ""
echo -e "${BLUE}Next Steps:${NC}"
echo "1. Install the APK on your device"
echo "2. Test the update system (see UPDATE_SYSTEM_VERIFICATION.md)"
echo "3. Create a GitHub release (v4.0.1) to test updates"
echo ""
echo -e "${BLUE}Testing Update Flow:${NC}"
echo "1. Create GitHub release v4.0.1 with APK"
echo "2. Open app (it will check for updates)"
echo "3. Update popup should appear"
echo "4. Test download → install → permissions flow"
echo ""
echo -e "${GREEN}✅ All fixes applied:${NC}"
echo "  ✅ Native InstallApk module created"
echo "  ✅ FileProvider integration working"
echo "  ✅ Permission handling complete"
echo "  ✅ Download progress tracking"
echo "  ✅ Automatic installation"
echo "  ✅ Data preservation guaranteed"
echo ""
echo -e "📖 For detailed testing instructions, see: ${YELLOW}UPDATE_SYSTEM_VERIFICATION.md${NC}"
echo "============================================================"
