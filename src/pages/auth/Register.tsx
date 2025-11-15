import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../../hooks/useAuth";

export default function Register() {
  const [salon, setSalon] = useState("");
  const [gerente, setGerente] = useState("");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [err, setErr] = useState("");

  const navigate = useNavigate();
  const { signUp, loading } = useAuth();

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErr("");

    if (!email || !senha || !salon || !gerente) {
      setErr("Preencha todos os campos.");
      return;
    }

    try {
      await signUp(email, senha, {
        tenant_name: salon,
        full_name: gerente,
      });

      // ✔ Importante: não navegar para /setup pois usuário ainda NÃO está logado
      // ✔ Redireciona para login com aviso
      navigate("/login?checkEmail=1");

    } catch (error: any) {
      console.error("Erro ao cadastrar:", error);
      setErr(error.message || "Erro ao cadastrar");
    }
  };

  return (
    <form onSubmit={onSubmit} style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
      
      {err && <div className="alert alert-danger">{err}</div>}

      <input
        value={salon}
        onChange={e => setSalon(e.target.value)}
        placeholder="Nome do salão"
        required
      />

      <input
        value={gerente}
        onChange={e => setGerente(e.target.value)}
        placeholder="Nome da gerente"
        required
      />

      <input
        type="email"
        value={email}
        onChange={e => setEmail(e.target.value)}
        placeholder="Email"
        required
      />

      <input
        type="password"
        value={senha}
        onChange={e => setSenha(e.target.value)}
        placeholder="Senha"
        required
      />

      <button type="submit" disabled={loading}>
        {loading ? "Criando..." : "Criar conta"}
      </button>
    </form>
  );
}
