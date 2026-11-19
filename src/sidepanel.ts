import {
  clearDraft,
  loadDraft,
  loadLang,
  saveDraft,
  sendMessage,
  type Draft,
  type Lang,
  type PendingContext,
  type QueueItem,
  type Settings,
  type TagOption,
} from "./shared";
import { applyI18n, bindLangSwitch, markLangSwitch, t } from "./i18n";

const $ = <T extends HTMLElement>(id: string): T => {
  const element = document.getElementById(id);
  if (!element) throw new Error(`Missing element #${id}`);
  return element as T;
};

let settings: Settings | null = null;
let queue: QueueItem[] = [];
let context: PendingContext | null = null;
let imageDataUrl = "";
let loading = true;
let draftTimer: number | undefined;
let lang: Lang = "zh";

const apiKey = $<HTMLInputElement>("apiKey");
const keyField = $<HTMLElement>("keyField");
const verifyKeyButton = $<HTMLButtonElement>("verifyKey");
const clearKeyButton = $<HTMLButtonElement>("clearKey");
const settingsPanel = $<HTMLElement>("settingsPanel");
const authState = $<HTMLElement>("authState");
const authText = $<HTMLElement>("authText");
const boundBadge = $<HTMLElement>("boundBadge");
const boundNote = $<HTMLElement>("boundNote");
const contextBanner = $<HTMLElement>("contextBanner");
const contextText = $<HTMLElement>("contextText");
const imagePreview = $<HTMLImageElement>("imagePreview");
const dropHint = $<HTMLElement>("dropHint");
const imageDrop = $<HTMLElement>("imageDrop");
const imageError = $<HTMLElement>("imageError");
const fileInput = $<HTMLInputElement>("fileInput");
const titleInput = $<HTMLInputElement>("title");
const promptText = $<HTMLTextAreaElement>("promptText");
const sourceUrl = $<HTMLInputElement>("sourceUrl");
const selectedTags = $<HTMLElement>("selectedTags");
const tagDraft = $<HTMLInputElement>("tagDraft");
const tagFilter = $<HTMLInputElement>("tagFilter");
const tagOptions = $<HTMLElement>("tagOptions");
const nsfwPicker = $<HTMLElement>("nsfwPicker");
const getApiKey = $<HTMLButtonElement>("getApiKey");
const queueRow = $<HTMLElement>("queueRow");
let availableTags: TagOption[] = [];
let selectedTagValues: string[] = [];
let nsfwValue = 0;
const MAX_TAGS = 10;
const formError = $<HTMLElement>("formError");
const queueBadge = $<HTMLElement>("queueBadge");
const queueText = $<HTMLElement>("queueText");
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

function applyLanguage(next: Lang): void {
  lang = next;
  document.documentElement.lang = next === "en" ? "en" : "zh-CN";
  applyI18n(lang);
  markLangSwitch(lang);
  updateAuth();
  updateBadge();
  renderTags();
  renderContext();
}

function updateAuth(): void {
  if (!settings) return;
  const bound = Boolean(settings.user);
  if (bound) {
    authState.textContent = t(lang, "side.auth.bound");
    const label = document.createElement("span");
    label.className = "muted";
    label.textContent = t(lang, "side.auth.boundLabel");
    const username = document.createElement("span");
    username.className = "bound-user";
    username.textContent = `@${settings.user?.username}`;
    boundBadge.replaceChildren(label, username);
    boundBadge.classList.remove("hidden");
    boundNote.classList.remove("hidden");
    authText.classList.add("hidden");
  } else {
    authState.textContent = t(lang, "side.auth.unbound");
    boundBadge.classList.add("hidden");
    boundNote.classList.add("hidden");
    authText.classList.remove("hidden");
    authText.textContent = t(lang, "side.auth.unboundText");
  }
  keyField.classList.toggle("hidden", bound);
  verifyKeyButton.classList.toggle("hidden", bound);
  clearKeyButton.classList.toggle("hidden", !bound);
  getApiKey.classList.toggle("hidden", bound);
}

function updateBadge(): void {
  queueBadge.textContent = String(queue.length);
  queueBadge.classList.toggle("hidden", queue.length === 0);
  queueText.textContent =
    queue.length > 0
      ? t(lang, "side.queue.count", { count: queue.length })
      : t(lang, "side.queue.empty");
  queueRow.classList.toggle("hidden", queue.length === 0);
  retryQueue.classList.toggle("hidden", queue.length === 0);
}

