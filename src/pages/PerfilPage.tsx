import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/PerfilPage.module.css";
import { Eye, EyeOff, Check } from "lucide-react";

type PasswordStrength = "empty" | "weak" | "medium" | "strong" | "very-strong";

/* ============================================================
  FUNÇÃO DE FORÇA DA SENHA (mesmo padrão do ForcePasswordReset)
============================================================== */
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

export default function PerfilPage() {
  const { profile, reloadProfile } = useUserAndTenant();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const strength = getPasswordStrength(novaSenha);

  const [loading, setLoading] = useState(false);

  /* ============================================================
    CARREGA PERFIL
  ============================================================ */
  useEffect(() => {
    if (profile) {
      setNome(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  /* ============================================================
     SALVAR DADOS DO PERFIL
  ============================================================ */
  const handleSalvarPerfil = async () => {
    setLoading(true);
    try {
      const { data: { user }, error: getUserError } = await supabase.auth.getUser();
      if (getUserError) throw getUserError;

      const { error: authError } = await supabase.auth.updateUser({
        data: { full_name: nome },
      });
      if (authError) throw authError;

      const { error: profileError } = await supabase
        .from("profiles")
        .update({ full_name: nome })
        .eq("user_id", user?.id);

      if (profileError) throw profileError;

      toast.success("Perfil atualizado com sucesso!");
      await reloadProfile();
    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ============================================================
     ALTERAR SENHA
  ============================================================ */
  const handleAlterarSenha = async () => {
    if (!novaSenha || !confirmarSenha) {
      toast.warning("Preencha a nova senha e a confirmação.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.warning("As senhas não coincidem!");
      return;
    }

    if (strength === "weak" || strength === "empty") {
      toast.warning("A senha está muito fraca.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    }

    setLoading(false);
  };

  const avatarUrl = profile?.avatar_url || "https://i.pravatar.cc/150?img=47";
  const role = profile?.role || "Usuário";

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Meu Perfil</h2>

      <div className="row g-4">

        {/* ====================== LADO ESQUERDO (AVATAR) ====================== */}
        <div className="col-md-4">
          <div className={styles.card}>
            <div className={styles.avatarContainer}>
              <img src={avatarUrl} alt="Avatar" className={styles.avatar} />
            </div>

            <div className="text-center mt-2">
              <h5 className={styles.cardTitle}>{nome || "Usuário"}</h5>
              <p className={styles.manager}>{role}</p>
            </div>
          </div>
        </div>

        {/* ====================== LADO DIREITO ====================== */}
        <div className="col-md-8">

          {/* ======= INFORMAÇÕES PESSOAIS ======= */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Informações Pessoais</h5>

            <div className="mt-3">
              <div className="mb-3">
                <label className={styles.label}>Nome Completo</label>
                <input
                  className="form-control"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className={styles.label}>Email</label>
                <input className="form-control" value={email} disabled />
              </div>

              <button
                className={styles.button}
                onClick={handleSalvarPerfil}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>

          {/* ======= ALTERAR SENHA ======= */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Alterar Senha</h5>

            <div className="mt-3">

              {/* NOVA SENHA */}
              <label className={styles.label}>Nova Senha</label>
              <div className={styles.inputSenhaWrapper}>
                <input
                  type={mostrarSenha ? "text" : "password"}
                  className="form-control"
                  value={novaSenha}
                  onChange={(e) => setNovaSenha(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setMostrarSenha(!mostrarSenha)}
                >
                  {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* BARRA DE FORÇA */}
              {novaSenha && (
                <div className={styles.strengthWrapper}>
                  <div
                    className={`${styles.strengthBar} ${
                      strength === "weak"
                        ? styles.weak
                        : strength === "medium"
                        ? styles.medium
                        : strength === "strong"
                        ? styles.strong
                        : styles.veryStrong
                    }`}
                  />
                  <span className={styles.strengthLabel}>
                    {strength === "weak"
                      ? "Fraca"
                      : strength === "medium"
                      ? "Média"
                      : strength === "strong"
                      ? "Forte"
                      : "Muito forte"}
                  </span>
                </div>
              )}

              {/* CONFIRMAR SENHA */}
              <label className={`${styles.label} mt-3`}>
                Confirmar Nova Senha
              </label>
              <div className={styles.inputSenhaWrapper}>
                <input
                  type={mostrarConfirmar ? "text" : "password"}
                  className="form-control"
                  value={confirmarSenha}
                  onChange={(e) => setConfirmarSenha(e.target.value)}
                />
                <button
                  type="button"
                  className={styles.eyeButton}
                  onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
                >
                  {mostrarConfirmar ? <EyeOff size={18} /> : <Eye size={18} />}
                </button>
              </div>

              {/* CHECKLIST */}
              <div className={styles.requirements}>
                <p className={styles.requirementsTitle}>A senha deve conter:</p>
                <ul>
                  <li className={novaSenha.length >= 8 ? styles.reqOk : ""}>
                    {novaSenha.length >= 8 && <Check size={14} />} Pelo menos 8 caracteres
                  </li>

                  <li className={/[A-Z]/.test(novaSenha) ? styles.reqOk : ""}>
                    {/[A-Z]/.test(novaSenha) && <Check size={14} />} Uma letra maiúscula
                  </li>

                  <li className={/[0-9]/.test(novaSenha) ? styles.reqOk : ""}>
                    {/[0-9]/.test(novaSenha) && <Check size={14} />} Um número
                  </li>

                  <li className={styles.reqOptional}>
                    Opcional: caractere especial
                  </li>
                </ul>
              </div>

              <button
                className={styles.button}
                onClick={handleAlterarSenha}
                disabled={loading}
              >
                {loading ? "Alterando..." : "Alterar Senha"}
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
