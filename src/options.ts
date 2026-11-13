import { sendMessage, type Settings } from "./shared";

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const apiKey = $<HTMLInputElement>("apiKey");
const keyField = $<HTMLElement>("keyField");
const keyActions = $<HTMLElement>("keyActions");
const clearKeyButton = $<HTMLButtonElement>("clearKey");
const status = $<HTMLElement>("status");
let settings: Settings | null = null;

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
  apiKey.placeholder = settings.apiKey ? "已保存，留空保留" : "pa_…";
  if (settings.user) {
    const username = document.createElement("span");
    username.className = "bound-user";
    username.textContent = `@${settings.user.username}`;
    status.replaceChildren("已绑定 ", username);
  } else {
    status.textContent = "未绑定：将匿名提交到待审核区";
  }
}

async function save(verify: boolean): Promise<void> {
  const key = apiKey.value.trim();
  if (verify) {
    const response = await sendMessage<{ ok: boolean; error?: string }>({
      type: "VERIFY_KEY",
      ...(key ? { apiKey: key } : {}),
    });
    status.textContent = response.ok
      ? "验证成功"
      : (response.error ?? "验证失败");
  } else {
    const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
      type: "SAVE_SETTINGS",
      settings: {
        ...(key ? { apiKey: key } : {}),
      },
    });
    settings = response.settings ?? settings;
    status.textContent = "设置已保存";
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
void load();
