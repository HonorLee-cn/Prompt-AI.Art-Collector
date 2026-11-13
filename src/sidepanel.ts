import {
  clearDraft,
  loadDraft,
  normalizeBase,
  saveDraft,
  sendMessage,
  type Draft,
  type HistoryItem,
  type PendingContext,
  type QueueItem,
  type Settings,
} from "./shared";

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

let settings: Settings | null = null;
let queue: QueueItem[] = [];
let history: HistoryItem[] = [];
let context: PendingContext | null = null;
let imageDataUrl = "";
let loading = true;
let draftTimer: number | undefined;

const apiBase = $<HTMLInputElement>("apiBase");
const webBase = $<HTMLInputElement>("webBase");
const apiKey = $<HTMLInputElement>("apiKey");
const settingsPanel = $<HTMLElement>("settingsPanel");
const authState = $<HTMLElement>("authState");
const authText = $<HTMLElement>("authText");
const contextBanner = $<HTMLElement>("contextBanner");
const contextText = $<HTMLElement>("contextText");
const imagePreview = $<HTMLImageElement>("imagePreview");
const dropHint = $<HTMLElement>("dropHint");
const imageDrop = $<HTMLElement>("imageDrop");
const imageError = $<HTMLElement>("imageError");
const fileInput = $<HTMLInputElement>("fileInput");
const imageUrl = $<HTMLInputElement>("imageUrl");
const titleInput = $<HTMLInputElement>("title");
const promptZh = $<HTMLTextAreaElement>("promptZh");
const promptEn = $<HTMLTextAreaElement>("promptEn");
const negativePrompt = $<HTMLInputElement>("negativePrompt");
const tagsInput = $<HTMLInputElement>("tags");
const nsfwLevel = $<HTMLSelectElement>("nsfwLevel");
const publishInput = $<HTMLInputElement>("publish");
const sourceUrl = $<HTMLInputElement>("sourceUrl");
const sourceSite = $<HTMLInputElement>("sourceSite");
const formError = $<HTMLElement>("formError");
const queueBadge = $<HTMLElement>("queueBadge");
const queueText = $<HTMLElement>("queueText");
const historyList = $<HTMLUListElement>("historyList");
const retryQueue = $<HTMLButtonElement>("retryQueue");
const toastElement = $<HTMLElement>("toast");

function showToast(message: string, tone: "info" | "error" = "info"): void {
  toastElement.textContent = message;
  toastElement.classList.toggle("error", tone === "error");
  toastElement.classList.remove("hidden");
  window.setTimeout(() => toastElement.classList.add("hidden"), 2600);
}

function showError(element: HTMLElement, message: string): void {
  element.textContent = message;
  element.classList.toggle("hidden", !message);
}

function updateAuth(): void {
  if (!settings) return;
  if (settings.user) {
    authState.textContent = "已绑定";
    authText.textContent = `已绑定 @${settings.user.username}，收录归属本人。`;
    publishInput.disabled = false;
  } else {
    authState.textContent = "未绑定";
    authText.textContent = "未绑定 API Key：收录会匿名提交到待审核区。";
    publishInput.disabled = true;
    publishInput.checked = false;
  }
}

function updateBadge(): void {
  queueBadge.textContent = String(queue.length);
  queueBadge.classList.toggle("hidden", queue.length === 0);
  queueText.textContent =
    queue.length > 0
      ? `离线队列 ${queue.length} 条，联网后自动重试（角标只表示待重试）。`
      : "没有待重试的提交。";
  retryQueue.classList.toggle("hidden", queue.length === 0);
}

function renderHistory(): void {
  historyList.innerHTML = "";
  for (const item of history.slice(0, 10)) {
    const li = document.createElement("li");
    const title = document.createElement("span");
    title.className = "title";
    title.textContent = item.title;
    const status = document.createElement("span");
    status.className = `status-${item.status}`;
    status.textContent =
      item.status === "submitted"
        ? "已提交"
        : item.status === "queued"
          ? "待重试"
          : "失败";
    status.title = item.error ?? "";
    li.append(title, status);
    historyList.append(li);
  }

  if (history.length === 0) {
    const li = document.createElement("li");
    li.className = "muted tiny";
    li.textContent = "还没有提交记录。";
    historyList.append(li);
  }
}

