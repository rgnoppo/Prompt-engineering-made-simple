// gemini.js - نفس منطق الإضافة الأصلية، منقول للويب بدون أي تغيير في الـ API نفسه.

// شكل الـ JSON اللي المفروض الموديل يرجعه بالظبط (نفس الشكل الموصوف في formatInstructions.js).
// بنبعته كـ responseSchema عشان جوجل تلتزم فعليًا بصيغة JSON صحيحة ومطابقة، بدل ما نعتمد
// على تعليمات نصية بس (اللي ممكن الموديل ميلتزمش بيها 100% خصوصًا مع نصوص طويلة/متعددة الأسطر).
const RESPONSE_SCHEMA = {
  type: "OBJECT",
  properties: {
    status: { type: "STRING", enum: ["need_info", "ready"] },
    understanding_percent: { type: "INTEGER" },
    questions: { type: "ARRAY", items: { type: "STRING" } },
    prompt: { type: "STRING" },
    note: { type: "STRING" },
  },
  required: ["status", "understanding_percent", "questions", "prompt", "note"],
  propertyOrdering: ["status", "understanding_percent", "questions", "prompt", "note"],
};

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

// أكواد الأخطاء المؤقتة من جوجل (الموديل مزنوق/محمّل دلوقتي) - يستاهل نعيد المحاولة
// بنفس المفتاح بدل ما نفشل على طول، خصوصًا إن الطلبات الأطول (claude/gemini/gpt)
// بتاخد وقت معالجة أطول من "general" فبتكون أكتر عرضة للـ 503 وقت الزحمة.
const RETRYABLE_STATUSES = new Set([503, 500]);
const MAX_RETRIES = 3;
const RETRY_BASE_DELAY_MS = 1000;

export async function callGemini({ apiKey, model, systemInstruction, contents }) {
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(
    model
  )}:generateContent?key=${encodeURIComponent(apiKey)}`;

  const body = {
    system_instruction: {
      parts: [{ text: systemInstruction }],
    },
    contents,
    generationConfig: {
      responseMimeType: "application/json",
      responseSchema: RESPONSE_SCHEMA,
      temperature: 0.4,
      maxOutputTokens: 8192,
    },
  };

  let lastErr = null;
  for (let attempt = 0; attempt <= MAX_RETRIES; attempt++) {
    const res = await fetch(url, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      let detail = "";
      try {
        const errJson = await res.json();
        detail = errJson?.error?.message || "";
      } catch {
        /* ignore */
      }
      const err = new Error(`فشل الطلب (${res.status})${detail ? ": " + detail : ""}`);
      err.status = res.status;

      // لو خطأ 429 (حد الاستخدام) سيبه يتعامل معاه callGeminiWithKeys زي ما هو (تبديل مفتاح)
      if (res.status === 429) {
        throw err;
      }

      if (RETRYABLE_STATUSES.has(res.status) && attempt < MAX_RETRIES) {
        lastErr = err;
        await sleep(RETRY_BASE_DELAY_MS * Math.pow(2, attempt)); // 1s, 2s, 4s
        continue;
      }
      throw err;
    }

    const data = await res.json();
    const text =
      data?.candidates?.[0]?.content?.parts?.map((p) => p.text || "").join("") || "";
    if (!text) {
      const finishReason = data?.candidates?.[0]?.finishReason;
      throw new Error("الموديل مرجعش رد نصي" + (finishReason ? ` (${finishReason})` : ""));
    }
    return text;
  }

  // مستحيل نوصل هنا عمليًا، بس احتياط
  throw lastErr || new Error("فشل الطلب بعد محاولات متكررة.");
}

// ---------- تبديل تلقائي بين أكتر من مفتاح ----------
// لو مفتاح وصل لحد جوجل المجاني (429)، بنجرب اللي بعده في القايمة تلقائيًا
// وبنعيد نفس الطلب من غير ما المستخدم يحس بحاجة. أي خطأ تاني (غير 429) بيتوقف على طول.

export async function callGeminiWithKeys({ apiKeys, startIndex, model, systemInstruction, contents }) {
  const usableKeys = (apiKeys || []).filter((k) => k.key && k.key.trim());
  if (!usableKeys.length) {
    throw new Error("مفيش أي API key متسجل. ضيفه من الإعدادات الأول.");
  }

  const safeStart = ((startIndex % usableKeys.length) + usableKeys.length) % usableKeys.length;
  let lastError = null;

  for (let i = 0; i < usableKeys.length; i++) {
    const idx = (safeStart + i) % usableKeys.length;
    const keyEntry = usableKeys[idx];
    try {
      const text = await callGemini({
        apiKey: keyEntry.key.trim(),
        model,
        systemInstruction,
        contents,
      });
      return { text, keyIndex: idx, keyLabel: keyEntry.label };
    } catch (e) {
      lastError = e;
      if (e.status === 429) {
        // المفتاح ده خلص حده، جرب اللي بعده
        continue;
      }
      // أي خطأ تاني (مفتاح غلط، مشكلة شبكة، إلخ) منعديش عليه، نوقفه على طول
      throw e;
    }
  }

  // كل المفاتيح جربت ووصلت لحد جوجل
  const err = new Error(
    usableKeys.length > 1
      ? `كل المفاتيح المسجلة (${usableKeys.length}) وصلت لحد الاستخدام المجاني عند جوجل دلوقتي. استنى شوية وجرب تاني، أو ضيف مفتاح جديد من الإعدادات.`
      : "المفتاح وصل لحد الاستخدام المجاني عند جوجل دلوقتي. استنى شوية وجرب تاني، أو ضيف مفتاح تاني من الإعدادات."
  );
  err.status = 429;
  err.cause = lastError;
  throw err;
}

// ---------- اختبار مفتاح ----------
// بيبعت طلب صغير جدًا لجوجل عشان يتأكد إن المفتاح شغال فعلًا.

export async function testApiKey({ apiKey, model }) {
  try {
    await callGemini({
      apiKey,
      model,
      systemInstruction: "رد بكلمة OK بس.",
      contents: [{ role: "user", parts: [{ text: "ping" }] }],
    });
    return { ok: true, message: "المفتاح شغال ✓" };
  } catch (e) {
    if (e.status === 429) {
      return { ok: false, message: "المفتاح شغال بس وصل لحد جوجل المجاني دلوقتي" };
    }
    return { ok: false, message: e.message || "فشل اختبار المفتاح" };
  }
}

export function parseModelJSON(text) {
  // احتياط: لو الموديل حط code fences رغم التعليمات، نشيلها
  let cleaned = text.trim();
  cleaned = cleaned.replace(/^```json\s*/i, "").replace(/^```\s*/, "").replace(/```\s*$/, "");

  try {
    return JSON.parse(cleaned);
  } catch (firstError) {
    // احتياط تاني: لو فيه أي نص زيادة قبل/بعد الـ JSON، نحاول نلاقي أول { ... }
    // متكامل (بعدد أقواس متوازن) ونعمله parse لوحده.
    const start = cleaned.indexOf("{");
    if (start !== -1) {
      let depth = 0;
      for (let i = start; i < cleaned.length; i++) {
        if (cleaned[i] === "{") depth++;
        else if (cleaned[i] === "}") {
          depth--;
          if (depth === 0) {
            const candidate = cleaned.slice(start, i + 1);
            try {
              return JSON.parse(candidate);
            } catch {
              break;
            }
          }
        }
      }
    }
    throw firstError;
  }
}
