export interface ExtensionUser {
  id: string;
  username: string;
  nickname: string | null;
  email: string;
  role: string;
}

export interface Settings {
  apiBase: string;
  webBase: string;
  apiKey: string;
  user: ExtensionUser | null;
}

export interface Draft {
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  tags: string;
  nsfwLevel: number;
  sourceUrl: string;
  sourceSite: string;
  imageDataUrl: string;
  publish: boolean;
  savedAt: number;
}

export interface SubmitPayload {
  clientRef: string;
  title: string;
  promptZh: string;
  promptEn: string;
  negativePrompt: string;
  tags: string[];
  nsfwLevel: number;
  imageDataUrl: string;
  sourceUrl: string;
  sourceSite: string;
  publish: boolean;
}

export interface QueueItem extends SubmitPayload {
  attempts: number;
  nextRetryAt: number;
  createdAt: number;
  lastError?: string;
}

export interface HistoryItem {
  clientRef: string;
  title: string;
  status: "queued" | "submitted" | "failed";
  promptId?: string;
  error?: string;
  createdAt: number;
}

export interface PendingContext {
  imageUrl?: string;
  selectionText?: string;
  pageUrl?: string;
  pageTitle?: string;
  createdAt: number;
}

const SETTINGS_KEY = "settings";
const DRAFT_KEY = "draft";
const QUEUE_KEY = "queue";
const HISTORY_KEY = "history";
const CONTEXT_KEY = "pendingContext";

export const DEFAULT_SETTINGS: Settings = {
  apiBase: "http://localhost:3000",
  webBase: "http://localhost:5173",
  apiKey: "",
  user: null,
};

export function normalizeBase(value: string): string {
  return value.trim().replace(/\/+$/, "");
}

export async function loadSettings(): Promise<Settings> {
  const result = await chrome.storage.local.get(SETTINGS_KEY);
  const stored = (result?.[SETTINGS_KEY] ?? {}) as Partial<Settings>;
  return {
    ...DEFAULT_SETTINGS,
    ...stored,
    apiBase: normalizeBase(stored.apiBase ?? DEFAULT_SETTINGS.apiBase),
    webBase: normalizeBase(stored.webBase ?? DEFAULT_SETTINGS.webBase),
  };
}

export async function saveSettings(settings: Settings): Promise<void> {
  await chrome.storage.local.set({ [SETTINGS_KEY]: settings });
}

export async function loadDraft(): Promise<Draft | null> {
  const result = await chrome.storage.local.get(DRAFT_KEY);
  return (result?.[DRAFT_KEY] as Draft | undefined) ?? null;
}

export async function saveDraft(draft: Draft): Promise<void> {
  await chrome.storage.local.set({
    [DRAFT_KEY]: { ...draft, savedAt: Date.now() },
  });
}

export async function clearDraft(): Promise<void> {
  await chrome.storage.local.remove(DRAFT_KEY);
}

export async function loadQueue(): Promise<QueueItem[]> {
  const result = await chrome.storage.local.get(QUEUE_KEY);
  return (result?.[QUEUE_KEY] as QueueItem[] | undefined) ?? [];
}

export async function saveQueue(queue: QueueItem[]): Promise<void> {
  await chrome.storage.local.set({ [QUEUE_KEY]: queue });
}

export async function loadHistory(): Promise<HistoryItem[]> {
  const result = await chrome.storage.local.get(HISTORY_KEY);
  return (result?.[HISTORY_KEY] as HistoryItem[] | undefined) ?? [];
}

export async function saveHistory(history: HistoryItem[]): Promise<void> {
  await chrome.storage.local.set({ [HISTORY_KEY]: history.slice(0, 50) });
}

export async function upsertHistory(item: HistoryItem): Promise<void> {
  const history = await loadHistory();
  const next = [
    item,
    ...history.filter((entry) => entry.clientRef !== item.clientRef),
  ];
  await saveHistory(next);
}

export async function loadContext(): Promise<PendingContext | null> {
  const result = await chrome.storage.local.get(CONTEXT_KEY);
  return (result?.[CONTEXT_KEY] as PendingContext | undefined) ?? null;
}

export async function saveContext(
  context: PendingContext | null,
): Promise<void> {
  if (context) await chrome.storage.local.set({ [CONTEXT_KEY]: context });
  else await chrome.storage.local.remove(CONTEXT_KEY);
}

export async function refreshBadge(): Promise<void> {
  const queue = await loadQueue();
  await chrome.action.setBadgeBackgroundColor({ color: "#f59e0b" });
  await chrome.action.setBadgeText({
    text: queue.length > 0 ? String(queue.length) : "",
  });
}

export async function sendMessage<T>(
  message: Record<string, unknown>,
): Promise<T> {
  return (await chrome.runtime.sendMessage(message)) as T;
}
