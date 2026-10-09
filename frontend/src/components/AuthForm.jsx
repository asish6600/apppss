import { useState } from "react";
import { toast } from "sonner";
import { Mail, ArrowLeft, Loader2 } from "lucide-react";
import { useAuth, apiError } from "@/context/AuthContext";
import { useI18n } from "@/lib/i18n";
import { Logo } from "@/components/Logo";

export function AuthForm({ onSuccess }) {
  const { t } = useI18n();
  const { checkEmail, requestOtp, verifyOtp, login, forgot, reset } = useAuth();
  const [step, setStep] = useState("email"); // email | password | otp | forgot | resetpw
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [code, setCode] = useState("");
  const [name, setName] = useState("");
  const [newUser, setNewUser] = useState(false);
  const [busy, setBusy] = useState(false);

  const wrap = async (fn) => { setBusy(true); try { await fn(); } catch (e) { toast.error(apiError(e)); } finally { setBusy(false); } };

  const onContinue = (e) => { e.preventDefault(); wrap(async () => {
    const r = await checkEmail(email);
    if (r.exists && r.has_password) setStep("password");
    else { await requestOtp(email); setNewUser(!r.exists); setStep("otp"); toast.success("Code sent to your email"); }
  }); };

  const onPassword = (e) => { e.preventDefault(); wrap(async () => { await login(email, password); toast.success("Welcome back"); onSuccess?.(); }); };

  const onSwitchToOtp = () => wrap(async () => { await requestOtp(email); setStep("otp"); toast.success("Code sent to your email"); });

  const onVerify = (e) => { e.preventDefault(); wrap(async () => { await verifyOtp(email, code, name); toast.success("You're signed in"); onSuccess?.(); }); };

  const onForgot = (e) => { e.preventDefault(); wrap(async () => { await forgot(email); setStep("resetpw"); toast.success("If an account exists, a reset code was emailed."); }); };

  const onReset = (e) => { e.preventDefault(); wrap(async () => { await reset({ email, code, new_password: password }); toast.success("Password updated. Please sign in."); setStep("password"); setCode(""); setPassword(""); }); };

  const field = "w-full rounded-xl border border-sage/50 bg-white px-4 py-3 text-charcoal outline-none transition-colors focus:border-forest focus:ring-2 focus:ring-forest/20";
  const primary = "w-full rounded-full bg-amber px-6 py-3 font-700 text-charcoal transition-colors hover:bg-amber/90 disabled:opacity-60";

  return (
    <div className="w-full max-w-md rounded-3xl border border-sage/30 bg-cream p-7 shadow-sm" data-testid="auth-form">
      <div className="mb-5 flex justify-center"><Logo /></div>

      {step === "email" && (
        <form onSubmit={onContinue} className="space-y-4">
          <div className="text-center">
            <h1 className="font-serif text-2xl text-forest">{t("auth.welcome")}</h1>
            <p className="mt-1 text-sm text-charcoal/65">{t("auth.emailPrompt")}</p>
          </div>
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-forest" />
            <input type="email" required value={email} onChange={(e) => setEmail(e.target.value)} placeholder={t("auth.email")} data-testid="auth-email-input" className={`${field} pl-10`} />
          </div>
          <button type="submit" disabled={busy} data-testid="auth-continue-btn" className={primary}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("common.continue")}</button>
        </form>
      )}

      {step === "password" && (
        <form onSubmit={onPassword} className="space-y-4">
          <Back onClick={() => setStep("email")} />
          <div className="text-center"><h1 className="font-serif text-2xl text-forest">{t("auth.welcomeBack")}</h1><p className="mt-1 text-sm text-charcoal/60">{email}</p></div>
          <input type="password" required value={password} onChange={(e) => setPassword(e.target.value)} placeholder={t("auth.password")} data-testid="auth-password-input" className={field} />
          <button type="submit" disabled={busy} data-testid="auth-login-btn" className={primary}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("common.signIn")}</button>
          <div className="flex items-center justify-between text-sm">
            <button type="button" onClick={onSwitchToOtp} data-testid="auth-use-otp-btn" className="font-600 text-forest hover:underline">{t("auth.useOtp")}</button>
            <button type="button" onClick={() => setStep("forgot")} data-testid="auth-forgot-btn" className="text-charcoal/60 hover:underline">{t("auth.forgot")}</button>
          </div>
        </form>
      )}

      {step === "otp" && (
        <form onSubmit={onVerify} className="space-y-4">
          <Back onClick={() => setStep("email")} />
          <div className="text-center"><h1 className="font-serif text-2xl text-forest">{t("auth.otpSent")}</h1><p className="mt-1 text-sm text-charcoal/60">{email}</p></div>
          {newUser && <input value={name} onChange={(e) => setName(e.target.value)} placeholder={t("auth.name")} data-testid="auth-name-input" className={field} />}
          <input inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="••••••" data-testid="auth-otp-input" className={`${field} text-center text-2xl tracking-[0.5em]`} />
          <button type="submit" disabled={busy} data-testid="auth-verify-btn" className={primary}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : t("auth.verify")}</button>
          <button type="button" onClick={onSwitchToOtp} data-testid="auth-resend-btn" className="w-full text-center text-sm font-600 text-forest hover:underline">{t("auth.resend")}</button>
        </form>
      )}

      {step === "forgot" && (
        <form onSubmit={onForgot} className="space-y-4">
          <Back onClick={() => setStep("password")} />
          <div className="text-center"><h1 className="font-serif text-2xl text-forest">Reset your password</h1><p className="mt-1 text-sm text-charcoal/60">We'll email a 6-digit code to {email}.</p></div>
          <button type="submit" disabled={busy} data-testid="auth-send-reset-btn" className={primary}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Send reset code"}</button>
        </form>
      )}

      {step === "resetpw" && (
        <form onSubmit={onReset} className="space-y-4">
          <Back onClick={() => setStep("forgot")} />
          <div className="text-center"><h1 className="font-serif text-2xl text-forest">Set a new password</h1></div>
          <input inputMode="numeric" maxLength={6} required value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, ""))} placeholder="6-digit code" data-testid="reset-code-input" className={`${field} text-center tracking-[0.3em]`} />
          <input type="password" required minLength={8} value={password} onChange={(e) => setPassword(e.target.value)} placeholder="New password (min 8 chars)" data-testid="reset-password-input" className={field} />
          <button type="submit" disabled={busy} data-testid="reset-submit-btn" className={primary}>{busy ? <Loader2 className="mx-auto h-5 w-5 animate-spin" /> : "Update password"}</button>
        </form>
      )}

      <p className="mt-5 text-center text-xs text-charcoal/50">We never ask for your password or OTP by email or phone.</p>
    </div>
  );
}

function Back({ onClick }) {
  return <button type="button" onClick={onClick} className="inline-flex items-center gap-1 text-sm text-charcoal/60 hover:text-forest"><ArrowLeft className="h-4 w-4" />Back</button>;
}
