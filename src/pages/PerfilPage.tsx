import { useState, useEffect, useRef } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/PerfilPage.module.css";
import { Eye, EyeOff, Check, UploadCloud } from "lucide-react";

/* ============================================================
  FUNÇÃO DE FORÇA DA SENHA (igual ao ForceReset)
============================================================== */
function getPasswordStrength(pwd: string) {
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
const { profile, refreshProfile } = useUserAndTenant();


  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [loading, setLoading] = useState(false);
  const [uploading, setUploading] = useState(false);

  const [avatarFile, setAvatarFile] = useState<File | null>(null);
  const [avatarPreviewUrl, setAvatarPreviewUrl] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // força real
  const strength = getPasswordStrength(novaSenha);

  // requisitos
  const hasMinLength = novaSenha.length >= 8;
  const hasUpper = /[A-Z]/.test(novaSenha);
  const hasNumber = /[0-9]/.test(novaSenha);

  /* ================================
        CARREGA PERFIL
  ================================ */
  useEffect(() => {
    if (profile) {
      setNome(profile.full_name || "");
      setEmail(profile.email || "");
      setAvatarPreviewUrl(profile.avatar_url); // Define a URL do avatar existente
    }
  }, [profile]);

  /* ================================
        Lidar com seleção de arquivo
  ================================ */
  const handleFileChange = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      setAvatarFile(file);
      setAvatarPreviewUrl(URL.createObjectURL(file)); // Cria URL de preview
    }
  };

  /* ================================
        Upload de Avatar
  ================================ */
  const handleUploadAvatar = async () => {
  if (!profile?.user_id || !avatarFile) {
    toast.warn("Nenhum arquivo selecionado ou usuário não identificado.");
    return;
  }

  setUploading(true);

  try {
    const fileExt = avatarFile.name.split(".").pop();
    const fileName = `${profile.user_id}.${fileExt}`;

    // caminho final do arquivo no bucket
    const filePath = `${profile.user_id}/${fileName}`;

    // 1) Upload no Storage
    const { error: uploadError } = await supabase.storage
      .from("avatars")
      .upload(filePath, avatarFile, {
        cacheControl: "3600",
        upsert: true,
      });

    if (uploadError) throw uploadError;

    // 2) Obter URL pública
    const { data: publicData } = supabase.storage
      .from("avatars")
      .getPublicUrl(filePath);

    if (!publicData?.publicUrl) {
      throw new Error("Não foi possível gerar a URL pública do avatar.");
    }

    // 3) Atualiza no perfil
    const { error: updateError } = await supabase
      .from("profiles")
      .update({ avatar_url: publicData.publicUrl })
      .eq("user_id", profile.user_id);

    if (updateError) throw updateError;

    toast.success("Avatar atualizado com sucesso!");
   refreshProfile();

  } catch (err: any) {
    console.error("Erro ao enviar avatar:", err);
    toast.error("Erro ao atualizar avatar: " + err.message);
  } finally {
    setUploading(false);
    setAvatarFile(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
  }
};

  /* ================================
        SALVAR PERFIL
  ================================ */
  const handleSalvarPerfil = async () => {
    setLoading(true);
    try {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) throw error;

      const { error: upd1 } = await supabase.auth.updateUser({
        data: { full_name: nome },
      });
      if (upd1) throw upd1;

      const { error: upd2 } = await supabase
        .from("profiles")
        .update({ full_name: nome })
        .eq("user_id", user?.id);

      if (upd2) throw upd2;

      toast.success("Perfil atualizado com sucesso!");
    refreshProfile();

    } catch (err: any) {
      toast.error("Erro ao salvar: " + err.message);
    } finally {
      setLoading(false);
    }
  };

  /* ================================
        ALTERAR SENHA
  ================================ */
  const handleAlterarSenha = async () => {
    if (!novaSenha || !confirmarSenha) {
      toast.warning("Preencha a nova senha e a confirmação.");
      return;
    }

    if (novaSenha !== confirmarSenha) {
      toast.warning("As senhas não coincidem!");
      return;
    }

    // VALIDAÇÃO REAL (igual ForceReset)
    if (!hasMinLength || !hasUpper || !hasNumber) {
      toast.warning("A senha não atende aos requisitos mínimos.");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({
      password: novaSenha,
    });

    if (error) {
      toast.error(error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
    }

    setLoading(false);
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Meu Perfil</h2>

      <div className="row g-4">

        {/* Lado Esquerdo */}
        <div className="col-12 col-md-4">
          <div className={styles.card}>
            <div className={styles.avatarContainer}>
              <img
                src={
                  avatarPreviewUrl ||
                  profile?.avatar_url ||
                  "https://i.pravatar.cc/150?img=47"
                }
                className={styles.avatar}
                alt="Avatar do usuário"
              />
              <input
                type="file"
                accept="image/*"
                onChange={handleFileChange}
                ref={fileInputRef}
                style={{ display: "none" }}
                id="avatar-upload-input"
              />
              <label htmlFor="avatar-upload-input" className={styles.uploadButton}>
                <UploadCloud size={20} />
              </label>
            </div>

            <div className="text-center mt-2">
              <h5 className={styles.cardTitle}>{nome}</h5>
              <p className={styles.manager}>{profile?.role}</p>
            </div>

            {avatarFile && (
              <button
                className={styles.button}
                onClick={handleUploadAvatar}
                disabled={uploading}
              >
                {uploading ? "Enviando..." : "Salvar Avatar"}
              </button>
            )}
          </div>
        </div>

        {/* Lado Direito */}
        <div className="col-12 col-md-8">

          {/* ===== Informações pessoais ===== */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Informações Pessoais</h5>

            <div className="mt-3">
              <label className={styles.label}>Nome Completo</label>
              <input
                className="form-control mb-3"
                value={nome}
                onChange={(e) => setNome(e.target.value)}
              />

              <label className={styles.label}>Email</label>
              <input className="form-control" value={email} disabled />

              <button
                className={styles.button}
                onClick={handleSalvarPerfil}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>

          {/* ===== Alterar Senha ===== */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Alterar Senha</h5>

            {/* Nova senha */}
            <label className={styles.label}>Nova Senha</label>
            <div className={styles.inputSenhaWrapper}>
              <input
                type={mostrarSenha ? "text" : "password"}
                className="form-control"
                value={novaSenha}
                onChange={(e) => setNovaSenha(e.target.value)}
              />

              <button
                className={styles.eyeButton}
                onClick={() => setMostrarSenha(!mostrarSenha)}
              >
                {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
              </button>
            </div>

            {/* barra de força */}
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

            {/* confirmar senha */}
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
                className={styles.eyeButton}
                onClick={() => setMostrarConfirmar(!mostrarConfirmar)}
              >
                {mostrarConfirmar ? (
                  <EyeOff size={18} />
                ) : (
                  <Eye size={18} />
                )}
              </button>
            </div>

            {/* checklist */}
            <div className={styles.requirements}>
              <p className={styles.requirementsTitle}>A senha deve conter:</p>

              <ul>
                <li className={hasMinLength ? styles.reqOk : ""}>
                  {hasMinLength && <Check size={14} />} Pelo menos 8 caracteres
                </li>

                <li className={hasUpper ? styles.reqOk : ""}>
                  {hasUpper && <Check size={14} />} Uma letra maiúscula
                </li>

                <li className={hasNumber ? styles.reqOk : ""}>
                  {hasNumber && <Check size={14} />} Um número
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
  );
}