function renderContext(): void {
  if (!context) {
    contextBanner.classList.add("hidden");
    return;
  }

  contextBanner.classList.remove("hidden");
  const parts = [];
  if (context.imageUrl) parts.push("右键图片");
  if (context.selectionText)
    parts.push(`选中文字：${context.selectionText.slice(0, 50)}`);
  if (context.pageTitle) parts.push(context.pageTitle);
  contextText.textContent = parts.join(" · ") || "来自当前页面";
}

function fillSettings(): void {
  if (!settings) return;
  apiBase.value = settings.apiBase;
  webBase.value = settings.webBase;
  apiKey.value = "";
  apiKey.placeholder = settings.apiKey ? "已保存，留空保留" : "pa_…";
  updateAuth();
}

function readForm(): Draft {
  return {
    title: titleInput.value.trim(),
    promptZh: promptZh.value.trim(),
    promptEn: promptEn.value.trim(),
    negativePrompt: negativePrompt.value.trim(),
    tags: tagsInput.value.trim(),
    nsfwLevel: Number(nsfwLevel.value),
    sourceUrl: sourceUrl.value.trim(),
    sourceSite: sourceSite.value.trim(),
    imageDataUrl,
    publish: publishInput.checked,
    savedAt: Date.now(),
  };
}

function applyForm(draft: Partial<Draft>): void {
  titleInput.value = draft.title ?? "";
  promptZh.value = draft.promptZh ?? "";
  promptEn.value = draft.promptEn ?? "";
  negativePrompt.value = draft.negativePrompt ?? "";
  tagsInput.value = draft.tags ?? "";
  nsfwLevel.value = String(draft.nsfwLevel ?? 0);
  sourceUrl.value = draft.sourceUrl ?? "";
  sourceSite.value = draft.sourceSite ?? "";
  publishInput.checked = Boolean(draft.publish);
  if (draft.imageDataUrl) setImage(draft.imageDataUrl);
}

function scheduleDraft(): void {
  if (loading) return;
  window.clearTimeout(draftTimer);
  draftTimer = window.setTimeout(() => {
    void saveDraft(readForm());
  }, 400);
}

function setImage(dataUrl: string): void {
  imageDataUrl = dataUrl;
  imagePreview.src = dataUrl;
  imagePreview.classList.remove("hidden");
  dropHint.classList.add("hidden");
  showError(imageError, "");
  scheduleDraft();
}

function clearImage(): void {
  imageDataUrl = "";
  imagePreview.src = "";
  imagePreview.classList.add("hidden");
  dropHint.classList.remove("hidden");
}

function clearForm(): void {
  applyForm({
    title: "",
    promptZh: "",
    promptEn: "",
    negativePrompt: "",
    tags: "",
    nsfwLevel: 0,
    sourceUrl: "",
    sourceSite: "",
    publish: false,
    imageDataUrl: "",
  });
  clearImage();
  void clearDraft();
}

async function compressDataUrl(dataUrl: string): Promise<string> {
  return new Promise((resolve) => {
    const image = new Image();
    image.onload = () => {
      const max = 1280;
      const scale = Math.min(1, max / Math.max(image.width, image.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(image.width * scale));
      canvas.height = Math.max(1, Math.round(image.height * scale));
      const ctx = canvas.getContext("2d");
      if (!ctx) {
        resolve(dataUrl);
        return;
      }
      ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
      resolve(canvas.toDataURL("image/jpeg", 0.85));
    };
    image.onerror = () => resolve(dataUrl);
    image.src = dataUrl;
  });
}

async function fileToDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result));
    reader.onerror = () => reject(new Error("读取图片失败"));
    reader.readAsDataURL(file);
  });
}

