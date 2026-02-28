# 🚀 CCJK v12.1.0 - 快速参考

## 📦 安装和使用

```bash
# 安装最新版本
npm install -g ccjk@latest

# 或使用 npx
npx ccjk@latest --version
```

## ⚡ 新功能

### 快速安装模式

```bash
# 启用快速安装（58-92% 更快）
export CCJK_FAST_INSTALL=1
npx ccjk init

# 或一次性启用
CCJK_FAST_INSTALL=1 npx ccjk init
```

### 层级菜单

```bash
# 启用层级菜单（更好的 UX）
export CCJK_HIERARCHICAL_MENU=1
npx ccjk
```

## 📊 性能对比

| 操作 | 旧版 | 新版 | 提升 |
|------|------|------|------|
| 首次安装 | 60s | 25s | **2.4x** |
| 重复安装 | 60s | 5s | **12x** |

## 🔗 重要链接

- **GitHub**: https://github.com/miounet11/ccjk
- **npm**: https://www.npmjs.com/package/ccjk
- **文档**: [docs/fast-installation.md](./docs/fast-installation.md)
- **Release**: https://github.com/miounet11/ccjk/releases/tag/v12.1.0

## 📋 发布状态

- ✅ Git: 已推送
- ⏳ npm: 测试中
- ⏳ Release: 待创建

## 🔍 监控

```bash
# 检查 npm 版本
npm view ccjk version

# 监控发布
./scripts/monitor-publish.sh
```

## 📚 完整文档

- [TODAY_SUMMARY.md](./TODAY_SUMMARY.md) - 今日工作总结
- [RELEASE_FINAL_STATUS.md](./RELEASE_FINAL_STATUS.md) - 发布状态
- [docs/fast-installation.md](./docs/fast-installation.md) - 用户指南
