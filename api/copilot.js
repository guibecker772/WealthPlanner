export default async function handler(req, res) {
  try {
    if (req.method !== "POST") {
      return res.status(405).json({ error: "Method not allowed" });
    }

    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return res.status(500).json({ error: "OPENAI_API_KEY não configurada no ambiente." });
    }

    const { context, instructions } = req.body || {};
    if (!context) {
      return res.status(400).json({ error: "Payload inválido: faltando context." });
    }

    const prompt = `
${instructions || "Responda em JSON."}

DADOS DO CENÁRIO (JSON):
${JSON.stringify(context, null, 2)}
`;

    // Responses API (formato oficial)
    const resp = await fetch("https://api.openai.com/v1/responses", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-5.2",
        input: prompt,
      }),
    });

    const data = await resp.json();

    if (!resp.ok) {
      return res.status(resp.status).json({ error: data?.error?.message || "Erro na OpenAI API", raw: data });
    }

    // output_text é o jeito mais simples de pegar o texto final
    const reply = data?.output_text || "";
    return res.status(200).json({ reply });
  } catch (e) {
    return res.status(500).json({ error: String(e?.message || e) });
  }
}
