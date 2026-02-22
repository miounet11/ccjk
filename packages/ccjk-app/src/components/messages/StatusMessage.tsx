import { View, Text, StyleSheet } from 'react-native';

interface StatusMessageProps {
  state: 'thinking' | 'idle' | 'error' | 'success';
  message?: string;
  timestamp: string;
}

export function StatusMessage({ state, message, timestamp }: StatusMessageProps) {
  const getIcon = () => {
    switch (state) {
      case 'thinking':
        return '🤔';
      case 'idle':
        return '💤';
      case 'error':
        return '❌';
      case 'success':
        return '✅';
      default:
        return 'ℹ️';
    }
  };

  const getColor = () => {
    switch (state) {
      case 'thinking':
        return '#4A90E2';
      case 'idle':
        return '#999';
      case 'error':
        return '#F44336';
      case 'success':
        return '#4CAF50';
      default:
        return '#666';
    }
  };

  const getBackgroundColor = () => {
    switch (state) {
      case 'thinking':
        return '#E3F2FD';
      case 'idle':
        return '#F5F5F5';
      case 'error':
        return '#FFEBEE';
      case 'success':
        return '#E8F5E9';
      default:
        return '#F5F5F5';
    }
  };

  const getStateText = () => {
    switch (state) {
      case 'thinking':
        return 'Thinking...';
      case 'idle':
        return 'Idle';
      case 'error':
        return 'Error';
      case 'success':
        return 'Success';
      default:
        return 'Status';
    }
  };

  return (
    <View style={[styles.container, { backgroundColor: getBackgroundColor() }]}>
      <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
      <View style={styles.content}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <View style={styles.textContainer}>
          <Text style={[styles.state, { color: getColor() }]}>{getStateText()}</Text>
          {message && <Text style={styles.message}>{message}</Text>}
        </View>
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#999',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginBottom: 6,
  },
  content: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 20,
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  state: {
    fontSize: 14,
    fontWeight: '600',
  },
  message: {
    fontSize: 13,
    color: '#666',
    marginTop: 4,
  },
});
