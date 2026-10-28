(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EQNoxusRewards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RELEASE_DATE = '2026-10-28';
  const SECONDS_PER_UNLOCK = 60;

  // [slug, label, accent, secondary, championKey, roleLabel]
  const RAW_SETS = [
    ['darius', 'Darius · Mão de Noxus', '#e5533d', '#381214', 'darius', 'Trifarix · Poder'],
    ['swain', 'Swain · Grande General', '#ff3b30', '#2b0b10', 'swain', 'Trifarix · Visão'],
    ['katarina', 'Katarina · Lâmina Sinistra', '#cfd8e3', '#1c2430', 'katarina', 'Assassina de Noxus'],
    ['leblanc', 'LeBlanc · Rosa Negra', '#f45bff', '#2d1136', 'leblanc', 'Cabal da Rosa Negra'],
    ['draven', 'Draven · Arena da Carnificina', '#ff9436', '#331a10', 'draven', 'Glorioso Carrasco']
  ];

  const SETS = RAW_SETS.map(([slug, label, accent, secondary, championKey, roleLabel], index) => ({
    index,
    slug,
    id: 'noxus_' + slug,
    label,
    accent,
    secondary,
    championKey,
    roleLabel,
    release: RELEASE_DATE
  }));

  const SET_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));

  const NOXUS_CHAMPIONS = [
    'darius',
    'draven',
    'katarina',
    'swain',
    'leblanc',
    'talon',
    'sion',
    'cassiopeia',
    'riven',
    'samira',
    'mordekaiser',
    'vladimir',
    'kled',
    'briar',
    'ambessa',
    'rell',
    'mel',
    'elise',
    'annie',
    'alistar'
  ];

  const NOXUS_KEYWORDS = [
    'noxus',
    'noxiana',
    'noxiano',
    'trifarix',
    'rosa negra',
    'black rose',
    'bastião imortal',
    'bastiao imortal',
    'carnificina',
    'bloodofnoxus',
    ...NOXUS_CHAMPIONS
  ];

  function makeOption(kind, s) {
    return {
      id: s.id,
      label: 'Noxus · ' + s.label,
      accent: s.accent,
      secondary: s.secondary,
      roleLabel: s.roleLabel,
      championKey: s.championKey,
      event: true,
      epic: true,
      noxus: true,
      art: kind === 'avatar',
      release: RELEASE_DATE
    };
  }

  const OPTIONS = {
    avatar: SETS.map(s => makeOption('avatar', s)),
    frame: SETS.map(s => makeOption('frame', s))
  };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function detectNoxusChampion(input) {
    const text = normalizeText(
      typeof input === 'string'
        ? input
        : [
            input && input.id,
            input && input.heroiId,
            input && input.heroiNome,
            input && input.titulo,
            input && input.nome,
            input && input.sub,
            input && input.colecao
          ]
            .filter(Boolean)
            .join(' ')
    );
    if (!text) return null;
    for (const s of SETS) {
      if (text.includes(s.championKey)) return s.id;
    }
    return null;
  }

  function isNoxusWork(input) {
    if (!input) return false;
    if (typeof input === 'object' && input.noxus === true) return true;
    const raw =
      typeof input === 'string'
        ? input
        : [
            input.id,
            input.heroiId,
            input.heroiNome,
            input.titulo,
            input.nome,
            input.sub,
            input.resumo,
            input.colecao,
            input.universo,
            input.regiao,
            Array.isArray(input.campeoes) ? input.campeoes.join(' ') : ''
          ]
            .filter(Boolean)
            .join(' ');
    const text = normalizeText(raw);
    if (!text) return false;
    return NOXUS_KEYWORDS.some(keyword => text.includes(normalizeText(keyword)));
  }

  function normalize(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      seconds: Math.max(0, Math.min(86400 * 365, Math.floor(Number(src.seconds) || 0))),
      worksRead: Array.isArray(src.worksRead)
        ? [...new Set(src.worksRead.filter(x => typeof x === 'string' && x.length <= 240))].slice(0, 500)
        : [],
      unlockedSets: Array.isArray(src.unlockedSets)
        ? [...new Set(src.unlockedSets.filter(id => SET_BY_ID[id]))]
        : []
    };
  }

  function hasReward(state, kind, setId) {
    const key = kind + ':' + setId;
    if (state?.eventRewards?.[key] === true) return true;
    if (Array.isArray(state?.unlocked) && state.unlocked.includes(key)) return true;
    return false;
  }

  function isSetComplete(state, setId) {
    return hasReward(state, 'avatar', setId) && hasReward(state, 'frame', setId);
  }

  function grantSet(state, setId, newlyUnlocked) {
    const set = SET_BY_ID[setId];
    if (!set || !state) return false;
    if (!state.eventRewards || typeof state.eventRewards !== 'object') state.eventRewards = {};
    let added = false;
    for (const kind of ['avatar', 'frame']) {
      const key = kind + ':' + set.id;
      if (state.eventRewards[key] !== true) {
        state.eventRewards[key] = true;
        if (Array.isArray(newlyUnlocked)) newlyUnlocked.push(key);
        added = true;
      }
      if (Array.isArray(state.unlocked) && !state.unlocked.includes(key)) {
        state.unlocked.push(key);
      }
    }
    state.noxusProgress = normalize(state.noxusProgress);
    if (!state.noxusProgress.unlockedSets.includes(set.id)) {
      state.noxusProgress.unlockedSets.push(set.id);
    }
    return added;
  }

  function pickNextSetToUnlock(state, preferredSetId) {
    if (preferredSetId && SET_BY_ID[preferredSetId] && !isSetComplete(state, preferredSetId)) {
      return preferredSetId;
    }
    for (const s of SETS) {
      if (!isSetComplete(state, s.id)) return s.id;
    }
    return null;
  }

  function advance(state, payload = {}) {
    if (!state || typeof state !== 'object') return [];
    state.noxusProgress = normalize(state.noxusProgress);
    for (const s of SETS) {
      if (isSetComplete(state, s.id) && !state.noxusProgress.unlockedSets.includes(s.id)) {
        state.noxusProgress.unlockedSets.push(s.id);
      }
    }

    const id = String(payload.id || '').trim();
    const isNoxus = Boolean(payload.noxus) || isNoxusWork(payload.work || id);
    if (!isNoxus) return [];

    const newlyUnlocked = [];
    const seconds = Math.max(0, Math.min(300, Math.floor(Number(payload.seconds) || 0)));
    const progress = Number.isFinite(payload.progress) ? Number(payload.progress) : 0;

    state.noxusProgress.seconds += seconds;

    const preferredSetId = detectNoxusChampion(payload.work || id);
    const completedWork = id && progress >= 0.5 && !state.noxusProgress.worksRead.includes(id);
    if (completedWork) {
      state.noxusProgress.worksRead.push(id);
    }

    const earnedByTime = Math.floor(state.noxusProgress.seconds / SECONDS_PER_UNLOCK);
    const earnedByWorks = state.noxusProgress.worksRead.length;
    const targetCount = Math.min(SETS.length, Math.max(earnedByTime, earnedByWorks));

    while (state.noxusProgress.unlockedSets.length < targetCount) {
      const nextId = pickNextSetToUnlock(state, preferredSetId);
      if (!nextId) break;
      grantSet(state, nextId, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  function unlockNextForWork(state, workOrId) {
    if (!state || typeof state !== 'object') return [];
    state.noxusProgress = normalize(state.noxusProgress);
    const newlyUnlocked = [];
    const preferredSetId = detectNoxusChampion(workOrId);
    const nextId = pickNextSetToUnlock(state, preferredSetId);
    if (nextId) {
      grantSet(state, nextId, newlyUnlocked);
      const workId = typeof workOrId === 'string' ? workOrId : (workOrId && workOrId.id) || '';
      if (workId && !state.noxusProgress.worksRead.includes(workId)) {
        state.noxusProgress.worksRead.push(workId);
      }
      state.noxusProgress.seconds = Math.max(
        state.noxusProgress.seconds,
        state.noxusProgress.unlockedSets.length * SECONDS_PER_UNLOCK
      );
    }
    return newlyUnlocked;
  }

  function status(state) {
    const prog = normalize(state && state.noxusProgress);
    const sets = SETS.map(s => {
      const hasAvatar = hasReward(state, 'avatar', s.id);
      const hasFrame = hasReward(state, 'frame', s.id);
      return {
        ...s,
        hasAvatar,
        hasFrame,
        complete: hasAvatar && hasFrame
      };
    });
    const completedSets = sets.filter(s => s.complete).length;
    const nextSecondsRemaining =
      completedSets >= SETS.length
        ? 0
        : Math.max(0, (completedSets + 1) * SECONDS_PER_UNLOCK - prog.seconds);
    return {
      sets,
      completedSets,
      totalSets: SETS.length,
      seconds: prog.seconds,
      worksRead: prog.worksRead,
      nextSecondsRemaining,
      secondsPerUnlock: SECONDS_PER_UNLOCK
    };
  }

  return {
    RELEASE_DATE,
    SECONDS_PER_UNLOCK,
    SETS,
    SET_BY_ID,
    NOXUS_CHAMPIONS,
    OPTIONS,
    isNoxusWork,
    detectNoxusChampion,
    normalize,
    normalizeProgress: normalize,
    advance,
    unlockNextForWork,
    status
  };
});
