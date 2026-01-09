import React, { useEffect, useMemo, useState } from "react";
import {
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
  sendPasswordResetEmail,
  signInWithPopup,
} from "firebase/auth";
import { auth, googleProvider } from "../services/firebase";

import { Mail, Lock, Eye, EyeOff, AlertTriangle, Loader2, CheckCircle2 } from "lucide-react";

function GoogleMark({ className = "" }) {
  return (
    <svg className={className} width="18" height="18" viewBox="0 0 48 48" aria-hidden="true">
      <path
        fill="#EA4335"
        d="M24 9.5c3.1 0 5.9 1.1 8.1 3.1l6-6C34.6 3.4 29.7 1.5 24 1.5 14.8 1.5 6.9 6.8 3.1 14.6l7.1 5.5C12 14 17.5 9.5 24 9.5z"
      />
      <path
        fill="#4285F4"
        d="M46.5 24.5c0-1.6-.1-2.8-.4-4.1H24v7.8h12.7c-.3 2-1.7 5-4.9 7l7.5 5.8c4.4-4.1 7.2-10.1 7.2-16.5z"
      />
      <path
        fill="#FBBC05"
        d="M10.2 28.1c-.5-1.4-.8-2.9-.8-4.6s.3-3.2.8-4.6l-7.1-5.5C1.7 16.2.9 19.2.9 23.5s.8 7.3 2.2 10.1l7.1-5.5z"
      />
      <path
        fill="#34A853"
        d="M24 45.5c5.7 0 10.6-1.9 14.1-5.2l-7.5-5.8c-2 1.4-4.7 2.4-6.6 2.4-6.5 0-12-4.5-13.8-10.6l-7.1 5.5C6.9 40.2 14.8 45.5 24 45.5z"
      />
    </svg>
  );
}