function tagForName(name: string): TagOption {
  const key = name.trim().toLowerCase();
  return (
    availableTags.find((tag) => tag.nameZh.toLowerCase() === key) ??
    availableTags.find((tag) => (tag.nameEn ?? "").toLowerCase() === key) ?? {
      nameZh: name,
      nameEn: null,
    }
  );
}

function tagDisplay(tag: TagOption): string {
  return lang === "en" ? tag.nameEn?.trim() || tag.nameZh : tag.nameZh;
}

function resolveTagName(raw: string): string {
  return tagForName(raw).nameZh;
}

function matchesTagQuery(tag: TagOption, query: string): boolean {
  if (!query) return true;
  return `${tag.nameZh} ${tag.nameEn ?? ""}`.toLowerCase().includes(query);
}

function renderTags(): void {
  selectedTags.innerHTML = "";
  if (nsfwPicker) {
    for (const button of nsfwPicker.querySelectorAll<HTMLButtonElement>("button")) {
      button.classList.toggle("active", Number(button.dataset.level) === nsfwValue);
    }
  }

  for (const name of selectedTagValues) {
    const chip = document.createElement("span");
    chip.className = "tag-chip";
    chip.append(`#${tagDisplay(tagForName(name))}`);
    const remove = document.createElement("button");
    remove.type = "button";
    remove.textContent = "×";
    remove.addEventListener("click", () => toggleTag(name));
    chip.append(remove);
    selectedTags.append(chip);
  }

  const query = tagFilter.value.trim().toLowerCase();
  const names = [...new Set([...availableTags.map((tag) => tag.nameZh), ...selectedTagValues])]
    .filter((name) => matchesTagQuery(tagForName(name), query))
    .sort((a, b) => tagDisplay(tagForName(a)).localeCompare(tagDisplay(tagForName(b))));
  tagOptions.innerHTML = "";
  if (names.length === 0) {
    const empty = document.createElement("span");
    empty.className = "muted tiny";
    empty.textContent = t(lang, "side.tags.empty");
    tagOptions.append(empty);
    return;
  }
  for (const name of names) {
    const button = document.createElement("button");
    button.type = "button";
    button.className = `tag-option${selectedTagValues.includes(name) ? " active" : ""}`;
    button.textContent = `#${tagDisplay(tagForName(name))}`;
    button.addEventListener("click", () => toggleTag(name));
    tagOptions.append(button);
  }
}

function toggleTag(name: string): void {
  selectedTagValues = selectedTagValues.includes(name)
    ? selectedTagValues.filter((item) => item !== name)
    : selectedTagValues.length >= MAX_TAGS
      ? selectedTagValues
      : [...selectedTagValues, name];
  renderTags();
  scheduleDraft();
}

function addTag(): void {
  const raw = tagDraft.value.trim().replace(/^#/, "");
  if (!raw) return;
  const name = resolveTagName(raw);
  if (!selectedTagValues.includes(name) && selectedTagValues.length < MAX_TAGS) {
    selectedTagValues = [...selectedTagValues, name];
  }
  tagDraft.value = "";
  renderTags();
  scheduleDraft();
}

async function loadTags(): Promise<void> {
  const response = await sendMessage<{ ok: boolean; tags?: TagOption[] }>({
    type: "GET_TAGS",
  });
  availableTags = response.ok ? (response.tags ?? []) : [];
  selectedTagValues = [...new Set(selectedTagValues.map(resolveTagName))];
  renderTags();
}


function renderContext(): void {
  if (!context) {
    contextBanner.classList.add("hidden");
    return;
  }

  contextBanner.classList.remove("hidden");
  const parts = [];
  if (context.imageUrl) parts.push(t(lang, "side.context.image"));
  if (context.selectionText)
    parts.push(
      t(lang, "side.context.selection", {
        text: context.selectionText.slice(0, 50),
      }),
    );
  if (context.pageTitle) parts.push(context.pageTitle);
  contextText.textContent = parts.join(" · ") || t(lang, "side.context.page");
}

function fillSettings(): void {
  if (!settings) return;
  apiKey.value = "";
  apiKey.placeholder = settings.apiKey
    ? t(lang, "side.auth.savedKey")
    : t(lang, "side.auth.keyPlaceholder");
  updateAuth();
}

function readForm(): Draft {
  return {
    title: titleInput.value.trim(),
    promptText: promptText.value.trim(),
    tags: selectedTagValues,
    nsfwLevel: nsfwValue,
    sourceUrl: sourceUrl.value.trim(),
    imageDataUrl,
    savedAt: Date.now(),
  };
}

function applyForm(draft: Partial<Draft>): void {
  titleInput.value = draft.title ?? "";
  const legacyPrompt = draft as Partial<Draft> & {
    promptZh?: string;
    promptEn?: string;
  };
  promptText.value =
    draft.promptText ??
    (lang === "zh"
      ? (legacyPrompt.promptZh ?? legacyPrompt.promptEn)
      : (legacyPrompt.promptEn ?? legacyPrompt.promptZh)) ??
    "";
  const legacyTags = (draft as unknown as { tags?: unknown }).tags;
  selectedTagValues = Array.isArray(legacyTags)
    ? legacyTags.map((value) => String(value))
    : typeof legacyTags === "string"
      ? legacyTags
          .split(/[,，]/)
          .map((value: string) => value.trim())
          .filter(Boolean)
      : [];
  nsfwValue = Number(draft.nsfwLevel ?? 0);
  sourceUrl.value = draft.sourceUrl ?? "";
  renderTags();
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
    promptText: "",
    tags: [],
    nsfwLevel: 0,
    sourceUrl: "",
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
    reader.onerror = () => reject(new Error(t(lang, "side.error.readImage")));
    reader.readAsDataURL(file);
  });
}

