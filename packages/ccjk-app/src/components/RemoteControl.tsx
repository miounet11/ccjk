import { View, Text, StyleSheet, TouchableOpacity, TextInput, Alert } from 'react-native';
import { useState } from 'react';
import { socketClient } from '../api/socket';

interface RemoteControlProps {
  sessionId: string;
  isActive: boolean;
}

export function RemoteControl({ sessionId, isActive }: RemoteControlProps) {
  const [inputText, setInputText] = useState('');
  const [isExpanded, setIsExpanded] = useState(false);

  const handleSendInput = () => {
    if (!inputText.trim()) return;

    socketClient.sendInput(sessionId, inputText);
    setInputText('');

    Alert.alert('Input Sent', `Sent to Claude Code: ${inputText}`);
  };

  const handleInterrupt = () => {
    Alert.alert(
      'Send Interrupt',
      'Send Ctrl+C to Claude Code?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Send',
          style: 'destructive',
          onPress: () => {
            socketClient.sendInterrupt(sessionId);
            Alert.alert('Interrupt Sent', 'Ctrl+C sent to Claude Code');
          },
        },
      ]
    );
  };

  const handleTakeControl = () => {
    Alert.alert(
      'Take Control',
      'Switch control to this device?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Take Control',
          onPress: () => {
            // Send take control command
            socketClient.sendInput(sessionId, '__TAKE_CONTROL__');
            Alert.alert('Control Taken', 'You now have control of this session');
          },
        },
      ]
    );
  };

  if (!isActive) {
    return (
      <View style={styles.inactiveContainer}>
        <Text style={styles.inactiveText}>Session is not active</Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <TouchableOpacity
        style={styles.toggleButton}
        onPress={() => setIsExpanded(!isExpanded)}
        activeOpacity={0.8}
      >
        <Text style={styles.toggleIcon}>{isExpanded ? '▼' : '▶'}</Text>
        <Text style={styles.toggleText}>Remote Control</Text>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.controlsContainer}>
          {/* Input Field */}
          <View style={styles.inputContainer}>
            <TextInput
              style={styles.input}
              placeholder="Type command or message..."
              value={inputText}
              onChangeText={setInputText}
              onSubmitEditing={handleSendInput}
              returnKeyType="send"
              multiline
            />
            <TouchableOpacity
              style={styles.sendButton}
              onPress={handleSendInput}
              disabled={!inputText.trim()}
            >
              <Text style={styles.sendButtonText}>Send</Text>
            </TouchableOpacity>
          </View>

          {/* Quick Actions */}
          <View style={styles.actionsContainer}>
            <TouchableOpacity
              style={[styles.actionButton, styles.interruptButton]}
              onPress={handleInterrupt}
            >
              <Text style={styles.actionButtonText}>⏹ Interrupt (Ctrl+C)</Text>
            </TouchableOpacity>

            <TouchableOpacity
              style={[styles.actionButton, styles.controlButton]}
              onPress={handleTakeControl}
            >
              <Text style={styles.actionButtonText}>🎮 Take Control</Text>
            </TouchableOpacity>
          </View>

          {/* Info */}
          <View style={styles.infoContainer}>
            <Text style={styles.infoText}>
              💡 Tip: Press any key on your computer to switch back to desktop control
            </Text>
          </View>
        </View>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    borderTopWidth: 1,
    borderTopColor: '#e0e0e0',
  },
  inactiveContainer: {
    backgroundColor: '#f5f5f5',
    padding: 16,
    alignItems: 'center',
  },
  inactiveText: {
    fontSize: 14,
    color: '#999',
  },
  toggleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: 16,
    backgroundColor: '#F0F8FF',
  },
  toggleIcon: {
    fontSize: 14,
    color: '#007AFF',
    marginRight: 8,
  },
  toggleText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#007AFF',
  },
  controlsContainer: {
    padding: 16,
    backgroundColor: '#F8F9FA',
  },
  inputContainer: {
    flexDirection: 'row',
    marginBottom: 12,
  },
  input: {
    flex: 1,
    backgroundColor: '#fff',
    borderWidth: 1,
    borderColor: '#ddd',
    borderRadius: 8,
    padding: 12,
    fontSize: 14,
    maxHeight: 100,
  },
  sendButton: {
    backgroundColor: '#007AFF',
    paddingHorizontal: 20,
    paddingVertical: 12,
    borderRadius: 8,
    marginLeft: 8,
    justifyContent: 'center',
  },
  sendButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  actionsContainer: {
    flexDirection: 'row',
    gap: 8,
    marginBottom: 12,
  },
  actionButton: {
    flex: 1,
    padding: 12,
    borderRadius: 8,
    alignItems: 'center',
  },
  interruptButton: {
    backgroundColor: '#FF6B6B',
  },
  controlButton: {
    backgroundColor: '#4CAF50',
  },
  actionButtonText: {
    color: '#fff',
    fontSize: 14,
    fontWeight: '600',
  },
  infoContainer: {
    backgroundColor: '#E3F2FD',
    padding: 12,
    borderRadius: 8,
  },
  infoText: {
    fontSize: 12,
    color: '#1976D2',
    lineHeight: 18,
  },
});
