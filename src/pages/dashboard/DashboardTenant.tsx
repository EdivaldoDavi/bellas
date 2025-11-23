import { useEffect, useMemo, useState, useCallback, useRef } from "react";
import "react-loading-skeleton/dist/skeleton.css";
import { supabase } from "../../lib/supabaseCleint";
import { useUserAndTenant } from "../../hooks/useUserAndTenant";
import styles from "./DashboardTenant.module.css";

type UUID = string;

interface Appointment {
  id: UUID;
  tenant_id: UUID;
  professional_id: UUID | null;
  service_id: UUID | null;
  customer_name: string;
  starts_at: string;
  ends_at: string;
  status: "scheduled" | "done" | "canceled" | "no_show";
}

function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  });
}

const REVENUE_GOAL_CENTS = 1_500_000;
const APPTS_GOAL = 200;
const PLACEHOLDER_AVATAR = "https://i.pravatar.cc/100?img=12";

const THEME_PRIMARY: Record<string, string> = {
  pink: "#FF4081",
  purple: "#9C27B0",
  blue: "#007BFF",
  green: "#2ECC71",
};

export default function DashboardTenant() {
  const { tenant, profile, loading: userTenantLoading } = useUserAndTenant();

  const [loading, setLoading] = useState(true);
  const [role, setRole] = useState("manager");

  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([]);
  const [top3, setTop3] = useState<any[]>([]);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);
  const [doneThisMonth, setDoneThisMonth] = useState(0);

  const hasLoadedRef = useRef(false);

  const variant = tenant?.theme_variant ?? "pink";
  const primary = THEME_PRIMARY[variant] ?? THEME_PRIMARY.pink;

  const revenueProgress = useMemo(() => {
    const pct = (revenueThisMonth * 100) / (REVENUE_GOAL_CENTS / 100);
    return Math.min(100, Math.round(pct));
  }, [revenueThisMonth]);

  const apptsProgress = useMemo(() => {
    const pct = (appointmentsToday / APPTS_GOAL) * 100;
    return Math.min(100, Math.round(pct));
  }, [appointmentsToday]);

  // 🔥 Load estável: depende apenas de IDs, nunca de objetos inteiros
  const loadDashboard = useCallback(async () => {
    if (!profile || !tenant) return;

    console.log("DashboardTenant: [loadDashboard] Executando...");
    setLoading(true);

    const tenantId = tenant.id;
    const professionalId = profile.professional_id ?? null;

    setRole(profile.role ?? "manager");

    try {
      // Dates
      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // === AGENDAMENTOS DE HOJE ===
      let apptsQuery = supabase
        .from("appointments")
        .select("id, professional_id, service_id, customer_name, starts_at, ends_at, status")
        .eq("tenant_id", tenantId)
        .gte("starts_at", `${todayISO}T00:00:00`)
        .lte("starts_at", `${todayISO}T23:59:59`)
        .order("starts_at");

      if (profile.role === "professional" && professionalId) {
        apptsQuery = apptsQuery.eq("professional_id", professionalId);
      }

      const { data: apptsTodayData } = await apptsQuery;

      const apptsToday = (apptsTodayData || []) as Appointment[];
      setAppointmentsToday(apptsToday.length);

      const serviceIds = apptsToday.map((a) => a.service_id).filter(Boolean) as UUID[];
      const profIds = apptsToday.map((a) => a.professional_id).filter(Boolean) as UUID[];

      const { data: svcData } = await supabase.from("services").select("id,name,price_cents").in("id", serviceIds);
      const { data: profData } = await supabase.from("professionals").select("id,name").in("id", profIds);

      const svcMap = new Map((svcData || []).map((s) => [s.id, s]));
      const profMap = new Map((profData || []).map((p) => [p.id, p]));

      setTodaysAppointments(
        apptsToday.map((a) => ({
          id: a.id,
          serviceName: svcMap.get(a.service_id)?.name ?? "Serviço",
          professionalName: profMap.get(a.professional_id)?.name ?? "Profissional",
          customerName: a.customer_name ?? "Cliente",
          startsAt: a.starts_at,
          endsAt: a.ends_at,
          status: a.status,
        }))
      );

      // === FATURAMENTO DO MÊS ===
      let doneQuery = supabase
        .from("appointments")
        .select("professional_id, service_id")
        .eq("tenant_id", tenantId)
        .eq("status", "done")
        .gte("starts_at", monthStart)
        .lt("starts_at", nextMonth);

      if (profile.role === "professional" && professionalId) {
        doneQuery = doneQuery.eq("professional_id", professionalId);
      }

      const { data: monthDone } = await doneQuery;

      const done = (monthDone || []) as { professional_id: UUID; service_id: UUID }[];
      setDoneThisMonth(done.length);

      const monthServiceIds = [...new Set(done.map((d) => d.service_id))];
      const { data: svcMonth } = await supabase
        .from("services")
        .select("id, price_cents")
        .in("id", monthServiceIds);

      const svcMonthMap = new Map((svcMonth || []).map((s) => [s.id, s.price_cents]));
      const totalCents = done.reduce((acc, d) => acc + (svcMonthMap.get(d.service_id) || 0), 0);

      setRevenueThisMonth(totalCents / 100);

      // === RANKING ===
      if (profile.role === "manager" || (profile.role === "professional" && professionalId)) {
        const allDone = await supabase
          .from("appointments")
          .select("professional_id, service_id")
          .eq("tenant_id", tenantId)
          .eq("status", "done")
          .gte("starts_at", monthStart)
          .lt("starts_at", nextMonth);

        const priceData = await supabase.from("services").select("id, price_cents");
        const priceMap = new Map((priceData.data || []).map((s) => [s.id, s.price_cents]));

        const allByProf = new Map<string, number>();
        (allDone.data || []).forEach((d) => {
          const prev = allByProf.get(d.professional_id) || 0;
          allByProf.set(d.professional_id, prev + (priceMap.get(d.service_id) || 0));
        });

        const ranking = Array.from(allByProf.entries())
          .map(([id, total]) => ({
            id,
            name: profMap.get(id)?.name ?? "Profissional",
            total,
          }))
          .sort((a, b) => b.total - a.total);

        setTop3(ranking.slice(0, 3));

        if (professionalId) {
          const pos = ranking.findIndex((r) => r.id === professionalId);
          setRankingPosition(pos >= 0 ? pos + 1 : null);
        }
      }
    } finally {
      setLoading(false);
    }
  }, [
    profile?.user_id,
    profile?.role,
    profile?.professional_id,
    tenant?.id,
  ]);

  // ============================================================
  // 🚀 Carregar uma única vez por tenant + profile
  // ============================================================
  useEffect(() => {
    if (userTenantLoading) return;
    if (!profile || !tenant) return;

    if (!hasLoadedRef.current) {
      hasLoadedRef.current = true;
      loadDashboard();
    }
  }, [
    userTenantLoading,
    profile?.user_id,
    tenant?.id,
  ]);

  // ============================================================
  // 🚀 Canal Supabase único e estável
  // ============================================================
  useEffect(() => {
    if (!tenant?.id) return;

    console.log("DashboardTenant: Canal supabase iniciado");

    const channel = supabase
      .channel(`dashboard-ten-${tenant.id}`)
      .on(
        "postgres_changes",
        { schema: "public", table: "appointments", event: "*" },
        () => {
          console.log("DashboardTenant: evento recebido → reload");
          loadDashboard();
        }
      )
      .subscribe();

    return () => {
      console.log("DashboardTenant: Canal removido");
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]);

  // ============================================================
  // 🚀 Renderizações
  // ============================================================

  if (loading) {
    return <div style={{ padding: 20, textAlign: "center" }}>Carregando informações…</div>;
  }

  if (!tenant) {
    return (
      <div className={styles.container}>
        <p style={{ textAlign: "center", padding: 20 }}>
          Não foi possível carregar os dados do salão.
        </p>
      </div>
    );
  }

  // === DASHBOARD MANAGER ===
  if (role === "manager") {
    return (
      <div className={styles.container} style={{ ["--color-primary" as any]: primary }}>
        {/* ... seu layout original para manager permanece igual ... */}
      </div>
    );
  }

  // === DASHBOARD PROFISSIONAL ===
  if (role === "professional") {
    return (
      <div className={styles.container} style={{ ["--color-primary" as any]: primary }}>
        {/* ... seu layout original para professional permanece igual ... */}
      </div>
    );
  }

  return null;
}
