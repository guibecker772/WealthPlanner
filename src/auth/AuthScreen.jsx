import React, { useState } from "react";
import { AlertCircle, Loader2 } from "lucide-react";

import Card from "../components/Card";
import InputField from "../components/InputField";
import { useAuth } from "../context/AuthContext.jsx";

export default function AuthScreen() {
  const { login, loginGoogle, register } = useAuth();

  const [mode, setMode] = useState("login"); // "login" | "register"
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setBusy(true);

    try {
      if (mode === "login") {
        await login(email, password);
      } else {
        await register(email, password, name);
      }
    } catch (err) {
      setError(err?.message || "Não foi possível autenticar. Verifique os dados e tente novamente.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 grid place-items-center px-4">
      <div className="w-full max-w-md">
        <Card>
          <div className="p-6">
            <div className="mb-4">
              <h1 className="text-xl font-extrabold text-slate-800">Wealth Planner</h1>
              <p className="text-sm text-slate-500">
                {mode === "login" ? "Entre para acessar o planejador" : "Crie sua conta"}
              </p>
            </div>

            {error && (
              <div className="mb-4 p-3 rounded-lg bg-rose-50 text-rose-700 text-sm flex gap-2 items-start">
                <AlertCircle size={18} className="mt-0.5" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-3">
              {mode === "register" && (
                <InputField
                  label="Nome"
                  value={name}
                  onChange={(v) => setName(v)}
                  placeholder="Seu nome"
                />
              )}

              <InputField
                label="E-mail"
                value={email}
                onChange={(v) => setEmail(v)}
                placeholder="email@dominio.com"
              />

              <InputField
                label="Senha"
                value={password}
                onChange={(v) => setPassword(v)}
                placeholder="••••••••"
                type="password"
              />

              <button
                type="submit"
                disabled={busy}
                className="w-full px-4 py-2 rounded-lg bg-slate-900 text-white font-extrabold hover:opacity-90 disabled:opacity-60 flex items-center justify-center gap-2"
              >
                {busy && <Loader2 className="animate-spin" size={16} />}
                {mode === "login" ? "Entrar" : "Cadastrar"}
              </button>

              <button
                type="button"
                onClick={async () => {
                  setError("");
                  setBusy(true);
                  try {
                    await loginGoogle();
                  } catch (err) {
                    setError(err?.message || "Falha no login com Google.");
                  } finally {
                    setBusy(false);
                  }
                }}
                disabled={busy}
                className="w-full px-4 py-2 rounded-lg border border-slate-200 text-slate-800 font-bold hover:bg-slate-50 disabled:opacity-60"
              >
                Entrar com Google
              </button>
            </form>

            <div className="mt-4 text-sm text-slate-600">
              {mode === "login" ? (
                <button
                  className="font-bold text-slate-900 hover:underline"
                  onClick={() => setMode("register")}
                >
                  Não tenho conta — cadastrar
                </button>
              ) : (
                <button
                  className="font-bold text-slate-900 hover:underline"
                  onClick={() => setMode("login")}
                >
                  Já tenho conta — entrar
                </button>
              )}
            </div>
          </div>
        </Card>
      </div>
    </div>
  );
}
