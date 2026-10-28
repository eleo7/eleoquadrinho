(function (root) {
  'use strict';

  const RELEASE_DATE = '2026-10-28';
  const V1_SECONDS_PER_REWARD = 60;

  const SETS = [
    ['liono', 'Lion-O', '#ffc247', '#40121b'],
    ['tygra', 'Tygra', '#54cbff', '#172c36'],
    ['cheetara', 'Cheetara', '#ffe281', '#412b16'],
    ['panthro', 'Panthro', '#89baff', '#182036'],
    ['mummra', 'Mumm-Ra', '#b6ff87', '#291839']
  ].map(([id, label, light, dark], index) => ({
    id: 'thunder_' + id,
    slug: id,
    label,
    light,
    dark,
    index
  }));

  const OPTIONS = Object.fromEntries(
    ['frame', 'avatar', 'theme'].map(kind => [
      kind,
      SETS.map(s => ({
        id: s.id,
        label: 'ThunderCats · ' + s.label,
        event: true,
        epic: true,
        thunder: true,
        art: kind === 'avatar',
        release: RELEASE_DATE
      }))
    ])
  );

  const THUNDER_KEYWORDS = [
    'thundercats',
    'thunder cats',
    'thundercat',
    'lion-o',
    'liono',
    'tygra',
    'cheetara',
    'panthro',
    'mumm-ra',
    'mummra',
    'terceira terra',
    'third earth',
    'olho de thundera',
    'espada justiceira'
  ];

  function normalizeText(value) {
    return String(value || '')
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '')
      .toLowerCase();
  }

  function isThunderWork(input) {
    if (!input) return false;
    if (typeof input === 'object' && (input.thunder === true || input.thunderV1 === true)) return true;
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
            input.universo
          ]
            .filter(Boolean)
            .join(' ');
    const text = normalizeText(raw);
    if (!text) return false;
    return THUNDER_KEYWORDS.some(k => text.includes(normalizeText(k)));
  }

  function isThunderV1Work(input) {
    if (!isThunderWork(input)) return false;
    if (typeof input === 'object' && input.thunderV1 === true) return true;
    const raw =
      typeof input === 'string'
        ? input
        : [
            input.id,
            input.serieNome,
            input.titulo,
            input.nome,
            input.sub,
            input.resumo,
            input.colecao
          ]
            .filter(Boolean)
            .join(' ');
    const text = normalizeText(raw);
    // All ThunderCats HQs/series (especially V1 / Vol 1 / Edition #1+) qualify when associated
    return Boolean(text);
  }

  function detectCatalog(items = []) {
    const list = Array.isArray(items) ? items : [];
    const works = [];
    const seen = new Set();
    let cloudCount = 0;
    let localCount = 0;
    let hasExplicitV1 = false;

    for (const it of list) {
      if (!it || typeof it !== 'object') continue;
      if (!isThunderV1Work(it)) continue;
      const id = it.id || it.readingKey;
      if (!id || seen.has(id)) continue;
      seen.add(id);

      const rawText = normalizeText([it.titulo, it.nome, it.serieNome, it.sub, it.id].filter(Boolean).join(' '));
      if (/\bv\s*1\b|\bvol(?:ume|\.)?\s*0*1\b|#0*1\b|edicao\s*0*1/i.test(rawText)) {
        hasExplicitV1 = true;
      }

      if (it.tipo !== 'heroi') {
        works.push(it);
        const isLocal = Boolean(it.localOnly || (it.tipo === 'local' && !it.storagePath));
        const isCloud = Boolean(it.storagePath || ['ext-hq', 'drive', 'ia', 'riot-hq', 'riot-serie', 'serie-pasta'].includes(it.tipo));
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
      hasExplicitV1,
      totalWorks: works.length,
      cloudCount,
      localCount,
      works,
      firstWork: works[0] || null
    };
  }

  function normalize(input) {
    const out = {};
    for (const kind of ['daily', 'weekly']) {
      const v = input?.[kind];
      if (v && typeof v.key === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(v.key) && Number.isFinite(Date.parse(v.key))) {
        out[kind] = { key: v.key, reward: typeof v.reward === 'string' ? v.reward : '' };
      }
    }
    return out;
  }

  function normalizeProgress(raw) {
    const src = raw && typeof raw === 'object' ? raw : {};
    return {
      v1Seconds: Math.max(0, Math.min(86400 * 365, Math.floor(Number(src.v1Seconds) || 0))),
      v1WorksRead: Array.isArray(src.v1WorksRead)
        ? [...new Set(src.v1WorksRead.filter(x => typeof x === 'string' && x.length <= 240))].slice(0, 500)
        : [],
      v1UnlockedRewards: Array.isArray(src.v1UnlockedRewards)
        ? [...new Set(src.v1UnlockedRewards.filter(x => typeof x === 'string' && x.length <= 80))].slice(0, 60)
        : [],
      v1CatalogBonusGranted: src.v1CatalogBonusGranted === true
    };
  }

  function allRewardKeys() {
    // Ordered by set so unlocking via ThunderCats V1 completes each hero's Frame -> Avatar -> Theme
    const keys = [];
    for (const s of SETS) {
      for (const kind of ['frame', 'avatar', 'theme']) {
        keys.push(kind + ':' + s.id);
      }
    }
    return keys;
  }

  function getLockedPool(state) {
    const eventRewards = state?.eventRewards || {};
    return allRewardKeys().filter(id => !eventRewards[id]);
  }

  function grantNextReward(state, seed = '') {
    if (!state.eventRewards || typeof state.eventRewards !== 'object') state.eventRewards = {};
    const pool = getLockedPool(state);
    if (!pool.length) return '';
    if (!seed) {
      const reward = pool[0];
      state.eventRewards[reward] = true;
      return reward;
    }
    let hash = 2166136261;
    for (const c of seed) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
    const reward = pool[hash % pool.length];
    state.eventRewards[reward] = true;
    return reward;
  }

  function draw(state, { day, week, seed = '' }) {
    if (day < RELEASE_DATE) return;
    for (const [kind, key, seconds, target] of [
      ['daily', day, state.days[day]?.seconds || 0, 600],
      [
        'weekly',
        week,
        Object.entries(state.days)
          .filter(([d]) => d >= week && d <= day && d >= RELEASE_DATE)
          .reduce((n, [, v]) => n + v.seconds, 0),
        3600
      ]
    ]) {
      if (seconds < target || state.thunderDraws[kind]?.key === key) continue;
      const pool = Object.entries(OPTIONS)
        .flatMap(([k, items]) => items.map(o => k + ':' + o.id))
        .filter(id => !state.eventRewards[id]);
      let hash = 2166136261;
      for (const c of seed + kind + key) hash = Math.imul(hash ^ c.charCodeAt(0), 16777619) >>> 0;
      const reward = pool.length ? pool[hash % pool.length] : '';
      state.thunderDraws[kind] = { key, reward };
      if (reward) state.eventRewards[reward] = true;
    }
  }

  function advanceV1(state, payload = {}) {
    if (!state || typeof state !== 'object') return [];
    state.thunderProgress = normalizeProgress(state.thunderProgress);
    const id = String(payload.id || '').trim();
    const isThunder = Boolean(payload.thunderV1) || isThunderV1Work(payload.work || id);
    const hasV1Catalog = Boolean(payload.hasV1Catalog);

    const newlyUnlocked = [];

    // If user has HQs ThunderCats V1 enabled in cloud or locally, grant initial collection bonus (1st reward) once
    if (hasV1Catalog && !state.thunderProgress.v1CatalogBonusGranted) {
      state.thunderProgress.v1CatalogBonusGranted = true;
      const reward = grantNextReward(state);
      if (reward) {
        state.thunderProgress.v1UnlockedRewards.push(reward);
        newlyUnlocked.push(reward);
      }
    }

    if (!isThunder) return newlyUnlocked;

    const seconds = Math.max(0, Math.min(300, Math.floor(Number(payload.seconds) || 0)));
    const progress = Number.isFinite(payload.progress) ? Number(payload.progress) : 0;

    state.thunderProgress.v1Seconds += seconds;

    if (id && progress >= 0.5 && !state.thunderProgress.v1WorksRead.includes(id)) {
      state.thunderProgress.v1WorksRead.push(id);
    }

    const bonusOffset = state.thunderProgress.v1CatalogBonusGranted ? 1 : 0;
    const earnedByTime = Math.floor(state.thunderProgress.v1Seconds / V1_SECONDS_PER_REWARD);
    // Each completed ThunderCats V1 edition unlocks 3 rewards (1 full character set: frame + avatar + theme)
    const earnedByWorks = state.thunderProgress.v1WorksRead.length * 3;
    const targetV1Rewards = Math.min(15, bonusOffset + Math.max(earnedByTime, earnedByWorks));

    while (state.thunderProgress.v1UnlockedRewards.length < targetV1Rewards) {
      const reward = grantNextReward(state);
      if (!reward) break;
      state.thunderProgress.v1UnlockedRewards.push(reward);
      newlyUnlocked.push(reward);
    }

    return newlyUnlocked;
  }

  function status(state, { day = RELEASE_DATE, week = '2026-10-26', catalogItems = [] } = {}) {
    const eventRewards = state?.eventRewards || {};
    const prog = normalizeProgress(state?.thunderProgress);
    const catalog = detectCatalog(catalogItems);

    const sets = SETS.map(s => {
      const hasFrame = eventRewards['frame:' + s.id] === true;
      const hasAvatar = eventRewards['avatar:' + s.id] === true;
      const hasTheme = eventRewards['theme:' + s.id] === true;
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

    const totalRewards = SETS.length * 3; // 15
    const unlockedCount = sets.reduce((sum, s) => sum + s.earnedCount, 0);
    const remainingRewards = Math.max(0, totalRewards - unlockedCount);
    const completedSets = sets.filter(s => s.complete).length;
    const remainingSets = Math.max(0, SETS.length - completedSets);
    const percent = Math.min(100, Math.round((unlockedCount / totalRewards) * 100));

    const dailySeconds = Math.min(600, Math.max(0, Number(state?.days?.[day]?.seconds) || 0));
    const dailyRemainingSeconds = Math.max(0, 600 - dailySeconds);
    const dailyDone = state?.thunderDraws?.daily?.key === day || dailySeconds >= 600;

    const weeklySeconds = Math.min(
      3600,
      Math.max(
        0,
        Object.entries(state?.days || {})
          .filter(([d]) => d >= week && d >= RELEASE_DATE)
          .reduce((n, [, v]) => n + (Number(v?.seconds) || 0), 0)
      )
    );
    const weeklyRemainingSeconds = Math.max(0, 3600 - weeklySeconds);
    const weeklyDone = state?.thunderDraws?.weekly?.key === week || weeklySeconds >= 3600;

    const v1StepSeconds = prog.v1Seconds % V1_SECONDS_PER_REWARD;
    const v1NextSecondsRemaining = remainingRewards === 0 ? 0 : V1_SECONDS_PER_REWARD - v1StepSeconds;
    const nextSet = sets.find(s => !s.complete) || null;

    return {
      sets,
      totalRewards,
      unlockedCount,
      remainingRewards,
      completedSets,
      totalSets: SETS.length,
      remainingSets,
      percent,
      dailySeconds,
      dailyTargetSeconds: 600,
      dailyRemainingSeconds,
      dailyDone,
      weeklySeconds,
      weeklyTargetSeconds: 3600,
      weeklyRemainingSeconds,
      weeklyDone,
      v1Seconds: prog.v1Seconds,
      v1WorksRead: prog.v1WorksRead,
      v1UnlockedCount: prog.v1UnlockedRewards.length,
      v1StepSeconds: remainingRewards === 0 ? V1_SECONDS_PER_REWARD : v1StepSeconds,
      v1SecondsPerReward: V1_SECONDS_PER_REWARD,
      v1NextSecondsRemaining,
      catalog,
      nextSet
    };
  }

  const api = {
    RELEASE_DATE,
    V1_SECONDS_PER_REWARD,
    SETS,
    OPTIONS,
    isThunderWork,
    isThunderV1Work,
    detectCatalog,
    normalize,
    normalizeProgress,
    draw,
    advanceV1,
    status
  };

  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.EQThunderRewards = api;
})(globalThis);
