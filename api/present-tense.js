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
            content: "Rewrite the user's goal as a first-person statement of the ACHIEVED STATE, as if it's already true today — not a literal present-tense of the action verb. Use the verb a person would naturally use once they already have it (e.g. \"buy a Ferrari\" -> \"I own a Ferrari\", not \"I buy a Ferrari\"; \"run a marathon\" -> \"I have run a marathon\"; \"buy my dream home\" -> \"I own my dream home\"). For a money or number goal, make it specific and granular the way someone stating an already-achieved financial goal naturally would, adding the conventional unit/timeframe if the goal implies one (e.g. \"earn 10 million\" -> \"I earn $10 million a year\"; \"lose weight\" -> \"I am at my ideal weight\"). Keep it short and natural, one sentence, don't invent unrelated specifics. Reply with ONLY the rewritten sentence — no quotes, no preamble."
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
