import { useEffect, useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionsStore } from '../../src/store/sessions';
import { socketClient } from '../../src/api/socket';
import { decryptJson } from '@ccjk/wire';

export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const { currentSession, messages, fetchSession, fetchMessages } = useSessionsStore();
  const [isLoading, setIsLoading] = useState(true);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);

  useEffect(() => {
    if (id) {
      loadSession();
    }

    return () => {
      // Leave session room on unmount
      if (id) {
        socketClient.leaveSession(id);
      }
    };
  }, [id]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      await fetchSession(id!);
      await fetchMessages(id!);
    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const handleApproval = (requestId: string, approved: boolean) => {
    socketClient.sendApproval(requestId, approved);
    setPendingApprovals(prev => prev.filter(a => a.requestId !== requestId));
  };

  const renderMessage = ({ item }: { item: any }) => {
    // TODO: Decrypt message content
    return (
      <View style={styles.messageCard}>
        <Text style={styles.messageTime}>
          {new Date(item.createdAt).toLocaleTimeString()}
        </Text>
        <Text style={styles.messageContent}>Message #{item.seq}</Text>
      </View>
    );
  };

  const renderApproval = ({ item }: { item: any }) => (
    <View style={styles.approvalCard}>
      <Text style={styles.approvalTitle}>Permission Request</Text>
      <Text style={styles.approvalTool}>{item.tool}</Text>
      <Text style={styles.approvalPattern}>{item.pattern}</Text>
      <View style={styles.approvalButtons}>
        <TouchableOpacity
          style={[styles.approvalButton, styles.approveButton]}
          onPress={() => handleApproval(item.requestId, true)}
        >
          <Text style={styles.approvalButtonText}>Approve</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.approvalButton, styles.denyButton]}
          onPress={() => handleApproval(item.requestId, false)}
        >
          <Text style={styles.approvalButtonText}>Deny</Text>
        </TouchableOpacity>
      </View>
    </View>
  );

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{currentSession?.tag}</Text>
          {currentSession?.active && (
            <View style={styles.activeBadge}>
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
      </View>

      {pendingApprovals.length > 0 && (
        <FlatList
          data={pendingApprovals}
          renderItem={renderApproval}
          keyExtractor={(item) => item.requestId}
          style={styles.approvalsList}
        />
      )}

      <FlatList
        data={messages}
        renderItem={renderMessage}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.messagesList}
        inverted
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#f5f5f5',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
  },
  header: {
    padding: 20,
    paddingTop: 60,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: '#e0e0e0',
  },
  backButton: {
    color: '#007AFF',
    fontSize: 16,
    marginBottom: 10,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  title: {
    fontSize: 24,
    fontWeight: 'bold',
  },
  activeBadge: {
    backgroundColor: '#4CAF50',
    paddingHorizontal: 12,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeBadgeText: {
    color: '#fff',
    fontSize: 12,
    fontWeight: '600',
  },
  approvalsList: {
    maxHeight: 200,
  },
  approvalCard: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginHorizontal: 16,
    marginTop: 16,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: '#FFC107',
  },
  approvalTitle: {
    fontSize: 16,
    fontWeight: '600',
    marginBottom: 8,
  },
  approvalTool: {
    fontSize: 14,
    fontWeight: '500',
    marginBottom: 4,
  },
  approvalPattern: {
    fontSize: 12,
    color: '#666',
    marginBottom: 12,
  },
  approvalButtons: {
    flexDirection: 'row',
    gap: 12,
  },
  approvalButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  denyButton: {
    backgroundColor: '#F44336',
  },
  approvalButtonText: {
    color: '#fff',
    fontWeight: '600',
  },
  messagesList: {
    padding: 16,
  },
  messageCard: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
  },
  messageTime: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  messageContent: {
    fontSize: 14,
  },
});
