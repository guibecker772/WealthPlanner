import React, { useEffect, useState } from "react";
import { Key, Eye, EyeOff, Trash2, Save, CheckCircle2 } from "lucide-react";
import Card from "./Card";

// mantém igual ao teu app (localStorage)
const AI_KEY_STORAGE = "WEALTH_PRO_AI_KEY";
const getStoredKey = () => localStorage.getItem(AI_KEY_STORAGE);
const setStoredKey = (key) => localStorage.setItem(AI_KEY_STORAGE, key);
const removeStoredKey = () => localStorage.removeItem(AI_KEY_STORAGE);

export default function ApiKeyManager() {
  const [key, setKey] = useState("");
  const [isVisible, setIsVisible] = useState(false);
  const [saved, setSaved] = useState(false);

  useEffect(() => {
    const stored = getStoredKey();
    if (stored) {
      setKey(stored);
      setSaved(true);
    }
  }, []);

  const handleSave = () => {
    if (key.trim()) {
      setStoredKey(key.trim());
      setSaved(true);
    }
  };

  const handleRemove = () => {
    removeStoredKey();
    setKey("");
    setSaved(false);
  };

  return (
    <Card title="Configuração da IA (API Key)">
      <div className="space-y-4">
        <p className="text-xs text-slate-500 leading-relaxed">
          Para usar o Smart Copilot com IA real, insira sua chave do Google Gemini.
          A chave fica salva apenas no seu navegador.
        </p>

        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <div className="absolute left-3 top-2.5 text-slate-400">
              <Key size={16} />
            </div>

            <input
              type={isVisible ? "text" : "password"}
              className={`w-full pl-9 pr-10 py-2 text-sm border rounded-lg outline-none transition-all ${
                saved
                  ? "border-emerald-300 bg-emerald-50 text-emerald-700"
                  : "border-slate-300 focus:border-indigo-500"
              }`}
              placeholder="Cole sua API Key aqui (ex: AIzaSy...)"
              value={key}
              onChange={(e) => {
                setKey(e.target.value);
                setSaved(false);
              }}
              readOnly={saved}
            />

            <button
              onClick={() => setIsVisible(!isVisible)}
              className="absolute right-3 top-2.5 text-slate-400 hover:text-indigo-600"
            >
              {isVisible ? <EyeOff size={16} /> : <Eye size={16} />}
            </button>
          </div>

          {saved ? (
            <button
              onClick={handleRemove}
              className="px-4 py-2 bg-white border border-rose-200 text-rose-600 text-sm font-medium rounded-lg hover:bg-rose-50 flex items-center gap-2"
            >
              <Trash2 size={16} /> Remover
            </button>
          ) : (
            <button
              onClick={handleSave}
              disabled={!key}
              className="px-4 py-2 bg-indigo-600 text-white text-sm font-medium rounded-lg hover:bg-indigo-700 disabled:opacity-50 flex items-center gap-2"
            >
              <Save size={16} /> Salvar
            </button>
          )}
        </div>

        {saved && (
          <p className="text-xs text-emerald-600 flex items-center gap-1">
            <CheckCircle2 size={12} /> Chave salva localmente com sucesso.
          </p>
        )}
      </div>
    </Card>
  );
}
