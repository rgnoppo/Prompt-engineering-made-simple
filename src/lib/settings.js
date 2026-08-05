// settings.js
// في الإضافة الأصلية كانت الإعدادات بتتخزن في chrome.storage.local.
// هنا في الموقع بنستخدم localStorage بنفس المنطق - كل حاجة فاضلة محفوظة على جهاز المستخدم بس،
// ومفيش أي سيرفر بيشوف الـ API key.

const SETTINGS_KEY = "prompt-generator:settings";
const REQUEST_LOG_KEY = "prompt-generator:requestLog";

// كل مفتاح: { id, label, key }
export const DEFAULT_SETTINGS = {
  apiKeys: [],
  currentKeyIndex: 0,
  model: "gemini-2.5-flash",
  maxPerMinute: 8,
  maxPerDay: 100,
};

export function genId() {
  if (typeof crypto !== "undefined" && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return "key_" + Math.random().toString(36).slice(2) + Date.now().toString(36);
}

export function loadSettings() {
  try {
    const raw = localStorage.getItem(SETTINGS_KEY);
    const parsed = raw ? JSON.parse(raw) : {};
    const merged = { ...DEFAULT_SETTINGS, ...parsed };

    // migration: نسخة قديمة كانت بتخزن مفتاح واحد فقط في apiKey
    if ((!merged.apiKeys || !merged.apiKeys.length) && parsed.apiKey) {
      merged.apiKeys = [{ id: genId(), label: "المفتاح الأول", key: parsed.apiKey }];
    }
    if (!Array.isArray(merged.apiKeys)) merged.apiKeys = [];
    delete merged.apiKey;

    return merged;
  } catch {
    return { ...DEFAULT_SETTINGS, apiKeys: [] };
  }
}

export function saveSettings(newSettings) {
  const current = loadSettings();
  const merged = { ...current, ...newSettings };
  localStorage.setItem(SETTINGS_KEY, JSON.stringify(merged));
  return merged;
}

// ---------- Rate limiting ----------
// بنسجل توقيت كل طلب في localStorage ونتأكد قبل كل طلب جديد
// إننا منعديناش الحد بتاع الدقيقة ولا اليوم.

export function checkAndRecordRateLimit(settings) {
  const now = Date.now();
  let log = [];
  try {
    const raw = localStorage.getItem(REQUEST_LOG_KEY);
    log = raw ? JSON.parse(raw) : [];
  } catch {
    log = [];
  }

  // امسح أي حاجة أقدم من 24 ساعة
  log = log.filter((ts) => now - ts < 24 * 60 * 60 * 1000);

  const perMinuteCount = log.filter((ts) => now - ts < 60 * 1000).length;
  const perDayCount = log.length;

  if (perMinuteCount >= settings.maxPerMinute) {
    return { allowed: false, reason: "minute" };
  }
  if (perDayCount >= settings.maxPerDay) {
    return { allowed: false, reason: "day" };
  }

  log.push(now);
  localStorage.setItem(REQUEST_LOG_KEY, JSON.stringify(log));
  return { allowed: true };
}
