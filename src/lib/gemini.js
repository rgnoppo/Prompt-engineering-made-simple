// gemini.js - نفس منطق الإضافة الأصلية، منقول للويب بدون أي تغيير في الـ API نفسه.

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
      temperature: 0.4,
    },
  };

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
  return JSON.parse(cleaned);
}
