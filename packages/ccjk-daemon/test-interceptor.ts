/**
 * Test script for Claude Code interceptor
 */

import { ClaudeCodeInterceptor } from './src/claude-interceptor';

// Mock daemon manager
const mockManager = {
  async sendEvent(sessionId: string, envelope: any) {
    console.log('📤 Event sent:', {
      sessionId,
      type: envelope.ev.t,
      data: envelope.ev,
    });
  },
} as any;

// Create interceptor
const interceptor = new ClaudeCodeInterceptor(
  {
    sessionId: 'test-session-123',
    projectPath: process.cwd(),
    codeToolType: 'claude-code',
  },
  mockManager,
);

// Test permission request handling
console.log('🧪 Testing Claude Code Interceptor\n');

// Simulate permission request
const requestId = 'test-request-123';

console.log('1. Simulating permission request...');
setTimeout(() => {
  console.log('\n2. Simulating remote approval (approved=true)...');
  interceptor.handleApprovalResponse(requestId, true);
}, 2000);

// Simulate input
console.log('\n3. Simulating user input...');
interceptor.sendInput('Hello Claude!');

console.log('\n✅ Test complete\n');
