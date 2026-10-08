/** Loja aberta/fechada a partir dos horários e do fuso da loja. */
import { DAYS } from './schema.js';

const WEEKDAY_INDEX = { Sun: 0, Mon: 1, Tue: 2, Wed: 3, Thu: 4, Fri: 5, Sat: 6 };

const toMinutes = (hhmm) => {
  const [hours, minutes] = hhmm.split(':').map(Number);
  return hours * 60 + minutes;
};

/** Dia da semana (0 = domingo) e minutos desde 00:00 no fuso informado. */
export function zonedNow(timeZone, date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone,
    weekday: 'short',
    hour: '2-digit',
    minute: '2-digit',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => parts.find((part) => part.type === type)?.value;
  return {
    day: WEEKDAY_INDEX[get('weekday')],
    minutes: (Number(get('hour')) % 24) * 60 + Number(get('minute')),
  };
}

/**
 * @returns {{ isOpen: boolean, label: string, detail: string, forced?: boolean }}
 */
export function getStoreStatus(store, date = new Date()) {
  const { settings, hours } = store;

  if (settings.forceStatus === 'open') return { isOpen: true, forced: true, label: 'Aberto agora', detail: '' };
  if (settings.forceStatus === 'closed') {
    return { isOpen: false, forced: true, label: 'Fechado', detail: 'Fechado temporariamente' };
  }

  const { day, minutes } = zonedNow(settings.timeZone, date);
  const today = hours[day];
  const yesterday = hours[(day + 6) % 7];

  // Horário que atravessa a meia-noite (ex.: 18:00–02:00) vindo de ontem.
  if (yesterday?.open) {
    const from = toMinutes(yesterday.from);
    const to = toMinutes(yesterday.to);
    if (to < from && minutes < to) return { isOpen: true, label: 'Aberto agora', detail: `Fecha às ${yesterday.to}` };
  }

  if (today?.open) {
    const from = toMinutes(today.from);
    const to = toMinutes(today.to);
    if (from === to) return { isOpen: true, label: 'Aberto agora', detail: 'Aberto 24 horas' };
    const openNow = from < to ? minutes >= from && minutes < to : minutes >= from;
    if (openNow) return { isOpen: true, label: 'Aberto agora', detail: `Fecha às ${today.to}` };
  }

  for (let offset = 0; offset <= 7; offset += 1) {
    const index = (day + offset) % 7;
    const entry = hours[index];
    if (!entry?.open) continue;
    if (offset === 0 && toMinutes(entry.from) <= minutes) continue;
    const when = offset === 0 ? 'hoje' : offset === 1 ? 'amanhã' : DAYS[index].toLowerCase();
    return { isOpen: false, label: 'Fechado', detail: `Abre ${when} às ${entry.from}` };
  }
  return { isOpen: false, label: 'Fechado', detail: '' };
}
