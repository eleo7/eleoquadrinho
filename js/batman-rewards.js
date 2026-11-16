(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EQBatmanRewards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RELEASE_DATE = '2026-11-01';
  const SECONDS_PER_UNLOCK = 60;

  // [slug, label, hero, light, dark, sagaKey, roleLabel, mascotId, mascotName]
  const RAW_SETS = [
    ['gothico', 'Bat-Sinal de Gotham', 'Bat-Sinal', '#f2c94c', '#151b29', 'gothico', 'Vigília Noturna · Gárgulas & Bat-Sinal', 'bat_sentinela', 'Bat-Sentinela'],
    ['tatico', 'Armadura Batcaverna', 'Tático Tech', '#38bdf8', '#0e1d30', 'tatico', 'Protocolo Batcomputador · Cinto Tático', 'bat_felino', 'Bat-Felino'],
    ['tumbler', 'Tumbler Blindado', 'Tumbler', '#f87171', '#211319', 'tumbler', 'Caçada em Gotham · Unidade Blindada', 'bat_blindado', 'Bat-Blindado'],
    ['arkham', 'Portões de Arkham', 'Arkham', '#4ade80', '#11241a', 'arkham', 'Asilo Arkham · Névoa Esmeralda', '', ''],
    ['sombra', 'Sombra do Morcego', 'Sombra', '#93c5fd', '#0b1224', 'sombra', 'Cavaleiro das Trevas · Tempestade Noturna', 'bat_estelar', 'Bat-Estelar']
  ];

  const SETS = RAW_SETS.map(([slug, label, hero, light, dark, sagaKey, roleLabel, mascotId, mascotName], index) => ({
    index,
    slug,
    id: 'batman_' + slug,
    label,
    hero,
    light,
    dark,
    accent: light,
    secondary: dark,
    sagaKey,
    roleLabel,
    mascotId: mascotId || null,
    mascotName: mascotName || null,
    release: RELEASE_DATE
  }));

  const SET_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));

  const BATMAN_KEYWORDS = [
    'batman',
    'batcaverna',
    'bat-sinal',
    'batsinal',
    'batmovel',
    'batgirl',
    'batwoman',
    'bruce wayne',
    'cavaleiro das trevas',
    'dark knight',
    'gotham',
    'arkham',
    'asilo arkham',
    'corte das corujas',
    'court of owls',
    'queda do morcego',
    'knightfall',
    'batman: ano um',
    'ano um',
    'longo dia das bruxas',
    'long halloween',
    'piada mortal',
    'killing joke',
    'guerra ao crime',
    'absolute batman',
    'detective comics #27',
    'homem-morcego',
    'coringa',
    'joker',
    'arlequina',
    'harley quinn',
    'mulher-gato',
    'catwoman',
    'asa noturna',
    'nightwing',
    'robin',
    'damian wayne',
    'tim drake',
    'jason todd',
    'dick grayson',
    'alfred pennyworth',
    'comissario gordon',
    'james gordon',
    'duas-caras',
    'charada',
    'pinguim',
    'espantalho',
    'hera venenosa',
    'bane',
    'ra\'s al ghul',
    'bob kane',
    'bill finger'
  ];

  function makeOption(kind, s) {
    return {
      id: s.id,
      label: 'Batman · ' + s.label,
      hero: s.hero,
      light: s.light,
      dark: s.dark,
      accent: s.accent,
      secondary: s.secondary,
      roleLabel: s.roleLabel,
      sagaKey: s.sagaKey,
      event: true,
      epic: true,
      batman: true,
      art: kind === 'avatar',
      release: RELEASE_DATE
    };
  }

  const OPTIONS = {
    frame: SETS.map(s => makeOption('frame', s)),
    avatar: SETS.map(s => makeOption('avatar', s)),
    theme: SETS.map(s => makeOption('theme', s))
  };

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function detectBatmanSet(input) {
    const text = normalizeText(
      typeof input === 'string'
        ? input
        : [
            input && input.id,
            input && input.heroiId,
            input && input.heroiNome,
            input && input.serieNome,
            input && input.titulo,
            input && input.nome,
            input && input.sub,
            input && input.colecao
          ]
            .filter(Boolean)
            .join(' ')
    );
    if (!text) return null;
    if (text.includes('arkham') || text.includes('coringa') || text.includes('joker') || text.includes('arlequina')) return 'batman_arkham';
    if (text.includes('bat-sinal') || text.includes('batsinal') || text.includes('ano um') || text.includes('detective')) return 'batman_gothico';
    if (text.includes('tumbler') || text.includes('queda do morcego') || text.includes('bane') || text.includes('absolute batman')) return 'batman_tumbler';
    if (text.includes('batcaverna') || text.includes('tatico') || text.includes('asa noturna') || text.includes('batgirl') || text.includes('robin')) return 'batman_tatico';
    if (text.includes('cavaleiro das trevas') || text.includes('corte das corujas') || text.includes('sombra') || text.includes('sombras')) return 'batman_sombra';
    if (text.includes('batman')) return 'batman_gothico';
    return null;
  }

  function isBatmanWork(input) {
    if (!input) return false;
    if (typeof input === 'object' && input.batman === true) return true;
    const raw =
      typeof input === 'string'
        ? input
        : [
            input.id,
            input.heroiId,
            input.heroiNome,
            input.serieId,
            input.serieNome,
            input.titulo,
            input.nome,
            input.sub,
            input.resumo,
            input.colecao,
            input.universo,
            Array.isArray(input.tags) ? input.tags.join(' ') : ''
          ]
            .filter(Boolean)
            .join(' ');
    const text = normalizeText(raw);
    if (!text) return false;
    return BATMAN_KEYWORDS.some(keyword => text.includes(normalizeText(keyword)));
  }

  function detectCatalog(items = []) {
    const list = Array.isArray(items) ? items : [];
    const works = [];
    const seen = new Set();
    let cloudCount = 0;
    let localCount = 0;

    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      if (!isBatmanWork(it)) continue;
      const id = it.id || it.readingKey;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      if (it.tipo !== 'heroi') {
        works.push(it);
        const isLocal = Boolean(it.localOnly || (it.tipo === 'local' && !it.storagePath));
        const isCloud = Boolean(it.storagePath || ['ext-hq', 'drive', 'ia', 'riot-hq', 'riot-serie', 'serie-pasta', 'conto'].includes(it.tipo));
        if (isLocal) localCount++;
        else if (isCloud) cloudCount++;
        else localCount++;
      }
    }

    works.sort((a, b) => {
      const na = Number(a.edicaoNum) || 9999;
      const nb = Number(b.edicaoNum) || 9999;
      if (na !== nb) return na - nb;
      return String(a.titulo || a.nome || '').localeCompare(String(b.titulo || b.nome || ''), undefined, { numeric: true });
    });

    return {
      enabled: works.length > 0,
      totalWorks: works.length,
      cloudCount,
      localCount,
      works,
      firstWork: works[0] || null
    };
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
        : [],
      catalogBonusGranted: src.catalogBonusGranted === true
    };
  }

  function hasReward(state, kind, setId) {
    const key = kind + ':' + setId;
    if (state?.eventRewards?.[key] === true) return true;
    if (Array.isArray(state?.unlocked) && state.unlocked.includes(key)) return true;
    return false;
  }

  function isSetComplete(state, setId) {
    return hasReward(state, 'frame', setId) && hasReward(state, 'avatar', setId) && hasReward(state, 'theme', setId);
  }

  function grantSet(state, setId, newlyUnlocked) {
    const set = SET_BY_ID[setId];
    if (!set || !state) return false;
    if (!state.eventRewards || typeof state.eventRewards !== 'object') state.eventRewards = {};
    let added = false;
    for (const kind of ['frame', 'avatar', 'theme']) {
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
    state.batmanProgress = normalize(state.batmanProgress);
    if (!state.batmanProgress.unlockedSets.includes(set.id)) {
      state.batmanProgress.unlockedSets.push(set.id);
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
    state.batmanProgress = normalize(state.batmanProgress);
    for (const s of SETS) {
      if (isSetComplete(state, s.id) && !state.batmanProgress.unlockedSets.includes(s.id)) {
        state.batmanProgress.unlockedSets.push(s.id);
      }
    }

    const newlyUnlocked = [];
    const hasBatmanCatalog = Boolean(payload.hasBatmanCatalog);
    if (hasBatmanCatalog && !state.batmanProgress.catalogBonusGranted) {
      state.batmanProgress.catalogBonusGranted = true;
      const firstId = pickNextSetToUnlock(state, detectBatmanSet(payload.work || payload.id));
      if (firstId) {
        grantSet(state, firstId, newlyUnlocked);
      }
    }

    const id = String(payload.id || '').trim();
    const isBatman = Boolean(payload.batman) || isBatmanWork(payload.work || id);
    if (!isBatman) return newlyUnlocked;

    const seconds = Math.max(0, Math.min(300, Math.floor(Number(payload.seconds) || 0)));
    const progress = Number.isFinite(payload.progress) ? Number(payload.progress) : 0;

    state.batmanProgress.seconds += seconds;

    const preferredSetId = detectBatmanSet(payload.work || id);
    const completedWork = id && progress >= 0.5 && !state.batmanProgress.worksRead.includes(id);
    if (completedWork) {
      state.batmanProgress.worksRead.push(id);
    }

    const bonusOffset = state.batmanProgress.catalogBonusGranted ? 1 : 0;
    const earnedByTime = Math.floor(state.batmanProgress.seconds / SECONDS_PER_UNLOCK);
    const earnedByWorks = state.batmanProgress.worksRead.length;
    const targetCount = Math.min(SETS.length, Math.max(bonusOffset, earnedByTime, earnedByWorks));

    while (state.batmanProgress.unlockedSets.length < targetCount) {
      const nextId = pickNextSetToUnlock(state, preferredSetId);
      if (!nextId) break;
      grantSet(state, nextId, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  function unlockNextForWork(state, workOrId) {
    if (!state || typeof state !== 'object') return [];
    state.batmanProgress = normalize(state.batmanProgress);
    const newlyUnlocked = [];
    const preferredSetId = detectBatmanSet(workOrId);
    const nextId = pickNextSetToUnlock(state, preferredSetId);
    if (nextId) {
      grantSet(state, nextId, newlyUnlocked);
      const workId = typeof workOrId === 'string' ? workOrId : (workOrId && workOrId.id) || '';
      if (workId && !state.batmanProgress.worksRead.includes(workId)) {
        state.batmanProgress.worksRead.push(workId);
      }
      state.batmanProgress.seconds = Math.max(
        state.batmanProgress.seconds,
        state.batmanProgress.unlockedSets.length * SECONDS_PER_UNLOCK
      );
    }
    return newlyUnlocked;
  }

  function status(state, { catalogItems = [] } = {}) {
    const prog = normalize(state && state.batmanProgress);
    const catalog = detectCatalog(catalogItems);
    const sets = SETS.map(s => {
      const hasFrame = hasReward(state, 'frame', s.id);
      const hasAvatar = hasReward(state, 'avatar', s.id);
      const hasTheme = hasReward(state, 'theme', s.id);
      const earnedCount = (hasFrame ? 1 : 0) + (hasAvatar ? 1 : 0) + (hasTheme ? 1 : 0);
      return {
        ...s,
        hasFrame,
        hasAvatar,
        hasTheme,
        earnedCount,
        totalCount: 3,
        complete: earnedCount === 3
      };
    });
    const completedSets = sets.filter(s => s.complete).length;
    const totalSets = SETS.length;
    const remainingSets = Math.max(0, totalSets - completedSets);
    const totalRewards = totalSets * 3;
    const unlockedCount = sets.reduce((sum, s) => sum + s.earnedCount, 0);
    const remainingRewards = Math.max(0, totalRewards - unlockedCount);
    const totalTargetSeconds = totalSets * SECONDS_PER_UNLOCK;
    const effectiveSeconds = Math.min(
      totalTargetSeconds,
      Math.max(prog.seconds, completedSets * SECONDS_PER_UNLOCK)
    );
    const percent = Math.min(100, Math.round((unlockedCount / totalRewards) * 100));
    const totalSecondsRemaining = Math.max(0, totalTargetSeconds - effectiveSeconds);
    const nextSecondsRemaining =
      completedSets >= totalSets
        ? 0
        : Math.max(0, (completedSets + 1) * SECONDS_PER_UNLOCK - effectiveSeconds);
    const currentStepSeconds =
      completedSets >= totalSets
        ? SECONDS_PER_UNLOCK
        : Math.min(SECONDS_PER_UNLOCK, Math.max(0, effectiveSeconds - completedSets * SECONDS_PER_UNLOCK));
    const nextSet = sets.find(s => !s.complete) || null;
    const unlockedMascots = [
      completedSets >= 1 ? 'bat_sentinela' : null,
      completedSets >= 2 ? 'bat_felino' : null,
      completedSets >= 3 ? 'bat_blindado' : null,
      completedSets >= 5 ? 'bat_estelar' : null
    ].filter(Boolean);
    return {
      sets,
      completedSets,
      totalSets,
      remainingSets,
      totalRewards,
      unlockedCount,
      remainingRewards,
      unlockedMascots,
      seconds: prog.seconds,
      effectiveSeconds,
      totalTargetSeconds,
      totalSecondsRemaining,
      percent,
      worksRead: prog.worksRead,
      nextSecondsRemaining,
      currentStepSeconds,
      secondsPerUnlock: SECONDS_PER_UNLOCK,
      catalog,
      nextSet
    };
  }

  return {
    RELEASE_DATE,
    SECONDS_PER_UNLOCK,
    SETS,
    SET_BY_ID,
    BATMAN_KEYWORDS,
    OPTIONS,
    isBatmanWork,
    detectBatmanSet,
    detectCatalog,
    normalize,
    normalizeProgress: normalize,
    advance,
    unlockNextForWork,
    status
  };
});