async function onFile(file: File): Promise<void> {
  try {
    setImage(await compressDataUrl(await fileToDataUrl(file)));
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : "读取图片失败",
    );
  }
}

async function fetchImage(url: string): Promise<void> {
  if (!url) return;
  showError(imageError, "正在读取图片…");

  try {
    const response = await sendMessage<{
      ok: boolean;
      dataUrl?: string;
      error?: string;
    }>({
      type: "FETCH_IMAGE",
      url,
    });
    if (!response.ok || !response.dataUrl)
      throw new Error(response.error ?? "读取失败");
    setImage(await compressDataUrl(response.dataUrl));
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : "读取图片失败",
    );
  }
}

async function readTab(): Promise<void> {
  try {
    const response = await sendMessage<{
      ok: boolean;
      imageUrl?: string | null;
      selectionText?: string;
      pageUrl?: string;
      pageTitle?: string;
      error?: string;
    }>({ type: "READ_TAB" });

    if (!response.ok) throw new Error(response.error ?? "读取页面失败");

    if (response.pageUrl && !sourceUrl.value)
      sourceUrl.value = response.pageUrl;
    if (response.pageUrl && !sourceSite.value) {
      try {
        sourceSite.value = new URL(response.pageUrl).hostname;
      } catch {
        // ignore invalid URL
      }
    }
    if (response.selectionText && !promptZh.value)
      promptZh.value = response.selectionText;
    if (response.imageUrl) await fetchImage(response.imageUrl);
    else
      showError(
        imageError,
        "当前页面没有找到可用图片，可右键图片或手动粘贴链接。",
      );
    scheduleDraft();
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : "读取页面失败",
    );
  }
}

async function verifyKey(): Promise<void> {
  const key = apiKey.value.trim();
  const response = await sendMessage<{
    ok: boolean;
    user?: Settings["user"];
    settings?: Settings;
    error?: string;
  }>({
    type: "VERIFY_KEY",
    ...(key ? { apiKey: key } : {}),
    apiBase: apiBase.value,
    webBase: webBase.value,
  });

  if (!response.ok) {
    showToast(response.error ?? "验证失败", "error");
    return;
  }

  settings = response.settings ?? settings;
  fillSettings();
  showToast(settings?.user ? "API Key 已验证" : "设置已保存（匿名模式）");
}

async function clearKey(): Promise<void> {
  const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
    type: "SAVE_SETTINGS",
    settings: { apiKey: "", user: null },
  });
  if (response.settings) settings = response.settings;
  fillSettings();
  showToast("已解除绑定，可匿名提交");
}

async function submit(): Promise<void> {
  showError(formError, "");

  if (!promptZh.value.trim() && !promptEn.value.trim()) {
    showError(formError, "至少填写中文或英文提示词。");
    return;
  }
  if (!imageDataUrl) {
    showError(formError, "请先添加图片（扩展只支持图片）。");
    return;
  }

  const item = {
    clientRef: crypto.randomUUID(),
    title: titleInput.value.trim(),
    promptZh: promptZh.value.trim(),
    promptEn: promptEn.value.trim(),
    negativePrompt: negativePrompt.value.trim(),
    tags: tagsInput.value
      .split(/[,，]/)
      .map((value) => value.trim())
      .filter(Boolean),
    nsfwLevel: Number(nsfwLevel.value),
    imageDataUrl,
    sourceUrl: sourceUrl.value.trim(),
    sourceSite:
      sourceSite.value.trim() ||
      (() => {
        try {
          return sourceUrl.value ? new URL(sourceUrl.value).hostname : "";
        } catch {
          return "";
        }
      })(),
    publish: publishInput.checked,
  };

  const response = await sendMessage<{
    ok: boolean;
    queued?: boolean;
    prompt?: { id: string };
    error?: string;
    code?: string;
  }>({ type: "SUBMIT", item });

  if (response.ok) {
    showToast("收录成功");
    clearForm();
    await refreshState();
    return;
  }

  if (response.queued) {
    showToast("已加入离线队列，联网后自动重试");
    clearForm();
    await refreshState();
    return;
  }

  const message =
    response.code === "API_KEY_INVALID" || response.code === "AUTH_REQUIRED"
      ? "API Key 失效或未绑定，请在“设置”中重新绑定；草稿已保留。"
      : (response.error ?? "提交失败");
  showToast(message, "error");
  showError(formError, message);
}

