import { TARGETS, TARGET_ORDER } from "../lib/rules";

const LEVELS = [
  { key: "بسيط", hint: "2-4 جمل" },
  { key: "متوسط", hint: "فقرة واحدة" },
  { key: "مفصل", hint: "تغطية كاملة" },
];

export default function StartScreen({
  idea,
  setIdea,
  selectedLevel,
  setSelectedLevel,
  selectedTarget,
  setSelectedTarget,
  canGenerate,
  onGenerate,
}) {
  function handleKeyDown(e) {
    if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && canGenerate) {
      onGenerate();
    }
  }

  return (
    <section id="startScreen" className="screen">
      <div className="screenHead">
        <span className="eyebrow">الخطوة الأولى</span>
        <h2>ابدأ بفكرتك</h2>
        <p className="sub">اكتب المطلوب في سطر أو سطرين، وهنحوّلها لبرومت منظم جاهز للإرسال.</p>
      </div>

      <label htmlFor="ideaInput">فكرتك</label>
      <textarea
        id="ideaInput"
        rows={4}
        maxLength={600}
        placeholder="مثال: عايز زرار يعمل export للجدول لملف اكسل..."
        value={idea}
        onChange={(e) => setIdea(e.target.value)}
        onKeyDown={handleKeyDown}
      />
      <div className="charCount">
        <span id="charCount">{idea.length}</span>/600
      </div>

      <label>المستوى</label>
      <div className="levels" role="group" aria-label="مستوى التفصيل">
        {LEVELS.map((lvl) => (
          <button
            key={lvl.key}
            type="button"
            className={"levelBtn" + (selectedLevel === lvl.key ? " selected" : "")}
            data-level={lvl.key}
            aria-pressed={selectedLevel === lvl.key}
            onClick={() => setSelectedLevel(lvl.key)}
          >
            <span className="bars" aria-hidden="true">
              <i></i>
              <i></i>
              <i></i>
            </span>
            <span className="levelText">
              <span className="levelName">{lvl.key}</span>
              <span className="levelHint">{lvl.hint}</span>
            </span>
          </button>
        ))}
      </div>

      <label>الموديل المستهدف</label>
      <div className="targets" role="group" aria-label="الموديل المستهدف">
        {TARGET_ORDER.map((key) => (
          <button
            key={key}
            type="button"
            className={"targetBtn" + (selectedTarget === key ? " selected" : "")}
            data-target={key}
            aria-pressed={selectedTarget === key}
            onClick={() => setSelectedTarget(key)}
          >
            <span className="targetName">{TARGETS[key].label}</span>
            <span className="targetHint">{TARGETS[key].hint}</span>
          </button>
        ))}
      </div>

      <button id="generateBtn" disabled={!canGenerate} onClick={onGenerate}>
        <span>توليد البرومت</span>
        <kbd>Ctrl + Enter</kbd>
      </button>
    </section>
  );
}
