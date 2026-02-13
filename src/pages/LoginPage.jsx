// src/pages/LoginPage.jsx
import React, { useEffect, useMemo, useState } from "react";
import {
  Mail,
  Lock,
  Eye,
  EyeOff,
  AlertTriangle,
  Loader2,
  CheckCircle2,
  User,
  Sparkles,
  Check,
} from "lucide-react";
import Card from "../components/ui/Card.jsx";
import Button from "../components/ui/Button.jsx";
import SuiteSwitcher from "../components/SuiteSwitcher.jsx";
import { useAuth } from "../auth/AuthContext.jsx";

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

function friendlyAuthError(err, fallback = "Não foi possível entrar. Tente novamente.") {
  const code = String(err?.code || "");

  if (
    code.includes("auth/invalid-credential") ||
    code.includes("auth/user-not-found") ||
    code.includes("auth/wrong-password")
  ) {
    return "Email ou senha inválidos.";
  }

  if (code.includes("auth/popup-closed-by-user")) {
    return "Login cancelado.";
  }

  if (code.includes("auth/unauthorized-domain")) {
    return "Domínio não autorizado. Verifique Authorized domains no Firebase.";
  }

  if (code.includes("auth/email-already-in-use")) {
    return "Esse email já está cadastrado.";
  }

  if (code.includes("auth/invalid-email")) {
    return "Email inválido.";
  }

  if (code.includes("auth/weak-password")) {
    return "Senha fraca. Use pelo menos 6 caracteres.";
  }

  if (code.includes("auth/too-many-requests")) {
    return "Muitas tentativas. Aguarde alguns minutos e tente novamente.";
  }

  if (code.includes("auth/operation-not-allowed")) {
    return "Método de login não habilitado no Firebase.";
  }

  return fallback;
}

