/* eslint-disable no-undef */
// /api/copilot.js
export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed. Use POST." });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY não configurada no ambiente." });
    }

    const body = req.body || {};
    const context = (body.context || body.prompt || "").toString().trim(); // ✅ aceita os dois
    if (!context) {
      return res.status(400).json({ error: "Payload inválido: faltando context" });
    }

    const model = process.env.OPENAI_MODEL || "gpt-4.1-mini";

    const oai = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model,
        input: context,
        max_output_tokens: 700,
      }),
    });

    if (!oai.ok) {
      const t = await oai.text();
      return res.status(oai.status).json({
        error: "Erro ao chamar OpenAI",
        details: t?.slice?.(0, 2000) || "",
      });
    }

    const json = await oai.json();

    const text =
      json?.output_text ||
      json?.output?.[0]?.content?.[0]?.text ||
      json?.output?.[0]?.content?.map?.((c) => c?.text).filter(Boolean).join("\n") ||
      "";

    if (!text) {
      return res.status(500).json({
        error: "OpenAI respondeu, mas não consegui extrair texto.",
        raw: json,
      });
    }

    return res.status(200).json({ text });
  } catch (err) {
    console.error("[/api/copilot] error:", err);
    return res.status(500).json({ error: err?.message || "Erro interno." });
  }
}
