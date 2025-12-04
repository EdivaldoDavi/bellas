import { useEffect, useState } from "react";
import { useNavigate, useLocation } from "react-router-dom"; // Adicionado useLocation
import { supabase } from "../lib/supabaseCleint"; // ajuste conforme seu projeto
import styles from "../css/SaloesPage.module.css";
import { useUserAndTenant } from "../hooks/useUserAndTenant"; // Import useUserAndTenant

type Salao = {
  id: string;
  name: string;
  manager: string | null;
  professionals: number;
  avatarUrl: string;
};

export default function SaloesPage() {
  const navigate = useNavigate();
  const [saloes, setSaloes] = useState<Salao[]>([]);
  const [loading, setLoading] = useState(true);
  const { tenant } = useUserAndTenant(); // Get tenant to access primary_color
  const location = useLocation(); // Obter o objeto location

  // The 'close' function is removed as the page is no longer a modal.
  // Navigation is now handled by the sidebar.

  useEffect(() => {
    async function fetchSaloes() {
      setLoading(true);

      const { data, error } = await supabase
        .from("tenants_overview") // VIEW que criamos
        .select("id, name, manager, professionals_count");

      if (error) {
        console.error("Erro ao buscar salões:", error);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((s: any) => ({
        id: s.id,
        name: s.name,
        manager: s.manager || "—",
        professionals: s.professionals_count || 0,
        avatarUrl: `https://api.dicebear.com/7.x/initials/svg?seed=${encodeURIComponent(s.name)}`
      }));

      setSaloes(mapped);
      setLoading(false);
    }

    fetchSaloes();
  }, []);

  // Apply brand color if available
  useEffect(() => {
    if (tenant?.primary_color) {
      document.documentElement.style.setProperty("--color-primary", tenant.primary_color);
    }
  }, [tenant?.primary_color]);


  return (
    <div className={styles.container}>
      <h2 className={styles.pageTitle}>Gerenciar Salões</h2>

      {loading ? (
        <p>Carregando...</p>
      ) : (
        <div className={styles.grid}>
          {saloes.map((s) => (
            <div key={s.id} className={styles.card}>
              <div className={styles.cardHeader}>
                <img src={s.avatarUrl} alt={s.name} className={styles.avatar} />
                <div>
                  <h3 className={styles.cardTitle}>{s.name}</h3>
                  <p className={styles.manager}>Gerente: {s.manager}</p>
                </div>
              </div>

              <div className={styles.cardInfo}>
                <div>
                  <p className={styles.value}>{s.professionals}</p>
                  <p className={styles.label}>Profissionais</p>
                </div>
              </div>

              <button
                className={styles.button}
                onClick={() => navigate(`/saloes/${s.id}`)}
              >
                👁 Visualizar Studio
              </button>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}