function FeedbackBanner({ type, text }) {
  if (!text) return null;

  const isError = type === "error";

  return (
    <div
      role={isError ? "alert" : "status"}
      aria-live={isError ? "assertive" : "polite"}
      className={`rounded-xl border px-4 py-3 text-sm flex items-start gap-3 ${
        isError
          ? "bg-danger-subtle/40 border-danger/40 text-danger"
          : "bg-success-subtle/30 border-success/40 text-success"
      }`}
    >
      <div className="mt-0.5 shrink-0">
        {isError ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
      </div>
      <span className="leading-relaxed">{text}</span>
    </div>
  );
}

const PW_HIGHLIGHTS = [
  "Visão consolidada da carteira e metas financeiras.",
  "Planejamento patrimonial com dados confiáveis e atualizados.",
  "Cenários e decisões com foco em previsibilidade.",
];

export default function LoginPage() {
  const { login, loginGoogle, register, resetPassword } = useAuth();
  const advisorControlUrl = import.meta.env.VITE_ADVISOR_CONTROL_BASE_URL;

  const [mode, setMode] = useState("login"); // login | signup
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPass, setShowPass] = useState(false);
  const [remember, setRemember] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isGoogleSubmitting, setIsGoogleSubmitting] = useState(false);
  const [isResetSubmitting, setIsResetSubmitting] = useState(false);
  const [feedback, setFeedback] = useState({ type: "", text: "" });

  const isBusy = isSubmitting || isGoogleSubmitting || isResetSubmitting;

  useEffect(() => {
    const saved = localStorage.getItem("pw_login_email_v1");
    if (saved) setEmail(saved);
  }, []);

  useEffect(() => {
    if (remember) localStorage.setItem("pw_login_email_v1", email || "");
    else localStorage.removeItem("pw_login_email_v1");
  }, [remember, email]);

  const canSubmit = useMemo(() => {
    const hasEmail = String(email || "").trim().length > 0;
    const hasPassword = String(password || "").length > 0;

    if (mode === "signup") {
      return hasEmail && hasPassword && String(name || "").trim().length >= 2;
    }

    return hasEmail && hasPassword;
  }, [email, password, name, mode]);

  const toggleMode = () => {
    if (isBusy) return;
    setFeedback({ type: "", text: "" });
    setMode((prev) => (prev === "login" ? "signup" : "login"));
  };

  const submit = async (event) => {
    event?.preventDefault?.();

    if (!canSubmit || isBusy) return;

    setFeedback({ type: "", text: "" });
    setIsSubmitting(true);

    try {
      if (mode === "signup") {
        await register(email, password, name);
        setFeedback({ type: "success", text: "Conta criada com sucesso!" });
      } else {
        await login(email, password);
        setFeedback({ type: "success", text: "Login realizado com sucesso!" });
      }
    } catch (err) {
      setFeedback({
        type: "error",
        text: friendlyAuthError(
          err,
          mode === "signup"
            ? "Não foi possível criar sua conta. Tente novamente."
            : "Não foi possível entrar. Tente novamente."
        ),
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleGoogle = async () => {
    if (isBusy) return;

    setFeedback({ type: "", text: "" });
    setIsGoogleSubmitting(true);

    try {
      await loginGoogle();
      setFeedback({ type: "success", text: "Login com Google realizado com sucesso!" });
    } catch (err) {
      setFeedback({
        type: "error",
        text: friendlyAuthError(err, "Não foi possível entrar. Tente novamente."),
      });
    } finally {
      setIsGoogleSubmitting(false);
    }
  };

  const handleResetPass = async () => {
    if (mode !== "login" || isBusy) return;

    setFeedback({ type: "", text: "" });

    if (!email?.trim()) {
      setFeedback({ type: "error", text: "Informe seu email para recuperar a senha." });
      return;
    }

    if (typeof resetPassword !== "function") {
      setFeedback({
        type: "error",
        text: "Recuperação de senha indisponível no momento.",
      });
      return;
    }

    setIsResetSubmitting(true);

    try {
      await resetPassword(email.trim());
      setFeedback({
        type: "success",
        text: "Email de recuperação enviado. Verifique sua caixa de entrada.",
      });
    } catch (err) {
      setFeedback({
        type: "error",
        text: friendlyAuthError(err, "Não foi possível enviar o email de recuperação."),
      });
    } finally {
      setIsResetSubmitting(false);
    }
  };

  const submitLabel = mode === "login" ? "Entrar na Plataforma" : "Criar Conta";

  return (
    <div className="relative min-h-screen overflow-hidden bg-bg text-text">
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute inset-0 bg-[linear-gradient(92deg,#0b1220_0%,#121d2f_42%,#10192a_68%,#0a131f_100%)]" />
        <div className="absolute inset-0 bg-[radial-gradient(1150px_640px_at_12%_8%,rgba(220,176,94,0.16),transparent_58%)]" />
        <div className="absolute right-[-10%] top-[14%] h-[78%] w-[36%] bg-[radial-gradient(ellipse_at_center,rgba(220,176,94,0.34)_0%,rgba(220,176,94,0.16)_34%,rgba(220,176,94,0.07)_55%,transparent_75%)] blur-3xl" />
        <div className="absolute inset-x-0 top-0 h-24 bg-gradient-to-b from-surface-2/35 to-transparent" />
      </div>

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-7xl flex-col px-4 py-6 sm:px-8 lg:px-12">
        <header className="flex items-center justify-between gap-4">
          <div className="inline-flex items-center gap-3 rounded-2xl border border-border bg-surface-1/60 px-3.5 py-2.5 backdrop-blur-md">
            <div className="grid h-10 w-10 place-items-center rounded-xl border border-accent/50 bg-gradient-to-br from-accent/90 to-accent-2 text-accent-fg font-black shadow-glow-accent">
              PW
            </div>
            <div>
              <p className="text-sm font-semibold leading-tight">Private Wealth</p>
              <p className="text-[11px] text-text-muted leading-tight">Planejamento patrimonial premium</p>
            </div>
          </div>

          <div className="flex items-center gap-2 text-sm">
            <span className="text-text-muted">
              {mode === "login" ? "Não tem uma conta?" : "Já tem uma conta?"}
            </span>
            <button
              type="button"
              onClick={toggleMode}
              disabled={isBusy}
              aria-label={mode === "login" ? "Criar nova conta" : "Entrar com conta existente"}
              className="font-semibold text-accent hover:text-accent-2 hover:underline transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {mode === "login" ? "Criar agora" : "Entrar"}
            </button>
          </div>
        </header>

        <main className="flex flex-1 items-center justify-center py-8 lg:items-start lg:py-10 xl:py-14">
          <div className="grid w-full max-w-[1380px] gap-10 lg:grid-cols-[minmax(0,1.12fr)_minmax(420px,500px)] lg:gap-16 xl:gap-20">
            <section className="order-2 space-y-8 lg:order-1 lg:min-h-[620px] lg:flex lg:flex-col lg:justify-between lg:pr-8">
              <div className="space-y-7">
                <div className="hidden lg:block">
                  <SuiteSwitcher current="pw" advisorUrl={advisorControlUrl} />
                </div>

                <div className="space-y-4">
                  <p className="inline-flex items-center gap-2 rounded-full border border-accent/25 bg-accent-subtle/20 px-3 py-1 text-xs font-medium tracking-wide text-accent">
                    <Sparkles size={14} />
                    Private Wealth
                  </p>

                  <h1 className="max-w-xl text-3xl font-display font-bold tracking-tight text-text sm:text-4xl lg:text-5xl leading-tight">
                    Controle patrimonial com foco em longo prazo e decisões melhores.
                  </h1>

                  <p className="max-w-xl text-base text-text-muted leading-relaxed">
                    Centralize patrimônio, metas e cenários em uma experiência elegante, consistente e segura.
                  </p>
                </div>
              </div>

              <ul className="space-y-3 lg:max-w-[560px]">
                {PW_HIGHLIGHTS.map((item) => (
                  <li
                    key={item}
                    className="flex items-center gap-3 rounded-xl border border-border bg-surface-2/40 px-4 py-3 text-sm text-text-secondary backdrop-blur-sm"
                  >
                    <span className="grid h-5 w-5 place-items-center rounded-full border border-accent/30 bg-accent-subtle/30 text-accent">
                      <Check size={12} />
                    </span>
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </section>

            <section className="order-1 lg:order-2 lg:w-[460px] lg:justify-self-end lg:self-center">
              <div className="mb-5 lg:hidden">
                <SuiteSwitcher current="pw" advisorUrl={advisorControlUrl} compact />
              </div>

              <Card
                glass
                elevated
                className="border-border-highlight/80 bg-surface-2/75 shadow-elevated"
              >
                <div className="space-y-6">
                  <div className="space-y-2">
                    <p className="text-xs uppercase tracking-[0.16em] text-text-faint font-semibold">
                      Private Wealth
                    </p>
                    <h2 className="text-2xl font-display font-bold tracking-tight text-text">
                      {mode === "login" ? "Entrar na plataforma" : "Criar sua conta"}
                    </h2>
                    <p className="text-sm text-text-muted leading-relaxed">
                      {mode === "login"
                        ? "Use seu email e senha para continuar no ambiente Private Wealth."
                        : "Crie sua conta para acessar o planejamento com seu perfil personalizado."}
                    </p>
                  </div>

                  <FeedbackBanner type={feedback.type} text={feedback.text} />

                  <form onSubmit={submit} aria-busy={isBusy} className="space-y-4">
                    {mode === "signup" && (
                      <div className="space-y-1.5">
                        <label htmlFor="name" className="text-sm font-medium text-text-muted">
                          Nome
                        </label>
                        <div className="relative">
                          <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                            <User size={17} />
                          </span>
                          <input
                            id="name"
                            name="name"
                            type="text"
                            autoComplete="name"
                            value={name}
                            onChange={(e) => setName(e.target.value)}
                            placeholder="Ex: Guilherme Becker"
                            disabled={isBusy}
                            required={mode === "signup"}
                            className="w-full rounded-xl border border-border bg-surface-1/80 px-10 py-2.5 text-text placeholder:text-text-faint/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/60 disabled:opacity-60 disabled:cursor-not-allowed"
                          />
                        </div>
                      </div>
                    )}

                    <div className="space-y-1.5">
                      <label htmlFor="email" className="text-sm font-medium text-text-muted">
                        Email
                      </label>
                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                          <Mail size={17} />
                        </span>
                        <input
                          id="email"
                          name="email"
                          type="email"
                          autoComplete="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="nome@exemplo.com"
                          disabled={isBusy}
                          required
                          aria-invalid={feedback.type === "error" ? "true" : "false"}
                          className="w-full rounded-xl border border-border bg-surface-1/80 px-10 py-2.5 text-text placeholder:text-text-faint/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/60 disabled:opacity-60 disabled:cursor-not-allowed"
                        />
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <div className="flex items-center justify-between gap-3">
                        <label htmlFor="password" className="text-sm font-medium text-text-muted">
                          Senha
                        </label>

                        {mode === "login" && (
                          <button
                            type="button"
                            onClick={handleResetPass}
                            disabled={isBusy}
                            className="text-xs font-medium text-accent hover:text-accent-2 transition-colors disabled:opacity-60 disabled:cursor-not-allowed"
                          >
                            {isResetSubmitting ? "Enviando..." : "Esqueceu a senha?"}
                          </button>
                        )}
                      </div>

                      <div className="relative">
                        <span className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 text-text-faint">
                          <Lock size={17} />
                        </span>
                        <input
                          id="password"
                          name="password"
                          type={showPass ? "text" : "password"}
                          autoComplete={mode === "login" ? "current-password" : "new-password"}
                          value={password}
                          onChange={(e) => setPassword(e.target.value)}
                          placeholder="••••••••"
                          disabled={isBusy}
                          required
                          aria-invalid={feedback.type === "error" ? "true" : "false"}
                          className="w-full rounded-xl border border-border bg-surface-1/80 px-10 py-2.5 pr-11 text-text placeholder:text-text-faint/80 transition-all focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 focus:border-accent/60 disabled:opacity-60 disabled:cursor-not-allowed"
                        />

                        <button
                          type="button"
                          onClick={() => setShowPass((prev) => !prev)}
                          disabled={isBusy}
                          aria-label={showPass ? "Ocultar senha" : "Mostrar senha"}
                          className="absolute right-3 top-1/2 -translate-y-1/2 text-text-faint hover:text-text-muted transition-colors focus:outline-none focus-visible:ring-2 focus-visible:ring-accent/40 rounded-md disabled:opacity-60 disabled:cursor-not-allowed"
                        >
                          {showPass ? <EyeOff size={17} /> : <Eye size={17} />}
                        </button>
                      </div>
                    </div>

                    <div className="flex items-center gap-2.5">
                      <input
                        type="checkbox"
                        id="remember"
                        checked={remember}
                        onChange={(e) => setRemember(e.target.checked)}
                        disabled={isBusy}
                        className="h-4 w-4 rounded border-border bg-surface-1 text-accent focus:ring-accent focus:ring-offset-0 disabled:opacity-60 disabled:cursor-not-allowed"
                      />
                      <label htmlFor="remember" className="text-sm text-text-muted select-none cursor-pointer">
                        Lembrar-me neste dispositivo
                      </label>
                    </div>

                    <Button
                      type="submit"
                      variant="primary"
                      size="lg"
                      disabled={isBusy || !canSubmit}
                      className="w-full"
                    >
                      {isSubmitting ? (
                        <>
                          <Loader2 size={17} className="animate-spin" />
                          {mode === "login" ? "Entrando..." : "Criando conta..."}
                        </>
                      ) : (
                        submitLabel
                      )}
                    </Button>
                  </form>

                  <div className="relative py-1">
                    <div className="absolute inset-0 flex items-center">
                      <span className="w-full border-t border-border" />
                    </div>
                    <div className="relative flex justify-center text-[11px] uppercase tracking-[0.18em]">
                      <span className="bg-surface-2/80 px-3 text-text-faint">OU CONTINUE COM</span>
                    </div>
                  </div>

                  <Button
                    type="button"
                    variant="secondary"
                    disabled={isBusy}
                    onClick={handleGoogle}
                    className="w-full"
                  >
                    {isGoogleSubmitting ? (
                      <>
                        <Loader2 size={17} className="animate-spin" />
                        Conectando...
                      </>
                    ) : (
                      <>
                        <GoogleMark />
                        Continuar com Google
                      </>
                    )}
                  </Button>
                </div>
              </Card>
            </section>
          </div>
        </main>
      </div>
    </div>
  );
}
