import { View, Text, StyleSheet } from 'react-native';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { vscDarkPlus } from 'react-syntax-highlighter/dist/esm/styles/prism';

interface TextMessageProps {
  text: string;
  thinking: boolean;
  timestamp: string;
}

export function TextMessage({ text, thinking, timestamp }: TextMessageProps) {
  // Detect code blocks
  const codeBlockMatch = text.match(/```(\w+)?\n([\s\S]*?)```/);

  if (codeBlockMatch) {
    const language = codeBlockMatch[1] || 'text';
    const code = codeBlockMatch[2];

    return (
      <View style={styles.container}>
        <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
        <View style={styles.codeBlock}>
          <Text style={styles.language}>{language}</Text>
          <SyntaxHighlighter
            language={language}
            style={vscDarkPlus}
            customStyle={styles.code}
          >
            {code}
          </SyntaxHighlighter>
        </View>
      </View>
    );
  }

  // Detect inline code
  const parts = text.split(/(`[^`]+`)/g);

  return (
    <View style={[styles.container, thinking && styles.thinking]}>
      <Text style={styles.timestamp}>{new Date(timestamp).toLocaleTimeString()}</Text>
      <Text style={styles.text}>
        {thinking && <Text style={styles.thinkingIcon}>🤔 </Text>}
        {parts.map((part, i) => {
          if (part.startsWith('`') && part.endsWith('`')) {
            return (
              <Text key={i} style={styles.inlineCode}>
                {part.slice(1, -1)}
              </Text>
            );
          }
          return <Text key={i}>{part}</Text>;
        })}
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#fff',
    padding: 12,
    marginBottom: 8,
    borderRadius: 8,
    borderLeftWidth: 3,
    borderLeftColor: '#007AFF',
  },
  thinking: {
    backgroundColor: '#F0F8FF',
    borderLeftColor: '#4A90E2',
  },
  timestamp: {
    fontSize: 10,
    color: '#999',
    marginBottom: 4,
  },
  text: {
    fontSize: 14,
    lineHeight: 20,
    color: '#333',
  },
  thinkingIcon: {
    fontSize: 14,
  },
  inlineCode: {
    fontFamily: 'Courier New',
    backgroundColor: '#f5f5f5',
    paddingHorizontal: 4,
    paddingVertical: 2,
    borderRadius: 3,
    fontSize: 13,
    color: '#e83e8c',
  },
  codeBlock: {
    backgroundColor: '#1e1e1e',
    borderRadius: 6,
    overflow: 'hidden',
  },
  language: {
    color: '#fff',
    fontSize: 12,
    paddingHorizontal: 12,
    paddingVertical: 6,
    backgroundColor: '#2d2d2d',
  },
  code: {
    margin: 0,
    padding: 12,
    fontSize: 13,
  },
});