async function onFile(file: File): Promise<void> {
  try {
    setImage(await compressDataUrl(await fileToDataUrl(file)));
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : t(lang, "side.error.readImage"),
    );
  }
}

async function fetchImage(url: string): Promise<void> {
  if (!url) return;
  showError(imageError, t(lang, "side.error.readingImage"));

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
      throw new Error(response.error ?? t(lang, "side.error.loadFailed"));
    setImage(await compressDataUrl(response.dataUrl));
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : t(lang, "side.error.readImage"),
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

    if (!response.ok)
      throw new Error(response.error ?? t(lang, "side.error.readPage"));

    if (response.pageUrl && !sourceUrl.value)
      sourceUrl.value = response.pageUrl;
    if (response.selectionText && !promptText.value)
      promptText.value = response.selectionText;
    if (response.imageUrl) await fetchImage(response.imageUrl);
    else
      showError(
        imageError,
        t(lang, "side.error.noImage"),
      );
    scheduleDraft();
  } catch (error) {
    showError(
      imageError,
      error instanceof Error ? error.message : t(lang, "side.error.readPage"),
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
  });

  if (!response.ok) {
    showToast(response.error ?? t(lang, "side.toast.verifyFailed"), "error");
    return;
  }

  settings = response.settings ?? settings;
  fillSettings();
  await loadTags();
  showToast(
    settings?.user
      ? t(lang, "side.toast.verified")
      : t(lang, "side.toast.savedAnon"),
  );
}

async function clearKey(): Promise<void> {
  const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
    type: "SAVE_SETTINGS",
    settings: { apiKey: "", user: null },
  });
  if (response.settings) settings = response.settings;
  fillSettings();
  await loadTags();
  showToast(t(lang, "side.toast.unbound"));
}

async function submit(): Promise<void> {
  showError(formError, "");

  const prompt = promptText.value.trim();
  if (!prompt) {
    showError(formError, t(lang, "side.error.promptRequired"));
    return;
  }
  if (!imageDataUrl) {
    showError(formError, t(lang, "side.error.imageRequired"));
    return;
  }

  const item = {
    clientRef: crypto.randomUUID(),
    title: lang === "zh" ? titleInput.value.trim() : "",
    titleEn: lang === "en" ? titleInput.value.trim() : "",
    promptZh: lang === "zh" ? prompt : "",
    promptEn: lang === "en" ? prompt : "",
    negativePrompt: "",
    tags: selectedTagValues,
    nsfwLevel: nsfwValue,
    imageDataUrl,
    sourceUrl: sourceUrl.value.trim(),
    sourceSite: (() => {
      try {
        return sourceUrl.value ? new URL(sourceUrl.value).hostname : "";
      } catch {
        return "";
      }
    })(),
  };

  const response = await sendMessage<{
    ok: boolean;
    queued?: boolean;
    prompt?: { id: string };
    error?: string;
    code?: string;
  }>({ type: "SUBMIT", item });

  if (response.ok) {
    showToast(t(lang, "side.toast.success"));
    clearForm();
    await refreshState();
    return;
  }

  if (response.queued) {
    showToast(t(lang, "side.toast.queued"));
    clearForm();
    await refreshState();
    return;
  }

  const message =
    response.code === "API_KEY_INVALID" || response.code === "AUTH_REQUIRED"
      ? t(lang, "side.error.apiKey")
      : (response.error ?? t(lang, "side.error.submitFailed"));
  showToast(message, "error");
  showError(formError, message);
}

