# @ccjk/cloud-sdk

CCJK Cloud 官方 SDK，用于设备绑定和通知发送。

## 安装

```bash
npm install @ccjk/cloud-sdk
# 或
pnpm add @ccjk/cloud-sdk
# 或
yarn add @ccjk/cloud-sdk
```

## 快速开始

### 1. 绑定设备

```typescript
import { CCJKClient } from '@ccjk/cloud-sdk';

// 使用网页端获取的 6 位绑定码
const client = await CCJKClient.bind('9RQ6DL', {
  name: 'My MacBook',
  platform: 'darwin',
});

// 保存 token 供后续使用
const token = client.getToken();
console.log('Device Token:', token);
// 将 token 保存到配置文件...
```

### 2. 配置通知渠道

```typescript
// 配置飞书
await client.configureFeishu('https://open.feishu.cn/open-apis/bot/v2/hook/xxx');

// 配置钉钉（带加签）
await client.configureDingtalk(
  'https://oapi.dingtalk.com/robot/send?access_token=xxx',
  'SECxxx' // 加签密钥
);

// 配置企业微信
await client.configureWechat('https://qyapi.weixin.qq.com/cgi-bin/webhook/send?key=xxx');
```

### 3. 发送通知

```typescript
// 使用已保存的 token 创建客户端
const client = new CCJKClient('ccjk_xxx');

// 发送完成通知
await client.completed('✅ 部署成功', '应用已部署到生产环境');

// 发送进度通知
await client.progress('🔄 构建中', '正在编译 TypeScript...');

// 发送失败通知
await client.failed('❌ 测试失败', '3 个测试用例未通过');

// 自定义通知
await client.notify({
  type: 'custom',
  title: '📢 自定义通知',
  body: '这是一条自定义消息',
  data: { key: 'value' },
});
```

### 4. 询问用户

```typescript
// 询问并等待回复
const answer = await client.ask('是否部署到生产环境？');
console.log('用户回复:', answer);

// 确认操作（返回 boolean）
const confirmed = await client.confirm('确定要删除这些文件吗？');
if (confirmed) {
  // 执行删除...
}

// 自定义超时时间（毫秒）
const reply = await client.ask('请输入验证码', '🔐 验证', 120000);
```

## API 参考

### CCJKClient

#### 静态方法

- `CCJKClient.bind(code, deviceInfo?, options?)` - 使用绑定码绑定设备

#### 实例方法

**设备管理**
- `getToken()` - 获取设备 Token
- `getDeviceInfo()` - 获取设备信息
- `regenerateToken()` - 重新生成 Token
- `deleteDevice()` - 删除设备

**渠道配置**
- `getChannels()` - 获取渠道配置
- `setChannels(channels)` - 设置渠道配置
- `configureFeishu(webhookUrl)` - 配置飞书
- `configureDingtalk(webhookUrl, secret?)` - 配置钉钉
- `configureWechat(webhookUrl)` - 配置企业微信

**通知发送**
- `notify(options)` - 发送通知
- `testNotify()` - 发送测试通知
- `progress(title, body, data?)` - 发送进度通知
- `completed(title, body, data?)` - 发送完成通知
- `failed(title, body, data?)` - 发送失败通知

**用户交互**
- `ask(question, title?, timeout?)` - 询问用户
- `confirm(question, timeout?)` - 确认操作
- `waitForReply(timeout?)` - 等待回复

**历史记录**
- `getHistory(limit?, offset?)` - 获取通知历史

## 完整示例

```typescript
import { CCJKClient } from '@ccjk/cloud-sdk';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';

const CONFIG_FILE = path.join(os.homedir(), '.ccjk', 'config.json');

async function getClient(): Promise<CCJKClient> {
  // 尝试读取已保存的 token
  if (fs.existsSync(CONFIG_FILE)) {
    const config = JSON.parse(fs.readFileSync(CONFIG_FILE, 'utf-8'));
    return new CCJKClient(config.token);
  }

  // 首次使用，需要绑定
  const code = process.argv[2];
  if (!code) {
    console.error('首次使用请提供绑定码: npx my-cli <绑定码>');
    process.exit(1);
  }

  const client = await CCJKClient.bind(code, {
    name: `${os.userInfo().username}'s CLI`,
    platform: os.platform(),
    hostname: os.hostname(),
  });

  // 保存 token
  fs.mkdirSync(path.dirname(CONFIG_FILE), { recursive: true });
  fs.writeFileSync(CONFIG_FILE, JSON.stringify({ token: client.getToken() }));

  console.log('✅ 设备绑定成功！');
  return client;
}

async function main() {
  const client = await getClient();

  // 执行任务...
  await client.progress('🚀 开始执行', '正在初始化...');

  // 模拟耗时操作
  await new Promise(r => setTimeout(r, 2000));

  // 询问用户
  const shouldContinue = await client.confirm('任务即将完成，是否继续？');

  if (shouldContinue) {
    await client.completed('✅ 任务完成', '所有操作已成功执行');
  } else {
    await client.notify({
      type: 'custom',
      title: '⏸️ 任务暂停',
      body: '用户选择暂停任务',
    });
  }
}

main().catch(console.error);
```

## License

MIT
