import { format } from 'date-fns';

/**
 * Converte uma string de data (ISO, 'YYYY-MM-DD', 'YYYY-MM-DDT00:00:00.000Z', etc)
 * para um objeto Date no fuso horário LOCAL do usuário sem risco de recuar para
 * o dia anterior em fusos negativos (ex: UTC-3 Brasil).
 */
export function parseEventDate(dateStr?: string | null): Date {
  if (!dateStr) return new Date();

  // Se for apenas 'YYYY-MM-DD' (10 caracteres) ou terminar em T00:00:00.000Z / T00:00:00Z / T00:00:00
  // interpretamos o ano, mês e dia no fuso horário LOCAL na hora 00:00:00
  if (
    /^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
    /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(dateStr)
  ) {
    const [y, m, d] = dateStr.slice(0, 10).split('-').map(Number);
    return new Date(y, m - 1, d, 0, 0, 0, 0);
  }

  // Para outros formatos com horário preenchido (ex: reuniões, aulas com hora), usamos parse nativo
  const parsed = new Date(dateStr);
  if (isNaN(parsed.getTime())) return new Date();
  return parsed;
}

/**
 * Retorna a string do dia ('YYYY-MM-DD') no fuso local sem recuar o dia anterior.
 */
export function getEventDayStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  if (
    dateStr.length >= 10 &&
    (/^\d{4}-\d{2}-\d{2}$/.test(dateStr) ||
     /^\d{4}-\d{2}-\d{2}T00:00:00(\.000)?Z?$/.test(dateStr))
  ) {
    return dateStr.slice(0, 10);
  }
  const d = parseEventDate(dateStr);
  return format(d, 'yyyy-MM-dd');
}

/**
 * Retorna o horário formatado HH:mm no fuso local de forma segura.
 */
export function getEventTimeStr(dateStr?: string | null): string {
  if (!dateStr) return '';
  const d = parseEventDate(dateStr);
  return format(d, 'HH:mm');
}
