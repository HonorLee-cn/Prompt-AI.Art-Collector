import {
  DEFAULT_SETTINGS,
  loadContext,
  loadQueue,
  loadSettings,
  normalizeBase,
  refreshBadge,
  saveQueue,
  saveSettings,
  type QueueItem,
  type Settings,
  type SubmitPayload,
} from "./shared";

class ApiRequestError extends Error {
  readonly status: number;
  readonly code: string;
  readonly retryable: boolean;

  constructor(
    message: string,
    status: number,
    code: string,
    retryable: boolean,
  ) {
    super(message);
    this.name = "ApiRequestError";
    this.status = status;
    this.code = code;
    this.retryable = retryable;
  }
}

function dataUrlToBlob(dataUrl: string): Blob {
  const match = /^data:([^;,]+)?(;base64)?,(.*)$/s.exec(dataUrl);
  if (!match) throw new Error("Invalid image data");

  const mime = match[1] || "image/jpeg";
  const bytes = match[2]
    ? Uint8Array.from(atob(match[3] ?? ""), (char) => char.charCodeAt(0))
    : new TextEncoder().encode(decodeURIComponent(match[3] ?? ""));

  return new Blob([bytes], { type: mime });
}

function arrayBufferToDataUrl(buffer: ArrayBuffer, mime: string): string {
  const bytes = new Uint8Array(buffer);
  let binary = "";
  const chunk = 0x8000;
  for (let index = 0; index < bytes.length; index += chunk) {
    binary += String.fromCharCode(...bytes.subarray(index, index + chunk));
  }
  return `data:${mime};base64,${btoa(binary)}`;
}

async function apiFetch(
  settings: Settings,
  path: string,
  init: RequestInit = {},
): Promise<any> {
  const headers = new Headers(init.headers);
  if (settings.apiKey)
    headers.set("authorization", `Bearer ${settings.apiKey}`);

  let response: Response;
  try {
    response = await fetch(`${settings.apiBase}/api/v1${path}`, {
      ...init,
      headers,
    });
  } catch {
    throw new ApiRequestError("网络不可用", 0, "NETWORK_ERROR", true);
  }

  if (!response.ok) {
    const payload = (await response.json().catch(() => null)) as {
      error?: { code?: string; message?: string };
    } | null;
    const status = response.status;
    const retryable = status >= 500 || status === 429 || status === 408;
    throw new ApiRequestError(
      payload?.error?.message ?? `HTTP ${status}`,
      status,
      payload?.error?.code ?? "HTTP_ERROR",
      retryable,
    );
  }

  if (response.status === 204) return null;
  return response.json();
}

async function submitItem(item: SubmitPayload): Promise<any> {
  const settings = await loadSettings();
  let mediaId: string | undefined;

  if (item.imageDataUrl) {
    const blob = dataUrlToBlob(item.imageDataUrl);
    const form = new FormData();
    form.append("file", blob, "extension.jpg");
    const media = await apiFetch(settings, "/media", {
      method: "POST",
      body: form,
    });
    mediaId = media?.media?.id;
  }

  const body = {
    title: item.title || null,
    promptZh: item.promptZh || null,
    promptEn: item.promptEn || null,
    negativePrompt: item.negativePrompt || null,
    tags: item.tags,
    nsfwLevel: item.nsfwLevel,
    mediaIds: mediaId ? [mediaId] : [],
    source: "extension",
    sourceUrl: item.sourceUrl || null,
    sourceSite: item.sourceSite || null,
    clientRef: item.clientRef,
  };

  const created = await apiFetch(settings, "/prompts", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });

  const prompt = created?.prompt;
  if (settings.apiKey && prompt?.id) {
    await apiFetch(settings, `/prompts/${prompt.id}/publish`, {
      method: "POST",
    });
  }

  return prompt;
}

async function enqueue(item: SubmitPayload, error: string): Promise<void> {
  const queue = await loadQueue();
  const existing = queue.find((entry) => entry.clientRef === item.clientRef);
  const now = Date.now();
  const next: QueueItem = {
    ...item,
    attempts: existing?.attempts ?? 0,
    nextRetryAt: now + 30_000,
    createdAt: existing?.createdAt ?? now,
    lastError: error,
  };

  const updated = existing
    ? queue.map((entry) => (entry.clientRef === item.clientRef ? next : entry))
    : [next, ...queue].slice(0, 20);

  await saveQueue(updated);
  await refreshBadge();
}

