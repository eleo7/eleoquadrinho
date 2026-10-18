/* Cosmetic reading rewards. Stored only in the authenticated reader's preferences. */
(function (root) {
  'use strict';
  const GOALS = [5, 10, 20, 30, 60];
  const MISSIONS = [
    { id: 'first_minutes', title: 'Primeiros capítulos', metric: 'seconds', target: 300, reward: 'avatar:owl', label: 'Avatar Coruja', icon: '🦉' },
    { id: 'first_book', title: 'Uma história completa', metric: 'completed', target: 1, reward: 'frame:bronze', label: 'Moldura Bronze', icon: '🥉' },
    { id: 'half_hour', title: 'Pausa para ler', metric: 'seconds', target: 1800, reward: 'theme:forest', label: 'Tema Floresta', icon: '🌿' },
    { id: 'three_books', title: 'Explorador de histórias', metric: 'completed', target: 3, reward: 'avatar:fox', label: 'Avatar Raposa', icon: '🦊' },
    { id: 'three_days', title: 'Um novo hábito', metric: 'days', target: 3, reward: 'frame:silver', label: 'Moldura Prata', icon: '🥈' },
    { id: 'two_hours', title: 'Viagem entre páginas', metric: 'seconds', target: 7200, reward: 'theme:nebula', label: 'Tema Nebulosa', icon: '🌌' },
    { id: 'ten_books', title: 'Estante de aventuras', metric: 'completed', target: 10, reward: 'frame:gold', label: 'Moldura Ouro', icon: '🥇' },
    { id: 'seven_days', title: 'Leitura na rotina', metric: 'days', target: 7, reward: 'avatar:dragon', label: 'Avatar Dragão', icon: '🐉' },
    { id: 'twenty_five', title: 'Biblioteca de histórias', metric: 'completed', target: 25, reward: 'theme:sunset', label: 'Tema Pôr do sol', icon: '🌅' }
  ];
  const OPTIONS = {
    avatar: [{ id: 'default', label: 'Meu perfil', icon: '👤' }, { id: 'owl', label: 'Coruja', icon: '🦉' }, { id: 'fox', label: 'Raposa', icon: '🦊' }, { id: 'dragon', label: 'Dragão', icon: '🐉' }],
    frame: [{ id: 'default', label: 'Padrão' }, { id: 'bronze', label: 'Bronze' }, { id: 'silver', label: 'Prata' }, { id: 'gold', label: 'Ouro' }],
    theme: [{ id: 'default', label: 'Clássico' }, { id: 'forest', label: 'Floresta' }, { id: 'nebula', label: 'Nebulosa' }, { id: 'sunset', label: 'Pôr do sol' }],
    layout: [{ id: 'comfortable', label: 'Confortável' }, { id: 'compact', label: 'Compacto' }]
  };
  const number = (n, max = 1e9) => Number.isFinite(n) ? Math.min(max, Math.max(0, Math.floor(n))) : 0;
  function normalize(input) {
    const x = input && typeof input === 'object' ? input : {};
    const state = { version: 1, totalSeconds: number(x.totalSeconds), goal: GOALS.includes(x.goal) ? x.goal : 10, goalDays: number(x.goalDays), books: {}, days: {}, appearance: {} };
    for (const [key, value] of Object.entries(x.books || {}).slice(0, 5000)) {
      if (!key.startsWith('work:') || key.length > 240 || !value || typeof value !== 'object') continue;
      state.books[key] = { seconds: number(value.seconds), progress: Math.min(1, Math.max(0, Number(value.progress) || 0)), completed: value.completed === true };
    }
    for (const [day, value] of Object.entries(x.days || {}).sort().slice(-366)) {
      if (!/^\d{4}-\d{2}-\d{2}$/.test(day) || !value || typeof value !== 'object') continue;
      state.days[day] = { seconds: number(value.seconds, 86400), goal: GOALS.includes(value.goal) ? value.goal : state.goal, done: value.done === true };
    }
    for (const [kind, options] of Object.entries(OPTIONS)) state.appearance[kind] = options.some(o => o.id === x.appearance?.[kind]) ? x.appearance[kind] : options[0].id;
    return state;
  }
  function metrics(state) {
    return { seconds: state.totalSeconds, completed: Object.values(state.books).filter(b => b.completed).length, days: state.goalDays };
  }
  function missions(state) {
    const stats = metrics(state);
    return MISSIONS.map(m => ({ ...m, current: Math.min(m.target, stats[m.metric]), unlocked: stats[m.metric] >= m.target }));
  }
  function available(state, kind, id) {
    if (!OPTIONS[kind]?.some(o => o.id === id)) return false;
    return id === 'default' || kind === 'layout' || missions(state).some(m => m.reward === kind + ':' + id && m.unlocked);
  }
  function appearance(state) {
    return Object.fromEntries(Object.entries(OPTIONS).map(([kind, options]) => [kind, available(state, kind, state.appearance[kind]) ? state.appearance[kind] : options[0].id]));
  }
  function dayKey(date = new Date()) {
    return new Intl.DateTimeFormat('en-CA', { timeZone: 'America/Sao_Paulo', year: 'numeric', month: '2-digit', day: '2-digit' }).format(date);
  }
  function finishGoal(state, day) {
    const record = state.days[day];
    if (!record.done && record.seconds >= record.goal * 60) { record.done = true; state.goalDays++; }
  }
  function advance(input, { id, seconds, progress, day }) {
    const state = normalize(input);
    if (typeof id !== 'string' || !id || id.length > 230 || !/^\d{4}-\d{2}-\d{2}$/.test(day)) return state;
    const credit = number(seconds, 20); if (!credit) return state;
    const key = 'work:' + id;
    if (!state.books[key] && Object.keys(state.books).length >= 5000) return state;
    const book = state.books[key] ||= { seconds: 0, progress: 0, completed: false };
    book.seconds += credit; book.progress = Math.max(book.progress, Math.min(1, Math.max(0, Number(progress) || 0)));
    if (book.seconds >= 60 && book.progress >= .95) book.completed = true;
    state.totalSeconds += credit;
    const record = state.days[day] ||= { seconds: 0, goal: state.goal, done: false };
    record.seconds = Math.min(86400, record.seconds + credit); finishGoal(state, day);
    return state;
  }
  function setGoal(input, goal, day) {
    const state = normalize(input);
    if (!GOALS.includes(goal)) return state;
    state.goal = goal;
    if (state.days[day] && !state.days[day].done) { state.days[day].goal = goal; finishGoal(state, day); }
    return state;
  }
  function equip(input, kind, id) {
    const state = normalize(input);
    if (!available(state, kind, id)) throw new Error('Conclua a missão indicada para desbloquear esta recompensa.');
    state.appearance[kind] = id; return state;
  }
  function activeSeconds({ elapsed, visible, focused, reading, idle }) {
    return visible && focused && reading && idle <= 90000 && elapsed > 0 && elapsed <= 20000 ? Math.floor(elapsed / 1000) : 0;
  }
  const api = { GOALS, MISSIONS, OPTIONS, normalize, metrics, missions, available, appearance, dayKey, advance, setGoal, equip, activeSeconds };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.EQReadingRewards = api;
})(globalThis);
