// src/pages/onboarding/steps/StepSchedule.tsx
import { useEffect, useState } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";
import ProfessionalsPage from "../../ProfessionalsPage";

type Professional = {
  id: string;
  name: string;
  is_active: boolean;
};

export default function StepSchedule() {
  const { tenant, profile, updateOnboardingStep } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [professionals, setProfessionals] = useState<Professional[]>([]);
  const [loadingProfessionals, setLoadingProfessionals] = useState(true);

  /* ============================================================
     🔥 CARREGAR PROFISSIONAIS
  ============================================================ */
  async function loadProfessionals() {
    if (!tenantId) return;
    setLoadingProfessionals(true);

    const { data, error } = await supabase
      .from("professionals")
      .select("id,name,is_active")
      .eq("tenant_id", tenantId)
      .order("name", { ascending: true });

    if (error) {
      console.error("Erro ao carregar profissionais:", error);
      toast.error("Erro ao carregar profissionais.");
      setLoadingProfessionals(false);
      return;
    }

    setProfessionals((data || []) as Professional[]);
    setLoadingProfessionals(false);
  }

  useEffect(() => {
    loadProfessionals();
  }, [tenantId]);

  /* ============================================================
     🔙 VOLTAR PARA STEP DE SERVIÇOS (1)
  ============================================================ */
  function goBack() {
    updateOnboardingStep(1);
  }

  /* ============================================================
     ✅ VALIDAR E CONTINUAR
  ============================================================ */
  async function validateAndContinue() {
    if (!tenantId || !userId) return;

    setLoadingCheck(true);

    try {
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .single();

      if (!prof) {
        toast.error("Profissional não encontrado.");
        setLoadingCheck(false);
        return;
      }

      const professionalId = prof.id;

      const { count: serviceCount } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!serviceCount || serviceCount === 0) {
        toast.warn(
          "Você deve selecionar ao menos 1 serviço para o profissional selecionado."
        );
        setLoadingCheck(false);
        return;
      }

      const { count: scheduleCount } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!scheduleCount || scheduleCount === 0) {
        toast.warn(
          "Você deve definir ao menos 1 horário para o profissional selecionado."
        );
        setLoadingCheck(false);
        return;
      }

      // Tudo certo → próximo step (3) = StepFirstCustomer
      updateOnboardingStep(3);
    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar dados.");
    }

    setLoadingCheck(false);
  }

  /* ============================================================
     RENDER
  ============================================================ */
  return (
    <div className={styles.stepContainer}>
      <h2 className={styles.stepTitle}>
        Escolha o(s) profissionais que irão atender
      </h2>

      <p className={styles.stepText}>
        Aqui você pode ajustar os horários dos profissionais do Studio. Por
        padrão, você já foi cadastrado como profissional com horários de
        09:00 às 18:00 todos os dias. Se quiser ajustar agora, clique em{" "}
        <strong>Ajustar horários agora</strong>.
      </p>

      {/* LISTA DE PROFISSIONAIS */}
      <div className={styles.professionalsListWrapper}>
        <p className={styles.servicesLabel}>Profissionais cadastrados:</p>

        {loadingProfessionals ? (
          <p className={styles.stepText}>Carregando profissionais...</p>
        ) : professionals.length === 0 ? (
          <p className={styles.emptyText}>Nenhum profissional cadastrado.</p>
        ) : (
          <ul className={styles.professionalsList}>
            {professionals.map((p) => (
              <li key={p.id} className={styles.professionalItem}>
                <span>{p.name}</span>
                <span
                  className={
                    p.is_active
                      ? styles.statusBadgeActive
                      : styles.statusBadgeInactive
                  }
                >
                  {p.is_active ? "Ativo" : "Inativo"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* BOTÕES */}
      <div className={styles.actions}>
        <button className={styles.backButton} onClick={goBack}>
          ← Voltar etapa
        </button>

        <button
          className={styles.primaryBtn}
          onClick={() => setShowModal(true)}
        >
          Ajustar horários agora
        </button>

        <button
          className={styles.secondaryBtn}
          disabled={loadingCheck}
          onClick={validateAndContinue}
        >
          {loadingCheck ? "Validando..." : "Continuar"}
        </button>
      </div>

      {tenantId && showModal && (
        <ProfessionalsPage onClose={() => setShowModal(false)} />
      )}
    </div>
  );
}
