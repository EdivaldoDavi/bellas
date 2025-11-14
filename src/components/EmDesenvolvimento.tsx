import { Wrench, Construction, Clock } from "lucide-react";

export default function EmDesenvolvimento() {
  return (
    <div
      style={{
        minHeight: "80vh",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        textAlign: "center",
        padding: "2rem",
      }}
    >
      <Construction size={80} color="#ff2d71" />
      <h1 style={{ marginTop: "1rem", fontSize: "2rem", fontWeight: 700 }}>
        Página em Desenvolvimento
      </h1>

      <p style={{ marginTop: "0.5rem", maxWidth: 420, fontSize: "1.1rem" }}>
        Estamos trabalhando para entregar esta funcionalidade em breve.  
        Obrigado pela paciência!
      </p>

      <div style={{ marginTop: "1.5rem", opacity: 0.6 }}>
        <Clock size={24} />
      </div>
    </div>
  );
}
