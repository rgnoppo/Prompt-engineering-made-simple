import { useEffect, useRef } from "react";

export default function ChatScreen({
  understandingPercent,
  messages,
  isLoading,
  answer,
  setAnswer,
  onSendAnswer,
  onFinalizeNow,
}) {
  const chatLogRef = useRef(null);

  useEffect(() => {
    if (chatLogRef.current) {
      chatLogRef.current.scrollTop = chatLogRef.current.scrollHeight;
    }
  }, [messages, isLoading]);

  function handleKeyDown(e) {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      if (answer.trim() && !isLoading) onSendAnswer();
    }
  }

  return (
    <section id="chatScreen" className="screen">
      <div className="screenHead">
        <span className="eyebrow">الخطوة الثانية</span>
        <h2>خلّينا نوضّح شوية</h2>
        <p className="sub">جاوب على الأسئلة عشان نرفع دقة البرومت النهائي.</p>
      </div>

      <div className="badgeRow">
        <span className="badge" id="understandingBadge">
          <span className="dot" />
          <span id="understandingText">
            نسبة الفهم: {understandingPercent === null ? "--" : understandingPercent}%
          </span>
        </span>
        <button
          id="finalizeNowBtn"
          className="linkBtn"
          disabled={isLoading}
          onClick={onFinalizeNow}
        >
          خلاص، طلع أحسن برومت ممكن
        </button>
      </div>

      <div id="chatLog" ref={chatLogRef}>
        {messages.map((m, i) => (
          <div key={i} className={"bubble " + m.role}>
            {m.text}
          </div>
        ))}
      </div>

      {isLoading && (
        <div id="loadingRow">
          <span className="spinner" /> بيفكر...
        </div>
      )}

      <div id="answerRow">
        <textarea
          id="answerInput"
          rows={2}
          placeholder="اكتب إجابتك هنا... (Enter للإرسال)"
          value={answer}
          onChange={(e) => setAnswer(e.target.value)}
          onKeyDown={handleKeyDown}
        />
        <button
          id="sendAnswerBtn"
          className="iconSendBtn"
          aria-label="إرسال"
          disabled={isLoading || !answer.trim()}
          onClick={onSendAnswer}
        >
          <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor">
            <path d="M3 11.5l17-8-6 17-3-7-8-2z" />
          </svg>
        </button>
      </div>
    </section>
  );
}
