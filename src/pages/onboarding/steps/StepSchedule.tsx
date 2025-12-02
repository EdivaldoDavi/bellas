import { useState, useEffect } from "react";
import { useUserTenant } from "../../../context/UserTenantProvider";
import { supabase } from "../../../lib/supabaseCleint";
import { toast } from "react-toastify";
import styles from "../Onboarding.module.css";
import ProfessionalsPage from "../../ProfessionalsPage";

export default function StepSchedule() {
  const { tenant, profile, updateOnboardingStep } = useUserTenant();
  const tenantId = tenant?.id;
  const userId = profile?.user_id;

  const [showModal, setShowModal] = useState(false);
  const [loadingCheck, setLoadingCheck] = useState(false);
  const [professionals, setProfessionals] = useState<any[]>([]);
  const [loadingProfs, setLoadingProfs] = useState(true);

  /* ============================================
     🔥 Carrega profissionais cadastrados
  ============================================ */
  async function loadProfessionals() {
    if (!tenantId) return;

    const { data, error } = await supabase
      .from("professionals")
      .select("id, name, is_active")
      .eq("tenant_id", tenantId)
      .order("name");

    if (error) {
      console.error(error);
      toast.error("Erro ao carregar profissionais.");
      return;
    }

    setProfessionals(data || []);
    setLoadingProfs(false);
  }

  useEffect(() => {
    loadProfessionals();
  }, [tenantId]);

  /* ============================================
     🔥 Valida e avança
  ============================================ */
  async function validateAndContinue() {
    if (!tenantId || !userId) return;

    setLoadingCheck(true);

    try {
      // 1️⃣ Pega o profissional do usuário
      const { data: prof } = await supabase
        .from("professionals")
        .select("id")
        .eq("tenant_id", tenantId)
        .eq("user_id", userId)
        .maybeSingle();

      if (!prof) {
        toast.error("Profissional não encontrado.");
        return;
      }

      const professionalId = prof.id;

      // 2️⃣ Serviços vinculados
      const { count: serviceCount } = await supabase
        .from("professional_services")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!serviceCount) {
        toast.warn("Vincule ao menos 1 serviço ao profissional.");
        return;
      }

      // 3️⃣ Horários
      const { count: scheduleCount } = await supabase
        .from("professional_schedules")
        .select("id", { count: "exact", head: true })
        .eq("tenant_id", tenantId)
        .eq("professional_id", professionalId);

      if (!scheduleCount) {
        toast.warn("Defina ao menos 1 horário.");
        return;
      }

      updateOnboardingStep(4);

    } catch (err) {
      console.error(err);
      toast.error("Erro ao validar dados.");
    }

    setLoadingCheck(false);
  }

  /* ============================================
     🔙 VOLTAR ETAPA
  ============================================ */
  function goBack() {
    updateOnboardingStep(2); // volta para step Services
  }

  return (
    <div className={styles.stepContainer}>
      
      <h2 className={styles.stepTitle}>Escolha o(s) profissionais que irão atender</h2>

      <p className={styles.stepText}>
        Aqui você pode ajustar os horários dos profissionais do Studio. 
        Por padrão, você já foi cadastrado como profissional com horários automáticos.
      </p>

      {/* 🔥 Lista de profissionais */}
      <h3 className={styles.sectionTitle}>Profissionais cadastrados:</h3>

      <div className={styles.servicesListWrapper}>
        {loadingProfs ? (
          <p className={styles.stepText}>Carregando profissionais...</p>
        ) : professionals.length === 0 ? (
          <p className={styles.emptyText}>Nenhum profissional cadastrado ainda.</p>
        ) : (
          <ul className={styles.servicesList}>
            {professionals.map((p) => (
              <li key={p.id} className={styles.serviceItem}>
                <strong>{p.name}</strong>
                <span>{p.is_active ? "Ativo" : "Inativo"}</span>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* ======================================================
          🔘 BOTÕES: Voltar — Ajustar horários — Continuar
      ======================================================= */}
      <div className={styles.actions}>
        
        {/* 🔙 VOLTAR ETAPA */}
        <button className={styles.tertiaryBtn} onClick={goBack}>
          ← Voltar etapa
        </button>

        {/* Ajustar horários */}
        <button className={styles.primaryBtn} onClick={() => setShowModal(true)}>
          Ajustar horários agora
        </button>

        {/* Continuar */}
        <button
          className={styles.secondaryBtn}
          disabled={loadingCheck}
          onClick={validateAndContinue}
        >
          {loadingCheck ? "Validando..." : "Continuar"}
        </button>

      </div>

      {/* Modal */}
      {tenantId && showModal && (
        <ProfessionalsPage onClose={() => {
          setShowModal(false);
          loadProfessionals();
        }} />
      )}
    </div>
  );
}
