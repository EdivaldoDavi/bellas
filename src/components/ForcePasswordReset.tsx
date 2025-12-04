import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTheme } from "../hooks/useTheme";
import { Eye, EyeOff, Check } from "lucide-react";
import styles from "../css/ForcePasswordReset.module.css";
import { useUserTenant } from "../context/UserTenantProvider";
import { useAuth } from "../context/AuthProvider"; // 👈 NOVO

type PasswordStrength = "empty" | "weak" | "medium" | "strong" | "very-strong";

function getPasswordStrength(pwd: string): PasswordStrength {
  if (!pwd) return "empty";

  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  if (score <= 1) return "weak";
  if (score === 2) return "medium";
  if (score === 3) return "strong";
  return "very-strong";
}

export default function ForcePasswordReset() {
  const navigate = useNavigate();

  const [newPass, setNewPass] = useState("");
  const [confirmPass, setConfirmPass] = useState("");
  const [showPassword, setShowPassword] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const strength = getPasswordStrength(newPass);
  const { reloadAll } = useUserTenant();
  const { theme } = useTheme();
  const { user } = useAuth(); // 👈 saber se já está autenticado

  // Tema
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  // 1️⃣ Validar hash + setSession (somente se tiver token)
  useEffect(() => {
    async function run() {
      console.log(
        "ForcePasswordReset: START useEffect. window.location.hash:",
        window.location.hash
      );

      const hash = window.location.hash || "";

      // ⚠️ CASO 1: Não tem access_token no hash
      if (!hash.includes("access_token")) {
        // 👉 Se NÃO tiver usuário autenticado: link realmente inválido
        if (!user) {
          toast.error("Link inválido ou expirado: token de acesso não encontrado.");
          console.error(
            "ForcePasswordReset: Hash sem access_token e nenhum usuário logado. Indo para /login."
          );
          navigate("/login", { replace: true });
        } else {
          // 👉 Se já tem usuário logado, não trata como erro.
          console.log(
            "ForcePasswordReset: Sem access_token no hash, mas usuário já está autenticado. Mantendo na tela de force-reset."
          );
        }

        setLoading(false);
        return;
      }

      // ⚠️ CASO 2: Tem access_token no hash → seguir fluxo normal
      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");
      console.log(
        "ForcePasswordReset: Extracted access_token:",
        access_token ? "present" : "missing",
        "refresh_token:",
        refresh_token ? "present" : "missing"
      );

      if (!access_token || !refresh_token) {
        toast.error("Token inválido: access_token ou refresh_token ausentes.");
        console.error(
          "ForcePasswordReset: Missing access_token or refresh_token. Navigating to /login."
        );
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }

      console.log("ForcePasswordReset: Attempting to set session with Supabase...");
      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });
      console.log(
        "ForcePasswordReset: setSession response - data:",
        data,
        "error:",
        error
      );

      if (error) {
        toast.error(`Erro ao autenticar link de redefinição: ${error.message}`);
        console.error("ForcePasswordReset: setSession failed with error:", error);
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }

      if (!data.session) {
        toast.error("Erro ao autenticar link de redefinição: sessão não retornada.");
        console.error(
          "ForcePasswordReset: setSession succeeded but data.session is null. Navigating to /login."
        );
        await supabase.auth.signOut();
        navigate("/login", { replace: true });
        setLoading(false);
        return;
      }

      console.log(
        "ForcePasswordReset: Session successfully set. User ID:",
        data.session.user.id
      );

      // Limpa hash feio da URL após sucesso
      window.history.replaceState({}, "", "/force-reset");
      setLoading(false);
    }

    run();
  }, [navigate, user]); // 👈 depende do user agora

  const hasMinLength = newPass.length >= 8;
  const hasUppercase = /[A-Z]/.test(newPass);
  const hasNumber = /[0-9]/.test(newPass);

  // 3️⃣ Atualizar senha
  async function updatePassword(e?: React.FormEvent) {
    if (e) e.preventDefault();

    if (!newPass || !confirmPass) {
      toast.warn("Preencha a nova senha e a confirmação.");
      return;
    }

    if (newPass !== confirmPass) {
      toast.warn("As senhas não coincidem.");
      return;
    }

    if (!hasMinLength || !hasUppercase || !hasNumber) {
      toast.warn(
        "A senha deve ter pelo menos 8 caracteres, com ao menos 1 letra maiúscula e 1 número."
      );
      return;
    }

    setSaving(true);
    const { error } = await supabase.auth.updateUser({ password: newPass });
    setSaving(false);

    if (error) {
      const msg = error.message.toLowerCase();

      if (msg.includes("different") || msg.includes("same")) {
        toast.error("A nova senha deve ser diferente da anterior.");
        return;
      }

      toast.error(error.message);
      return;
    }

    toast.success("Senha atualizada com sucesso! 🎉");

    // 🔥 Recarrega tudo antes de redirecionar
    await reloadAll();

    // Agora o AppGuard decide se vai para /setup, /onboarding ou /dashboard
    navigate("/dashboard", { replace: true });
  }

  if (loading) {
    return (
      <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
        <div className={styles.card}>
          <p>Validando link de redefinição...</p>
        </div>
      </div>
    );
  }

  const strengthLabel =
    strength === "weak"
      ? "Força: fraca"
      : strength === "medium"
      ? "Força: média"
      : strength === "strong"
      ? "Força: forte"
      : strength === "very-strong"
      ? "Força: muito forte"
      : "";

  return (
    <div className={`${styles.wrap} ${theme === "dark" ? styles.dark : ""}`}>
      <div className={styles.card}>
        <h2 className={styles.title}>Definir nova senha</h2>
        <p className={styles.subtitle}>Escolha uma senha segura.</p>

        <form onSubmit={updatePassword}>
          {/* Nova senha */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Nova senha</label>
            <div className={styles.passwordWrapper}>
              <input
                type={showPassword ? "text" : "password"}
                className={styles.input}
                placeholder="Digite a nova senha"
                value={newPass}
                onChange={(e) => setNewPass(e.target.value)}
              />
              <button
                type="button"
                className={styles.eyeButton}
                onClick={() => setShowPassword((v) => !v)}
              >
                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {newPass && (
              <div className={styles.strengthWrapper}>
                <div
                  className={`${styles.strengthBar} ${
                    strength === "weak"
                      ? styles.weak
                      : strength === "medium"
                      ? styles.medium
                      : strength === "strong"
                      ? styles.strong
                      : strength === "very-strong"
                      ? styles.veryStrong
                      : ""
                  }`}
                />
                <span className={styles.strengthLabel}>{strengthLabel}</span>
              </div>
            )}
          </div>

          {/* Confirmar senha */}
          <div className={styles.fieldGroup}>
            <label className={styles.label}>Confirmar senha</label>
            <input
              type={showPassword ? "text" : "password"}
              className={styles.input}
              placeholder="Confirme a senha"
              value={confirmPass}
              onChange={(e) => setConfirmPass(e.target.value)}
            />
          </div>

          {/* Requisitos */}
          <div className={styles.requirements}>
            <p className={styles.requirementsTitle}>A senha deve conter:</p>
            <ul>
              <li className={hasMinLength ? styles.reqOk : ""}>
                {hasMinLength && <Check size={14} />} Pelo menos 8 caracteres
              </li>
              <li className={hasUppercase ? styles.reqOk : ""}>
                {hasUppercase && <Check size={14} />} Uma letra maiúscula
              </li>
              <li className={hasNumber ? styles.reqOk : ""}>
                {hasNumber && <Check size={14} />} Um número
              </li>
              <li className={styles.reqOptional}>
                Opcional: caractere especial (ex.: @ # $ %)
              </li>
            </ul>
          </div>

          {/* Botões */}
          <button
            type="submit"
            className={styles.submitButton}
            disabled={saving}
          >
            {saving ? "Salvando..." : "Salvar nova senha"}
          </button>
        </form>
      </div>
    </div>
  );
}
