import { Redirect, Stack } from 'expo-router';
import React from 'react';
import { View } from 'react-native';

import { palette } from '@/constants/unbreakable';

export default function GuidedCompatibilityRedirect() {
  return (
    <>
      <Stack.Screen options={{ headerShown: false }} />
      <View style={{ flex: 1, backgroundColor: palette.bg }} />
      <Redirect href="/quick-vow" />
    </>
  );
}
