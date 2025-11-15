import { useState } from "react";
import { supabase } from "../../lib/supabaseCleint";
import { Link } from "react-router-dom";

export default function Register() {
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");

  const handleRegister = async () => {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: {
          full_name: fullName,
        },
      },
    });

    setLoading(false);

    if (error) {
      setMessage(error.message);
      return;
    }

    setMessage(
      "Cadastro criado! Verifique seu e-mail para confirmar."
    );
  };

  return (
    <div className="auth-container">
      <h2>Criar Conta</h2>

      {message && <p>{message}</p>}

      <input
        type="text"
        placeholder="Seu nome"
        value={fullName}
        onChange={(e) => setFullName(e.target.value)}
      />

      <input
        type="email"
        placeholder="E-mail"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
      />

      <input
        type="password"
        placeholder="Senha"
        value={password}
        onChange={(e) => setPassword(e.target.value)}
      />

      <button disabled={loading} onClick={handleRegister}>
        {loading ? "Registrando..." : "Criar conta"}
      </button>

      <p>
        Já possui conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
