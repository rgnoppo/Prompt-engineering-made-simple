import { useEffect, useState } from "react";
import { DEFAULT_SETTINGS, genId } from "../lib/settings";
import { testApiKey } from "../lib/gemini";

const MODEL_OPTIONS = [
  "gemini-2.5-flash",
  "gemini-2.5-flash-lite",
  "gemini-2.5-pro",
  "gemini-2.0-flash",
];

function emptyRow() {
  return { id: genId(), label: "", key: "" };
}

export default function SettingsModal({ settings, onSave, onClose }) {
  const [apiKeys, setApiKeys] = useState(
    settings.apiKeys && settings.apiKeys.length
      ? settings.apiKeys.map((k) => ({ ...k }))
      : [emptyRow()]
  );
  const [model, setModel] = useState(settings.model || DEFAULT_SETTINGS.model);
  const [maxPerMinute, setMaxPerMinute] = useState(settings.maxPerMinute);
  const [maxPerDay, setMaxPerDay] = useState(settings.maxPerDay);
  const [visibleKeys, setVisibleKeys] = useState({});
  const [testResults, setTestResults] = useState({});
  const [status, setStatus] = useState("");

  useEffect(() => {
    function handleEsc(e) {
      if (e.key === "Escape") onClose();
    }
    document.addEventListener("keydown", handleEsc);
    return () => document.removeEventListener("keydown", handleEsc);
  }, [onClose]);

  function updateRow(id, field, value) {
    setApiKeys((rows) => rows.map((r) => (r.id === id ? { ...r, [field]: value } : r)));
  }

  function addRow() {
    setApiKeys((rows) => [...rows, emptyRow()]);
  }

  function removeRow(id) {
    setApiKeys((rows) => (rows.length > 1 ? rows.filter((r) => r.id !== id) : rows));
    setTestResults((prev) => {
      const next = { ...prev };
      delete next[id];
      return next;
    });
  }

  function toggleVisible(id) {
    setVisibleKeys((prev) => ({ ...prev, [id]: !prev[id] }));
  }

  async function handleTest(id) {
    const row = apiKeys.find((r) => r.id === id);
    if (!row || !row.key.trim()) return;
    setTestResults((prev) => ({ ...prev, [id]: { status: "testing", message: "" } }));
    const result = await testApiKey({
      apiKey: row.key.trim(),
      model: model.trim() || DEFAULT_SETTINGS.model,
    });
    setTestResults((prev) => ({
      ...prev,
      [id]: { status: result.ok ? "ok" : "error", message: result.message },
    }));
  }

  function handleSave() {
    const cleaned = apiKeys
      .filter((r) => r.key.trim())
      .map((r, i) => ({
        id: r.id || genId(),
        label: r.label.trim() || `مفتاح ${i + 1}`,
        key: r.key.trim(),
      }));

    onSave({
      apiKeys: cleaned,
      currentKeyIndex: 0,
      model: model.trim() || DEFAULT_SETTINGS.model,
      maxPerMinute: parseInt(maxPerMinute, 10) || DEFAULT_SETTINGS.maxPerMinute,
      maxPerDay: parseInt(maxPerDay, 10) || DEFAULT_SETTINGS.maxPerDay,
    });
    setStatus("✓ اتحفظ");
    setTimeout(() => setStatus(""), 2000);
  }

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalWrap"
        role="dialog"
        aria-modal="true"
        aria-label="إعدادات مولّد البرومتات"
        onClick={(e) => e.stopPropagation()}
      >
        <button className="modalClose" aria-label="إغلاق" onClick={onClose}>
          ✕
        </button>

        <div className="brand settingsBrand">
          <img src="/icons/icon-48.png" alt="" width="36" height="36" className="logo" />
          <div>
            <h1>إعدادات مولّد البرومتات</h1>
            <p className="sub">الـ API keys وحدود الاستخدام محفوظين على جهازك بس</p>
          </div>
        </div>

        <div className="card">
          <h2>مفاتيح Gemini</h2>
          <p className="hint" style={{ marginTop: "-2px" }}>
            تقدر تضيف أكتر من مفتاح. لو مفتاح وصل لحد جوجل المجاني، التطبيق هيبدّل تلقائي للي بعده من غير ما تحس.
          </p>

          <div className="keyList">
            {apiKeys.map((row, i) => {
              const test = testResults[row.id];
              return (
                <div className="keyEntry" key={row.id}>
                  <div className="keyEntryTop">
                    <input
                      type="text"
                      className="keyLabelInput"
                      placeholder={`اسم المفتاح (مثال: حساب ${i + 1})`}
                      value={row.label}
                      onChange={(e) => updateRow(row.id, "label", e.target.value)}
                    />
                    <button
                      type="button"
                      className="removeKeyBtn"
                      aria-label="حذف المفتاح"
                      onClick={() => removeRow(row.id)}
                      disabled={apiKeys.length <= 1}
                    >
                      🗑
                    </button>
                  </div>

                  <div className="keyRow">
                    <input
                      type={visibleKeys[row.id] ? "text" : "password"}
                      placeholder="الصق مفتاح الـ API هنا"
                      value={row.key}
                      onChange={(e) => updateRow(row.id, "key", e.target.value)}
                    />
                    <button
                      type="button"
                      className="ghostBtn"
                      aria-label={visibleKeys[row.id] ? "إخفاء المفتاح" : "إظهار المفتاح"}
                      onClick={() => toggleVisible(row.id)}
                    >
                      {visibleKeys[row.id] ? "🙈" : "👁"}
                    </button>
                    <button
                      type="button"
                      className="testKeyBtn"
                      disabled={!row.key.trim() || test?.status === "testing"}
                      onClick={() => handleTest(row.id)}
                    >
                      {test?.status === "testing" ? "بيتأكد..." : "اختبار"}
                    </button>
                  </div>

                  {test && test.status !== "testing" && (
                    <p className={"keyTestMsg " + (test.status === "ok" ? "ok" : "error")}>
                      {test.status === "ok" ? "✓" : "✕"} {test.message}
                    </p>
                  )}
                </div>
              );
            })}
          </div>

          <button type="button" className="addKeyBtn" onClick={addRow}>
            + ضيف مفتاح تاني
          </button>

          <label htmlFor="model">الموديل</label>
          <input
            list="modelOptions"
            id="model"
            placeholder="مثال: gemini-2.5-flash"
            value={model}
            onChange={(e) => setModel(e.target.value)}
          />
          <datalist id="modelOptions">
            {MODEL_OPTIONS.map((m) => (
              <option value={m} key={m} />
            ))}
          </datalist>
          <p className="hint">
            أسماء الموديلات بتتغير باستمرار من جوجل - لو الاسم بقى قديم أو ظهر خطأ 404، روح{" "}
            <a href="https://aistudio.google.com/" target="_blank" rel="noopener noreferrer">
              Google AI Studio
            </a>{" "}
            وشوف الاسم الصحيح الحالي واكتبه هنا.
          </p>
        </div>

        <div className="card">
          <h2>حدود الطلبات</h2>
          <p className="hint" style={{ marginTop: "-4px" }}>
            الحد ده مشترك بين كل المفاتيح مع بعض (مش لكل مفتاح لوحده)، عشان متكونش كتير وسريعة على النسخة المجانية.
          </p>

          <div className="row2">
            <div>
              <label htmlFor="maxPerMinute">أقصى طلبات/دقيقة</label>
              <input
                type="number"
                id="maxPerMinute"
                min={1}
                max={60}
                value={maxPerMinute}
                onChange={(e) => setMaxPerMinute(e.target.value)}
              />
            </div>
            <div>
              <label htmlFor="maxPerDay">أقصى طلبات/يوم</label>
              <input
                type="number"
                id="maxPerDay"
                min={1}
                max={10000}
                value={maxPerDay}
                onChange={(e) => setMaxPerDay(e.target.value)}
              />
            </div>
          </div>
        </div>

        <button id="saveBtn" onClick={handleSave}>
          حفظ الإعدادات
        </button>
        <p id="status" className="status" role="status">
          {status}
        </p>
      </div>
    </div>
  );
}
