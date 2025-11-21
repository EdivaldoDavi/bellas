import { supabase } from "../lib/supabaseCleint";
import {
  getDayBoundsISO,
  toLocalISOString,
  isPastDateLocal,
  getWeekdayLocal,
  isHoliday,
  combineLocalDateTime,
} from "./date";

const SLOT_INTERVAL_MIN = 15; // Intervalo fixo para gerar os slots (agora 15 minutos)

/**
 * Gera os horários disponíveis para um dado profissional e serviço em uma data específica.
 *
 * @param {string} tenantId O ID do tenant.
 * @param {string} professionalId O ID do profissional.
 * @param {number} serviceDuration A duração do serviço em minutos.
 * @param {string} dateStr A data no formato YYYY-MM-DD.
 * @returns {Promise<string[]>} Um array de horários disponíveis no formato HH:mm.
 */
export async function getAvailableTimeSlots(
  tenantId: string,
  professionalId: string,
  serviceDuration: number,
  dateStr: string
): Promise<string[]> {
  const availableSlots: string[] = [];

  if (!tenantId || !professionalId || !serviceDuration || !dateStr) {
    return availableSlots;
  }

  // 1. Validação básica da data
  if (isPastDateLocal(dateStr) || isHoliday(dateStr)) {
    return availableSlots;
  }

  const weekday = getWeekdayLocal(dateStr);

  // 2. Buscar a agenda do profissional para o dia
  const { data: schedule, error: scheduleError } = await supabase
    .from("professional_schedules")
    .select("start_time, end_time, break_start_time, break_end_time")
    .eq("tenant_id", tenantId)
    .eq("professional_id", professionalId)
    .eq("weekday", weekday)
    .maybeSingle();

  if (scheduleError) {
    console.error("Erro ao buscar agenda do profissional:", scheduleError);
    return availableSlots;
  }
  if (!schedule) {
    return availableSlots; // Nenhuma agenda para este dia
  }

  // 3. Combinar data e hora para os limites de trabalho
  const workStart = combineLocalDateTime(dateStr, schedule.start_time.slice(0, 5));
  const workEnd = combineLocalDateTime(dateStr, schedule.end_time.slice(0, 5));

  // 4. Lidar com o horário de almoço
  const hasBreak =
    schedule.break_start_time !== "00:00:00" &&
    schedule.break_end_time !== "00:00:00";
  const breakStart = hasBreak
    ? combineLocalDateTime(dateStr, schedule.break_start_time.slice(0, 5))
    : null;
  const breakEnd = hasBreak
    ? combineLocalDateTime(dateStr, schedule.break_end_time.slice(0, 5))
    : null;

  // 5. Buscar agendamentos existentes para o dia
  const { startISO, endISO } = getDayBoundsISO(dateStr);
  const { data: bookedAppointments, error: bookedError } = await supabase
    .from("appointments")
    .select("starts_at, ends_at")
    .eq("tenant_id", tenantId)
    .eq("professional_id", professionalId)
    .gte("starts_at", startISO)
    .lte("ends_at", endISO);

  if (bookedError) {
    console.error("Erro ao buscar agendamentos:", bookedError);
    return availableSlots;
  }

  const booked = (bookedAppointments || []).map(a => ({
    start: new Date(a.starts_at),
    end: new Date(a.ends_at)
  }));

  // 6. Gerar slots e verificar disponibilidade
  let currentTimeCursor = new Date(workStart);
  const now = new Date();
  const isToday = toLocalISOString(now).split("T")[0] === dateStr;

  // Loop enquanto o horário de início do slot for ANTES do horário de término do profissional
  while (currentTimeCursor.getTime() < workEnd.getTime()) {
    const slotStart = new Date(currentTimeCursor);
    const slotEndIfServiceStartsHere = new Date(slotStart.getTime() + serviceDuration * 60000);

    // Pular se o slot começar no passado (para o dia de hoje)
    if (isToday && slotStart.getTime() < now.getTime()) {
      currentTimeCursor = new Date(currentTimeCursor.getTime() + SLOT_INTERVAL_MIN * 60000);
      continue;
    }

    // Verificar sobreposição com o horário de almoço
    const overlapsWithBreak =
      hasBreak &&
      breakStart &&
      breakEnd &&
      slotStart.getTime() < breakEnd.getTime() &&
      slotEndIfServiceStartsHere.getTime() > breakStart.getTime();

    if (overlapsWithBreak) {
      // Se o serviço se sobrepor ao almoço, avança o cursor para o fim do almoço
      currentTimeCursor = new Date(breakEnd);
      continue;
    }

    // Verificar sobreposição com agendamentos existentes
    const conflictsWithBooked = booked.some((b) => {
      return slotStart.getTime() < b.end.getTime() && slotEndIfServiceStartsHere.getTime() > b.start.getTime();
    });

    if (!conflictsWithBooked) {
      // Se não houver conflitos, adiciona o slot
      availableSlots.push(
        `${String(slotStart.getHours()).padStart(2, "0")}:${String(
          slotStart.getMinutes()
        ).padStart(2, "0")}`
      );
    }

    // Avança para o próximo intervalo de 15 minutos
    currentTimeCursor = new Date(currentTimeCursor.getTime() + SLOT_INTERVAL_MIN * 60000);
  }

  return availableSlots;
}