async function processQueue(
  force = false,
): Promise<{ processed: number; remaining: number }> {
  const queue = await loadQueue();
  const now = Date.now();
  let processed = 0;
  const remaining: QueueItem[] = [];

  for (const item of queue) {
    if (!force && item.nextRetryAt > now) {
      remaining.push(item);
      continue;
    }

    try {
      await submitItem(item);
      processed += 1;
    } catch (error) {
      processed += 1;
      const apiError =
        error instanceof ApiRequestError
          ? error
          : new ApiRequestError("提交失败", 0, "UNKNOWN", true);

      if (apiError.retryable) {
        const attempts = item.attempts + 1;
        const delay = Math.min(
          30 * 60_000,
          30_000 * 2 ** Math.min(attempts, 6),
        );
        remaining.push({
          ...item,
          attempts,
          nextRetryAt: Date.now() + delay,
          lastError: apiError.message,
        });
      }
    }
  }

  await saveQueue(remaining);
  await refreshBadge();
  return { processed, remaining: remaining.length };
}

async function fetchImageData(url: string): Promise<string> {
  const response = await fetch(url, { credentials: "include" });
  if (!response.ok) throw new Error(`图片读取失败（HTTP ${response.status}）`);

  const blob = await response.blob();
  if (blob.size > 10 * 1024 * 1024) throw new Error("图片超过 10MB");

  return arrayBufferToDataUrl(
    await blob.arrayBuffer(),
    blob.type || "image/jpeg",
  );
}

async function readActiveTab(): Promise<{
  imageUrl: string | null;
  selectionText: string;
  pageUrl: string;
  pageTitle: string;
}> {
  const [tab] = await chrome.tabs.query({ active: true, currentWindow: true });
  if (!tab?.id) throw new Error("没有活动标签页");

  const [result] = await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => {
      const images = [...document.images]
        .filter((image) => image.currentSrc || image.src)
        .map((image) => ({
          url: image.currentSrc || image.src,
          area: image.naturalWidth * image.naturalHeight,
        }))
        .sort((a, b) => b.area - a.area);

      return {
        imageUrl: images[0]?.url ?? null,
        selectionText: window.getSelection()?.toString() ?? "",
        pageUrl: location.href,
        pageTitle: document.title,
      };
    },
  });

  return (
    result?.result ?? {
      imageUrl: null,
      selectionText: "",
      pageUrl: tab.url ?? "",
      pageTitle: tab.title ?? "",
    }
  );
}

async function openPanel(tabId?: number): Promise<void> {
  try {
    if (tabId) await chrome.sidePanel.open({ tabId });
    else
      await chrome.sidePanel.open({
        windowId: chrome.windows.WINDOW_ID_CURRENT,
      });
  } catch {
    // The panel can only be opened from a user gesture; the action click fallback remains.
  }
}

async function initialize(): Promise<void> {
  await chrome.storage.local.remove("history");
  try {
    await chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });
  } catch {
    // Older Chrome versions may not expose setPanelBehavior.
  }

  chrome.contextMenus.removeAll(() => {
    chrome.contextMenus.create({
      id: "promptai-collect-image",
      title: "收录这张图片到 Prompt-AI.ART",
      contexts: ["image"],
    });
    chrome.contextMenus.create({
      id: "promptai-collect-selection",
      title: "用选中文字收录到 Prompt-AI.ART",
      contexts: ["selection"],
    });
  });

  chrome.alarms.create("promptai-process-queue", { periodInMinutes: 1 });
  await refreshBadge();
}

chrome.runtime.onInstalled.addListener(() => void initialize());
chrome.runtime.onStartup.addListener(() => {
  void refreshBadge();
  chrome.alarms.create("promptai-process-queue", { periodInMinutes: 1 });
});

chrome.commands.onCommand.addListener((command: any) => {
  if (command === "open-collector") {
    void chrome.tabs
      .query({ active: true, currentWindow: true })
      .then(([tab]: any[]) => openPanel(tab?.id));
  }
});

chrome.contextMenus.onClicked.addListener((info: any, tab: any) => {
  const imageUrl =
    info.menuItemId === "promptai-collect-image" ? info.srcUrl : undefined;
  const selectionText =
    info.menuItemId === "promptai-collect-selection"
      ? info.selectionText
      : undefined;

  void chrome.storage.local.set({
    pendingContext: {
      imageUrl,
      selectionText,
      pageUrl: info.pageUrl ?? tab?.url,
      pageTitle: tab?.title ?? "",
      createdAt: Date.now(),
    },
  });
  void openPanel(tab?.id);
});

chrome.alarms.onAlarm.addListener((alarm: any) => {
  if (alarm.name === "promptai-process-queue") void processQueue(false);
});

