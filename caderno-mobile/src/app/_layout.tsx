import React from 'react';
import { StatusBar } from 'react-native';
import { SafeAreaProvider } from 'react-native-safe-area-context';
import { AppProvider } from '../store/AppContext';
import { Stack } from 'expo-router';
import { CryptoWebView } from '../services/CryptoWebView';
import '../global.css';

export default function RootLayout() {
  return (
    <SafeAreaProvider>
      <AppProvider>
        <StatusBar barStyle="light-content" backgroundColor="#0f0e17" />
        <CryptoWebView />
        <Stack screenOptions={{ headerShown: false, animation: 'slide_from_right' }}>
          <Stack.Screen name="index" />
        </Stack>
      </AppProvider>
    </SafeAreaProvider>
  );
}