function friendlyAuthError(err) {
  const code = err?.code || "";
  if (code.includes("auth/invalid-credential")) return "E-mail ou senha incorretos.";
  if (code.includes("auth/wrong-password")) return "Senha incorreta.";
  if (code.includes("auth/user-not-found")) return "Usuário não encontrado.";
  if (code.includes("auth/email-already-in-use")) return "Esse e-mail já está cadastrado.";
  if (code.includes("auth/invalid-email")) return "E-mail inválido.";
  if (code.includes("auth/weak-password")) return "Senha fraca. Use pelo menos 6 caracteres.";
  if (code.includes("auth/popup-closed-by-user")) return "Login com Google cancelado.";
  if (code.includes("auth/operation-not-allowed"))
    return "Método de login não habilitado no Firebase (verifique Authentication).";
  return err?.message || "Erro ao autenticar. Tente novamente.";
}

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "signup"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);

  const [loading, setLoading] = useState(false);
  const [msg, setMsg] = useState({ type: "", text: "" });

  useEffect(() => {
    const saved = localStorage.getItem("pw_login_email_v1");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (remember) localStorage.setItem("pw_login_email_v1", email || "");
    else localStorage.removeItem("pw_login_email_v1");
  }, [remember, email]);

  const canSubmit = useMemo(() => {
    return String(email || "").trim().length > 0 && String(password || "").length > 0;
  }, [email, password]);

  const submit = async (e) => {
    e?.preventDefault?.();
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      if (mode === "signup") {
        await createUserWithEmailAndPassword(auth, email.trim(), password);
      } else {
        await signInWithEmailAndPassword(auth, email.trim(), password);
      }
      setMsg({
        type: "success",
        text: mode === "signup" ? "Conta criada com sucesso!" : "Login realizado!",
      });
    } catch (err) {
      setMsg({ type: "error", text: friendlyAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const loginGoogle = async () => {
    setMsg({ type: "", text: "" });
    setLoading(true);
    try {
      await signInWithPopup(auth, googleProvider);
      setMsg({ type: "success", text: "Login com Google realizado!" });
    } catch (err) {
      setMsg({ type: "error", text: friendlyAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  const resetPass = async () => {
    setMsg({ type: "", text: "" });
    if (!email?.trim()) {
      setMsg({ type: "error", text: "Informe seu e-mail para recuperar a senha." });
      return;
    }
    setLoading(true);
    try {
      await sendPasswordResetEmail(auth, email.trim());
      setMsg({ type: "success", text: "E-mail de recuperação enviado. Verifique sua caixa de entrada." });
    } catch (err) {
      setMsg({ type: "error", text: friendlyAuthError(err) });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex min-h-screen w-full bg-[#09090B] text-white overflow-hidden font-sans">
      
      {/* --- LADO ESQUERDO (HERO / BRANDING) --- */}
      {/* Oculto em mobile, visível em lg (metade da tela) */}
      <div className="hidden lg:flex lg:w-1/2 relative bg-[#070A12] items-center justify-center p-12 overflow-hidden">
        {/* Efeitos de Fundo (Glow) */}
        <div className="absolute top-[-20%] left-[-20%] h-[800px] w-[800px] rounded-full bg-[#D4AF37]/10 blur-[180px] pointer-events-none" />
        <div className="absolute bottom-[-10%] right-[-10%] h-[600px] w-[600px] rounded-full bg-[#D4AF37]/5 blur-[150px] pointer-events-none" />
        
        {/* Conteúdo Centralizado */}
        <div className="relative z-10 max-w-xl">
          {/* Logo */}
          <div className="flex items-center gap-3 mb-12">
            <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-[#D4AF37] to-[#B5952F] text-[#0A0C14] grid place-items-center font-black text-xl shadow-[0_0_40px_rgba(212,175,55,0.3)]">
              PW
            </div>
            <span className="text-xl font-bold tracking-tight">Private Wealth</span>
          </div>

          <h1 className="text-5xl xl:text-6xl font-extrabold leading-[1.1] tracking-tight mb-6">
            O controle do seu <br />
            legado, <span className="text-transparent bg-clip-text bg-gradient-to-r from-[#D4AF37] to-[#F2D06B]">elevado.</span>
          </h1>
          
          <p className="text-lg text-slate-400 mb-10 leading-relaxed max-w-md">
            A suíte definitiva para gestão patrimonial de alta performance. Segurança, inteligência e controle em um só lugar.
          </p>

          {/* Features / Bullets */}
          <div className="space-y-6">
            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="mt-1">
                <CheckCircle2 className="text-[#D4AF37]" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Segurança de Nível Bancário</h3>
                <p className="text-sm text-slate-400">Criptografia de ponta a ponta para seus dados mais sensíveis.</p>
              </div>
            </div>

            <div className="flex items-start gap-4 p-4 rounded-2xl bg-white/5 border border-white/5 backdrop-blur-sm">
              <div className="mt-1">
                <CheckCircle2 className="text-[#D4AF37]" size={24} />
              </div>
              <div>
                <h3 className="font-semibold text-white mb-1">Gestão Patrimonial 360º</h3>
                <p className="text-sm text-slate-400">Acompanhe ativos globais, sucessão e projeções financeiras.</p>
              </div>
            </div>
          </div>

          <div className="mt-12 text-xs text-slate-600 font-medium">
            © 2026 Private Wealth Management. Acesso restrito.
          </div>
        </div>
      </div>

      {/* --- LADO DIREITO (LOGIN FORM) --- */}
      <div className="flex-1 flex flex-col justify-center items-center p-4 sm:p-8 lg:p-12 bg-[#09090B] relative">
        {/* Botão de Alternar Login/Cadastro no topo direito (opcional, pode ficar dentro do form também) */}
        <div className="absolute top-8 right-8 flex items-center gap-2 text-sm">
          <span className="text-slate-400">
            {mode === 'login' ? 'Não tem uma conta?' : 'Já tem uma conta?'}
          </span>
          <button 
            onClick={() => setMode(mode === 'login' ? 'signup' : 'login')}
            className="text-[#D4AF37] font-semibold hover:underline"
          >
            {mode === 'login' ? 'Criar agora' : 'Entrar'}
          </button>
        </div>

        <div className="w-full max-w-[400px] space-y-8">
          {/* Cabeçalho Mobile (só aparece se tela pequena) */}
          <div className="lg:hidden flex justify-center mb-8">
             <div className="w-10 h-10 rounded-xl bg-[#D4AF37] text-[#0A0C14] grid place-items-center font-black">PW</div>
          </div>

          <div className="space-y-2 text-center lg:text-left">
            <h2 className="text-3xl font-bold tracking-tight text-white">
              {mode === 'login' ? 'Acesse sua conta' : 'Crie sua conta'}
            </h2>
            <p className="text-slate-400">
              {mode === 'login' ? 'Bem-vindo de volta! Insira seus dados para continuar.' : 'Comece sua jornada de gestão patrimonial hoje.'}
            </p>
          </div>

          {/* Mensagens de Erro/Sucesso */}
          {msg.text && (
            <div className={`rounded-lg border px-4 py-3 text-sm flex items-start gap-3 ${
              msg.type === "error" 
                ? "bg-red-500/10 border-red-500/20 text-red-400" 
                : "bg-emerald-500/10 border-emerald-500/20 text-emerald-400"
            }`}>
              <div className="mt-0.5">
                {msg.type === "error" ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
              </div>
              <span>{msg.text}</span>
            </div>
          )}

          <form onSubmit={submit} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300" htmlFor="email">E-mail</label>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Mail size={18} />
                </div>
                <input
                  id="email"
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="nome@exemplo.com"
                  className="
                    w-full bg-[#18181B] border border-[#27272A] rounded-lg px-10 py-2.5 text-white placeholder:text-slate-600
                    focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]
                    transition-all
                  "
                />
              </div>
            </div>

            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium text-slate-300" htmlFor="password">Senha</label>
                {mode === 'login' && (
                  <button 
                    type="button" 
                    onClick={resetPass}
                    className="text-xs text-[#D4AF37] hover:text-[#E8C766] transition-colors"
                  >
                    Esqueceu a senha?
                  </button>
                )}
              </div>
              <div className="relative">
                <div className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500 pointer-events-none">
                  <Lock size={18} />
                </div>
                <input
                  id="password"
                  type={showPass ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="
                    w-full bg-[#18181B] border border-[#27272A] rounded-lg px-10 py-2.5 text-white placeholder:text-slate-600
                    focus:outline-none focus:ring-2 focus:ring-[#D4AF37]/50 focus:border-[#D4AF37]
                    transition-all
                  "
                />
                <button
                  type="button"
                  onClick={() => setShowPass(!showPass)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-500 hover:text-slate-300 transition-colors"
                >
                  {showPass ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>
            </div>

            {/* Checkbox Lembrar-me */}
            <div className="flex items-center gap-2">
              <input 
                type="checkbox" 
                id="remember"
                checked={remember}
                onChange={(e) => setRemember(e.target.checked)}
                className="
                  w-4 h-4 rounded bg-[#18181B] border-[#27272A] 
                  text-[#D4AF37] focus:ring-[#D4AF37] focus:ring-offset-0 focus:ring-offset-[#09090B]
                "
              />
              <label htmlFor="remember" className="text-sm text-slate-400 select-none cursor-pointer">
                Lembrar-me neste dispositivo
              </label>
            </div>

            <button
              type="submit"
              disabled={loading || !canSubmit}
              className={`
                w-full py-2.5 rounded-lg font-bold text-[#09090B]
                flex items-center justify-center gap-2
                transition-all duration-200
                ${loading || !canSubmit
                  ? "bg-[#D4AF37]/50 cursor-not-allowed"
                  : "bg-[#D4AF37] hover:bg-[#B5952F] hover:shadow-[0_0_20px_rgba(212,175,55,0.4)]"
                }
              `}
            >
              {loading && <Loader2 className="animate-spin" size={18} />}
              {mode === 'login' ? 'Entrar na Plataforma' : 'Criar Conta'}
            </button>
          </form>

          <div className="relative">
            <div className="absolute inset-0 flex items-center">
              <span className="w-full border-t border-[#27272A]" />
            </div>
            <div className="relative flex justify-center text-xs uppercase">
              <span className="bg-[#09090B] px-2 text-slate-500">ou continue com</span>
            </div>
          </div>

          <button
            type="button"
            onClick={loginGoogle}
            disabled={loading}
            className="
              w-full py-2.5 rounded-lg font-medium text-slate-300
              bg-[#18181B] border border-[#27272A]
              hover:bg-[#27272A] hover:text-white
              flex items-center justify-center gap-3
              transition-all
            "
          >
            <GoogleMark />
            Google
          </button>

          <p className="text-center text-xs text-slate-500 pt-4">
            Ao clicar em continuar, você concorda com nossos{" "}
            <a href="#" className="underline hover:text-slate-400">Termos de Serviço</a> e{" "}
            <a href="#" className="underline hover:text-slate-400">Política de Privacidade</a>.
          </p>
        </div>
      </div>
    </div>
  );
}