import { useState, useEffect } from "react";
import { toast } from "react-toastify";
import { supabase } from "../lib/supabaseCleint";
import { useUserAndTenant } from "../hooks/useUserAndTenant";
import styles from "../css/PerfilPage.module.css";

export default function PerfilPage() {
  const { profile, reloadProfile } = useUserAndTenant();
  const [nome, setNome] = useState("");
  const [email, setEmail] = useState("");
  const [novaSenha, setNovaSenha] = useState("");
  const [confirmarSenha, setConfirmarSenha] = useState("");
  const [loading, setLoading] = useState(false);

  // 🔹 Atualiza estados quando profile é carregado
  useEffect(() => {
    if (profile) {
      setNome(profile.full_name || "");
      setEmail(profile.email || "");
    }
  }, [profile]);

  const handleSalvarPerfil = async () => {
  setLoading(true);
  try {
    const { data: { user }, error: getUserError } = await supabase.auth.getUser();
    if (getUserError) throw getUserError;

    // 1️⃣ Atualiza metadado (auth.users)
    const { error: authError } = await supabase.auth.updateUser({
      data: { full_name: nome },
    });
    if (authError) throw authError;

    // 2️⃣ Atualiza tabela profiles manualmente
    const { error: profileError } = await supabase
      .from("profiles")
      .update({ full_name: nome })
      .eq("user_id", user?.id);
    if (profileError) throw profileError;

    toast.success("Perfil atualizado com sucesso!");
    await reloadProfile();
  } catch (err: any) {
    toast.error("Erro ao salvar perfil: " + err.message);
  } finally {
    setLoading(false);
  }
};

  const handleAlterarSenha = async () => {
    if (novaSenha !== confirmarSenha) {
      toast.warning("As senhas não coincidem!");
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
    }
    setLoading(false);
  };

  const avatarUrl = profile?.avatar_url || "https://i.pravatar.cc/150?img=47";
  const role = profile?.role || "Usuário";

  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Meu Perfil</h2>

      <div className="row g-4">
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

        <div className="col-md-8">
          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Informações Pessoais</h5>
            <form className="mt-3">
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
                  onChange={(e) => setEmail(e.target.value)}
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
            </form>
          </div>

          <div className={styles.card}>
            <h5 className={styles.cardTitle}>Alterar Senha</h5>
            <form className="mt-3">
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className={styles.label}>Nova Senha</label>
                  <input
                    type="password"
                    className="form-control"
                    value={novaSenha}
                    onChange={(e) => setNovaSenha(e.target.value)}
                  />
                </div>
                <div className="col-md-6 mb-3">
                  <label className={styles.label}>Confirmar Nova Senha</label>
                  <input
                    type="password"
                    className="form-control"
                    value={confirmarSenha}
                    onChange={(e) => setConfirmarSenha(e.target.value)}
                  />
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
            </form>
          </div>
        </div>
      </div>
    </div>
  );
}
