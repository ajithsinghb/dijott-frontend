import React, { useEffect, useCallback } from 'react';
import { Platform, View, Text, TouchableOpacity, StyleSheet } from "react-native";
import { ClerkProvider, SignedIn, SignedOut, useOAuth } from "@clerk/clerk-expo";
import { Stack } from "expo-router";
import * as SecureStore from 'expo-secure-store';
import * as WebBrowser from "expo-web-browser";
import * as Linking from "expo-linking";
import { BriefcaseProvider } from "../context/BriefcaseContext";

// 1. Warm up the browser
WebBrowser.maybeCompleteAuthSession();

// 2. Security Cache
const tokenCache = {
  async getToken(key: string) {
    try { return SecureStore.getItemAsync(key); } catch (err) { return null; }
  },
  async saveToken(key: string, value: string) {
    try { return SecureStore.setItemAsync(key, value); } catch (err) { return; }
  },
};

// 3. YOUR CLERK KEY (Use pk_live_ here if you upgraded to Production!)
const CLERK_PUBLISHABLE_KEY = "pk_test_ZmluZXItbWFsbGFyZC02OC5jbGVyay5hY2NvdW50cy5kZXYk";

// --- THE GOOGLE SIGN-IN COMPONENT ---
function SignInScreen() {
  const { startOAuthFlow } = useOAuth({ strategy: "oauth_google" });

  const onSignInWithGoogle = useCallback(async () => {
    try {
      const { createdSessionId, setActive } = await startOAuthFlow({ redirectUrl: Linking.createURL('/') });
      if (createdSessionId && setActive) setActive({ session: createdSessionId });
    } catch (err) { console.error("OAuth error", err); }
  }, [startOAuthFlow]);

  return (
    <View style={styles.loginContainer}>
      <Text style={styles.loginTitle}>dijott</Text>
      <Text style={styles.loginSubtitle}>Your AI-Powered Field Inspector</Text>
      <TouchableOpacity style={styles.googleButton} onPress={onSignInWithGoogle}>
        <Text style={styles.googleButtonText}>Continue with Google</Text>
      </TouchableOpacity>
    </View>
  );
}

// --- THE ROOT APP WRAPPER ---
export default function RootLayout() {
  
  // --- THE WEB TAB BAR FIX ---
  // This locks the browser window to the screen height so the tabs don't float away!
  useEffect(() => {
    if (Platform.OS === 'web') {
      document.body.style.overflow = 'hidden';
      document.documentElement.style.height = '100%';
      document.body.style.height = '100%';
      const root = document.getElementById('root');
      if (root) {
        root.style.height = '100vh';
        root.style.display = 'flex';
      }
    }
  }, []);

  return (
    <ClerkProvider publishableKey={CLERK_PUBLISHABLE_KEY} tokenCache={tokenCache}>
      <SignedOut>
        <SignInScreen />
      </SignedOut>
      <SignedIn>
        {/* Wrap the Tab Navigation with the Briefcase Provider */}
        <BriefcaseProvider>
          <Stack>
            <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
          </Stack>
        </BriefcaseProvider>
      </SignedIn>
    </ClerkProvider>
  );
}

const styles = StyleSheet.create({
  loginContainer: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 20, backgroundColor: '#F5F7FA' },
  loginTitle: { fontSize: 36, fontWeight: 'bold', color: '#2C3E50', marginBottom: 5 },
  loginSubtitle: { fontSize: 16, color: '#7F8C8D', marginBottom: 40 },
  googleButton: { backgroundColor: '#4285F4', paddingHorizontal: 25, paddingVertical: 15, borderRadius: 10, elevation: 3 },
  googleButtonText: { color: 'white', fontWeight: 'bold', fontSize: 16 },
});