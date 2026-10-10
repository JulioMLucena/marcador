const pad = (n: number) => String(n).padStart(2, '0');

export const dayKey = (d: Date) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;

export const addDays = (d: Date, n: number) => {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
};

export const parseDay = (k: string) => {
  const [y, m, d] = k.split('-').map(Number);
  return new Date(y, m - 1, d);
};

/** Segunda-feira da semana de `d`, como chave de dia. */
export const weekKey = (d: Date) => dayKey(addDays(d, -((d.getDay() + 6) % 7)));

export const daysBetween = (a: Date, b: Date) =>
  Math.round((new Date(b.toDateString()).getTime() - new Date(a.toDateString()).getTime()) / 864e5);

export const DOW = ['dom', 'seg', 'ter', 'qua', 'qui', 'sex', 'sáb'];
export const MONTHS = [
  'janeiro', 'fevereiro', 'março', 'abril', 'maio', 'junho',
  'julho', 'agosto', 'setembro', 'outubro', 'novembro', 'dezembro',
];

export const fmtClock = (s: number) => `${pad(Math.floor(s / 60))}:${pad(s % 60)}`;
export const fmtTime = (h: number, m: number) => `${pad(h)}:${pad(m)}`;
export const fmtMinutes = (m: number) => {
  const r = Math.round(m);
  return r >= 60 ? `${Math.floor(r / 60)}h${pad(r % 60)}` : `${r} min`;
};

export const longDate = (d: Date) =>
  `${['domingo', 'segunda', 'terça', 'quarta', 'quinta', 'sexta', 'sábado'][d.getDay()]}, ${d.getDate()} de ${MONTHS[d.getMonth()]}`;

export const uid = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
