// Vercel serverless function: rewrites a goal into first-person present tense via an LLM.
export default async function handler(req, res) {
  if (req.method !== "POST") {
    res.setHeader("Allow", "POST");
    return res.status(405).json({ error: "Method not allowed" });
  }

  const { text } = req.body || {};
  if (!text || typeof text !== "string" || !text.trim()) {
    return res.status(400).json({ error: "Missing text" });
  }
  const raw = text.trim().slice(0, 300);

  try {
    const upstream = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": "Bearer " + process.env.OPENAI_API_KEY
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        temperature: 0.2,
        max_tokens: 60,
        messages: [
          {
            role: "system",
            content: "Rewrite the user's goal in natural first-person present tense, as if it is already true (e.g. \"Run a marathon\" -> \"I run a marathon\", \"earn 10 million\" -> \"I earn $10 million\"). Keep it short and natural, don't add facts that weren't there. Reply with ONLY the rewritten sentence — no quotes, no preamble."
          },
          { role: "user", content: raw }
        ]
      })
    });

    if (!upstream.ok) {
      return res.status(200).json({ result: raw, fallback: true });
    }

    const data = await upstream.json();
    const out = data?.choices?.[0]?.message?.content?.trim();
    res.setHeader("Cache-Control", "s-maxage=86400, stale-while-revalidate");
    return res.status(200).json({ result: out || raw });
  } catch (e) {
    return res.status(200).json({ result: raw, fallback: true });
  }
}
