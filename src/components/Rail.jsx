const STEPS = [
  { num: "01", label: "الفكرة" },
  { num: "02", label: "التوضيح" },
  { num: "03", label: "النتيجة" },
];

export default function Rail({
  activeStep,
  hasKey,
  onOpenSettings,
  rateLimitMessage,
}) {
  return (
    <aside className="rail">
      <div className="railTop">
        <div className="brand">
          <img src="/icons/icon-32.png" alt="" className="logo" width="24" height="24" />
          <span className="brandName">مولّد البرومتات</span>
        </div>
        <button
          id="optionsBtn"
          className="iconBtn"
          title="الإعدادات"
          aria-label="الإعدادات"
          onClick={onOpenSettings}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8">
            <path d="M12 15a3 3 0 100-6 3 3 0 000 6z" />
            <path d="M19.4 13a7.6 7.6 0 000-2l2-1.6-2-3.4-2.4 1a7.7 7.7 0 00-1.7-1L15 3h-6l-.3 2.4a7.7 7.7 0 00-1.7 1l-2.4-1-2 3.4L4.6 11a7.6 7.6 0 000 2l-2 1.6 2 3.4 2.4-1a7.7 7.7 0 001.7 1L9 21h6l.3-2.4a7.7 7.7 0 001.7-1l2.4 1 2-3.4-2-1.6z" />
          </svg>
        </button>
      </div>

      <div className="railSteps" id="stepsIndicator">
        {STEPS.map((step, idx) => (
          <div key={step.num}>
            <div
              className={
                "step railStep" +
                (idx === activeStep ? " active" : "") +
                (idx < activeStep ? " done" : "")
              }
              data-step={idx}
            >
              <span className="railDot" />
              <div className="railStepBody">
                <span className="railStepNum">{step.num}</span>
                <span className="railStepLabel">{step.label}</span>
              </div>
            </div>
            {idx < STEPS.length - 1 && <div className="railLine" />}
          </div>
        ))}
      </div>

      {!hasKey && (
        <div id="noKeyWarning" className="warning">
          محتاج تحط الـ API key الأول من{" "}
          <a
            href="#"
            id="openOptionsLink"
            onClick={(e) => {
              e.preventDefault();
              onOpenSettings();
            }}
          >
            الإعدادات
          </a>
          .
        </div>
      )}

      {rateLimitMessage && (
        <div id="rateLimitMsg" className="warning">
          {rateLimitMessage}
        </div>
      )}
    </aside>
  );
}
