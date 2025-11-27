/* ============================================================
    📌 phoneUtils.ts
    Utilidades completas para máscara e normalização de telefone
============================================================ */

/** Mantém apenas números */
export function onlyDigits(value: string): string {
  return value.replace(/\D/g, "");
}
export function extractDbPhoneMasked(dbPhone: string): string {
  return onlyDigits(dbPhone);
}

/** Aplica máscara brasileira: (14) 99655-2177 */
export function maskPhoneFromDigits(digits: string): string {
  const d = digits.slice(0, 11); // Limita a 11 dígitos

  if (d.length === 0) return "";
  if (d.length <= 2) return `(${d}`;
  if (d.length <= 7) return `(${d.slice(0, 2)}) ${d.slice(2)}`;
  return `(${d.slice(0, 2)}) ${d.slice(2, 7)}-${d.slice(7)}`;
}

/** Para usar no input */
export function formatPhoneInput(value: string): string {
  const digits = onlyDigits(value);
  return maskPhoneFromDigits(digits);
}

/** Salvar no banco → 5514996552177 */
export function maskedToDbPhone(masked: string): string | null {
  const digits = onlyDigits(masked);

  if (digits.length !== 11) {
    return null; // inválido
  }

  return `55${digits}`;
}

/** Converter valor do banco → máscara */
export function dbPhoneToMasked(value?: string | null): string {
  if (!value) return "";

  const digits = onlyDigits(value);

  // Padrão 55 + 11 dígitos
  if (digits.startsWith("55") && digits.length >= 13) {
    return maskPhoneFromDigits(digits.slice(2));
  }

  // Se vier sem 55, tenta mascarar assim mesmo
  return maskPhoneFromDigits(digits);
}

/** Checar se o telefone é válido */
export function isValidMaskedPhone(masked: string): boolean {
  const digits = onlyDigits(masked);
  return digits.length === 11; // DDD + 9 dígitos
}
