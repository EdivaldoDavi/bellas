// src/utils/currencyUtils.ts

/**
 * Converte um valor em centavos para uma string formatada em BRL (R$ X.XXX,XX).
 * @param cents Valor em centavos (ex: 12345 para R$ 123,45).
 * @returns String formatada (ex: "R$ 123,45").
 */
export function formatCentsToBRL(cents: number | null | undefined): string {
  if (typeof cents !== 'number' || isNaN(cents)) {
    return "R$ 0,00";
  }
  const reais = cents / 100;
  return new Intl.NumberFormat('pt-BR', {
    style: 'currency',
    currency: 'BRL',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(reais);
}

/**
 * Converte uma string formatada em BRL (R$ X.XXX,XX) para um valor em centavos.
 * @param formattedValue String formatada (ex: "R$ 123,45").
 * @returns Valor em centavos (ex: 12345).
 */
export function parseBRLToCents(formattedValue: string): number {
  if (!formattedValue) return 0;

  // Remove "R$", espaços, pontos de milhar e substitui vírgula por ponto
  const cleaned = formattedValue
    .replace(/[R$ ]/g, '')
    .replace(/\./g, '')
    .replace(/,/g, '.');

  const floatValue = parseFloat(cleaned);
  if (isNaN(floatValue)) return 0;

  // Multiplica por 100 e arredonda para evitar problemas de ponto flutuante
  return Math.round(floatValue * 100);
}

/**
 * Formata o valor do input de preço enquanto o usuário digita.
 * Este formatador funciona no modo "cents-first", onde cada dígito digitado
 * é adicionado à direita, e a vírgula e o "R$" são inseridos automaticamente.
 * Ex: "" -> "R$ 0,00"
 *     "1" -> "R$ 0,01"
 *     "12" -> "R$ 0,12"
 *     "123" -> "R$ 1,23"
 *     "12345" -> "R$ 123,45"
 *
 * @param inputValue O valor atual do input (string).
 * @returns O valor formatado para exibição no input.
 */
export function formatPriceInput(inputValue: string): string {
  // 1. Remove tudo que não for dígito
  let digits = inputValue.replace(/\D/g, '');

  // 2. Se não houver dígitos, retorna "R$ 0,00"
  if (digits.length === 0) {
    return "R$ 0,00";
  }

  // 3. Garante que haja pelo menos 3 dígitos para representar centavos (ex: "5" -> "005")
  while (digits.length < 3) {
    digits = '0' + digits;
  }

  // 4. Divide a string em parte inteira e parte decimal
  let integerPart = digits.slice(0, -2);
  const decimalPart = digits.slice(-2);

  // 5. Remove zeros à esquerda da parte inteira, exceto se a parte inteira for "0"
  integerPart = integerPart.replace(/^0+/, '');
  if (integerPart === '') { // Se após remover zeros à esquerda, a parte inteira ficar vazia, define como "0"
    integerPart = '0';
  }

  // 6. Adiciona pontos de milhar na parte inteira
  const formattedInteger = integerPart.replace(/\B(?=(\d{3})+(?!\d))/g, '.');

  // 7. Constrói a string final no formato "R$ X.XXX,XX"
  return `R$ ${formattedInteger},${decimalPart}`;
}