import { View, Text, StyleSheet, TouchableOpacity, Alert } from 'react-native';
import { useState } from 'react';

interface PermissionCardProps {
  requestId: string;
  tool: string;
  pattern: string;
  description?: string;
  timestamp: string;
  onApprove: (requestId: string, approved: boolean) => void;
}

export function PermissionCard({
  requestId,
  tool,
  pattern,
  description,
  timestamp,
  onApprove,
}: PermissionCardProps) {
  const [responded, setResponded] = useState(false);

  const handleApprove = () => {
    Alert.alert(
      'Approve Permission',
      `Allow ${tool} for ${pattern}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Approve',
          style: 'default',
          onPress: () => {
            onApprove(requestId, true);
            setResponded(true);
          },
        },
      ]
    );
  };

  const handleDeny = () => {
    Alert.alert(
      'Deny Permission',
      `Deny ${tool} for ${pattern}?`,
      [
        {
          text: 'Cancel',
          style: 'cancel',
        },
        {
          text: 'Deny',
          style: 'destructive',
          onPress: () => {
            onApprove(requestId, false);
            setResponded(true);
          },
        },
      ]
    );
  };

  if (responded) {
    return (
      <View style={[styles.container, styles.responded]}>
        <Text style={styles.respondedText}>✓ Response sent</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <View style={styles.header}>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
        <View style={styles.urgentBadge}>
          <Text style={styles.urgentText}>⚠️ ACTION REQUIRED</Text>
        </View>
      </View>

      <Text style={styles.title}>Permission Request</Text>

      <View style={styles.detailsContainer}>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Tool:</Text>
          <Text style={styles.detailValue}>{tool}</Text>
        </View>
        <View style={styles.detailRow}>
          <Text style={styles.detailLabel}>Pattern:</Text>
          <Text style={styles.detailValue}>{pattern}</Text>
        </View>
        {description && (
          <View style={styles.detailRow}>
            <Text style={styles.detailLabel}>Details:</Text>
            <Text style={styles.detailValue}>{description}</Text>
          </View>
        )}
      </View>

      <View style={styles.buttonContainer}>
        <TouchableOpacity
          style={[styles.button, styles.denyButton]}
          onPress={handleDeny}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>✕ Deny</Text>
        </TouchableOpacity>
        <TouchableOpacity
          style={[styles.button, styles.approveButton]}
          onPress={handleApprove}
          activeOpacity={0.8}
        >
          <Text style={styles.buttonText}>✓ Approve</Text>
        </TouchableOpacity>
      </View>

      <Text style={styles.timeout}>Auto-deny in 60 seconds</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFF3CD',
    padding: 16,
    marginBottom: 12,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: '#FFC107',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 4,
    elevation: 3,
  },
  responded: {
    backgroundColor: '#E8F5E9',
    borderColor: '#4CAF50',
  },
  respondedText: {
    fontSize: 14,
    fontWeight: '600',
    color: '#2E7D32',
    textAlign: 'center',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  timestamp: {
    fontSize: 10,
    color: '#856404',
  },
  urgentBadge: {
    backgroundColor: '#FF6B6B',
    paddingHorizontal: 8,
    paddingVertical: 4,
    borderRadius: 12,
  },
  urgentText: {
    color: '#fff',
    fontSize: 10,
    fontWeight: '700',
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: '#856404',
    marginBottom: 12,
  },
  detailsContainer: {
    backgroundColor: '#fff',
    padding: 12,
    borderRadius: 8,
    marginBottom: 16,
  },
  detailRow: {
    flexDirection: 'row',
    marginBottom: 8,
  },
  detailLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: '#666',
    width: 80,
  },
  detailValue: {
    fontSize: 14,
    color: '#333',
    flex: 1,
    fontFamily: 'Courier New',
  },
  buttonContainer: {
    flexDirection: 'row',
    gap: 12,
  },
  button: {
    flex: 1,
    padding: 14,
    borderRadius: 8,
    alignItems: 'center',
    justifyContent: 'center',
  },
  approveButton: {
    backgroundColor: '#4CAF50',
  },
  denyButton: {
    backgroundColor: '#F44336',
  },
  buttonText: {
    color: '#fff',
    fontSize: 16,
    fontWeight: '700',
  },
  timeout: {
    fontSize: 11,
    color: '#856404',
    textAlign: 'center',
    marginTop: 8,
    fontStyle: 'italic',
  },
});
