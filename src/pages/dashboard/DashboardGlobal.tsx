import { useEffect, useState } from "react";
import styles from "./DashboardGlobal.module.css";
import { supabase } from "../../lib/supabaseCleint";
import { useUserAndTenant } from "../../hooks/useUserAndTenant"; // Import useUserAndTenant
import LoadingSpinner from "../../components/LoadingSpinner";

interface Stats {
  totalTenants: number;
  totalUsers: number;
  appointmentsToday: number;
  totalRevenue: number;
}

export default function DashboardGlobal() {
  const [stats, setStats] = useState<Stats>({
    totalTenants: 0,
    totalUsers: 0,
    appointmentsToday: 0,
    totalRevenue: 0,
  });
  const [loading, setLoading] = useState(true);
  const { tenant } = useUserAndTenant(); // Get tenant to access primary_color

  useEffect(() => {
    async function fetchStats() {
      try {
        // 🔹 Total de salões
        const { count: tenantsCount, error: tenantsError } = await supabase
          .from("tenants")
          .select("*", { count: "exact" });
        if (tenantsError) throw tenantsError;

        // 🔹 Total de usuários
        const { count: usersCount, error: usersError } = await supabase
          .from("profiles")
          .select("*", { count: "exact" });
        if (usersError) throw usersError;

        // 🔹 Agendamentos de hoje
        const hoje = new Date();
        const inicio = new Date(hoje.setHours(0, 0, 0, 0)).toISOString();
        const fim = new Date(hoje.setHours(23, 59, 59, 999)).toISOString();

        const { count: apptsToday, error: apptsError } = await supabase
          .from("appointments")
          .select("*", { count: "exact" })
          .gte("starts_at", inicio)
          .lte("starts_at", fim);
        if (apptsError) throw apptsError;

        // 🔹 Faturamento total (baseado em services.price_cents dos appointments concluídos)
        const { data: appointments, error: appointmentsError } = await supabase
          .from("appointments")
          .select("service_id")
          .eq("status", "done"); // apenas concluídos contam como faturamento
        if (appointmentsError) throw appointmentsError;

        const serviceIds = appointments?.map((a) => a.service_id).filter(Boolean);
        let totalRevenue = 0;

        if (serviceIds && serviceIds.length > 0) {
          const { data: services, error: servicesError } = await supabase
            .from("services")
            .select("id, price_cents");
          if (servicesError) throw servicesError;

          // soma os preços dos serviços agendados
          totalRevenue = appointments.reduce((acc, appt) => {
            const s = services?.find((srv) => srv.id === appt.service_id);
            return acc + (s?.price_cents ?? 0);
          }, 0);

          // converte de centavos para reais
          totalRevenue = totalRevenue / 100;
        }

        setStats({
          totalTenants: tenantsCount ?? 0,
          totalUsers: usersCount ?? 0,
          appointmentsToday: apptsToday ?? 0,
          totalRevenue,
        });
      } catch (error) {
        console.error("Erro ao carregar dados:", error);
      } finally {
        setLoading(false);
      }
    }

    fetchStats();
  }, []);

  // Apply brand color if available
  useEffect(() => {
    if (tenant?.primary_color) {
      document.documentElement.style.setProperty("--color-primary", tenant.primary_color);
    }
  }, [tenant?.primary_color]);

  if (loading) return <LoadingSpinner />;

  return (
    <div className={styles.container}>
      <div className={styles.grid}>
        <div className={styles.card}>
          <span className={`${styles.dot} ${styles.pink}`}></span>
          <div>
            <p className={styles.label}>Total de Salões</p>
            <p className={styles.value}>{stats.totalTenants}</p>
          </div>
        </div>

        <div className={styles.card}>
          <span className={`${styles.dot} ${styles.purple}`}></span>
          <div>
            <p className={styles.label}>Total de Usuários</p>
            <p className={styles.value}>{stats.totalUsers}</p>
          </div>
        </div>

        <div className={styles.card}>
          <span className={`${styles.dot} ${styles.blue}`}></span>
          <div>
            <p className={styles.label}>Agendamentos Hoje</p>
            <p className={styles.value}>{stats.appointmentsToday}</p>
          </div>
        </div>

        <div className={styles.card}>
          <span className={`${styles.dot} ${styles.green}`}>R$</span>
          <div>
            <p className={styles.label}>Faturamento Geral</p>
            <p className={styles.value}>
              R$ {stats.totalRevenue.toLocaleString("pt-BR", { minimumFractionDigits: 2 })}
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}