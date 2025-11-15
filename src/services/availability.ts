import { supabase } from "../lib/supabaseCleint";
import {
  getDayBoundsISO,
  toLocalISOString,
  isPastDateLocal,
  getWeekdayLocal,
  isHoliday,
  combineLocalDateTime,
} from "../utils/date";

/**
 * Gera os horários possíveis (slots) dentro de um bloco [start_time, end_time] em minutos,
 * respeitando a duração do serviço e filtrando “agora” quando o dia é hoje.
 */
function generateSlotsForDay(
  dateISO: string,
  start_time: string,
  end_time: string,
  durationMin: number
) {
  const [sh, sm] = start_time.split(":").map(Number);
  const [eh, em] = end_time.split(":").map(Number);
  const start = combineLocalDateTime(
    dateISO,
    `${String(sh).padStart(2, "0")}:${String(sm).padStart(2, "0")}`
  );
  const end = combineLocalDateTime(
    dateISO,
    `${String(eh).padStart(2, "0")}:${String(em).padStart(2, "0")}`
  );

  const slots: { start: Date; end: Date }[] = [];
  let cursor = new Date(start);

  const isToday = dateISO === toLocalISOString(new Date()).split("T")[0];
  const now = new Date();

  while (cursor.getTime() + durationMin * 60000 <= end.getTime()) {
    const s = new Date(cursor);
    const e = new Date(cursor.getTime() + durationMin * 60000);

    // não oferecer horários já passados se for hoje
    if (!isToday || s.getTime() > now.getTime()) {
      slots.push({ start: s, end: e });
    }
    cursor = new Date(cursor.getTime() + durationMin * 60000);
  }
  return slots;
}

/**
 * Verifica se um slot conflita com algum agendamento existente.
 * Agora com comparação precisa via timestamp.
 */
function overlaps(
  appointments: { starts_at: string; ends_at: string }[],
  s: Date,
  e: Date
) {
  const sT = s.getTime();
  const eT = e.getTime();
  return appointments.some((a) => {
    const aStart = new Date(a.starts_at).getTime();
    const aEnd = new Date(a.ends_at).getTime();
    return aStart < eT && aEnd > sT; // há interseção de horários
  });
}

/**
 * Retorna um Set com datas (YYYY-MM-DD) que possuem ao menos 1 slot livre.
 * - Faz apenas 2 consultas no Supabase para o mês inteiro.
 */
export async function computeAvailableDaysForMonth(opts: {
  tenantId: string;
  professionalId: string;
  serviceDuration: number;
  year: number;
  month: number;
}) {
  const { tenantId, professionalId, serviceDuration, year, month } = opts;


  // limites do mês
  const monthStart = new Date(year, month - 1, 1);
  const monthEnd = new Date(year, month, 0);

  const { startISO } = getDayBoundsISO(
    toLocalISOString(monthStart).split("T")[0]
  );
  const { endISO: endMonthISO } = getDayBoundsISO(
    toLocalISOString(monthEnd).split("T")[0]
  );

  // 1) agendas do mês (com tenant!)
  const { data: appts } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("professional_id", professionalId)
    .gte("starts_at", startISO)
    .lte("starts_at", endMonthISO);

  const appointments = (appts || []) as {
    starts_at: string;
    ends_at: string;
  }[];

  // 2) schedules (com tenant!)
  const { data: schedules } = await supabase
    .from("professional_schedules")
    .select("weekday, start_time, end_time")
    .eq("tenant_id", tenantId)
    .eq("professional_id", professionalId);

  const byWeekday = new Map<number, any[]>();
  (schedules || []).forEach((s) => {
    const list = byWeekday.get(s.weekday) || [];
    list.push(s);
    byWeekday.set(s.weekday, list);
  });

  // 3) varrer dias do mês
  const canBook = new Set<string>();

  for (let d = 1; d <= monthEnd.getDate(); d++) {
    const iso = `${year}-${String(month).padStart(2, "0")}-${String(d).padStart(
      2,
      "0"
    )}`;

    if (isPastDateLocal(iso)) continue;
    if (isHoliday(iso)) continue;

    const wd = getWeekdayLocal(iso);
    if (wd === 7) continue; // domingo

    const blocks = byWeekday.get(wd) || [];
    if (blocks.length === 0) continue;

    let hasAny = false;

    for (const b of blocks) {
      const slots = generateSlotsForDay(
        iso,
        b.start_time,
        b.end_time,
        serviceDuration
      );

      for (const slot of slots) {
        if (!overlaps(appointments, slot.start, slot.end)) {
          hasAny = true;
          break;
        }
      }

      if (hasAny) break;
    }

    if (hasAny) {
      canBook.add(iso);
    }
  }

  return canBook;
}
