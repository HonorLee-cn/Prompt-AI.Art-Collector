# Prompt-AI.ART Collector（Chrome MV3）

从网页图片一键收录到 Prompt-AI.ART。Side Panel 形态，支持 API Key 绑定、草稿、离线重试队列与右键/快捷键。

## 构建

在仓库根目录的 `Prompt-AI.Art/` 下执行：

```bash
pnpm build:extension
```

输出到 `Chrome-Extension/Prompt-AI.Art Collector/dist/`。开发时修改 `src/` 后重新构建，再到 `chrome://extensions` 点击刷新。

## 安装（未打包）

1. 打开 `chrome://extensions`。
2. 开启右上角“开发者模式”。
3. “加载已解压的扩展程序” → 选择 `dist/` 目录。
4. 建议 Chrome 116+（Side Panel API）。

## 绑定

点击工具栏图标打开 Side Panel → “设置”：

- API 地址：本地 `http://localhost:3000`，线上填你的域名。
- 站点地址：本地 `http://localhost:5173`，线上填你的域名。
- API Key：在 Prompt-AI.ART 用户中心 → API Key 创建并粘贴（明文只显示一次）。
- 点“保存并验证”；Key 失效会提示，草稿保留。

不绑定 Key 也可提交：会匿名进入后台待审核区（归属 system）。绑定后收录归属本人。

## 图片获取顺序

1. 右键图片 → “收录这张图片到 Prompt-AI.ART”
2. 侧边栏粘贴截图（⌘/Ctrl+V）
3. “从当前页读取”（取页面最大图片 / 选中文字）
4. 后台 fetch 图片链接（带当前站点 Cookie）
5. 拖拽图片文件
6. 手动粘贴图片 URL

## 离线队列

- 网络失败/5xx/429 自动进入本机队列，指数退避重试，徽标数字只表示“待重试”，不代表审核状态。
- 提交带 `clientRef`，服务端 `external_ref` 幂等，恢复后只提交一次。
- 队列最多 20 条，历史保留最近 50 条。
- 关闭 Side Panel 后草稿与队列仍在 `chrome.storage.local`。

## 权限

- `sidePanel` / `activeTab` / `scripting`：读取当前页最大图片与选中文字。
- `contextMenus`：右键图片/文字。
- `storage` / `alarms`：本机设置、草稿、离线队列与重试。
- `host_permissions`：读取图片所在站点；不读取浏览历史，不上传页面内容。
- **不申请 `notifications`**；没有通知权限。

## 打包

```bash
# zip（可直接分发，用户解压后加载 dist）
pnpm package:extension

# CRX（需 Chrome）
"/Applications/Google Chrome.app/Contents/MacOS/Google Chrome" \
  --pack-extension="$PWD/../Chrome-Extension/Prompt-AI.Art Collector/dist" \
  --no-message-box
```

CRX 未上架商店时，用户需在 `chrome://extensions` 开启开发者模式后拖入；企业策略可能禁用。

## 已知限制

- 5 个真实站点成功率未做自动化统计；不同站点图片防盗链/Cookie 策略可能影响读取，失败时请用右键/拖拽/手动 URL。
- 线上 API 需允许 `chrome-extension://` Origin（服务端 CORS 已默认放行扩展 Origin）。
- Side Panel 首次打开需用户手势（点击图标/右键/快捷键）。
- 本扩展不显示审核状态；审核结果去网站“我的收录”查看。
