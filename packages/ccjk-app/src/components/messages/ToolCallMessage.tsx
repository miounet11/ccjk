import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { useState } from 'react';

interface ToolCallMessageProps {
  callId: string;
  name: string;
  description?: string;
  args?: any;
  result?: string;
  timestamp: string;
  status: 'running' | 'completed' | 'failed';
}

export function ToolCallMessage({
  callId,
  name,
  description,
  args,
  result,
  timestamp,
  status,
}: ToolCallMessageProps) {
  const [expanded, setExpanded] = useState(false);

  const getIcon = () => {
    switch (name) {
      case 'Read':
        return '📖';
      case 'Write':
        return '✍️';
      case 'Edit':
        return '✏️';
      case 'Bash':
        return '⚡';
      case 'Grep':
        return '🔍';
      case 'Glob':
        return '📁';
      default:
        return '🔧';
    }
  };

  const getStatusColor = () => {
    switch (status) {
      case 'running':
        return '#FFA500';
      case 'completed':
        return '#4CAF50';
      case 'failed':
        return '#F44336';
      default:
        return '#999';
    }
  };

  const getStatusText = () => {
    switch (status) {
      case 'running':
        return 'Running...';
      case 'completed':
        return 'Completed';
      case 'failed':
        return 'Failed';
      default:
        return '';
    }
  };

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={() => setExpanded(!expanded)}
      activeOpacity={0.7}
    >
      <View style={styles.header}>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
        <View style={[styles.statusBadge, { backgroundColor: getStatusColor() }]}>
          <Text style={styles.statusText}>{getStatusText()}</Text>
        </View>
      </View>

      <View style={styles.toolInfo}>
        <Text style={styles.icon}>{getIcon()}</Text>
        <View style={styles.toolDetails}>
          <Text style={styles.toolName}>{name}</Text>
          {description && <Text style={styles.description}>{description}</Text>}
        </View>
        <Text style={styles.expandIcon}>{expanded ? '▼' : '▶'}</Text>
      </View>

      {expanded && args && (
        <View style={styles.argsContainer}>
          <Text style={styles.sectionTitle}>Arguments:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>{JSON.stringify(args, null, 2)}</Text>
          </View>
        </View>
      )}

      {expanded && result && (
        <View style={styles.resultContainer}>
          <Text style={styles.sectionTitle}>Result:</Text>
          <View style={styles.codeBlock}>
            <Text style={styles.code}>{result}</Text>
          </View>
        </View>
      )}
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#F8F9FA',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#6C757D',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
  },
  statusBadge: {
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 10,
  },
  statusText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '600',
  },
  toolInfo: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  icon: {
    fontSize: 24,
    marginRight: 12,
  },
  toolDetails: {
    flex: 1,
  },
  toolName: {
    fontSize: 16,
    fontWeight: '600',
    color: '#333',
  },
  description: {
    fontSize: 12,
    color: '#666',
    marginTop: 2,
  },
  expandIcon: {
    fontSize: 12,
    color: '#999',
  },
  argsContainer: {
    marginTop: 12,
  },
  resultContainer: {
    marginTop: 12,
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: '#666',
    marginBottom: 6,
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    padding: 12,
    borderRadius: 6,
  },
  code: {
    fontFamily: 'Courier New',
    fontSize: 12,
    color: '#d4d4d4',
    lineHeight: 18,
  },
});
