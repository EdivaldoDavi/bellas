// src/components/ForcePasswordReset.tsx
import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";
import { useTheme } from "../hooks/useTheme";
import { useBrandColor } from "../hooks/useBrandColor";
import { Eye, EyeOff, Check } from "lucide-react";
import styles from "../css/ForcePasswordReset.module.css";
import { useUserTenant } from "../context/UserTenantProvider";
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
  const { brandColor } = useBrandColor();

  // Tema
  useEffect(() => {
    document.documentElement.setAttribute("data-theme-variant", theme);
  }, [theme]);

  useEffect(() => {
    if (brandColor) {
      document.documentElement.style.setProperty("--color-primary", brandColor);
    }
  }, [brandColor]);

  // 1️⃣ Validar hash + setSession
  useEffect(() => {
    async function run() {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) {
        toast.error("Link inválido ou expirado.");
        navigate("/login", { replace: true });
        return;
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        toast.error("Token inválido.");
        navigate("/login", { replace: true });
        return;
      }

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token,
      });

      if (error || !data.session) {
        toast.error("Erro ao autenticar link de redefinição.");
        navigate("/login", { replace: true });
        return;
      }

      // Limpa hash feio da URL
      window.history.replaceState({}, "", "/force-reset");
      setLoading(false);
    }

    run();
  }, [navigate]);

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

    // 👉 NÃO faz signOut.
    // 👉 Deixa o usuário logado.
    // 👉 Sempre manda pra /setup e deixa o SetupRedirectGuard decidir:
    //    - se needsSetup = true → fica no /setup
    //    - se needsSetup = false → redireciona pra /dashboard
  // 🔥 Recarrega tudo antes de redirecionar
await reloadAll();

// Agora o Guard já tem os valores corretos (needsSetup lá dentro será true ou false corretamente)
navigate("/setup", { replace: true });
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

          <button
            type="button"
            className={styles.secondaryButton}
            onClick={() => setShowPassword((v) => !v)}
          >
            {showPassword ? "Ocultar senha" : "Ver senha digitada"}
          </button>
        </form>
      </div>
    </div>
  );
}
