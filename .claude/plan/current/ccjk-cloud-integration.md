# Feature Plan: CCJK Cloud Service Integration

## 📋 Overview

- **Feature Objective**: Integrate CCJK CLI with the ccjk-cloud backend service deployed at `https://api.claudehome.cn`
- **Expected Value**: Enable task completion notifications via multiple channels (Feishu, WeChat, DingTalk, Email, SMS)
- **Impact Scope**: `src/utils/notification/`, `src/commands/notification.ts`, i18n files

## 🔍 API Connectivity Test Results

All API endpoints at `https://api.claudehome.cn` are **working correctly**:

| Endpoint | Method | Status | Notes |
|----------|--------|--------|-------|
| `/device/register` | POST | ✅ Working | Returns `deviceId` and `token` |
| `/device/info` | GET | ✅ Working | Returns device details and channels |
| `/device/channels` | PUT | ✅ Working | **Requires array format, not object** |
| `/notify` | POST | ✅ Working | **Requires `title` and `body` fields** |
| `/notify/test` | POST | ✅ Working | Tests all enabled channels |
| `/reply/poll` | GET | ✅ Working | Long-polling for replies |

## 🔄 API Format Differences

The actual API has some differences from the original documentation:

### 1. Channel Configuration Format

**Documentation (Object format)**:
```json
{
  "channels": {
    "feishu": { "enabled": true, "webhookUrl": "..." }
  }
}
```

**Actual API (Array format)**:
```json
{
  "channels": [
    { "type": "feishu", "enabled": true, "config": { "webhookUrl": "..." } }
  ]
}
```

### 2. Notification Request Format

**Documentation**:
```json
{
  "type": "task_completed",
  "task": { ... },
  "channels": ["feishu"]
}
```

**Actual API (requires title and body)**:
```json
{
  "type": "task_completed",
  "title": "Task Completed",
  "body": "Task description...",
  "task": { ... },
  "channels": ["feishu"]
}
```

### 3. Device Info Response

**Actual Response**:
```json
{
  "success": true,
  "data": {
    "id": "dev_xxx",
    "name": "Device Name",
    "platform": "darwin",
    "hostname": null,
    "version": "1.0.0",
    "userId": null,
    "createdAt": "2026-01-10 10:20:46",
    "lastSeenAt": "2026-01-10 10:21:59",
    "channels": [
      { "type": "feishu", "enabled": true, "configured": true }
    ]
  }
}
```

## 🎯 Feature Breakdown

- [x] Test API connectivity
- [ ] Update `DEFAULT_CLOUD_ENDPOINT` to `https://api.claudehome.cn`
- [ ] Fix channel configuration format (object → array)
- [ ] Add `title` and `body` fields to notification requests
- [ ] Update type definitions to match actual API
- [ ] Implement actual test notification in command
- [ ] Add error handling for API-specific errors
- [ ] Update i18n translations for new error messages
- [ ] Write unit tests for cloud client

## 📐 Technical Approach

### 1. Update Cloud Client (`src/utils/notification/cloud-client.ts`)

**Changes needed**:
- Change `DEFAULT_CLOUD_ENDPOINT` from `http://localhost:3456` to `https://api.claudehome.cn`
- Update `updateChannels()` method to use array format
- Update `sendNotification()` to include `title` and `body` fields
- Add helper function to convert channel config format

### 2. Update Type Definitions (`src/utils/notification/types.ts`)

**Changes needed**:
- Add `CloudChannelConfig` interface for array format
- Add `title` and `body` to `NotificationMessage` interface
- Update `DeviceRegisterResponse` to match actual response

### 3. Update Notification Command (`src/commands/notification.ts`)

**Changes needed**:
- Implement actual `sendTestNotification()` using cloud client
- Update channel configuration to use new format
- Add proper error handling and user feedback

### 4. Configuration Management

**Changes needed**:
- Update `config.ts` to handle channel format conversion
- Ensure backward compatibility with existing configs

## ✅ Acceptance Criteria

### Functional Acceptance
- [ ] Device registration works with `https://api.claudehome.cn`
- [ ] Channel configuration saves correctly in array format
- [ ] Test notification sends successfully to configured channels
- [ ] Reply polling works for receiving user responses
- [ ] Error messages are properly displayed to users

### Performance Metrics
- API response time < 5 seconds
- Long-polling timeout: 60 seconds

### Test Coverage
- Unit tests for cloud client methods
- Integration tests for full notification flow
- Edge case tests for error handling

## ⏱️ Implementation Plan

### Phase 1: Core Updates (Priority: High)
1. Update `DEFAULT_CLOUD_ENDPOINT` constant
2. Fix channel configuration format
3. Add `title`/`body` to notification requests

### Phase 2: Type System Updates (Priority: High)
1. Update type definitions
2. Add format conversion helpers

### Phase 3: Command Integration (Priority: Medium)
1. Implement actual test notification
2. Update error handling
3. Add i18n translations

### Phase 4: Testing (Priority: High)
1. Write unit tests
2. Manual integration testing
3. Edge case testing

## 📊 Execution Status

| Subtask | Status | Progress |
|---------|--------|----------|
| API connectivity testing | ✅ Complete | 100% |
| Update cloud endpoint | ⏳ Pending | 0% |
| Fix channel format | ⏳ Pending | 0% |
| Add title/body fields | ⏳ Pending | 0% |
| Update type definitions | ⏳ Pending | 0% |
| Implement test notification | ⏳ Pending | 0% |
| Write unit tests | ⏳ Pending | 0% |

```
Overall Progress: [██░░░░░░░░░░░░░░] 15%

✅ Completed: 1/7 subtasks
🔄 In Progress: 0/7 subtasks
⏳ Pending: 6/7 subtasks
```

---

**Next Step**: Start implementation by updating the cloud client with the correct endpoint and API formats.
