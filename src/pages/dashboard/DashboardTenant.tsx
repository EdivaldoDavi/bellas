import { useEffect, useMemo, useState, useCallback } from "react"; // Adicionado useCallback

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

// Função auxiliar movida para antes do componente principal
function formatHour(iso: string) {
  const d = new Date(iso);
  return d.toLocaleTimeString("pt-BR", { hour: "2-digit", minute: "2-digit" });
}

const REVENUE_GOAL_CENTS = 1_500_000; // 15.000
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

  const [ ,setLoading] = useState(true);
  const [ ,setGreetingName] = useState<string>("");

  const [role, setRole] = useState<string>("manager");

  const [appointmentsToday, setAppointmentsToday] = useState(0);
  const [revenueThisMonth, setRevenueThisMonth] = useState(0);
  const [todaysAppointments, setTodaysAppointments] = useState<any[]>([]);
  const [top3, setTop3] = useState<any[]>([]);
  const [rankingPosition, setRankingPosition] = useState<number | null>(null);
  const [doneThisMonth, setDoneThisMonth] = useState(0);

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

  // ==============================
  // Função global reutilizável, agora memoizada com useCallback
  // ==============================
  const loadDashboard = useCallback(async () => {
    try {
      setLoading(true);
      // Usar o profile do contexto, não buscar novamente
      if (userTenantLoading || !profile) return;

    setRole(profile.role ?? "manager");

    const safeName = typeof profile.full_name === "string" && profile.full_name.trim() !== ""
  ? profile.full_name
  : "Usuário";

setGreetingName(safeName);
     if (!profile.tenant_id) return;
const tenantId: UUID = profile.tenant_id;

      const professionalId: UUID | null = profile.user_id || null; // Usar user_id como professional_id se aplicável

      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // ====== AGENDAMENTOS DE HOJE ======
      const { data: apptsTodayData } = await supabase
        .from("appointments")
        .select("id, professional_id, service_id, customer_name, starts_at, ends_at, status")
        .eq("tenant_id", tenantId)
        .gte("starts_at", `${todayISO}T00:00:00`)
        .lte("starts_at", `${todayISO}T23:59:59`)
        .order("starts_at");

      const apptsToday = (apptsTodayData || []) as Appointment[];
      setAppointmentsToday(apptsToday.length);

      const serviceIds = apptsToday.map((a) => a.service_id).filter(Boolean) as UUID[];
      const profIds = apptsToday.map((a) => a.professional_id).filter(Boolean) as UUID[];

      const { data: svcData } = await supabase
        .from("services")
        .select("id,name,price_cents")
        .in("id", serviceIds);

      const { data: profData } = await supabase
        .from("professionals")
        .select("id,name")
        .in("id", profIds);

      const svcMap = new Map((svcData || []).map((s) => [s.id, s]));
      const profMap = new Map((profData || []).map((p) => [p.id, p]));

      setTodaysAppointments(
        apptsToday.map((a) => ({
          id: a.id,
          serviceName: svcMap.get(a.service_id)?.name || "Serviço",
          professionalName: profMap.get(a.professional_id)?.name || "Profissional",
          customerName: a.customer_name || "Cliente",
          startsAt: a.starts_at,
          endsAt: a.ends_at,
          status: a.status,
        }))
      );

      // ====== FATURAMENTO DO MÊS ======
      const { data: monthDone } = await supabase
        .from("appointments")
        .select("professional_id, service_id")
        .eq("tenant_id", tenantId)
        .eq("status", "done")
        .gte("starts_at", monthStart)
        .lt("starts_at", nextMonth);

      const done = (monthDone || []) as { professional_id: UUID; service_id: UUID }[];
      setDoneThisMonth(done.length);

      const monthServiceIds = [...new Set(done.map((d) => d.service_id))];
      const { data: svcMonth } = await supabase
        .from("services")
        .select("id, price_cents")
        .in("id", monthServiceIds);

      const svcMonthMap = new Map((svcMonth || []).map((s) => [s.id, s.price_cents]));
      const totalCents = done.reduce(
        (acc, d) => acc + (svcMonthMap.get(d.service_id) || 0),
        0
      );
      setRevenueThisMonth(totalCents / 100);

      // ranking
      const byProf = new Map<string, number>();
      done.forEach((d) => {
        const prev = byProf.get(d.professional_id) || 0;
        byProf.set(d.professional_id, prev + (svcMonthMap.get(d.service_id) || 0));
      });

      const top = Array.from(byProf.entries())
        .map(([id, totalCents]) => ({
          id,
          name: profMap.get(id)?.name || "Profissional",
          total: totalCents,
        }))
        .sort((a, b) => b.total - a.total);

      setTop3(top.slice(0, 3));

      if (professionalId) {
        const pos = top.findIndex((t) => t.id === professionalId);
        setRankingPosition(pos >= 0 ? pos + 1 : null);
      }
    } finally {
      setLoading(false);
    }
  }, [userTenantLoading, profile, tenant?.id]); // Dependências para useCallback

  // 🔁 Carrega inicialmente e quando o perfil/tenant muda
  useEffect(() => {
    if (!userTenantLoading && profile && tenant?.id) {
      loadDashboard();
    }
    // 👇 Atualiza automaticamente ao voltar para a aba
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        loadDashboard();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    // cleanup
    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile, userTenantLoading, tenant?.id, loadDashboard]); // Adicionado loadDashboard como dependência

  useEffect(() => {
    // 👇 Atualiza automaticamente quando há UPDATE no Supabase
    if (!tenant?.id) return; // Não subscreve se não houver tenantId

    const channel = supabase
      .channel(`appointments-changes-${tenant.id}`) // Canal específico para o tenant
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload) => {
          console.log("🟢 Atualização recebida:", payload);
          loadDashboard(); // ✅ agora recarrega automaticamente
        }
      )
      .subscribe();

    // cleanup
    return () => {
      supabase.removeChannel(channel);
    };
  }, [tenant?.id, loadDashboard]); // Depende do tenant.id e loadDashboard para recriar o canal se o tenant mudar

  // ====================================================
  // === GERENTE ========================================
  // ====================================================
  if (role === "manager") {
    return (
      <div
        className={styles.container}
        style={
          {
            ["--color-primary" as any]: primary,
          } as React.CSSProperties
        }
      >
     

        <div className={styles.dashboardGrid}>
          {/* ====== COLUNA ESQUERDA ====== */}
          <div className={styles.leftColumn}>
            {/* ====== METAS ====== */}
            <div className={styles.goalsGrid}>
              <div className={styles.goalCard}>
                <h4>Meta de Faturamento</h4>
                <div className={styles.goalValue}>
                  R${" "}
                  {revenueThisMonth.toLocaleString("pt-BR", {
                    minimumFractionDigits: 2,
                  })}{" "}
                  <span className={styles.goalTarget}>/ R$ 15.000,00</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressInner}
                    style={{ width: `${revenueProgress}%` }}
                  />
                </div>
                <span className={styles.progressLabel}>{revenueProgress}%</span>
              </div>

              <div className={styles.goalCard}>
                <h4>Meta de Atendimentos</h4>
                <div className={styles.goalValue}>
                  {appointmentsToday} <span className={styles.goalTarget}>/ 200</span>
                </div>
                <div className={styles.progressBar}>
                  <div
                    className={styles.progressInner}
                    style={{ width: `${apptsProgress}%` }}
                  />
                </div>
                <span className={styles.progressLabel}>{apptsProgress}%</span>
              </div>
            </div>

            {/* ====== PRÓXIMOS AGENDAMENTOS ====== */}
            <div className={styles.section}>
              <h3 className={styles.sectionTitle}>Próximos Agendamentos</h3>
              {todaysAppointments.length === 0 ? (
                <p className={styles.emptyState}>Sem agendamentos para hoje.</p>
              ) : (
todaysAppointments.map((item) => (
  <div key={item.id} className={styles.appointmentCard}>
    <img
      className={styles.avatar}
      src={PLACEHOLDER_AVATAR}
      alt={item.professionalName}
    />

    <div className={styles.appointmentInfo}>
      <div className={styles.appointmentTitle}>
        {item.serviceName}{" "}
        <span className={styles.gray}>
          ({item.status === "scheduled" ? "Manutenção" : item.status})
        </span>
      </div>

      <div className={styles.appointmentSubtitle}>
        com {item.professionalName}
      </div>

      <div className={styles.appointmentClient}>
        Cliente: <strong>{item.customerName || "Não informado"}</strong>
      </div>
    </div>

    <div className={styles.appointmentRight}>
      <div className={styles.appointmentTime}>
        {formatHour(item.startsAt)} – {formatHour(item.endsAt)}
      </div>
     <span
  className={`${styles.statusBadge} ${
    item.status === "done"
      ? styles.done
      : item.status === "canceled"
      ? styles.canceled
      : item.status === "rescheduled"
      ? styles.rescheduled
      : styles.scheduled
  }`}
>
  {item.status === "done"
    ? "Realizado"
    : item.status === "canceled"
    ? "Cancelado"
    : item.status === "rescheduled"
    ? "Reagendado"
    : "Agendado"}
</span>

    </div>
  </div>
))
              )}
            </div>
          </div>

          {/* ====== COLUNA DIREITA ====== */}
          <div className={styles.rightColumn}>
            <div className={styles.topProfCard}>
              <h3 className={styles.sectionTitle}>Top 3 Profissionais (Mês)</h3>
              {top3.length === 0 ? (
                <p className={styles.emptyState}>Sem faturamento neste mês ainda.</p>
              ) : (
                top3.map((p, index) => (
                  <div key={p.id} className={styles.rankItem}>
                    <span className={styles.rankNumber}>#{index + 1}</span>
                    <img
                      src={PLACEHOLDER_AVATAR}
                      alt={p.name}
                      width={40}
                      height={40}
                      className={styles.rankAvatar}
                    />
                    <div className={styles.rankInfo}>
                      <span className={styles.rankName}>{p.name}</span>
                      <span className={styles.rankAmount}>
                        R${" "}
                        {(p.total / 100).toLocaleString("pt-BR", {
                          minimumFractionDigits: 2,
                        })}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ====================================================
  // === PROFISSIONAL ===================================
  // ====================================================
  if (role === "professional") {
    return (
      <div
        className={styles.container}
        style={
          {
            ["--color-primary" as any]: primary,
          } as React.CSSProperties
        }
      >
       

        <section className={styles.goalsGrid}>
          <div className={`${styles.goalCard} ${styles.prof}`}>
            <h3>Meus Agendamentos Hoje</h3>
            <div className={styles.goalValue}>{appointmentsToday}</div>
          </div>

          <div className={`${styles.goalCard} ${styles.prof}`}>
            <h3>Meu Faturamento (Mês)</h3>
            <div className={styles.goalValue}>
              R${" "}
              {revenueThisMonth.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className={`${styles.goalCard} ${styles.prof}`}>
            <h3>Atendimentos Concluídos (Mês)</h3>
            <div className={styles.goalValue}>{doneThisMonth}</div>
          </div>

          <div className={`${styles.goalCard} ${styles.prof}`}>
            <h3>Minha Posição no Ranking</h3>
            <div className={styles.goalValue}>
              {rankingPosition ? `#${rankingPosition}` : "–"}
            </div>
          </div>
        </section>

        <section className={`${styles.section} ${styles.prof}`}>
          <div className={styles.sectionHeader}>
            <h3>Meus Próximos Atendimentos</h3>
          </div>
          {todaysAppointments.length === 0 ? (
            <div className={styles.emptyState}>Você não tem agendamentos para hoje.</div>
          ) : (
            todaysAppointments.map((item) => (
              <div key={item.id} className={styles.appointmentCard}>
                <img className={styles.avatar} src={PLACEHOLDER_AVATAR} alt="" />
                <div>
                  <div className={styles.appointmentTitle}>{item.serviceName}</div>
                  <div className={styles.appointmentSubtitle}>
                    {formatHour(item.startsAt)} - {formatHour(item.endsAt)}
                  </div>
                </div>
              </div>
            ))
          )}
        </section>
      </div>
    );
  }

  return null;
}