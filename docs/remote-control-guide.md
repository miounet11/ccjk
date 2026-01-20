# CCJK Remote Control - User Guide

**Version**: 3.7.0
**Status**: Production Ready
**Last Updated**: 2026-01-19

---

## 🎯 What is CCJK Remote Control?

CCJK Remote Control allows you to **control Claude Code CLI from anywhere** using email. Send an email, and your local machine executes the command and sends back the results.

### Use Cases

- 🏖️ **Work from anywhere** - Control your dev machine from your phone
- ⏰ **Asynchronous workflow** - Submit tasks and check results later
- 📱 **Mobile-first** - No special client needed, just email
- 🤝 **Team collaboration** - Multiple team members can submit tasks

---

## 🚀 Quick Start (5 Minutes)

### Step 1: Setup Configuration

```bash
ccjk daemon setup
```

You'll be prompted for:
- **Email address**: Your Gmail address
- **Password**: Gmail app-specific password ([How to create](https://support.google.com/accounts/answer/185833))
- **Allowed senders**: Email addresses that can send commands (comma-separated)
- **Project path**: Directory where commands will be executed
- **Check interval**: How often to check for new emails (default: 30 seconds)

### Step 2: Start the Daemon

```bash
ccjk daemon start
```

The daemon will:
- ✅ Connect to your email account
- ✅ Start monitoring for new emails
- ✅ Execute commands and send results

### Step 3: Send Your First Command

**From your phone or any email client:**

```
To: your-email@gmail.com
Subject: [CCJK] Test
Body: echo "Hello from remote!"
```

**Wait 30-60 seconds**, then check your inbox for the result email! 📬

---

## 📧 Email Command Format

### Basic Format

```
To: your-email@gmail.com
Subject: [CCJK] <task description>
Body: <command to execute>
```

### Examples

#### Example 1: Run Tests

```
To: your-email@gmail.com
Subject: [CCJK] Run Tests
Body: npm test
```

#### Example 2: Git Status

```
To: your-email@gmail.com
Subject: [CCJK] Check Git Status
Body: git status
```

#### Example 3: Build Project

```
To: your-email@gmail.com
Subject: [CCJK] Build
Body: npm run build
```

#### Example 4: Claude Code Interaction

```
To: your-email@gmail.com
Subject: [CCJK] Code Review
Body: claude "Review src/daemon/index.ts and suggest improvements"
```

---

## 🔐 Security

### Email Whitelist

Only emails from **allowed senders** can execute commands. Configure this during setup:

```bash
ccjk daemon setup
# Allowed sender emails: user@example.com, team@company.com
```

### Command Whitelist

By default, only safe commands are allowed:
- ✅ `npm test`, `npm run`, `pnpm`, `yarn`
- ✅ `git status`, `git log`, `git diff`
- ✅ `claude`, `ccjk`
- ✅ `echo`, `ls`, `pwd`

### Command Blacklist

Dangerous commands are automatically blocked:
- ❌ `rm -rf` (delete files)
- ❌ `sudo` (superuser access)
- ❌ `git push --force` (force push)
- ❌ `curl | sh` (pipe to shell)

### How It Works

```
Email arrives
    ↓
Check sender whitelist ✓
    ↓
Check command whitelist ✓
    ↓
Check command blacklist ✓
    ↓
Execute in sandbox
    ↓
Send result email
```

---

## 🛠️ CLI Commands

### Setup

```bash
ccjk daemon setup
```

Configure email settings and security.

### Start

```bash
ccjk daemon start
```

Start the daemon in foreground mode. Press `Ctrl+C` to stop.

### Stop

```bash
ccjk daemon stop
```

Stop a running daemon.

### Status

```bash
ccjk daemon status
```

Check if daemon is running and view configuration.

### Logs

```bash
ccjk daemon logs
```

View daemon logs (currently shows stdout).

---

## 📊 Result Emails

### Success Email

```
Subject: ✅ Task Completed: npm test

Command:
npm test

Output:
All tests passed ✓
- 32 tests
- 0 failures

---
Duration: 2.3s
Exit Code: 0
Task ID: abc123xyz
```

### Failure Email

```
Subject: ❌ Task Failed: npm test

Command:
npm test

Error:
Test suite failed
- 2 tests failed
- See details below

---
Duration: 1.8s
Exit Code: 1
Task ID: def456uvw
```

---

## 🔧 Advanced Configuration

### Custom Check Interval

```bash
ccjk daemon setup
# Check interval (seconds): 10  # Check every 10 seconds
```

### Debug Mode

```bash
ccjk daemon setup
# Enable debug logging? Yes
```

Then start with debug output:

```bash
ccjk daemon start
```

### Multiple Projects

Run separate daemons for different projects:

```bash
# Terminal 1 - Project A
cd /path/to/project-a
ccjk daemon setup
ccjk daemon start

# Terminal 2 - Project B
cd /path/to/project-b
ccjk daemon setup
ccjk daemon start
```

---

## 🐛 Troubleshooting

### Problem: "Failed to connect to email server"

**Solution**: Check your email credentials

1. Verify email address is correct
2. Use **app-specific password**, not your regular password
3. Enable IMAP in Gmail settings

### Problem: "Daemon is already running"

**Solution**: Stop the existing daemon

```bash
ccjk daemon stop
ccjk daemon start
```

### Problem: "No emails received"

**Solution**: Check email format

1. Subject must start with `[CCJK]`
2. Sender must be in whitelist
3. Check spam folder

### Problem: "Command not allowed"

**Solution**: Command is blocked by security

1. Check if command is in blacklist
2. Verify command starts with allowed pattern
3. Contact admin to add command to whitelist

---

## 📱 Mobile Usage Tips

### iOS Mail

1. Open Mail app
2. Compose new email
3. To: `your-email@gmail.com`
4. Subject: `[CCJK] <task>`
5. Body: `<command>`
6. Send ✉️

### Android Gmail

1. Open Gmail app
2. Tap compose (✏️)
3. To: `your-email@gmail.com`
4. Subject: `[CCJK] <task>`
5. Body: `<command>`
6. Send ✉️

### Quick Tip: Save as Draft

Create email drafts for common commands:
- `[CCJK] Run Tests` → `npm test`
- `[CCJK] Deploy` → `npm run deploy`
- `[CCJK] Status` → `git status`

Just open draft, send, done! 🚀

---

## 🎓 Best Practices

### 1. Use Descriptive Subjects

❌ Bad: `[CCJK] Test`
✅ Good: `[CCJK] Run Unit Tests for Auth Module`

### 2. One Command Per Email

❌ Bad:
```
npm test
npm run build
git push
```

✅ Good: Send 3 separate emails

### 3. Check Results Before Next Command

Wait for result email before sending dependent commands.

### 4. Use Absolute Paths

❌ Bad: `cd ../other-project && npm test`
✅ Good: Configure separate daemon for each project

### 5. Keep Commands Simple

❌ Bad: `for i in {1..10}; do npm test; done`
✅ Good: `npm test`

---

## 🔄 Workflow Examples

### Morning Routine

```
1. Send: [CCJK] Git Pull
   Body: git pull origin main

2. Send: [CCJK] Install Dependencies
   Body: npm install

3. Send: [CCJK] Run Tests
   Body: npm test
```

### Pre-Deployment Check

```
1. Send: [CCJK] Run All Tests
   Body: npm run test:all

2. Wait for result ✅

3. Send: [CCJK] Build Production
   Body: npm run build:prod

4. Wait for result ✅

5. Send: [CCJK] Deploy
   Body: npm run deploy
```

### Code Review Request

```
Send: [CCJK] Review Latest Changes
Body: claude "Review the last 3 commits and suggest improvements"
```

---

## 📈 Performance

### Email Check Frequency

- **Default**: 30 seconds
- **Minimum**: 10 seconds (not recommended)
- **Maximum**: 300 seconds (5 minutes)

### Command Timeout

- **Default**: 5 minutes
- **Configurable**: Edit `~/.ccjk/daemon-config.json`

### Resource Usage

- **Memory**: ~50MB
- **CPU**: <1% (idle), 5-10% (executing)
- **Network**: Minimal (IMAP/SMTP only)

---

## 🔮 Future Features

### Coming Soon

- [ ] Web dashboard for task management
- [ ] Telegram bot integration
- [ ] Scheduled tasks (cron-like)
- [ ] Task queue with priorities
- [ ] Multi-user collaboration
- [ ] Webhook support

### Roadmap

- **v3.7.0**: Email-based remote control ✅
- **v3.8.0**: Web dashboard
- **v3.9.0**: Telegram bot
- **v4.0.0**: Full team collaboration

---

## 💡 Tips & Tricks

### Tip 1: Use Email Filters

Create Gmail filter to auto-label CCJK result emails:
- Filter: `from:your-email@gmail.com subject:"Task Completed"`
- Label: `CCJK/Success`

### Tip 2: Create Email Templates

Save common commands as email templates in your email client.

### Tip 3: Use Aliases

Add to your shell config:
```bash
alias ccjk-start="ccjk daemon start"
alias ccjk-stop="ccjk daemon stop"
alias ccjk-status="ccjk daemon status"
```

### Tip 4: Run in Background (Linux/macOS)

```bash
nohup ccjk daemon start > ~/ccjk-daemon.log 2>&1 &
```

### Tip 5: Auto-Start on Boot

Add to crontab:
```bash
@reboot cd /path/to/project && ccjk daemon start
```

---

## 🆘 Support

### Get Help

- 📖 Documentation: [GitHub Wiki](https://github.com/miounet11/ccjk)
- 🐛 Report Issues: [GitHub Issues](https://github.com/miounet11/ccjk/issues)
- 💬 Discussions: [GitHub Discussions](https://github.com/miounet11/ccjk/discussions)

### Community

- 🌟 Star the project on GitHub
- 🤝 Contribute improvements
- 📢 Share your use cases

---

## 📄 License

MIT License - See [LICENSE](../LICENSE) file for details.

---

**Happy Remote Coding! 🚀**
