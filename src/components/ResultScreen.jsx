import { useState } from "react";

export default function ResultScreen({
  understandingPercent,
  note,
  prompt,
  setPrompt,
  targetBadge,
  onRestart,
}) {
  const [copyLabel, setCopyLabel] = useState("نسخ");

  async function handleCopy() {
    try {
      await navigator.clipboard.writeText(prompt);
      setCopyLabel("اتنسخ ✓");
    } catch {
      setCopyLabel("مقدرش أنسخ");
    }
    setTimeout(() => setCopyLabel("نسخ"), 1500);
  }

  return (
    <section id="resultScreen" className="screen">
      <div className="screenHead">
        <span className="eyebrow">الخطوة الأخيرة</span>
        <h2>البرومت جاهز</h2>
        <p className="sub">راجعه، عدّل لو حابب، وانسخه على طول.</p>
      </div>

      <div className="badgeRow">
        <span className="badge" id="finalUnderstandingBadge">
          <span className="dot" />
          <span id="finalUnderstandingText">
            نسبة الفهم: {understandingPercent === null ? "--" : understandingPercent}%
          </span>
        </span>
        {targetBadge && (
          <span className="badge">
            <span className="dot" />
            <span>{targetBadge}</span>
          </span>
        )}
      </div>
      {note && (
        <div id="noteBox" className="note">
          ⚠️ {note}
        </div>
      )}

      <label htmlFor="finalPrompt">البرومت النهائي (تقدر تعدله)</label>
      <div className="terminal">
        <div className="terminalBar">
          <span className="tdot r" />
          <span className="tdot y" />
          <span className="tdot g" />
          <span className="terminalTitle">prompt.txt</span>
        </div>
        <textarea
          id="finalPrompt"
          rows={9}
          value={prompt}
          onChange={(e) => setPrompt(e.target.value)}
        />
      </div>

      <div className="resultActions">
        <button id="copyBtn" onClick={handleCopy}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <rect x="9" y="9" width="12" height="12" rx="2" />
            <path d="M5 15V5a2 2 0 012-2h10" />
          </svg>
          <span id="copyLabel">{copyLabel}</span>
        </button>
        <button id="restartBtn" className="secondaryBtn" onClick={onRestart}>
          فكرة جديدة
        </button>
      </div>
    </section>
  );
}