async function refreshState(): Promise<void> {
  const response = await sendMessage<{
    ok: boolean;
    settings?: Settings;
    queue?: QueueItem[];
    context?: PendingContext | null;
  }>({ type: "GET_STATE" });

  if (!response.ok) return;
  settings = response.settings ?? settings;
  queue = response.queue ?? [];
  context = response.context ?? null;
  fillSettings();
  updateBadge();
  renderContext();
}

async function init(): Promise<void> {
  lang = await loadLang();
  applyLanguage(lang);
  await refreshState();

  const draft = await loadDraft();
  if (draft) applyForm(draft);

  if (context?.pageUrl && !sourceUrl.value) sourceUrl.value = context.pageUrl;
  if (context?.selectionText && !promptText.value)
    promptText.value = context.selectionText;

  loading = false;
  await loadTags();

  for (const element of [titleInput, promptText, sourceUrl]) {
    element.addEventListener("input", scheduleDraft);
  }
  tagFilter.addEventListener("input", renderTags);
  tagDraft.addEventListener("keydown", (event) => {
    if (event.key === "Enter") {
      event.preventDefault();
      addTag();
    }
  });
  nsfwPicker.addEventListener("click", (event) => {
    const target = event.target as HTMLElement;
    const button = target.closest<HTMLButtonElement>("button[data-level]");
    if (!button) return;
    nsfwValue = Number(button.dataset.level);
    renderTags();
    scheduleDraft();
  });
}

$("toggleSettings").addEventListener("click", () =>
  settingsPanel.classList.toggle("hidden"),
);
verifyKeyButton.addEventListener("click", () => void verifyKey());
clearKeyButton.addEventListener("click", () => void clearKey());
getApiKey.addEventListener("click", () => {
  void sendMessage({ type: "OPEN_API_KEY_PAGE" });
});
$("selectAllTags").addEventListener("click", () => {
  selectedTagValues = [...new Set([...selectedTagValues, ...availableTags.map((tag) => tag.nameZh)])].slice(
    0,
    MAX_TAGS,
  );
  renderTags();
  scheduleDraft();
});
$("invertTags").addEventListener("click", () => {
  const query = tagFilter.value.trim().toLowerCase();
  const names = [...new Set([...availableTags.map((tag) => tag.nameZh), ...selectedTagValues])].filter(
    (name) => matchesTagQuery(tagForName(name), query),
  );
  const next = new Set(selectedTagValues);
  for (const name of names) {
    if (next.has(name)) next.delete(name);
    else next.add(name);
  }
  selectedTagValues = [...next].slice(0, MAX_TAGS);
  renderTags();
  scheduleDraft();
});
$("clearTags").addEventListener("click", () => {
  selectedTagValues = [];
  renderTags();
  scheduleDraft();
});
imageDrop.addEventListener("click", () => fileInput.click());
imageDrop.addEventListener("keydown", (event) => {
  if (event.key === "Enter" || event.key === " ") {
    event.preventDefault();
    fileInput.click();
  }
});
fileInput.addEventListener("change", () => {
  const file = fileInput.files?.[0];
  if (file) void onFile(file);
  fileInput.value = "";
});
$("readTab").addEventListener("click", () => void readTab());
$("submit").addEventListener("click", () => void submit());
$("retryQueue").addEventListener("click", async () => {
  await sendMessage({ type: "PROCESS_QUEUE", force: true });
  await refreshState();
  showToast(t(lang, "side.toast.queueRetried"));
});
$("useContext").addEventListener("click", async () => {
  if (context?.imageUrl) await fetchImage(context.imageUrl);
  if (context?.pageUrl && !sourceUrl.value) sourceUrl.value = context.pageUrl;
  if (context?.selectionText && !promptText.value)
    promptText.value = context.selectionText;
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


window.addEventListener("beforeunload", () => {
  if (!loading) void saveDraft(readForm());
});

bindLangSwitch((next) => applyLanguage(next));
void init();
