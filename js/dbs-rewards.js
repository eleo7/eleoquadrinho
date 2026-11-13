(function (root, factory) {
  if (typeof module === 'object' && module.exports) module.exports = factory();
  else root.EQDbsRewards = factory();
})(typeof self !== 'undefined' ? self : this, function () {
  'use strict';

  const RELEASE_DATE = '2026-10-28';
  const SECONDS_PER_UNLOCK = 60;

  // [slug, label, hero, light, dark, sagaKey, roleLabel]
  const RAW_SETS = [
    ['shenlong', 'Shenlong · Esferas do Dragão', 'Shenlong', '#ffc93c', '#193518', 'shenlong', 'Saga das Esferas · Desejo Eterno'],
    ['ssjgod', 'Goku · Deus Super Saiyajin', 'SSJ God', '#ff4d3d', '#380d14', 'ssjgod', 'Batalha dos Deuses · Ritual Divino'],
    ['ssjblue', 'Goku · Super Saiyajin Blue', 'SSJ Blue', '#29e3ff', '#09243d', 'ssjblue', 'Ki Divino · Corporação Cápsula'],
    ['ultrainstinct', 'Goku · Instinto Superior', 'Instinto Superior', '#b8dcff', '#121b38', 'ultrainstinct', 'Presságio Cósmico · Limite Quebrado'],
    ['zeno_mui', 'Torneio do Poder · Zeno & Instinto Completo', 'Zeno & Instinto', '#d98aff', '#23113b', 'zeno', 'Arena do Vazio · Domínio dos Deuses']
  ];

  const SETS = RAW_SETS.map(([slug, label, hero, light, dark, sagaKey, roleLabel], index) => ({
    index,
    slug,
    id: 'dbs_' + slug,
    label,
    hero,
    light,
    dark,
    accent: light,
    secondary: dark,
    sagaKey,
    roleLabel,
    release: RELEASE_DATE
  }));

  const SET_BY_ID = Object.fromEntries(SETS.map(s => [s.id, s]));

  const DBS_KEYWORDS = [
    'dragon ball',
    'dragonball',
    'dragon ball super',
    'dragon ball z',
    'dbs',
    'dbz',
    'shenlong',
    'shenron',
    'esferas do dragao',
    'esfera do dragao',
    'super esferas',
    'saiyajin',
    'super saiyajin',
    'ssj',
    'ssj god',
    'ssj blue',
    'deus super saiyajin',
    'instinto superior',
    'ultra instinct',
    'goku',
    'son goku',
    'kakarotto',
    'kakaroto',
    'vegeta',
    'beerus',
    'bills',
    'whis',
    'freeza',
    'frieza',
    'broly',
    'gohan',
    'piccolo',
    'trunks',
    'goten',
    'bulma',
    'corporacao capsula',
    'capsule corp',
    'zeno',
    'zen-oh',
    'torneio do poder',
    'jiren',
    'goku black',
    'zamasu',
    'vegetto',
    'gogeta',
    'moro',
    'granolah',
    'akira toriyama',
    'toyotaro'
  ];

  function makeOption(kind, s) {
    return {
      id: s.id,
      label: 'Dragon Ball Super · ' + s.label,
      hero: s.hero,
      light: s.light,
      dark: s.dark,
      accent: s.accent,
      secondary: s.secondary,
      roleLabel: s.roleLabel,
      sagaKey: s.sagaKey,
      event: true,
      epic: true,
      dbs: true,
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

  function detectDbsSet(input) {
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
    if (text.includes('shenlong') || text.includes('shenron') || text.includes('esfera')) return 'dbs_shenlong';
    if (text.includes('deus super') || text.includes('batalha dos deuses') || text.includes('beerus') || text.includes('bills') || text.includes('ssjgod')) return 'dbs_ssjgod';
    if (text.includes('blue') || text.includes('capsula') || text.includes('capsule') || text.includes('freeza') || text.includes('broly')) return 'dbs_ssjblue';
    if (text.includes('zeno') || text.includes('torneio do poder') || text.includes('jiren') || text.includes('completo')) return 'dbs_zeno_mui';
    if (text.includes('instinto') || text.includes('ultra instinct') || text.includes('pressagio')) return 'dbs_ultrainstinct';
    return null;
  }

  function isDbsWork(input) {
    if (!input) return false;
    if (typeof input === 'object' && (input.dbs === true || input.dragonBall === true)) return true;
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
    return DBS_KEYWORDS.some(keyword => text.includes(normalizeText(keyword)));
  }

  function detectCatalog(items = []) {
    const list = Array.isArray(items) ? items : [];
    const works = [];
    const seen = new Set();
    let cloudCount = 0;
    let localCount = 0;

    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      if (!isDbsWork(it)) continue;
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
    state.dbsProgress = normalize(state.dbsProgress);
    if (!state.dbsProgress.unlockedSets.includes(set.id)) {
      state.dbsProgress.unlockedSets.push(set.id);
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
    state.dbsProgress = normalize(state.dbsProgress);
    for (const s of SETS) {
      if (isSetComplete(state, s.id) && !state.dbsProgress.unlockedSets.includes(s.id)) {
        state.dbsProgress.unlockedSets.push(s.id);
      }
    }

    const newlyUnlocked = [];
    const hasDbsCatalog = Boolean(payload.hasDbsCatalog);
    if (hasDbsCatalog && !state.dbsProgress.catalogBonusGranted) {
      state.dbsProgress.catalogBonusGranted = true;
      const firstId = pickNextSetToUnlock(state, detectDbsSet(payload.work || payload.id));
      if (firstId) {
        grantSet(state, firstId, newlyUnlocked);
      }
    }

    const id = String(payload.id || '').trim();
    const isDbs = Boolean(payload.dbs) || isDbsWork(payload.work || id);
    if (!isDbs) return newlyUnlocked;

    const seconds = Math.max(0, Math.min(300, Math.floor(Number(payload.seconds) || 0)));
    const progress = Number.isFinite(payload.progress) ? Number(payload.progress) : 0;

    state.dbsProgress.seconds += seconds;

    const preferredSetId = detectDbsSet(payload.work || id);
    const completedWork = id && progress >= 0.5 && !state.dbsProgress.worksRead.includes(id);
    if (completedWork) {
      state.dbsProgress.worksRead.push(id);
    }

    const bonusOffset = state.dbsProgress.catalogBonusGranted ? 1 : 0;
    const earnedByTime = Math.floor(state.dbsProgress.seconds / SECONDS_PER_UNLOCK);
    const earnedByWorks = state.dbsProgress.worksRead.length;
    const targetCount = Math.min(SETS.length, Math.max(bonusOffset, earnedByTime, earnedByWorks));

    while (state.dbsProgress.unlockedSets.length < targetCount) {
      const nextId = pickNextSetToUnlock(state, preferredSetId);
      if (!nextId) break;
      grantSet(state, nextId, newlyUnlocked);
    }

    return newlyUnlocked;
  }

  function unlockNextForWork(state, workOrId) {
    if (!state || typeof state !== 'object') return [];
    state.dbsProgress = normalize(state.dbsProgress);
    const newlyUnlocked = [];
    const preferredSetId = detectDbsSet(workOrId);
    const nextId = pickNextSetToUnlock(state, preferredSetId);
    if (nextId) {
      grantSet(state, nextId, newlyUnlocked);
      const workId = typeof workOrId === 'string' ? workOrId : (workOrId && workOrId.id) || '';
      if (workId && !state.dbsProgress.worksRead.includes(workId)) {
        state.dbsProgress.worksRead.push(workId);
      }
      state.dbsProgress.seconds = Math.max(
        state.dbsProgress.seconds,
        state.dbsProgress.unlockedSets.length * SECONDS_PER_UNLOCK
      );
    }
    return newlyUnlocked;
  }

  function status(state, { catalogItems = [] } = {}) {
    const prog = normalize(state && state.dbsProgress);
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
    return {
      sets,
      completedSets,
      totalSets,
      remainingSets,
      totalRewards,
      unlockedCount,
      remainingRewards,
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
    DBS_KEYWORDS,
    OPTIONS,
    isDbsWork,
    detectDbsSet,
    detectCatalog,
    normalize,
    normalizeProgress: normalize,
    advance,
    unlockNextForWork,
    status
  };
});
