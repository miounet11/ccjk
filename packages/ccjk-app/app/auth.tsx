import { useRouter } from 'expo-router';
import * as WebBrowser from 'expo-web-browser';
import { useState } from 'react';
import { ActivityIndicator, Alert, Button, StyleSheet, Text, View } from 'react-native';
import { apiClient } from '../src/api/client';
import { CONFIG } from '../src/config';
import { useAuthStore } from '../src/store/auth';

WebBrowser.maybeCompleteAuthSession();

function generateEphemeralPublicKey(): string {
  return `mobile-${Date.now()}-${Math.random().toString(36).slice(2, 12)}`;
}

export default function Auth() {
  const router = useRouter();
  const { login } = useAuthStore();
  const [isLoading, setIsLoading] = useState(false);

  const handleGitHubLogin = async () => {
    try {
      setIsLoading(true);

      // Open GitHub OAuth in browser
      const redirectUri = 'ccjk://auth';
      const authUrl = `https://github.com/login/oauth/authorize?client_id=${CONFIG.github.clientId}&redirect_uri=${redirectUri}&scope=user:email`;

      const result = await WebBrowser.openAuthSessionAsync(authUrl, redirectUri);

      if (result.type === 'success' && result.url) {
        // Extract code from URL
        const url = new URL(result.url);
        const code = url.searchParams.get('code');

        if (!code) {
          throw new Error('No code received');
        }

        const publicKey = generateEphemeralPublicKey();

        // Exchange code for token
        const { token, user } = await apiClient.authenticateWithGitHub(code, publicKey);

        // Save auth state
        login(token, user);

        // Navigate to sessions
        router.replace('/sessions');
      } else if (result.type === 'cancel') {
        Alert.alert('Cancelled', 'Authentication was cancelled');
      }
    } catch (error) {
      console.error('GitHub login error:', error);
      Alert.alert('Error', 'Failed to authenticate with GitHub');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Sign In</Text>
      <Text style={styles.subtitle}>Connect with GitHub to continue</Text>

      {isLoading ? (
        <ActivityIndicator size="large" color="#007AFF" />
      ) : (
        <View style={styles.buttonContainer}>
          <Button
            title="Sign in with GitHub"
            onPress={handleGitHubLogin}
          />
        </View>
      )}

      <Button
        title="Back"
        onPress={() => router.back()}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
    marginBottom: 10,
  },
  subtitle: {
    fontSize: 16,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  buttonContainer: {
    marginBottom: 20,
    width: '80%',
  },
});
