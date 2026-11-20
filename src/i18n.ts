import { saveLang, type Lang } from "./shared";

const zh = {
  "common.settings": "设置",
  "side.title": "Prompt-AI.ART 收录",
  "side.account": "账号",
  "side.auth.checking": "检查绑定…",
  "side.auth.initial":
    "绑定 API Key 后收录归属本人；不绑定则匿名提交到待审核。",
  "side.auth.keyPlaceholder": "pa_…（留空保留已保存的 Key）",
  "side.apiKeyLabel": "API Key",
  "side.verify": "保存并验证",
  "side.unbind": "解除绑定",
  "side.getKey": "获取 API KEY",
  "side.keyHint":
    "Key 只保存在本机 chrome.storage.local，不会发送到其他服务。",
  "side.retryQueue": "重试队列",
  "side.contextUse": "使用右键内容",
  "side.contextDismiss": "忽略",
  "side.contextTitle": "发现右键内容",
  "side.imageTitle": "图片",
  "side.readTab": "从当前页读取",
  "side.dropHint": "拖入图片，或点击选择",
  "side.formTitle": "收录信息",
  "side.reverse": "反推提示词",
  "side.reverseConfirmTitle": "确认反推提示词",
  "side.reverseConfirmBody":
    "将使用当前图片调用 AI 反推，并自动填入标题、提示词和 NSFW。是否继续？",
  "side.reverseStart": "开始反推",
  "side.reverseCancel": "取消",
  "side.reverseProgressTitle": "正在反推提示词",
  "side.reverseQueued": "反推任务排队中…",
  "side.reverseRunning": "AI 正在分析图片…",
  "side.reverseDone": "反推完成，已自动填入。",
  "side.reverseFailed": "反推失败",
  "side.reverseCanceled": "已取消反推",
  "side.reverseNeedImage": "请先添加图片。",
  "side.reverseNeedKey": "请先绑定 API Key 后再使用反推。",
  "side.reverseTimeout": "反推超时，请稍后重试。",
  "side.reverseClose": "关闭",
  "side.successTitle": "收录成功",
  "side.successBodyBound": "已提交到你的账号，可前往用户中心查看。",
  "side.successBodyGuest": "已提交到 Prompt-AI.Art，可前往网站查看。",
  "side.successOpenMine": "前往用户中心",
  "side.successOpenSite": "前往 Prompt-AI.Art",
  "side.successClose": "关闭",
  "side.titleLabel": "标题",
  "side.promptLabel": "提示词",
  "side.promptPlaceholder": "输入提示词…",
  "side.tags": "标签",
  "side.tagDraftPlaceholder": "输入新标签，回车加入",
  "side.tagFilterPlaceholder": "筛选标签…",
  "side.selectAll": "全选",
  "side.invertTags": "反选",
  "side.clearTags": "清空",
  "side.nsfw": "NSFW",
  "side.sourceUrl": "来源页面",
  "side.submit": "提交收录",
  "side.draftHint": "草稿自动保存在本机；关闭侧边栏不会丢失。",

  "side.auth.bound": "已绑定",
  "side.auth.unbound": "未绑定",
  "side.auth.boundLabel": "已绑定 ",
  "side.auth.boundNote": "· 收录归属本人。",
  "side.auth.unboundText":
    "未绑定 API Key：收录会匿名提交到待审核区。",
  "side.auth.savedKey": "已保存，留空保留",
  "side.queue.count":
    "离线队列 {count} 条，联网后自动重试（角标只表示待重试）。",
  "side.queue.empty": "没有待重试的提交。",
  "side.tags.empty": "没有匹配标签",
  "side.context.image": "右键图片",
  "side.context.selection": "选中文字：{text}",
  "side.context.page": "来自当前页面",
  "side.toast.verified": "API Key 已验证",
  "side.toast.savedAnon": "设置已保存（匿名模式）",
  "side.toast.unbound": "已解除绑定，可匿名提交",
  "side.toast.success": "收录成功",
  "side.toast.queued": "已加入离线队列，联网后自动重试",
  "side.toast.queueRetried": "离线队列已重试",
  "side.toast.verifyFailed": "验证失败",
  "side.error.promptRequired": "请填写提示词。",
  "side.error.imageRequired": "请先添加图片（扩展只支持图片）。",
  "side.error.apiKey":
    "API Key 失效或未绑定，请在“设置”中重新绑定；草稿已保留。",
  "side.error.submitFailed": "提交失败",
  "side.error.readPage": "读取页面失败",
  "side.error.noImage":
    "当前页面没有找到可用图片，可右键图片，或将图片拖入/点击上传。",
  "side.error.readingImage": "正在读取图片…",
  "side.error.readImage": "读取图片失败",
  "side.error.loadFailed": "读取失败",

  "menu.image": "收录这张图片到 Prompt-AI.ART",
  "menu.selection": "用选中文字收录到 Prompt-AI.ART",
  "bg.network": "网络不可用",
  "bg.submitFailed": "提交失败",
  "bg.imageReadFailed": "图片读取失败（HTTP {status}）",
  "bg.imageTooLarge": "图片超过 10MB",
  "bg.noActiveTab": "没有活动标签页",
  "bg.operationFailed": "操作失败",

  "options.title": "Prompt-AI.ART 扩展设置",
  "options.usageTitle": "使用方式",
  "options.usageLine1":
    "点击工具栏图标打开 Side Panel；在任意图片上右键选择“收录这张图片到 Prompt-AI.ART”，或按 Ctrl+Shift+Y / Command+Shift+Y 打开。",
  "options.usageLine2":
    "扩展只处理当前页/右键/拖入或点击上传的图片，不读取浏览历史。",
  "options.connectionTitle": "连接设置",
  "options.apiKeyLabel": "API Key",
  "options.keyPlaceholder": "留空保留已保存的 Key",
  "options.savedKey": "已保存，留空保留",
  "options.save": "保存",
  "options.saveVerify": "保存并验证",
  "options.getKey": "获取 API KEY",
  "options.unbind": "解除绑定",
  "options.privacyTitle": "权限与隐私",
  "options.privacyKey": "API Key 只保存在本机 chrome.storage.local。",
  "options.privacyHost":
    "为读取图片，扩展需要访问图片所在站点的权限；不会上传浏览历史。",
  "options.privacyNotifications":
    "不申请通知权限；角标只表示“待重试的离线队列”。",
  "options.privacyAnonymous": "未绑定 Key 时匿名提交，内容进入待审核区。",
  "options.install":
    "安装：chrome://extensions → 开发者模式 → 加载已解压的扩展程序 → 选择 dist 目录。",
  "options.status.boundPrefix": "已绑定 ",
  "options.status.unbound": "未绑定：将匿名提交到待审核区",
  "options.status.verifySuccess": "验证成功",
  "options.status.verifyFailed": "验证失败",
  "options.status.saved": "设置已保存",
} as const;

