import { useEffect, useMemo, useState } from "react";
import { supabase } from "../lib/supabaseCleint";
import styles from "../css/AssinaturasPage.module.css";

type TableItem = {
  id: string;
  salao: string;
  plano: string;
  status: string;
  precoCentavos: number | null;
  proximaCobranca: string | null; // ISO
};

const BRL = new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" });

function formatPriceFromCents(cents: number | null | undefined) {
  if (typeof cents !== "number") return "—";
  return BRL.format(cents / 100);
}

function formatDateBR(dateIso: string | null) {
  if (!dateIso) return "—";
  const d = new Date(dateIso);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR");
}

function nextCharge(status: string, trial_end_at: string | null, current_period_end_at: string | null) {
  if (status === "trial") return trial_end_at ?? null;
  if (status === "active") return current_period_end_at ?? null;
  return null; // canceled → “—”
}

export default function AssinaturasPage() {
  const [rows, setRows] = useState<TableItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [errorMsg, setErrorMsg] = useState<string | null>(null);

  useEffect(() => {
    async function load() {
      setLoading(true);
      setErrorMsg(null);

      // ✅ Busca direto da VIEW
      const { data, error } = await supabase
        .from("subscriptions_overview")
        .select("subscription_id, tenant_name, plan_name, status, price_cents, trial_end_at, current_period_end_at");

      if (error) {
        setErrorMsg("Não foi possível carregar as assinaturas.");
        console.error(error);
        setLoading(false);
        return;
      }

      const mapped = (data || []).map((s: any) => ({
        id: s.subscription_id,
        salao: s.tenant_name,
        plano: s.plan_name,
        status: s.status,
        precoCentavos: s.price_cents ?? null,
        proximaCobranca: nextCharge(s.status, s.trial_end_at, s.current_period_end_at),
      }));

      mapped.sort((a, b) => a.salao.localeCompare(b.salao, "pt-BR"));

      setRows(mapped);
      setLoading(false);
    }

    load();
  }, []);

  const content = useMemo(() => {
    if (loading) return <div className={styles.loading}>Carregando...</div>;
    if (errorMsg) return <div className={styles.error}>{errorMsg}</div>;
    if (rows.length === 0) return <div className={styles.empty}>Nenhuma assinatura encontrada.</div>;

    return (
      <div className={styles.card}>
        <table className={styles.table}>
          <thead>
            <tr>
              <th>Salão</th>
              <th>Plano</th>
              <th>Status</th>
              <th>Preço</th>
              <th>Próxima Cobrança</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => (
              <tr key={r.id}>
                <td data-label="Salão">{r.salao}</td>
                <td data-label="Plano">{r.plano}</td>
                <td data-label="Status">
                  {r.status === "active" && <span className={`${styles.badge} ${styles.badgeGreen}`}>Ativa</span>}
                  {r.status === "trial" && <span className={`${styles.badge} ${styles.badgeOrange}`}>Teste Gratuito</span>}
                  {r.status === "canceled" && <span className={`${styles.badge} ${styles.badgeRed}`}>Cancelada</span>}
                  {!["active", "trial", "canceled"].includes(r.status) && <span className={styles.badge}>{r.status}</span>}
                </td>
                <td data-label="Preço">{formatPriceFromCents(r.precoCentavos)}</td>
                <td data-label="Próxima Cobrança">{formatDateBR(r.proximaCobranca)}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    );
  }, [loading, errorMsg, rows]);

  return (
    <div className={styles.container}>
      <h2 className={styles.title}>Assinaturas dos Salões</h2>
      {content}
    </div>
  );
}
