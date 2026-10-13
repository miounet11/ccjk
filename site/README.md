# ccjk 项目介绍页

这是 ccjk 的单页介绍站，用于对外宣传。纯静态 HTML + 内联 CSS/JS，没有构建步骤、没有外部依赖、不加载任何第三方资源。

## 本地预览

```bash
open site/index.html
```

或起一个临时服务：

```bash
python3 -m http.server -d site 8080
```

## 发布

发布到 `gh-pages` 分支（本仓库已关闭 GitHub Actions，所以不走 Actions 部署）：

```bash
git subtree push --prefix site origin gh-pages
```

首次发布后，到仓库 Settings → Pages 选择 `gh-pages` 分支作为来源。

## 内容口径

页面上的说法必须和产品实际能力一致。写文案时注意：

- 代理只听 `127.0.0.1`，要用户自己开。
- 不读钥匙串、不冒充官方客户端、不发送遥测。
- 不做局域网、不做 Docker、不做 smart / pace、不做订阅感知。
- 拿不准就写「不做什么」，比堆功能更可信。

对照表里关于 cc-switch、magpie 的行，依据是它们各自介绍页写的内容，不要替对方补功能。