type MessageKey = keyof typeof zh;

const en: Record<MessageKey, string> = {
  "common.settings": "Settings",
  "side.title": "Prompt-AI.ART Collector",
  "side.account": "Account",
  "side.auth.checking": "Checking…",
  "side.auth.initial":
    "Bind an API Key to collect under your account; otherwise submissions go to the anonymous pending queue.",
  "side.auth.keyPlaceholder": "pa_… (leave blank to keep the saved key)",
  "side.apiKeyLabel": "API Key",
  "side.verify": "Save & verify",
  "side.unbind": "Unbind",
  "side.getKey": "Get API KEY",
  "side.keyHint":
    "The key is stored only in chrome.storage.local on this device and is never sent anywhere else.",
  "side.retryQueue": "Retry queue",
  "side.contextUse": "Use context",
  "side.contextDismiss": "Dismiss",
  "side.contextTitle": "Context menu content",
  "side.imageTitle": "Image",
  "side.readTab": "Read from page",
  "side.dropHint": "Drop an image here, or click to choose",
  "side.formTitle": "Collection details",
  "side.reverse": "Reverse prompt",
  "side.reverseConfirmTitle": "Reverse prompt?",
  "side.reverseConfirmBody":
    "Use the current image to generate a title, prompt and NSFW level, then fill the form. Continue?",
  "side.reverseStart": "Start reverse",
  "side.reverseCancel": "Cancel",
  "side.reverseProgressTitle": "Reversing prompt",
  "side.reverseQueued": "Reverse job queued…",
  "side.reverseRunning": "AI is analyzing the image…",
  "side.reverseDone": "Reverse complete; fields filled.",
  "side.reverseFailed": "Reverse failed",
  "side.reverseCanceled": "Reverse canceled",
  "side.reverseNeedImage": "Add an image first.",
  "side.reverseNeedKey": "Bind an API key before using reverse.",
  "side.reverseTimeout": "Reverse timed out. Try again later.",
  "side.reverseClose": "Close",
  "side.successTitle": "Collected successfully",
  "side.successBodyBound": "Submitted to your account. Open your user center to view it.",
  "side.successBodyGuest": "Submitted to Prompt-AI.Art. Open the website to view it.",
  "side.successOpenMine": "Open user center",
  "side.successOpenSite": "Open Prompt-AI.Art",
  "side.successClose": "Close",
  "side.titleLabel": "Title",
  "side.promptLabel": "Prompt",
  "side.promptPlaceholder": "Enter a prompt…",
  "side.tags": "Tags",
  "side.tagDraftPlaceholder": "Type a new tag, press Enter",
  "side.tagFilterPlaceholder": "Filter tags…",
  "side.selectAll": "Select all",
  "side.invertTags": "Invert",
  "side.clearTags": "Clear",
  "side.nsfw": "NSFW",
  "side.sourceUrl": "Source page",
  "side.submit": "Submit",
  "side.draftHint":
    "Drafts are saved locally; closing the side panel won't lose them.",

  "side.auth.bound": "Bound",
  "side.auth.unbound": "Not bound",
  "side.auth.boundLabel": "Bound ",
  "side.auth.boundNote": "· Saved to your account.",
  "side.auth.unboundText":
    "No API key: submissions go to the anonymous pending queue.",
  "side.auth.savedKey": "Saved; leave blank to keep",
  "side.queue.count":
    "{count} submission(s) queued; will retry when online (the badge only shows pending retries).",
  "side.queue.empty": "No pending retries.",
  "side.tags.empty": "No matching tags",
  "side.context.image": "Image from context menu",
  "side.context.selection": "Selected text: {text}",
  "side.context.page": "From the current page",
  "side.toast.verified": "API key verified",
  "side.toast.savedAnon": "Saved (anonymous mode)",
  "side.toast.unbound": "Unbound; anonymous submissions enabled",
  "side.toast.success": "Collected",
  "side.toast.queued": "Added to the offline queue; will retry when online",
  "side.toast.queueRetried": "Offline queue retried",
  "side.toast.verifyFailed": "Verification failed",
  "side.error.promptRequired": "Enter a prompt.",
  "side.error.imageRequired": "Add an image first (images only).",
  "side.error.apiKey":
    "API key is invalid or missing. Rebind it in Settings; your draft is kept.",
  "side.error.submitFailed": "Submission failed",
  "side.error.readPage": "Failed to read page",
  "side.error.noImage":
    "No usable image found on this page. Use the image context menu, or drag/drop or click to upload.",
  "side.error.readingImage": "Loading image…",
  "side.error.readImage": "Failed to load image",
  "side.error.loadFailed": "Load failed",

  "menu.image": "Collect this image to Prompt-AI.ART",
  "menu.selection": "Collect selected text to Prompt-AI.ART",
  "bg.network": "Network unavailable",
  "bg.submitFailed": "Submission failed",
  "bg.imageReadFailed": "Failed to load image (HTTP {status})",
  "bg.imageTooLarge": "Image exceeds 10 MB",
  "bg.noActiveTab": "No active tab",
  "bg.operationFailed": "Operation failed",

  "options.title": "Prompt-AI.ART Extension Settings",
  "options.usageTitle": "How to use",
  "options.usageLine1":
    "Click the toolbar icon to open the side panel. Right-click any image and choose “Collect this image to Prompt-AI.ART”, or press Ctrl+Shift+Y / Command+Shift+Y.",
  "options.usageLine2":
    "The extension only handles images from the current page, the context menu, or drag-and-drop/click upload. It never reads browsing history.",
  "options.connectionTitle": "Connection",
  "options.apiKeyLabel": "API Key",
  "options.keyPlaceholder": "Leave blank to keep the saved key",
  "options.savedKey": "Saved; leave blank to keep",
  "options.save": "Save",
  "options.saveVerify": "Save & verify",
  "options.getKey": "Get API KEY",
  "options.unbind": "Unbind",
  "options.privacyTitle": "Permissions & privacy",
  "options.privacyKey":
    "The API key is stored only in chrome.storage.local on this device.",
  "options.privacyHost":
    "To read images, the extension needs access to the image's site. Browsing history is never uploaded.",
  "options.privacyNotifications":
    "No notification permission is requested; the badge only shows pending offline retries.",
  "options.privacyAnonymous":
    "Without a bound key, submissions are anonymous and go to the pending review queue.",
  "options.install":
    "Install: chrome://extensions → Developer mode → Load unpacked → select the dist folder.",
  "options.status.boundPrefix": "Bound ",
  "options.status.unbound":
    "Not bound: submissions go to the anonymous pending queue",
  "options.status.verifySuccess": "Verified",
  "options.status.verifyFailed": "Verification failed",
  "options.status.saved": "Settings saved",
};

