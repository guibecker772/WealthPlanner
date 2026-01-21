// src/pages/SecurityPage.jsx
import React, { useMemo, useState } from "react";
import {
  EmailAuthProvider,
  reauthenticateWithCredential,
  updatePassword,
  sendPasswordResetEmail,
} from "firebase/auth";
import { auth } from "../services/firebase"; // precisa do auth para reset email
import { useAuth } from "../auth/AuthContext.jsx";

export default function SecurityPage() {
  const { fbUser, user } = useAuth();

  const [currentPass, setCurrentPass] = useState("");
  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  const providerIds = useMemo(() => {
    const list = user?.providerData || [];
    return list.map((p) => p?.providerId).filter(Boolean);
  }, [user?.providerData]);

  const isPasswordUser = providerIds.includes("password");
  const isGoogleUser = providerIds.includes("google.com");

  const changePassword = async () => {
    setMsg({ type: "", text: "" });

    const current = fbUser || user;
    if (!current || !user?.email) return;

    if (!isPasswordUser) {
      setMsg({
        type: "error",
        text: "Sua conta não usa senha do aplicativo (ex.: login Google). Não é possível trocar senha aqui.",
      });
      return;
    }

    if (!currentPass) {
      setMsg({ type: "error", text: "Informe sua senha atual." });
      return;
    }

    if (String(newPass || "").length < 6) {
      setMsg({ type: "error", text: "A nova senha precisa ter pelo menos 6 caracteres." });
      return;
    }

    if (newPass !== confirmPass) {
      setMsg({ type: "error", text: "A confirmação da senha não confere." });
      return;
    }

    setSaving(true);
    try {
      const cred = EmailAuthProvider.credential(user.email, currentPass);
      await reauthenticateWithCredential(current, cred);
      await updatePassword(current, newPass);

      setMsg({ type: "success", text: "Senha atualizada com sucesso!" });
      setCurrentPass("");
      setNewPass("");
      setConfirmPass("");
    } catch (e) {
      setMsg({
        type: "error",
        text: "Não foi possível atualizar. Verifique a senha atual e tente novamente (ou faça login novamente).",
      });
    } finally {
      setSaving(false);
    }
  };

  const resetByEmail = async () => {
    setMsg({ type: "", text: "" });
    if (!user?.email) {
      setMsg({ type: "error", text: "Seu usuário não possui e-mail associado." });
      return;
    }

    setSaving(true);
    try {
      await sendPasswordResetEmail(auth, user.email);
      setMsg({ type: "success", text: "E-mail de redefinição enviado. Verifique sua caixa de entrada." });
    } catch (e) {
      setMsg({ type: "error", text: "Não foi possível enviar o e-mail agora. Tente novamente." });
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="max-w-2xl">
      <h2 className="text-2xl font-display font-bold text-text-primary">Segurança</h2>
      <p className="text-sm text-text-secondary mt-1">Senha e recuperação de acesso.</p>

      <div className="mt-8 rounded-2xl border border-border bg-surface/20 p-6 space-y-5">
        {/* Aviso para conta Google */}
        {isGoogleUser && !isPasswordUser && (
          <div className="rounded-xl border border-border bg-surface/20 px-4 py-3 text-sm text-text-secondary">
            Sua conta utiliza <b>Login com Google</b>. Nesse caso, a senha é gerenciada pelo Google — não há troca de
            senha do app aqui.
          </div>
        )}

        {/* Trocar senha só para usuários "password" */}
        {isPasswordUser && (
          <>
            <div>
              <label className="text-sm font-semibold text-text-secondary">Senha atual</label>
              <input
                type="password"
                value={currentPass}
                onChange={(e) => setCurrentPass(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                placeholder="••••••••"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-text-secondary">Nova senha</label>
              <input
                type="password"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                placeholder="mínimo 6 caracteres"
              />
            </div>

            <div>
              <label className="text-sm font-semibold text-text-secondary">Confirmar nova senha</label>
              <input
                type="password"
                value={confirmPass}
                onChange={(e) => setConfirmPass(e.target.value)}
                className="mt-2 w-full rounded-xl border border-border bg-surface-muted px-4 py-3 text-sm text-text-primary outline-none focus:ring-1 focus:ring-accent/40"
                placeholder="repita a nova senha"
              />
            </div>
          </>
        )}

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

        <div className="flex flex-wrap gap-3">
          {isPasswordUser && (
            <button
              onClick={changePassword}
              disabled={saving}
              className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
                saving
                  ? "opacity-60 cursor-not-allowed border-border text-text-secondary"
                  : "border-accent/40 text-accent hover:bg-accent-subtle/20"
              }`}
            >
              {saving ? "Atualizando..." : "Trocar senha"}
            </button>
          )}

          <button
            onClick={resetByEmail}
            disabled={saving || !user?.email}
            className={`px-5 py-3 rounded-xl font-bold text-sm border transition-all ${
              saving || !user?.email
                ? "opacity-60 cursor-not-allowed border-border text-text-secondary"
                : "border-border text-text-secondary hover:text-text-primary hover:bg-surface-highlight"
            }`}
            title={!user?.email ? "Sem e-mail associado" : "Enviar e-mail de redefinição"}
          >
            Enviar e-mail de redefinição
          </button>
        </div>

        <p className="text-xs text-text-secondary">
          Dica: Se aparecer erro de “precisa fazer login novamente”, saia e entre de novo para refazer a autenticação.
        </p>
      </div>
    </div>
  );
}
