# Changesets

本项目使用 [Changesets](https://github.com/changesets/changesets) 进行版本管理和发布。

## 添加变更记录

当你完成一个功能或修复后，运行：

```bash
pnpm changeset
```

然后按照提示：
1. 选择变更类型（major/minor/patch）
2. 输入变更描述

这会在 `.changeset` 目录下创建一个临时文件，记录本次变更。

## 版本发布流程

### 自动发布（推荐）

1. 创建 PR 并合并到 main 分支
2. Changesets bot 会自动创建一个 "Version Packages" PR
3. 这个 PR 会：
   - 更新版本号
   - 生成 CHANGELOG
   - 删除临时的 changeset 文件
4. 合并这个 PR 后，GitHub Actions 会自动发布到 npm

### 本地发布

```bash
# 1. 创建变更记录
pnpm changeset

# 2. 更新版本（会更新 package.json 和 CHANGELOG.md）
pnpm changeset version

# 3. 提交更改
git add .
git commit -m "chore: release"

# 4. 发布到 npm
pnpm release

# 5. 推送到 GitHub
git push --follow-tags
```

## 变更类型说明

- **patch**: 修复 bug，向后兼容的小改动
- **minor**: 新增功能，向后兼容
- **major**: 重大更改，可能不兼容旧版本