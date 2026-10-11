const SYS = `You are Creator Studio, a short-video scriptwriter. Write like a 25-year-old creator talking to a friend, never like an AI. Avoid words like 'in today's world', 'let's dive in', 'unlock'. Read-aloud test: every line must be natural to speak.
SCRIPT rules: Hindi, in the requested writing style, the way a real person talks. Short sentences, casual words, fillers like "yaar", "dekho", "suno". Include ONE relatable real-life example. Strong hook in the first 3 seconds. End with a question or CTA. No textbook/formal Hindi. Mark pauses with "..." or "(pause)" and emphasis with CAPS or *stars*.
Return ONLY valid JSON (no markdown fences) with this shape:
{"script":"full script as one string with line breaks","timeline":[{"time":"0-3s","spoken":"line spoken in this segment","onscreen":"short on-screen text","edit":"cut/zoom/transition suggestion","broll":"AI video/image prompt in English: scene, camera angle, lighting, mood"}],"titles":["5 titles"],"caption":"1 caption with emojis","tags":["15 hashtags/keywords"],"thumbnail":{"text":"max 4 words","visual":"visual idea","prompt":"one image-generation prompt in English"}}
Timeline segments must cover the whole video length (about 4 segments for 15s, 6 for 30s, 9 for 60s) and the spoken lines must add up to the script. Titles and caption in Hinglish/Hindi like a creator would write.`;

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).json({ error: "POST only" });
  const b = req.body || {};
  const topic = String(b.topic || "").slice(0, 200).trim();
  const niche = String(b.niche || "").slice(0, 80).trim();
  const len = ["15", "30", "60"].includes(String(b.len)) ? String(b.len) : "30";
  const style = b.style === "Devanagari Hindi" ? "Devanagari Hindi" : "Roman Hindi (Hinglish)";
  if (!topic) return res.status(400).json({ error: "Topic required" });

  const prompt = `Topic: ${topic}\nNiche: ${niche || "general"}\nVideo length: ${len} seconds\nScript writing style: ${style}`;
  try {
    const model = process.env.GEMINI_MODEL || "gemini-2.5-flash";
    const r = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent`,
      {
        method: "POST",
        headers: {
          "content-type": "application/json",
          "x-goog-api-key": process.env.GEMINI_API_KEY,
        },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: SYS }] },
          contents: [{ role: "user", parts: [{ text: prompt }] }],
          generationConfig: { responseMimeType: "application/json", maxOutputTokens: 6000 },
        }),
      }
    );
    const d = await r.json();
    if (r.status === 429) return res.status(429).json({ error: "Aaje nu free limit puru thai gayu. Thodi vaar pachhi try karo." });
    if (!r.ok) return res.status(502).json({ error: d?.error?.message || "AI error" });
    const text = (d.candidates?.[0]?.content?.parts || []).map((p) => p.text || "").join("");
    const clean = text.replace(/```json|```/g, "").trim();
    return res.status(200).json(JSON.parse(clean));
  } catch (e) {
    return res.status(500).json({ error: "Generate nahi thayu, fari try karo." });
  }
}
