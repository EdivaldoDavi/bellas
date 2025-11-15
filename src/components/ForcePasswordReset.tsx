import { useEffect, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import { useNavigate } from "react-router-dom";
import { toast } from "react-toastify";

export default function ForcePasswordReset() {
  const navigate = useNavigate();
  const [newPass, setNewPass] = useState("");
  const [loading, setLoading] = useState(true);
  const [session, setSession] = useState<any>(null);

  useEffect(() => {
    async function run() {
      const hash = window.location.hash;

      if (!hash.includes("access_token")) {
        toast.error("Link inválido ou expirado.");
        return navigate("/login");
      }

      const params = new URLSearchParams(hash.replace("#", ""));
      const access_token = params.get("access_token");
      const refresh_token = params.get("refresh_token");

      if (!access_token || !refresh_token) {
        toast.error("Token inválido.");
        return navigate("/login");
      }

      const { data, error } = await supabase.auth.setSession({
        access_token,
        refresh_token
      });

      if (error || !data.session) {
        toast.error("Erro ao autenticar.");
        return navigate("/login");
      }

      setSession(data.session);
      setLoading(false);
      window.history.replaceState({}, "", "/force-reset");
    }

    run();
  }, []);

  async function updatePassword() {
    if (newPass.length < 6) {
      toast.warn("A senha deve ter pelo menos 6 caracteres.");
      return;
    }

    const { error } = await supabase.auth.updateUser({
      password: newPass
    });

    if (error) return toast.error(error.message);

    toast.success("Senha atualizada! 🎉");
    navigate("/dashboard");
  }

  if (loading) return <p>Carregando...</p>;

  return (
    <div style={{ padding: 30 }}>
      <h2>Defina sua nova senha</h2>

      <input
        type="password"
        placeholder="Nova senha"
        value={newPass}
        onChange={(e) => setNewPass(e.target.value)}
        style={{ padding: 12, width: "100%", marginTop: 15 }}
      />

      <button onClick={updatePassword} style={{ marginTop: 20 }}>
        Salvar nova senha
      </button>
    </div>
  );
}
