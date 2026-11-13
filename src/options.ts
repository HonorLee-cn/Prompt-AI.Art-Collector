import { sendMessage, type Settings } from "./shared";

const $ = <T extends HTMLElement>(id: string): T =>
  document.getElementById(id) as T;
const apiKey = $<HTMLInputElement>("apiKey");
const status = $<HTMLElement>("status");
let settings: Settings | null = null;

async function load(): Promise<void> {
  const response = await sendMessage<{ ok: boolean; settings?: Settings }>({
    type: "GET_STATE",
  });
  settings = response.settings ?? null;
  if (!settings) return;
  apiKey.placeholder = settings.apiKey ? "已保存，留空保留" : "pa_…";
  status.textContent = settings.user
    ? `已绑定 @${settings.user.username}`
    : "未绑定：将匿名提交到待审核区";
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
$("getApiKey").addEventListener("click", () => {
  void sendMessage({ type: "OPEN_API_KEY_PAGE" });
});
void load();
