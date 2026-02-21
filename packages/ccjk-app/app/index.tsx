import { useEffect } from 'react';
import { View, Text, StyleSheet, ActivityIndicator, Button } from 'react-native';
import { useRouter } from 'expo-router';
import { useAuthStore } from '../src/store/auth';

export default function Index() {
  const router = useRouter();
  const { isAuthenticated, isLoading, verifyToken } = useAuthStore();

  useEffect(() => {
    // Verify token on mount
    verifyToken().then((valid) => {
      if (valid) {
        router.replace('/sessions');
      }
    });
  }, []);

  if (isLoading) {
    return (
      <View style={styles.container}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading...</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.title}>CCJK Remote</Text>
      <Text style={styles.subtitle}>Monitor your AI coding sessions from anywhere</Text>

      {!isAuthenticated && (
        <View style={styles.buttonContainer}>
          <Button
            title="Sign in with GitHub"
            onPress={() => router.push('/auth')}
          />
        </View>
      )}
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
    fontSize: 32,
    fontWeight: 'bold',
    marginBottom: 10,
    textAlign: 'center',
  },
  subtitle: {
    fontSize: 18,
    color: '#666',
    marginBottom: 40,
    textAlign: 'center',
  },
  loadingText: {
    marginTop: 10,
    color: '#666',
  },
  buttonContainer: {
    marginTop: 20,
    width: '80%',
  },
});