async function refreshState(): Promise<void> {
  const response = await sendMessage<{
    ok: boolean;
    settings?: Settings;
    queue?: QueueItem[];
    history?: HistoryItem[];
    context?: PendingContext | null;
  }>({ type: "GET_STATE" });

  if (!response.ok) return;
  settings = response.settings ?? settings;
  queue = response.queue ?? [];
  history = response.history ?? [];
  context = response.context ?? null;
  fillSettings();
  updateBadge();
  renderHistory();
  renderContext();
}

async function init(): Promise<void> {
  await refreshState();

  const draft = await loadDraft();
  if (draft) applyForm(draft);

  if (context?.pageUrl && !sourceUrl.value) sourceUrl.value = context.pageUrl;
  if (context?.selectionText && !promptZh.value)
    promptZh.value = context.selectionText;

  loading = false;

  for (const element of [
    titleInput,
    promptZh,
    promptEn,
    negativePrompt,
    tagsInput,
    nsfwLevel,
    sourceUrl,
    sourceSite,
  ]) {
    element.addEventListener("input", scheduleDraft);
  }
  publishInput.addEventListener("change", scheduleDraft);
}

$("toggleSettings").addEventListener("click", () =>
  settingsPanel.classList.toggle("hidden"),
);
$("verifyKey").addEventListener("click", () => void verifyKey());
$("clearKey").addEventListener("click", () => void clearKey());
$("pickFile").addEventListener("click", () => fileInput.click());
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void onFile(file);
  fileInput.value = "";
});
$("fetchUrl").addEventListener(
  "click",
  () => void fetchImage(imageUrl.value.trim()),
);
$("readTab").addEventListener("click", () => void readTab());
$("submit").addEventListener("click", () => void submit());
$("retryQueue").addEventListener("click", async () => {
  await sendMessage({ type: "PROCESS_QUEUE", force: true });
  await refreshState();
  showToast("离线队列已重试");
});
$("manage").addEventListener(
  "click",
  () => void sendMessage({ type: "OPEN_MANAGE" }),
);
$("useContext").addEventListener("click", async () => {
  if (context?.imageUrl) await fetchImage(context.imageUrl);
  if (context?.pageUrl && !sourceUrl.value) sourceUrl.value = context.pageUrl;
  if (context?.selectionText && !promptZh.value)
    promptZh.value = context.selectionText;
  await sendMessage({ type: "CLEAR_CONTEXT" });
  context = null;
  renderContext();
  scheduleDraft();
});
$("dismissContext").addEventListener("click", async () => {
  await sendMessage({ type: "CLEAR_CONTEXT" });
  context = null;
  renderContext();
});

imageDrop.addEventListener("dragover", (event) => {
  event.preventDefault();
  imageDrop.classList.add("dragging");
});
imageDrop.addEventListener("dragleave", () =>
  imageDrop.classList.remove("dragging"),
);
imageDrop.addEventListener("drop", (event) => {
  event.preventDefault();
  imageDrop.classList.remove("dragging");
  const file = event.dataTransfer?.files?.[0];
  if (file) void onFile(file);
});

document.addEventListener("paste", (event) => {
  const item = [...(event.clipboardData?.items ?? [])].find((entry) =>
    entry.type.startsWith("image/"),
  );
  const file = item?.getAsFile();
  if (file) {
    event.preventDefault();
    void onFile(file);
  }
});

window.addEventListener("beforeunload", () => {
  if (!loading) void saveDraft(readForm());
});

void init();
