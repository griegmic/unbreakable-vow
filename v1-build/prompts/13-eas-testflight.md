# Prompt 13: EAS Build + TestFlight Configuration

## Context
Unbreakable Vow app is feature-complete. Time to build for TestFlight distribution to 10-30 beta users.

## Prerequisites (manual — see MANUAL_SETUP.md)
- EAS CLI installed and logged in
- Bundle ID changed from Rork default in `app.json`
- Apple Developer account with App ID registered
- Push notification credentials configured

## What to do

### 1. Update `app.json`

```json
{
  "expo": {
    "name": "Unbreakable Vow",
    "slug": "unbreakable-vow",
    "version": "1.0.0",
    "orientation": "portrait",
    "icon": "./assets/images/icon.png",
    "scheme": "unbreakablevow",
    "userInterfaceStyle": "dark",
    "newArchEnabled": true,
    "splash": {
      "image": "./assets/images/splash-icon.png",
      "resizeMode": "contain",
      "backgroundColor": "#05070B"
    },
    "ios": {
      "supportsTablet": false,
      "bundleIdentifier": "com.yourname.unbreakablevow",
      "infoPlist": {
        "NSFaceIDUsageDescription": "Use Face ID to authenticate"
      }
    },
    "plugins": [
      ["expo-router", { "origin": "https://unbreakablevow.app/" }],
      "expo-font",
      "expo-web-browser",
      "expo-apple-authentication",
      ["@stripe/stripe-react-native", {
        "merchantIdentifier": "merchant.com.yourname.unbreakablevow",
        "enableGooglePay": false
      }],
      ["expo-notifications", {
        "icon": "./assets/images/notification-icon.png",
        "color": "#D4A24F"
      }]
    ],
    "experiments": {
      "typedRoutes": true
    },
    "extra": {
      "eas": {
        "projectId": "your-eas-project-id"
      }
    }
  }
}
```

### 2. Create `eas.json`

```json
{
  "cli": {
    "version": ">= 12.0.0"
  },
  "build": {
    "development": {
      "developmentClient": true,
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "preview": {
      "distribution": "internal",
      "ios": {
        "simulator": false
      }
    },
    "production": {
      "distribution": "store",
      "ios": {
        "autoIncrement": true
      }
    }
  },
  "submit": {
    "production": {
      "ios": {
        "appleId": "your@email.com",
        "ascAppId": "your-app-store-connect-app-id",
        "appleTeamId": "XXXXXXXXXX"
      }
    }
  }
}
```

### 3. Create `.easignore`

```
# Don't upload these to EAS build
.env
.env.local
supabase/
v1-build/
PRODUCTION_READINESS.md
CLAUDE.md
*.md
```

### 4. Environment variables for EAS

Set environment variables for the build:
```bash
eas secret:create --name EXPO_PUBLIC_SUPABASE_URL --value "https://xxxxx.supabase.co" --scope project
eas secret:create --name EXPO_PUBLIC_SUPABASE_ANON_KEY --value "eyJhbG..." --scope project
eas secret:create --name EXPO_PUBLIC_STRIPE_PUBLISHABLE_KEY --value "pk_test_..." --scope project
```

### 5. Build command

```bash
# First build — this will prompt for Apple credentials
cd expo
eas build --platform ios --profile production

# After build completes, submit to TestFlight
eas submit --platform ios --latest
```

### 6. TestFlight distribution

After the build is submitted to App Store Connect:
1. Go to [appstoreconnect.apple.com](https://appstoreconnect.apple.com)
2. Select your app → TestFlight tab
3. The build will appear after processing (~15-30 min)
4. Add internal testers (your Apple Developer team members)
5. For external testers: create a group, add email addresses, submit for Beta App Review
6. Beta App Review is lighter than full App Store review (~24-48h)

## Do NOT modify
- Any app screens or logic
- Backend code
- This prompt is purely build configuration

## Important notes
- The FIRST `eas build` takes longer (~20 min) because it provisions certificates and profiles.
- If you haven't run `eas build` before, it will ask to create an Apple Distribution Certificate and Provisioning Profile. Say yes.
- Bundle ID change from the Rork default is CRITICAL — do this before the first build. You can't change it after.
- Splash screen background color should match the app's dark theme (#05070B).
- The `notification-icon.png` should be a simple monochrome icon (iOS requirement).
