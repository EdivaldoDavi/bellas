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

  const [loading, setLoading] = useState(true);
  const [greetingName, setGreetingName] = useState<string>("");

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
    console.log("DashboardTenant: [loadDashboard] Função chamada.");
    try {
      setLoading(true);
      // Usar o profile do contexto, não buscar novamente
      if (userTenantLoading || !profile || !tenant) {
        console.log("DashboardTenant: [loadDashboard] Condição de carregamento ou dados ausentes. userTenantLoading:", userTenantLoading, "profile:", !!profile, "tenant:", !!tenant);
        setLoading(false); // Ensure loading is false if tenant is null
        return;
      }

      console.log("DashboardTenant: [loadDashboard] Profile:", profile.user_id, "Tenant:", tenant.id);

      setRole(profile.role ?? "manager");
      console.log("DashboardTenant: [loadDashboard] Role definido como:", profile.role);

      const safeName = typeof profile.full_name === "string" && profile.full_name.trim() !== ""
        ? profile.full_name.split(" ")[0] // Only first name for greeting
        : "Usuário";

      setGreetingName(safeName);
      const tenantId: UUID = tenant.id; // Use tenant.id directly

      // 🔥 Usar profile.professional_id aqui
      const professionalId: UUID | null = profile.professional_id || null;
      console.log("DashboardTenant: [loadDashboard] Professional ID:", professionalId);


      const now = new Date();
      const todayISO = now.toISOString().slice(0, 10);
      const monthStart = new Date(now.getFullYear(), now.getMonth(), 1).toISOString();
      const nextMonth = new Date(now.getFullYear(), now.getMonth() + 1, 1).toISOString();

      // ====== AGENDAMENTOS DE HOJE ======
      let apptsTodayQuery = supabase
        .from("appointments")
        .select("id, professional_id, service_id, customer_name, starts_at, ends_at, status")
        .eq("tenant_id", tenantId)
        .gte("starts_at", `${todayISO}T00:00:00`)
        .lte("starts_at", `${todayISO}T23:59:59`)
        .order("starts_at");

      if (profile.role === "professional" && professionalId) {
        apptsTodayQuery = apptsTodayQuery.eq("professional_id", professionalId);
        console.log("DashboardTenant: [loadDashboard] Filtrando agendamentos por professional_id:", professionalId);
      }

      const { data: apptsTodayData } = await apptsTodayQuery;
      console.log("DashboardTenant: [loadDashboard] Agendamentos de hoje (raw):", apptsTodayData);

      const apptsToday = (apptsTodayData || []) as Appointment[];
      setAppointmentsToday(apptsToday.length);
      console.log("DashboardTenant: [loadDashboard] Total de agendamentos hoje:", apptsToday.length);


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
      console.log("DashboardTenant: [loadDashboard] Agendamentos de hoje (formatados):", todaysAppointments);


      // ====== FATURAMENTO DO MÊS ======
      let monthDoneQuery = supabase
        .from("appointments")
        .select("professional_id, service_id")
        .eq("tenant_id", tenantId)
        .eq("status", "done")
        .gte("starts_at", monthStart)
        .lt("starts_at", nextMonth);

      if (profile.role === "professional" && professionalId) {
        monthDoneQuery = monthDoneQuery.eq("professional_id", professionalId);
        console.log("DashboardTenant: [loadDashboard] Filtrando faturamento por professional_id:", professionalId);
      }

      const { data: monthDone } = await monthDoneQuery;
      console.log("DashboardTenant: [loadDashboard] Faturamento do mês (raw):", monthDone);


      const done = (monthDone || []) as { professional_id: UUID; service_id: UUID }[];
      setDoneThisMonth(done.length);
      console.log("DashboardTenant: [loadDashboard] Atendimentos concluídos no mês:", done.length);


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
      console.log("DashboardTenant: [loadDashboard] Faturamento total do mês:", totalCents / 100);


      // ranking (only for manager, or if professional wants to see their rank)
      if (profile.role === "manager" || (profile.role === "professional" && professionalId)) {
        console.log("DashboardTenant: [loadDashboard] Calculando ranking.");
        const allDoneAppointments = await supabase
          .from("appointments")
          .select("professional_id, service_id")
          .eq("tenant_id", tenantId)
          .eq("status", "done")
          .gte("starts_at", monthStart)
          .lt("starts_at", nextMonth);

        const allServicePrices = await supabase
          .from("services")
          .select("id, price_cents");

        const allSvcPriceMap = new Map((allServicePrices.data || []).map((s) => [s.id, s.price_cents]));

        const allByProf = new Map<string, number>();
        (allDoneAppointments.data || []).forEach((d) => {
          const prev = allByProf.get(d.professional_id) || 0;
          allByProf.set(d.professional_id, prev + (allSvcPriceMap.get(d.service_id) || 0));
        });

        const allTop = Array.from(allByProf.entries())
          .map(([id, totalCents]) => ({
            id,
            name: profMap.get(id)?.name || "Profissional",
            total: totalCents,
          }))
          .sort((a, b) => b.total - a.total);

        setTop3(allTop.slice(0, 3));
        console.log("DashboardTenant: [loadDashboard] Top 3 Profissionais:", allTop.slice(0, 3));


        if (professionalId) {
          const pos = allTop.findIndex((t) => t.id === professionalId);
          setRankingPosition(pos >= 0 ? pos + 1 : null);
          console.log("DashboardTenant: [loadDashboard] Posição no ranking do profissional:", pos >= 0 ? pos + 1 : null);
        }
      }

    } finally {
      console.log("DashboardTenant: [loadDashboard] Finalizado. Definindo loading para false.");
      setLoading(false);
    }
  }, [userTenantLoading, profile, tenant]); // Dependencies for useCallback

  useEffect(() => {
    console.log("DashboardTenant: [useEffect principal] Disparado. userTenantLoading:", userTenantLoading, "profile:", !!profile);
    if (!userTenantLoading && profile) {
      console.log("DashboardTenant: [useEffect principal] Profile carregado e não está em loading, chamando loadDashboard.");
      loadDashboard();
    } else if (!userTenantLoading && !profile) {
      console.log("DashboardTenant: [useEffect principal] Profile não carregado e não está em loading. Não chamando loadDashboard.");
    }
    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        console.log("DashboardTenant: [visibilitychange] Aba visível, chamando loadDashboard.");
        loadDashboard();
      }
    };
    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [profile, userTenantLoading, tenant]); // Removido loadDashboard das dependências

  // Ref para a função loadDashboard
  const loadDashboardRef = useRef(loadDashboard);
  useEffect(() => {
    loadDashboardRef.current = loadDashboard;
  }, [loadDashboard]);

  useEffect(() => {
    if (!tenant?.id) {
      console.log("DashboardTenant: [useEffect Supabase Channel] Sem tenant ID, não configurando canal.");
      return;
    }
    console.log("DashboardTenant: [useEffect Supabase Channel] Configurando canal para tenant ID:", tenant.id);


    const channel = supabase
      .channel(`appointments-changes-${tenant.id}`)
      .on(
        "postgres_changes",
        { event: "UPDATE", schema: "public", table: "appointments" },
        (payload) => {
          console.log("DashboardTenant: [Supabase Channel] Atualização recebida:", payload);
          loadDashboardRef.current(); // Chama a função via ref
        }
      )
      .subscribe();

    return () => {
      console.log("DashboardTenant: [Supabase Channel] Desinscrevendo do canal.");
      supabase.removeChannel(channel);
    };
  }, [tenant?.id]); // loadDashboard removido das dependências

  if (loading) {
    console.log("DashboardTenant: Renderizando tela de carregamento.");
    return (
      <div style={{ padding: 20, textAlign: "center" }}>
        Carregando informações…
      </div>
    );
  }

  if (!tenant) {
    console.log("DashboardTenant: Renderizando mensagem de tenant não encontrado.");
    return (
      <div className={styles.container}>
        <p style={{ textAlign: "center", padding: 20 }}>
          Seu perfil está associado a um salão, mas não foi possível carregar as informações do salão.
          Por favor, entre em contato com o administrador do sistema.
        </p>
      </div>
    );
  }

  if (role === "manager") {
    console.log("DashboardTenant: Renderizando dashboard para MANAGER.");
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
          <div className={styles.leftColumn}>
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

  if (role === "professional") {
    console.log("DashboardTenant: Renderizando dashboard para PROFESSIONAL.");
    if (!profile?.professional_id) {
      console.log("DashboardTenant: Professional sem professional_id vinculado.");
      return (
        <div className={styles.container}>
          <p style={{ textAlign: "center", padding: 20 }}>
            Seu perfil de usuário não está vinculado a um profissional cadastrado no salão.
            Por favor, entre em contato com o administrador do sistema para vincular seu usuário a um profissional.
          </p>
        </div>
      );
    }

    return (
      <div
        className={styles.container}
        style={
          {
            ["--color-primary" as any]: primary,
          } as React.CSSProperties
        }
      >
        <div className={styles.profStatsGrid}>
          <div className={styles.profStatCard}>
            <div className={styles.profCardHeader}>
              <div className={`${styles.profCardIcon} ${styles.appointmentsToday}`}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{appointmentsToday}</span>
              </div>
              <span className={styles.profCardTitle}>Meus Agendamentos Hoje</span>
            </div>
            <div className={styles.profCardValue}>{appointmentsToday}</div>
          </div>

          <div className={styles.profStatCard}>
            <div className={styles.profCardHeader}>
              <div className={`${styles.profCardIcon} ${styles.revenueMonth}`}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>R$</span>
              </div>
              <span className={styles.profCardTitle}>Meu Faturamento (Mês)</span>
            </div>
            <div className={styles.profCardValue}>
              R${" "}
              {revenueThisMonth.toLocaleString("pt-BR", {
                minimumFractionDigits: 2,
              })}
            </div>
          </div>

          <div className={styles.profStatCard}>
            <div className={styles.profCardHeader}>
              <div className={`${styles.profCardIcon} ${styles.completedMonth}`}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>{doneThisMonth}</span>
              </div>
              <span className={styles.profCardTitle}>Atendimentos Concluídos (Mês)</span>
            </div>
            <div className={styles.profCardValue}>{doneThisMonth}</div>
          </div>

          <div className={styles.profStatCard}>
            <div className={styles.profCardHeader}>
              <div className={`${styles.profCardIcon} ${styles.rankingPosition}`}>
                <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>#</span>
              </div>
              <span className={styles.profCardTitle}>Minha Posição no Ranking</span>
            </div>
            <div className={styles.profCardValue}>
              {rankingPosition ? `#${rankingPosition}` : "–"}
            </div>
          </div>
        </div>

        <section className={styles.appointmentsSection}>
          <h3 className={styles.sectionTitle}>Meus Próximos Atendimentos</h3>
          {todaysAppointments.length === 0 ? (
            <p className={styles.emptyState}>Você não tem agendamentos para hoje.</p>
          ) : (
            todaysAppointments.map((item) => (
              <div key={item.id} className={styles.appointmentCard}>
                <img className={styles.appointmentAvatar} src={PLACEHOLDER_AVATAR} alt="" />
                <div className={styles.appointmentInfo}>
                  <div className={styles.appointmentTitle}>{item.serviceName}</div>
                  <div className={styles.appointmentTime}>
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

  console.log("DashboardTenant: Renderizando null (papel não tratado).");
  return null;
}