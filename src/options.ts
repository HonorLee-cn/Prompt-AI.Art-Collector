import { loadLang, sendMessage, type Lang, type Settings } from "./shared";
import { applyI18n, bindLangSwitch, markLangSwitch, t } from "./i18n";

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const apiKey = $<HTMLInputElement>("apiKey");
const keyField = $<HTMLElement>("keyField");
const keyActions = $<HTMLElement>("keyActions");
const clearKeyButton = $<HTMLButtonElement>("clearKey");
const status = $<HTMLElement>("status");
let settings: Settings | null = null;
let lang: Lang = "zh";

function renderStatus(): void {
  if (!settings) return;
  if (settings.user) {
    const username = document.createElement("span");
    username.className = "bound-user";
    username.textContent = `@${settings.user.username}`;
    status.replaceChildren(t(lang, "options.status.boundPrefix"), username);
  } else {
    status.textContent = t(lang, "options.status.unbound");
  }
}

function applyLanguage(next: Lang): void {
  lang = next;
  document.documentElement.lang = next === "en" ? "en" : "zh-CN";
  applyI18n(lang);
  markLangSwitch(lang);
  renderStatus();
}

async function load(): Promise<void> {
  const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
    type: "GET_STATE",
  });
  settings = response.settings ?? null;
  if (!settings) return;
  const bound = Boolean(settings.user);
  keyField.classList.toggle("hidden", bound);
  keyActions.classList.toggle("hidden", bound);
  clearKeyButton.classList.toggle("hidden", !bound);
  apiKey.placeholder = settings.apiKey
    ? t(lang, "options.savedKey")
    : t(lang, "options.keyPlaceholder");
  renderStatus();
}

async function save(verify: boolean): Promise<void> {
  const key = apiKey.value.trim();
  if (verify) {
    const response = await sendMessage<{ ok: boolean; error?: string }>({
      type: "VERIFY_KEY",
      ...(key ? { apiKey: key } : {}),
    });
    status.textContent = response.ok
      ? t(lang, "options.status.verifySuccess")
      : (response.error ?? t(lang, "options.status.verifyFailed"));
  } else {
    const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
      type: "SAVE_SETTINGS",
      settings: {
        ...(key ? { apiKey: key } : {}),
      },
    });
    settings = response.settings ?? settings;
    status.textContent = t(lang, "options.status.saved");
  }
  apiKey.value = "";
  await load();
}

$("save").addEventListener("click", () => void save(false));
$("verify").addEventListener("click", () => void save(true));
clearKeyButton.addEventListener("click", async () => {
  const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
    type: "SAVE_SETTINGS",
    settings: { apiKey: "", user: null },
  });
  settings = response.settings ?? settings;
  apiKey.value = "";
  await load();
});
$("getApiKey").addEventListener("click", () => {
  void sendMessage({ type: "OPEN_API_KEY_PAGE" });
});
bindLangSwitch((next) => applyLanguage(next));
void (async () => {
  lang = await loadLang();
  applyLanguage(lang);
  await load();
})();
