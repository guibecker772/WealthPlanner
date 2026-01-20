// src/hooks/useSmartCopilot.js
import { useCallback, useMemo, useState } from "react";

const STORAGE_API_KEY = "planner_openai_api_key_v1";

function getStoredApiKey() {
  return (
    localStorage.getItem(STORAGE_API_KEY) ||
    localStorage.getItem("OPENAI_API_KEY") ||
    localStorage.getItem("openai_api_key") ||
    ""
  );
}

function buildPrompt({ clientData, kpis, isStressTest }) {
  const name = clientData?.name || "Cliente";
  const scenario = clientData?.scenarioName || "Cenário";
  const status = kpis?.sustainabilityLabel || "—";
  const score = kpis?.wealthScore ?? "—";

  return `
Você é um planejador financeiro. Gere um diagnóstico objetivo e acionável.

Contexto:
- Cliente: ${name}
- Cenário: ${scenario}
- Stress ativo: ${isStressTest ? "sim" : "não"}
- Status do plano: ${status}
- Wealth Score: ${score}

KPIs:
- Patrimônio financeiro atual: ${kpis?.initialFinancialWealth ?? 0}
- Patrimônio ilíquido atual: ${kpis?.initialIlliquidWealth ?? 0}
- Capital projetado na aposentadoria (financeiro): ${kpis?.projectedWealthAtRetirement ?? 0}
- Capital necessário: ${kpis?.requiredCapital ?? 0}
- Cobertura da meta (%): ${kpis?.goalPercentage ?? 0}
- Renda sustentável (mensal real): ${kpis?.sustainableIncome ?? 0}
- Idade de ruptura (se houver): ${kpis?.brokeAge ?? "não"}

Entrega:
1) Resumo (3 bullets)
2) Principais riscos (3 bullets)
3) Recomendações práticas (5 bullets)
4) Perguntas para o assessor fazer ao cliente (5 perguntas)
  `.trim();
}

export default function useSmartCopilot({ aiEnabled }) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [result, setResult] = useState("");

  const apiKey = useMemo(() => getStoredApiKey(), []);

  const generateDiagnosis = useCallback(
    async ({ clientData, kpis, isStressTest }) => {
      setError("");
      setResult("");

      if (!aiEnabled) {
        setError("A IA está desativada. Ative em Ajustes para usar o Smart Copilot.");
        return;
      }

      const prompt = buildPrompt({ clientData, kpis, isStressTest });

      setLoading(true);
      try {
        // ✅ 1) Tenta /api/copilot (backend)
        const res = await fetch("/api/copilot", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          // ✅ manda context (o backend está exigindo isso)
          body: JSON.stringify({
            context: prompt,
            prompt, // mantém também por compatibilidade
            meta: {
              scenarioName: clientData?.scenarioName || "",
              clientName: clientData?.name || "",
              isStressTest: !!isStressTest,
            },
          }),
        });

        if (res.ok) {
          const data = await res.json();
          const text = data?.text || data?.output || data?.result || "";
          if (!text) throw new Error("Resposta vazia do /api/copilot.");
          setResult(text);
          return;
        }

        // Se não existe endpoint, tenta alternativa frontend-only (se tiver apiKey)
        if (res.status === 404 || res.status === 405) {
          if (!apiKey) {
            setResult(
              "Diagnóstico (mock):\n\n• Plano com base no patrimônio financeiro (liquidez) e metas informadas.\n• Sugestão: revisar custo de aposentadoria, aumentar aporte ou ajustar idade.\n• Próximo passo: conferir se os ativos ilíquidos (imóveis/empresa) não estão sendo usados para bancar a renda.\n\n(Configure um /api/copilot para diagnóstico real, ou salve uma API key no localStorage: planner_openai_api_key_v1.)"
            );
            return;
          }

          // ⚠️ frontend-only (menos seguro): chama OpenAI direto
          const oai = await fetch("https://api.openai.com/v1/responses", {
            method: "POST",
            headers: {
              "Content-Type": "application/json",
              Authorization: `Bearer ${apiKey}`,
            },
            body: JSON.stringify({
              model: "gpt-4.1-mini",
              input: prompt,
              max_output_tokens: 600,
            }),
          });

          if (!oai.ok) {
            const t = await oai.text();
            throw new Error(`Falha OpenAI (${oai.status}): ${t?.slice?.(0, 200) || "erro"}`);
          }

          const json = await oai.json();

          const text =
            json?.output_text ||
            json?.output?.[0]?.content?.[0]?.text ||
            json?.output?.[0]?.content?.map?.((c) => c?.text).filter(Boolean).join("\n") ||
            "";

          if (!text) throw new Error("OpenAI respondeu, mas não consegui extrair o texto.");

          setResult(text);
          return;
        }

        const msg = await res.text();
        throw new Error(`Erro /api/copilot (${res.status}): ${msg?.slice?.(0, 200) || "sem detalhes"}`);
      } catch (e) {
        console.error("[SmartCopilot] erro:", e);
        setError(e?.message || "Falha ao gerar diagnóstico.");
      } finally {
        setLoading(false);
      }
    },
    [aiEnabled, apiKey]
  );

  return { loading, error, result, generateDiagnosis };
}