chrome.storage.onChanged.addListener((_changes: any, area: string) => {
  if (area === "local") void refreshBadge();
});

chrome.runtime.onMessage.addListener(
  (message: any, _sender: any, sendResponse: any) => {
    void (async () => {
      try {
        switch (message?.type) {
          case "GET_STATE": {
            const [settings, queue, context] = await Promise.all([
              loadSettings(),
              loadQueue(),
              loadContext(),
            ]);
            sendResponse({ ok: true, settings, queue, context });
            break;
          }
          case "SAVE_SETTINGS": {
            const current = await loadSettings();
            const next: Settings = {
              ...current,
              ...message.settings,
              apiBase: normalizeBase(
                message.settings?.apiBase ?? current.apiBase,
              ),
              webBase: normalizeBase(
                message.settings?.webBase ?? current.webBase,
              ),
            };
            await saveSettings(next);
            sendResponse({ ok: true, settings: next });
            break;
          }
          case "VERIFY_KEY": {
            const settings = await loadSettings();
            if (message.apiKey !== undefined)
              settings.apiKey = String(message.apiKey).trim();
            if (message.apiBase)
              settings.apiBase = normalizeBase(message.apiBase);
            if (message.webBase)
              settings.webBase = normalizeBase(message.webBase);

            if (!settings.apiKey) {
              settings.user = null;
              await saveSettings(settings);
              sendResponse({ ok: true, user: null, settings, anonymous: true });
              break;
            }

            const me = await apiFetch(settings, "/auth/me");
            settings.user = me.user;
            await saveSettings(settings);
            sendResponse({ ok: true, user: me.user, settings });
            break;
          }
          case "SUBMIT": {
            const item = message.item as SubmitPayload;
            try {
              const prompt = await submitItem(item);
              sendResponse({ ok: true, prompt });
            } catch (error) {
              const apiError =
                error instanceof ApiRequestError
                  ? error
                  : new ApiRequestError("提交失败", 0, "UNKNOWN", true);

              if (apiError.retryable) {
                await enqueue(item, apiError.message);
                sendResponse({
                  ok: false,
                  queued: true,
                  error: apiError.message,
                  code: apiError.code,
                });
              } else {
                sendResponse({
                  ok: false,
                  error: apiError.message,
                  code: apiError.code,
                });
              }
            }
            break;
          }
          case "PROCESS_QUEUE": {
            sendResponse({
              ok: true,
              ...(await processQueue(Boolean(message.force))),
            });
            break;
          }
          case "FETCH_IMAGE": {
            const dataUrl = await fetchImageData(String(message.url));
            sendResponse({ ok: true, dataUrl });
            break;
          }
          case "READ_TAB": {
            sendResponse({ ok: true, ...(await readActiveTab()) });
            break;
          }
          case "CLEAR_CONTEXT": {
            await chrome.storage.local.remove("pendingContext");
            sendResponse({ ok: true });
            break;
          }
          case "GET_TAGS": {
            const settings = await loadSettings();
            let response: any;
            try {
              response = await apiFetch(
                settings,
                settings.apiKey ? "/tags/all?limit=500" : "/tags?limit=200",
              );
            } catch {
              response = await apiFetch(settings, "/tags?limit=200");
            }
            const tags = (response?.data ?? [])
              .map((tag: any) => String(tag?.nameZh ?? "").trim())
              .filter(Boolean);
            sendResponse({ ok: true, tags });
            break;
          }
          case "OPEN_API_KEY_PAGE": {
            const settings = await loadSettings();
            await chrome.tabs.create({
              url: `${settings.webBase}/me/api-keys`,
            });
            sendResponse({ ok: true });
            break;
          }
          case "OPEN_MANAGE": {
            const settings = await loadSettings();
            const url = settings.user
              ? `${settings.webBase}/me/prompts`
              : `${settings.webBase}/`;
            await chrome.tabs.create({ url });
            sendResponse({ ok: true });
            break;
          }
          case "OPEN_PANEL": {
            const [tab] = await chrome.tabs.query({
              active: true,
              currentWindow: true,
            });
            await openPanel(tab?.id);
            sendResponse({ ok: true });
            break;
          }
          default:
            sendResponse({ ok: false, error: "Unknown message" });
        }
      } catch (error) {
        const apiError =
          error instanceof ApiRequestError
            ? error
            : new ApiRequestError(
                error instanceof Error ? error.message : "操作失败",
                0,
                "UNKNOWN",
                false,
              );
        sendResponse({
          ok: false,
          error: apiError.message,
          code: apiError.code,
        });
      }
    })();

    return true;
  },
);

void refreshBadge();
