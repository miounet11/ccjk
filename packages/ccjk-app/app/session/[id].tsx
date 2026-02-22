import { useEffect, useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  ActivityIndicator,
  TouchableOpacity,
  Alert,
  RefreshControl,
} from 'react-native';
import { useRouter, useLocalSearchParams } from 'expo-router';
import { useSessionsStore } from '../../src/store/sessions';
import { socketClient } from '../../src/api/socket';
import { decryptMessage, getSessionKey } from '../../src/utils/encryption';
import {
  TextMessage,
  ToolCallMessage,
  PermissionCard,
  StatusMessage,
} from '../../src/components/messages';
import { RemoteControl } from '../../src/components/RemoteControl';

export default function SessionDetail() {
  const router = useRouter();
  const { id } = useLocalSearchParams<{ id: string }>();
  const {
    currentSession,
    messages,
    sessionKey,
    toolCalls,
    fetchSession,
    fetchMessages,
    addMessage,
    setSessionKey,
    updateToolCall,
  } = useSessionsStore();

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [pendingApprovals, setPendingApprovals] = useState<any[]>([]);
  const [decryptedEvents, setDecryptedEvents] = useState<any[]>([]);

  // Load session and setup listeners
  useEffect(() => {
    if (id) {
      loadSession();
      setupSocketListeners();
    }

    return () => {
      if (id) {
        socketClient.emit('session:unsubscribe', { sessionId: id });
      }
    };
  }, [id]);

  // Decrypt messages when they change or session key is available
  useEffect(() => {
    if (sessionKey && messages.length > 0) {
      decryptMessages();
    }
  }, [messages, sessionKey]);

  const loadSession = async () => {
    try {
      setIsLoading(true);
      await fetchSession(id!);
      await fetchMessages(id!);

      // Get session key
      const key = await getSessionKey(id!);
      if (key) {
        setSessionKey(key);
      }
    } catch (error) {
      console.error('Failed to load session:', error);
      Alert.alert('Error', 'Failed to load session');
    } finally {
      setIsLoading(false);
    }
  };

  const setupSocketListeners = () => {
    // Subscribe to session events
    socketClient.emit('session:subscribe', { sessionId: id });

    // Listen for real-time events
    const handleSessionEvent = (data: any) => {
      if (data.sessionId !== id) return;

      // Decrypt event
      if (sessionKey) {
        const event = decryptMessage(data.envelope, sessionKey);
        if (event) {
          handleDecryptedEvent(event);
        }
      }

      // Add to messages (encrypted)
      addMessage({
        id: `msg-${Date.now()}`,
        sessionId: id!,
        envelope: data.envelope,
        seq: messages.length + 1,
        createdAt: new Date().toISOString(),
      });
    };

    socketClient.on('session:event', handleSessionEvent);

    return () => {
      socketClient.off('session:event', handleSessionEvent);
    };
  };

  const decryptMessages = () => {
    const decrypted: any[] = [];

    for (const message of messages) {
      const event = decryptMessage(message.envelope, sessionKey!);
      if (event) {
        decrypted.push({
          ...event,
          id: message.id,
          timestamp: message.createdAt,
        });
      }
    }

    setDecryptedEvents(decrypted);
  };

  const handleDecryptedEvent = (event: any) => {
    // Handle different event types
    switch (event.t) {
      case 'permission-request':
        setPendingApprovals((prev) => [...prev, event]);
        break;

      case 'tool-call-start':
        updateToolCall(event.callId, {
          ...event,
          status: 'running',
        });
        break;

      case 'tool-call-end':
        updateToolCall(event.callId, {
          result: event.result,
          status: 'completed',
        });
        break;

      default:
        break;
    }
  };

  const handleApproval = (requestId: string, approved: boolean) => {
    socketClient.emit('approval:response', {
      requestId,
      approved,
    });

    setPendingApprovals((prev) => prev.filter((a) => a.requestId !== requestId));

    Alert.alert(
      'Response Sent',
      approved ? 'Permission approved' : 'Permission denied'
    );
  };

  const handleRefresh = useCallback(async () => {
    setIsRefreshing(true);
    await loadSession();
    setIsRefreshing(false);
  }, [id]);

  const renderEvent = ({ item }: { item: any }) => {
    switch (item.t) {
      case 'text':
        return (
          <TextMessage
            text={item.text}
            thinking={item.thinking}
            timestamp={item.timestamp}
          />
        );

      case 'tool-call-start':
      case 'tool-call-end':
        const toolCall = toolCalls.get(item.callId) || item;
        return (
          <ToolCallMessage
            callId={item.callId}
            name={toolCall.name}
            description={toolCall.description}
            args={toolCall.args}
            result={toolCall.result}
            timestamp={item.timestamp}
            status={toolCall.status || 'running'}
          />
        );

      case 'permission-request':
        return (
          <PermissionCard
            requestId={item.requestId}
            tool={item.tool}
            pattern={item.pattern}
            description={item.description}
            timestamp={item.timestamp}
            onApprove={handleApproval}
          />
        );

      case 'status':
        return (
          <StatusMessage
            state={item.state}
            message={item.message}
            timestamp={item.timestamp}
          />
        );

      case 'session-start':
        return (
          <View style={styles.sessionEvent}>
            <Text style={styles.sessionEventText}>🚀 Session started</Text>
          </View>
        );

      case 'session-stop':
        return (
          <View style={styles.sessionEvent}>
            <Text style={styles.sessionEventText}>🛑 Session stopped</Text>
            {item.reason && (
              <Text style={styles.sessionEventReason}>{item.reason}</Text>
            )}
          </View>
        );

      default:
        return (
          <View style={styles.unknownEvent}>
            <Text style={styles.unknownEventText}>Unknown event: {item.t}</Text>
          </View>
        );
    }
  };

  if (isLoading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color="#007AFF" />
        <Text style={styles.loadingText}>Loading session...</Text>
      </View>
    );
  }

  if (!sessionKey) {
    return (
      <View style={styles.errorContainer}>
        <Text style={styles.errorIcon}>🔐</Text>
        <Text style={styles.errorTitle}>Encryption Key Required</Text>
        <Text style={styles.errorMessage}>
          Session key is required to decrypt messages.
        </Text>
        <TouchableOpacity style={styles.retryButton} onPress={loadSession}>
          <Text style={styles.retryButtonText}>Retry</Text>
        </TouchableOpacity>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={() => router.back()}>
          <Text style={styles.backButton}>← Back</Text>
        </TouchableOpacity>
        <View style={styles.headerInfo}>
          <Text style={styles.title}>{currentSession?.tag || 'Session'}</Text>
          {currentSession?.active && (
            <View style={styles.activeBadge}>
              <View style={styles.activeDot} />
              <Text style={styles.activeBadgeText}>Active</Text>
            </View>
          )}
        </View>
        <Text style={styles.subtitle}>
          {currentSession?.machine.hostname} • {currentSession?.machine.platform}
        </Text>
      </View>

      {/* Pending Approvals */}
      {pendingApprovals.length > 0 && (
        <View style={styles.approvalsContainer}>
          <Text style={styles.approvalsTitle}>
            ⚠️ {pendingApprovals.length} Pending Approval{pendingApprovals.length > 1 ? 's' : ''}
          </Text>
          {pendingApprovals.map((approval) => (
            <PermissionCard
              key={approval.requestId}
              requestId={approval.requestId}
              tool={approval.tool}
              pattern={approval.pattern}
              description={approval.description}
              timestamp={approval.timestamp}
              onApprove={handleApproval}
            />
          ))}
        </View>
      )}

      {/* Messages */}
      <FlatList
        data={decryptedEvents}
        renderItem={renderEvent}
        keyExtractor={(item, index) => item.id || `event-${index}`}
        contentContainerStyle={styles.messagesList}
        inverted
        refreshControl={
          <RefreshControl refreshing={isRefreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyContainer}>
            <Text style={styles.emptyIcon}>💬</Text>
            <Text style={styles.emptyText}>No messages yet</Text>
            <Text style={styles.emptySubtext}>
              Start coding and messages will appear here
            </Text>
          </View>
        }
      />

      {/* Remote Control */}
      <RemoteControl sessionId={id!} isActive={currentSession?.active || false} />
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
    backgroundColor: '#f5f5f5',
  },
  loadingText: {
    marginTop: 12,
    fontSize: 14,
    color: '#666',
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: 20,
    backgroundColor: '#f5f5f5',
  },
  errorIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  errorTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: '#333',
    marginBottom: 8,
  },
  errorMessage: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
    marginBottom: 24,
  },
  retryButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 24,
    paddingVertical: 12,
    borderRadius: 8,
  },
  retryButtonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '600',
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
    marginBottom: 12,
  },
  headerInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: 4,
  },
  title: {
    fontSize: 24,
    fontWeight: '700',
    color: '#333',
  },
  subtitle: {
    fontSize: 13,
    color: '#666',
  },
  activeBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#E8F5E9',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
  },
  activeDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: '#4CAF50',
    marginRight: 6,
  },
  activeBadgeText: {
    color: '#2E7D32',
    fontSize: 12,
    fontWeight: '600',
  },
  approvalsContainer: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    borderBottomWidth: 1,
    borderBottomColor: '#FFC107',
  },
  approvalsTitle: {
    fontSize: 14,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 12,
  },
  messagesList: {
    padding: 16,
  },
  emptyContainer: {
    alignItems: 'center',
    paddingVertical: 60,
  },
  emptyIcon: {
    fontSize: 64,
    marginBottom: 16,
  },
  emptyText: {
    fontSize: 18,
    fontWeight: '600',
    color: '#333',
    marginBottom: 8,
  },
  emptySubtext: {
    fontSize: 14,
    color: '#666',
    textAlign: 'center',
  },
  sessionEvent: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    alignItems: 'center',
  },
  sessionEventText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#1976D2',
  },
  sessionEventReason: {
    fontSize: 12,
    color: '#666',
    marginTop: 4,
  },
  unknownEvent: {
    backgroundColor: '#FFF',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: '#E0E0E0',
  },
  unknownEventText: {
    fontSize: 12,
    color: '#999',
  },
});
