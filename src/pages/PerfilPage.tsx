import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/PerfilPage.module.css";
import { Eye, EyeOff } from "lucide-react";

export default function PerfilPage() {
  const { profile, reloadProfile } = useUserAndTenant();

  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");

  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [mostrarSenha, setMostrarSenha] = useState(false);
  const [mostrarConfirmar, setMostrarConfirmar] = useState(false);

  const [forca, setForca] = useState(0);
  const [loading, setLoading] = useState(false);

  // ===================================================
  // 🔹 Atualiza estados quando profile é carregado
  // ===================================================
  useEffect(() => {
    if (profile) {
      setNome(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  // ===================================================
  // 🔹 Medidor de força da senha
  // ===================================================
  const avaliarForcaSenha = (senha: string) => {
    let pontos = 0;

    if (senha.length >= 6) pontos++;
    if (/[A-Z]/.test(senha)) pontos++;
    if (/[0-9]/.test(senha)) pontos++;
    if (/[^A-Za-z0-9]/.test(senha)) pontos++;

    setForca(pontos);
  };

  const handleNovaSenha = (senha: string) => {
    setNovaSenha(senha);
    avaliarForcaSenha(senha);
  };

  // ===================================================
  // 🔹 Atualizar perfil
  // ===================================================
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

  // ===================================================
  // 🔹 Alterar senha
  // ===================================================
  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      toast.warning("As senhas não coincidem!");
      return;
    }

    if (forca < 2) {
      toast.warning("A senha está muito fraca!");
      return;
    }

    setLoading(true);

    const { error } = await supabase.auth.updateUser({ password: novaSenha });

    if (error) {
      toast.error("Erro ao alterar senha: " + error.message);
    } else {
      toast.success("Senha alterada com sucesso!");
      setNovaSenha("");
      setConfirmarSenha("");
      setForca(0);
    }

    setLoading(false);
  };

  // ===================================================
  const avatarUrl =
    profile?.avatar_url || "https://i.pravatar.cc/150?img=47";
  const role = profile?.role || "Usuário";

  // ===================================================
  // 🔹 Cores do medidor de força
  // ===================================================
  const getCorForca = () => {
    switch (forca) {
      case 0:
      case 1:
        return "#e74c3c"; // vermelho
      case 2:
        return "#f39c12"; // amarelo
      case 3:
        return "#27ae60"; // verde
      case 4:
        return "#2ecc71"; // verde forte
    }
  };

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Meu Perfil</h2>

      <div className="row g-4">
        {/* ============================================
              LADO ESQUERDO – Avatar
        ============================================ */}
        <div className="col-md-4">
          <div className={styles.card}>
            <div className={styles.avatarContainer}>
              <img src={avatarUrl} alt="Avatar" className={styles.avatar} />
            </div>
            <div className="text-center">
              <h5 className={styles.cardTitle}>{nome || "Usuário"}</h5>
              <p className={styles.manager}>{role}</p>
            </div>
          </div>
        </div>

        {/* ============================================
              LADO DIREITO – Informações e senha
        ============================================ */}
        <div className="col-md-8">
          {/* ======= Informações pessoais ======= */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Informações Pessoais</h5>

            <div className="mt-3">
              <div className="mb-3">
                <label className={styles.label}>Nome Completo</label>
                <input
                  type="text"
                  className="form-control"
                  value={nome}
                  onChange={(e) => setNome(e.target.value)}
                />
              </div>

              <div className="mb-3">
                <label className={styles.label}>Email</label>
                <input
                  type="email"
                  className="form-control"
                  value={email}
                  disabled
                />
              </div>

              <button
                type="button"
                className={styles.button}
                onClick={handleSalvarPerfil}
                disabled={loading}
              >
                {loading ? "Salvando..." : "Salvar Alterações"}
              </button>
            </div>
          </div>

          {/* ======= Alterar senha ======= */}
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Alterar Senha</h5>

            <div className="mt-3">
              <div className="row">
                {/* NOVA SENHA */}
                <div className="col-md-6 mb-3">
                  <label className={styles.label}>Nova Senha</label>
                  <div className={styles.inputSenhaWrapper}>
                    <input
                      type={mostrarSenha ? "text" : "password"}
                      className="form-control"
                      value={novaSenha}
                      onChange={(e) => handleNovaSenha(e.target.value)}
                    />

                    <button
                      type="button"
                      className={styles.eyeButton}
                      onClick={() => setMostrarSenha(!mostrarSenha)}
                    >
                      {mostrarSenha ? <EyeOff size={18} /> : <Eye size={18} />}
                    </button>
                  </div>

                  {/* 🔥 Barra de força */}
                  {novaSenha.length > 0 && (
                    <div
                      className={styles.forcaBar}
                      style={{ backgroundColor: getCorForca(), width: `${forca * 25}%` }}
                    ></div>
                  )}
                </div>

                {/* CONFIRMAR SENHA */}
                <div className="col-md-6 mb-3">
                  <label className={styles.label}>Confirmar Senha</label>
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
                      {mostrarConfirmar ? (
                        <EyeOff size={18} />
                      ) : (
                        <Eye size={18} />
                      )}
                    </button>
                  </div>
                </div>
              </div>

              <button
                type="button"
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
