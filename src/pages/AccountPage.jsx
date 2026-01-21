// src/pages/AccountPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import { updateProfile } from "firebase/auth";
import { useAuth } from "../auth/AuthContext.jsx";

export default function AccountPage() {
  const { user, fbUser, refreshUser } = useAuth();

  const initialName = useMemo(() => user?.displayName || "", [user?.displayName]);
  const [name, setName] = useState(initialName);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    setName(initialName);
  }, [initialName]);

  const save = async () => {
    setMsg({ type: "", text: "" });

    const current = fbUser || user;
    if (!current) return;

    const trimmed = String(name || "").trim();
    if (trimmed.length < 2) {
      setMsg({ type: "error", text: "Informe um nome válido (mínimo 2 caracteres)." });
      return;
    }

    setSaving(true);
    try {
      await updateProfile(current, { displayName: trimmed });
      await refreshUser?.();
      setMsg({ type: "success", text: "Nome atualizado com sucesso!" });
    } catch (e) {
      setMsg({ type: "error", text: "Não foi possível atualizar o nome agora. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-display font-bold text-text-primary">Minha Conta</h2>
      <p className="text-sm text-text-secondary mt-1">Gerencie seus dados de perfil.</p>

      <div className="mt-8 rounded-2xl border border-border bg-surface/20 p-6 space-y-5">
        <div>
          <label className="text-sm font-semibold text-text-secondary">E-mail</label>
          <div className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary">
            {user?.email || "—"}
          </div>
        </div>

        <div>
          <label className="text-sm font-semibold text-text-secondary">Nome</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
            placeholder="Ex: Guilherme Becker"
          />
          <p className="text-xs text-text-secondary mt-2">
            Esse nome aparece no menu lateral e em áreas internas do sistema.
          </p>
        </div>

        {msg.text && (
          <div
            className={`rounded-xl border px-4 py-3 text-sm ${
              msg.type === "error"
                ? "border-danger/30 bg-danger-subtle/20 text-danger"
                : "border-accent/30 bg-accent-subtle/10 text-accent"
            }`}
          >
            {msg.text}
          </div>
        )}

        <button
          onClick={save}
          disabled={saving}
          className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
            saving
              ? "opacity-60 cursor-not-allowed border-border text-text-secondary"
              : "border-accent/40 text-accent hover:bg-accent-subtle/20"
          }`}
        >
          {saving ? "Salvando..." : "Salvar alterações"}
        </button>
      </div>
    </div>
  );
}