export function t(
  lang: Lang,
  key: string,
  params: Record<string, string | number> = {},
): string {
  const table = lang === "en" ? en : zh;
  const template = table[key as MessageKey] ?? zh[key as MessageKey] ?? key;
  return Object.entries(params).reduce(
    (text, [name, value]) => text.replaceAll(`{${name}}`, String(value)),
    template,
  );
}

export function applyI18n(lang: Lang, root: ParentNode = document): void {
  for (const element of root.querySelectorAll<HTMLElement>("[data-i18n]")) {
    const key = element.dataset.i18n;
    if (key) element.textContent = t(lang, key);
  }
  for (const element of root.querySelectorAll<HTMLInputElement>(
    "[data-i18n-placeholder]",
  )) {
    const key = element.dataset.i18nPlaceholder;
    if (key) element.placeholder = t(lang, key);
  }
}

export function markLangSwitch(lang: Lang): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-lang]",
  )) {
    const active = button.dataset.lang === lang;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", String(active));
  }
}

export function bindLangSwitch(onChange: (lang: Lang) => void): void {
  for (const button of document.querySelectorAll<HTMLButtonElement>(
    "[data-lang]",
  )) {
    button.addEventListener("click", () => {
      const lang: Lang = button.dataset.lang === "en" ? "en" : "zh";
      if (button.classList.contains("active")) return;
      onChange(lang);
      void saveLang(lang);
    });
  }

  chrome.storage.onChanged.addListener((changes: any, area: string) => {
    if (area !== "local" || !changes?.lang) return;
    onChange(changes.lang.newValue === "en" ? "en" : "zh");
  });
}
