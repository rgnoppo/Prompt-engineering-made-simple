import { useEffect, useState } from "react";
import Rail from "./components/Rail";
import StartScreen from "./components/StartScreen";
import ChatScreen from "./components/ChatScreen";
import ResultScreen from "./components/ResultScreen";
import SettingsModal from "./components/SettingsModal";
import { buildRulesText, TARGETS } from "./lib/rules";
import { FORMAT_INSTRUCTIONS } from "./lib/formatInstructions";
import { callGeminiWithKeys, parseModelJSON } from "./lib/gemini";
import { loadSettings, saveSettings, checkAndRecordRateLimit } from "./lib/settings";

const SCREEN_STEP_INDEX = { start: 0, chat: 1, result: 2 };

function buildInitialUserMessage(idea, level) {
  return `المستوى المطلوب: ${level}\n\nالفكرة:\n${idea}`;
}

export default function App() {
  const [settings, setSettings] = useState(() => loadSettings());
  const [showSettings, setShowSettings] = useState(false);

  const [screen, setScreen] = useState("start");
  const [idea, setIdea] = useState("");
  const [selectedLevel, setSelectedLevel] = useState(null);
  const [selectedTarget, setSelectedTarget] = useState("general");

  const [history, setHistory] = useState([]); // Gemini "contents" array
  const [messages, setMessages] = useState([]); // {role: user|model|system, text}
  const [isLoading, setIsLoading] = useState(false);
  const [answer, setAnswer] = useState("");
  const [understandingPercent, setUnderstandingPercent] = useState(null);
  const [finalPrompt, setFinalPrompt] = useState("");
  const [note, setNote] = useState("");
  const [rateLimitMessage, setRateLimitMessage] = useState("");

  const hasKey = Boolean(settings.apiKeys?.some((k) => k.key && k.key.trim()));
  const canGenerate = Boolean(hasKey && idea.trim() && selectedLevel);

  useEffect(() => {
    document.title = "مولّد البرومتات";
  }, []);

  function handleSaveSettings(newSettings) {
    const merged = saveSettings(newSettings);
    setSettings(merged);
  }

  function appendBubble(role, text) {
    setMessages((prev) => [...prev, { role, text }]);
  }

  async function sendToModel(nextHistory) {
    setRateLimitMessage("");
    const rl = checkAndRecordRateLimit(settings);
    if (!rl.allowed) {
      setRateLimitMessage(
        rl.reason === "minute"
          ? "وصلت للحد الأقصى من الطلبات في الدقيقة، استنى شوية وجرب تاني."
          : "وصلت للحد الأقصى من الطلبات المسموحة اليوم. تقدر تزوّد الحد من الإعدادات لو حابب."
      );
      return;
    }

    setIsLoading(true);
    try {
      const systemInstruction = buildRulesText(selectedTarget) + "\n\n" + FORMAT_INSTRUCTIONS;
      const { text: responseText, keyIndex } = await callGeminiWithKeys({
        apiKeys: settings.apiKeys,
        startIndex: settings.currentKeyIndex || 0,
        model: settings.model,
        systemInstruction,
        contents: nextHistory,
      });

      if (keyIndex !== settings.currentKeyIndex) {
        const merged = saveSettings({ currentKeyIndex: keyIndex });
        setSettings(merged);
      }

      let parsed;
      try {
        parsed = parseModelJSON(responseText);
      } catch {
        throw new Error("الموديل رجّع رد مش JSON صحيح، جرب تاني.");
      }

      const updatedHistory = [
        ...nextHistory,
        { role: "model", parts: [{ text: responseText }] },
      ];
      setHistory(updatedHistory);
      handleModelResponse(parsed);
    } catch (e) {
      appendBubble("system", "حصل خطأ: " + e.message);
      setScreen("chat");
    } finally {
      setIsLoading(false);
    }
  }

  function handleModelResponse(parsed) {
    const percent = Number.isFinite(parsed.understanding_percent)
      ? Math.max(0, Math.min(100, Math.round(parsed.understanding_percent)))
      : null;

    if (parsed.status === "need_info") {
      setScreen("chat");
      setUnderstandingPercent(percent);
      (parsed.questions || []).forEach((q) => appendBubble("model", q));
    } else {
      setScreen("result");
      setUnderstandingPercent(percent);
      setFinalPrompt(parsed.prompt || "");
      setNote(parsed.note && parsed.note.trim() ? parsed.note : "");
    }
  }

  async function handleGenerate() {
    const trimmedIdea = idea.trim();
    if (!trimmedIdea || !selectedLevel) return;

    setMessages([]);
    const initialHistory = [
      {
        role: "user",
        parts: [{ text: buildInitialUserMessage(trimmedIdea, selectedLevel) }],
      },
    ];
    setHistory(initialHistory);
    appendBubble("user", trimmedIdea);
    setScreen("chat");
    setUnderstandingPercent(null);
    await sendToModel(initialHistory);
  }

  async function handleSendAnswer() {
    const trimmed = answer.trim();
    if (!trimmed) return;
    appendBubble("user", trimmed);
    const nextHistory = [...history, { role: "user", parts: [{ text: trimmed }] }];
    setHistory(nextHistory);
    setAnswer("");
    await sendToModel(nextHistory);
  }

  async function handleFinalizeNow() {
    const msg = "مش قادر أوضح أكتر من كده، طلع أحسن برومت ممكن دلوقتي.";
    appendBubble("user", msg);
    const nextHistory = [...history, { role: "user", parts: [{ text: msg }] }];
    setHistory(nextHistory);
    await sendToModel(nextHistory);
  }

  function handleRestart() {
    setIdea("");
    setSelectedLevel(null);
    setSelectedTarget("general");
    setHistory([]);
    setMessages([]);
    setNote("");
    setRateLimitMessage("");
    setUnderstandingPercent(null);
    setFinalPrompt("");
    setScreen("start");
  }

  return (
    <div className="shell">
      <Rail
        activeStep={SCREEN_STEP_INDEX[screen]}
        hasKey={hasKey}
        onOpenSettings={() => setShowSettings(true)}
        rateLimitMessage={rateLimitMessage}
      />

      <main className="main">
        {screen === "start" && (
          <StartScreen
            idea={idea}
            setIdea={setIdea}
            selectedLevel={selectedLevel}
            setSelectedLevel={setSelectedLevel}
            selectedTarget={selectedTarget}
            setSelectedTarget={setSelectedTarget}
            canGenerate={canGenerate}
            onGenerate={handleGenerate}
          />
        )}

        {screen === "chat" && (
          <ChatScreen
            understandingPercent={understandingPercent}
            messages={messages}
            isLoading={isLoading}
            answer={answer}
            setAnswer={setAnswer}
            onSendAnswer={handleSendAnswer}
            onFinalizeNow={handleFinalizeNow}
          />
        )}

        {screen === "result" && (
          <ResultScreen
            understandingPercent={understandingPercent}
            note={note}
            prompt={finalPrompt}
            setPrompt={setFinalPrompt}
            targetBadge={TARGETS[selectedTarget]?.badge}
            onRestart={handleRestart}
          />
        )}
      </main>

      {showSettings && (
        <SettingsModal
          settings={settings}
          onSave={handleSaveSettings}
          onClose={() => setShowSettings(false)}
        />
      )}
    </div>
  );
}
