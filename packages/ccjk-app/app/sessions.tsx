import { useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  RefreshControl,
} from 'react-native';
import { useRouter } from 'expo-router';
import { useSessionsStore } from '../src/store/sessions';
import { useAuthStore } from '../src/store/auth';

export default function Sessions() {
  const router = useRouter();
  const { sessions, isLoading, fetchSessions } = useSessionsStore();
  const { user, logout } = useAuthStore();

  useEffect(() => {
    fetchSessions();
  }, []);

  const handleSessionPress = (sessionId: string) => {
    router.push(`/session/${sessionId}`);
  };

  const handleLogout = () => {
    logout();
    router.replace('/');
  };

  const renderSession = ({ item }: { item: any }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => handleSessionPress(item.id)}
    >
      <View style={styles.sessionHeader}>
        <Text style={styles.sessionTag}>{item.tag}</Text>
        {item.active && <View style={styles.activeBadge} />}
      </View>
      <Text style={styles.sessionMachine}>
        {item.machine.hostname} ({item.machine.platform})
      </Text>
      <Text style={styles.sessionTime}>
        Last activity: {new Date(item.lastActivityAt).toLocaleString()}
      </Text>
    </TouchableOpacity>
  );

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <View>
          <Text style={styles.title}>Sessions</Text>
          {user && <Text style={styles.subtitle}>{user.name}</Text>}
        </View>
        <TouchableOpacity onPress={handleLogout}>
          <Text style={styles.logoutButton}>Logout</Text>
        </TouchableOpacity>
      </View>

      {isLoading && sessions.length === 0 ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator size="large" color="#007AFF" />
        </View>
      ) : sessions.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyText}>No active sessions</Text>
          <Text style={styles.emptySubtext}>
            Start coding on your desktop to see sessions here
          </Text>
        </View>
      ) : (
        <FlatList
          data={sessions}
          renderItem={renderSession}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContainer}
          refreshControl={
            <RefreshControl
              refreshing={isLoading}
              onRefresh={fetchSessions}
            />
          }
        />
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  title: {
    fontSize: 28,
    fontWeight: 'bold',
  },
  subtitle: {
    fontSize: 14,
    color: '#666',
    marginTop: 4,
  },
  logoutButton: {
    color: '#007AFF',
    fontSize: 16,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 40,
  },
  emptyText: {
    fontSize: 20,
    fontWeight: '600',
    color: '#666',
    marginBottom: 10,
  },
  emptySubtext: {
    fontSize: 16,
    color: '#999',
    textAlign: 'center',
  },
  listContainer: {
    padding: 16,
  },
  sessionCard: {
    backgroundColor: '#fff',
    borderRadius: 12,
    padding: 16,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  sessionHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  sessionTag: {
    fontSize: 18,
    fontWeight: '600',
  },
  activeBadge: {
    width: 10,
    height: 10,
    borderRadius: 5,
    backgroundColor: '#4CAF50',
  },
  sessionMachine: {
    fontSize: 14,
    color: '#666',
    marginBottom: 4,
  },
  sessionTime: {
    fontSize: 12,
    color: '#999',
  },
});
