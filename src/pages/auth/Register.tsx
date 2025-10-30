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
    try {
      await signUp(email, senha, { tenant_name: salon || undefined, full_name: gerente || undefined });
      navigate("/setup");
    } catch (error: any) {
      setErr(error.message || "Erro ao cadastrar");
    }
  };

  return (
    <form onSubmit={onSubmit}>
      {err && <div className="alert alert-danger">{err}</div>}
      <input value={salon} onChange={e=>setSalon(e.target.value)} placeholder="Nome do salão" />
      <input value={gerente} onChange={e=>setGerente(e.target.value)} placeholder="Nome da gerente" />
      <input value={email} onChange={e=>setEmail(e.target.value)} placeholder="Email" />
      <input type="password" value={senha} onChange={e=>setSenha(e.target.value)} placeholder="Senha" />
      <button disabled={loading}>Criar conta</button>
    </form>
  );
}
