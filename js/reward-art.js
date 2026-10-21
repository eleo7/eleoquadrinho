/* Original vector cosmetics: crisp previews and the same artwork on equipped avatars. */
(function(root) {
  'use strict';
  let sequence=0;
  const Seasons=root.EQRewardSeasons;
  const palettes={
    default:['#8492a6','#d9e3f0','metal'],bronze:['#a65b32','#f4c598','metal'],silver:['#7a92b0','#eff8ff','metal'],
    steel:['#1473bd','#9aeaff','metal'],verdant:['#277b24','#b1f86b','leaf'],ice:['#168dcc','#beffff','ice'],gold:['#bd6b09','#ffe582','crown'],
    arcana:['#7d19c6','#eeb2ff','star'],flames:['#d33509','#ffcf33','flame'],skull:['#7f1524','#c0cbd3','skull'],cosmic:['#5135bc','#ffca63','orbit'],
    crimson:['#8c071d','#ff5471','spike'],gear:['#256a76','#a8e6eb','gear'],sheriff:['#a75609','#ffcf79','badge'],outlaw:['#572261','#dc85de','badge'],
    jade:['#078453','#9cfbc7','leaf'],cyborg:['#165bb5','#88dbff','circuit'],gamer:['#631adb','#35f6ed','circuit'],western:['#553225','#d6b38a','wood'],
    ruby:['#9b1737','#ffc07e','gem'],treasure:['#ae720a','#fff39a','treasure'],royal:['#25357c','#bfcaff','crown'],dragon_frame:['#a42712','#ffd18c','dragon'],
    pop:['#c07808','#ffe27a','dots'],neon:['#4a129a','#2fe6ff','neon'],golden:['#a86c12','#ffe08a','deco'],onyx:['#0c0e14','#ffcf6b','diamond'],
    aurora:['#12607f','#7dffc4','aurora'],inferno:['#8f0d08','#ff9f2e','blaze'],ocean:['#0a3b6b','#8ffcff','wave'],pixel:['#0c6b57','#5cff9d','blocks']
  };
  for(const set of Seasons.SETS) {
    palettes['hero_'+set.id]=[set.dark,set.light,set.motif];
    palettes['event_'+set.id]=[set.dark,'#ffe399',set.motif];
  }
  const symbols={
    bolt:'<path d="M60 8 24 56h24L36 92l42-53H54Z"/><path d="m60 8-8 34h19L43 77l9-29H33Z" fill="#fff4bb"/>',
    bat:'<path d="M9 27q13 12 23 10l10-15 4 14h8l4-14 10 15q10 2 23-10l-8 31q-13-7-21 5L50 83 38 63Q25 51 17 58Z"/><path d="m45 44 5 3 5-3" fill="none" stroke="#fff" stroke-width="2"/>',
    web:'<path d="M50 12v76M12 50h76M23 23l54 54m0-54L23 77" fill="none" stroke="currentColor" stroke-width="3"/><path d="M24 24q26 8 52 0-8 26 0 52-26-8-52 0 8-26 0-52Z M36 36q14 4 28 0-4 14 0 28-14-4-28 0 4-14 0-28Z" fill="none" stroke="currentColor" stroke-width="2"/><path d="m31 43 15 8-8 12-10-9Zm38 0-15 8 8 12 10-9Z" fill="white"/>',
    shield:'<path d="M50 10 82 23v28Q79 77 50 91 21 77 18 51V23Z"/><path d="m50 25 6 15 17 1-13 11 4 17-14-9-14 9 4-17-13-11 17-1Z" fill="#fff4d1"/>',
    reactor:'<circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" stroke-width="7"/><path d="m21 29 58 0-29 49Z"/><path d="m35 38 30 0-15 27Z" fill="#e7ffff"/><path d="M50 8v10m0 64v10M8 50h10m64 0h10" stroke="currentColor" stroke-width="4"/>',
    fist:'<path d="M22 48V29q5-11 13-2v-8q7-9 14 0 8-10 15 0 10-6 15 5v39L60 84H36L17 64 12 47q4-8 10 1Z"/><path d="M35 27v26m14-34v31m15-31v32M22 48l18 6 7 16" fill="none" stroke="#173b16" stroke-width="4"/>',
    hammer:'<path d="m18 19 54-6 15 12-2 27-52 8-16-11Z"/><path d="m48 55 15-2-7 35-13 3Z" fill="#e9bd78"/><path d="m23 27 55-7-1 22-48 8Z" fill="#e4f6ff"/><path d="m17 65 12-4-5 14 13-5-19 23 4-16-12 3Z"/>',
    panther:'<path d="m18 17 23 11h18l23-11-7 29 3 23-28 23-28-23 3-23Z"/><path d="m31 45 15 8-15 6Zm38 0-15 8 15 6Z" fill="#fff"/><path d="m42 69 8 9 8-9M50 29v25" fill="none" stroke="#eee0ff" stroke-width="3"/>',
    eye:'<circle cx="50" cy="50" r="35" fill="none" stroke="currentColor" stroke-width="3"/><path d="m50 9 35 61H15Z" fill="none" stroke="currentColor" stroke-width="3"/><path d="M13 50q37-40 74 0-37 40-74 0Z"/><circle cx="50" cy="50" r="14" fill="#153b29"/><circle cx="50" cy="50" r="7" fill="#a9ff93"/>',
    sun:'<path d="m50 3 8 20 20-13-3 24 23 8-22 13 11 22-25-3-12 23-12-23-25 3 11-22L2 42l23-8-3-24 20 13Z"/><circle cx="50" cy="49" r="23" fill="#ffeab0"/><path d="m50 29 14 20-14 20-14-20Z" fill="#e8a01b"/>',
    spiral:'<path d="M77 67C46 98 12 70 24 38 34 10 79 18 78 48c-1 25-37 28-39 5-1-13 18-18 22-6" fill="none" stroke="currentColor" stroke-width="9" stroke-linecap="round"/><path d="m21 69-10 19 23-8" fill="none" stroke="currentColor" stroke-width="5"/>',
    starball:'<circle cx="50" cy="50" r="34"/><path d="m50 23 7 17 19 1-15 12 5 19-16-11-16 11 5-19-15-12 19-1Z" fill="#dc3f24"/><path d="M25 40q4-15 18-18" fill="none" stroke="#fff7cd" stroke-width="5" stroke-linecap="round"/>'
  };
  function heroAvatar(set, exclusive) {
    const uid='eq-hero-'+(++sequence),color=exclusive?'#ffdf83':set.light;
    return `<svg class="reward-avatar-art hero-emblem" viewBox="0 0 100 100" aria-hidden="true"><defs><radialGradient id="${uid}"><stop stop-color="${set.dark}"/><stop offset="1" stop-color="#08090e"/></radialGradient></defs><rect width="100" height="100" rx="22" fill="url(#${uid})"/><circle cx="50" cy="50" r="45" fill="none" stroke="${color}" stroke-width="${exclusive?3:1}"/><g fill="${color}" style="color:${color}" stroke="${set.dark}" stroke-width="1.5">${symbols[set.symbol]}</g>${exclusive?'<path d="m50 2 3 5-3 5-3-5ZM8 46l4 4-4 4-4-4Zm84 0 4 4-4 4-4-4Z" fill="#fff0ba"/>':''}</svg>`;
  }
  function epicFrame(option) {
    const set=EQEpicRewards.STYLES.find(s=>s.id===option.style),uid='epic-'+(++sequence),light=option.monthly?['#ffe4a0','#ff8fbb','#a4f9ff','#bbadff','#ffa96e','#a8ffbe','#f9f39b','#97bfff','#ffb5eb','#c9fbf5','#ff8b75','#e3c9ff'][Number(option.id.split('_')[1])-1]:set.light,dark=set.dark;
    const heads={
      titan:'<path d="m40 17-10-9 5 20 10 7h30l10-7 5-20-10 9-7-5H47Z"/><path d="m44 24 9 4-4 6-7-4m34-6-9 4 4 6 7-4" fill="#c4ff53"/><path d="m49 37 11 7 11-7-3 11H52Z" fill="#112407"/><path d="m53 39 2 6 3-5 4 5 3-6" fill="white"/>',
      storm:'<path d="m25 12 25 5 10-8 10 8 25-5-14 18H39Z"/><circle cx="60" cy="23" r="12"/><path d="m63 12-12 13h9l-4 12 14-18h-10Z" fill="#fff6a4"/>',
      reaper:'<path d="M38 32 44 12 60 3 76 12 82 32 70 43H50Z"/><path d="m48 20 12-8 12 8-2 17-10 8-10-8Z" fill="#c1ebff"/><path d="m50 24 8 3-3 6-5-3m20-6-8 3 3 6 5-3m-9 8-4 5h7" fill="#092340"/><path d="M55 37v5m5-5v6m5-6v5" stroke="#092340"/>',
      reactor:'<path d="M30 12h18l5 8h14l5-8h18l8 14-17 9-7-7H46l-7 7-17-9Z"/><path d="m52 18 16 0-8 15Z" fill="#a0ffff"/>',
      guardian:'<path d="M10 50Q-4 3 35 16l25 4 25-4q39-13 25 34l-9 44-9 15 3-65-23-12H48L25 44l3 65-9-15Z" fill="#9d172e"/><path d="m60 8 16 7-2 20-14 10-14-10-2-20Z"/><path d="m60 14 10 5-2 12-8 7Z" fill="#72d8ff"/>'
    };
    const decorations={
      titan:'<path d="M20 22 10 30 17 43 8 53 16 67 9 82 24 104m76-82 10 8-7 13 9 10-8 14 7 15-15 22" fill="none" stroke="#a2ee5c" stroke-width="3"/><path d="m5 42 10-5-2 12Zm109 28-10 5 2-12ZM22 96l8-7 6 12-10 6Z"/>',
      storm:'<path d="m24 23-10 15 9-3-12 25 9-2-4 25 14 18m66-78 10 15-9-3 12 25-9-2 4 25-14 18" fill="none" stroke="#fff395" stroke-width="2.5"/>',
      reaper:'<path d="M17 100 29 60l-3 35 21 14-19-5Zm86 0L91 60l3 35-21 14 19-5Z" fill="#b3efff"/><path d="m19 48 7-5-6 12 8-4m64-8 7 5-8 3 6 4" stroke="#8ce9ff" fill="none"/>',
      reactor:'<circle cx="60" cy="104" r="12" fill="#12355e"/><circle cx="60" cy="104" r="8" fill="#65eaff"/><circle cx="60" cy="104" r="4" fill="white"/><path d="M18 35h8v16h-8m84-16h-8v16h8M18 70h8v16h-8m84-16h-8v16h8" fill="#edb34b"/>',
      guardian:'<path d="m25 33 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Zm70 0 3 5 6 1-5 4 1 6-5-3-5 3 1-6-5-4 6-1Z" fill="#ffecb0"/><path d="m44 101 16 12 16-12-4-9H48Z" fill="#245ca3"/>'
    };
    return `<svg class="reward-frame-art epic-frame" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${uid}" x2=".8" y2="1"><stop stop-color="${light}"/><stop offset=".2" stop-color="${dark}"/><stop offset=".45" stop-color="${light}"/><stop offset=".65" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><g fill="url(#${uid})" stroke="#09111d" stroke-width="1.7"><path d="M25 17h70l12 13v64l-14 16H27L13 94V30Zm6 12-8 8v51l10 12h54l10-12V37l-8-8Z" fill-rule="evenodd"/><path d="M30 28h60l9 10v51l-12 13H33L21 89V38Z" fill="none" stroke="${light}" stroke-width="2"/>${heads[set.id]}${decorations[set.id]}${option.monthly?'<path d="m38 105 8-7 7 8 7-13 7 13 7-8 8 7-6 10H44Z" fill="#ffda76"/>':''}</g></svg>`;
  }

  function frame(id) {
    const epic=EQEpicRewards.OPTIONS.find(o=>o.id===id);if(epic)return epicFrame(epic);
    const [dark,light,motif]=palettes[id]||palettes.default, uid='eq-frame-'+(++sequence);
    const ornaments={
      metal:'<path d="M12 5 26 10 22 23 9 25 5 12Z"/><path d="m10 11 8-1 3 7-9 4Z" fill="#102132"/><circle cx="14" cy="14" r="2" fill="white"/>',
      leaf:'<path d="M9 29C-1 13 3 4 16 6c-4 11-4 16-7 23ZM11 27C30 22 32 9 25 4c-1 9-9 16-14 23Z"/><path d="M8 29 19 9" fill="none"/>',
      ice:'<path d="m4 4 16 9 12-8-4 18 7 8-17-4-9 7 2-17Z"/><path d="M4 4 20 21 32 5M9 34 20 21 35 31" fill="none" stroke="white"/>',
      crown:'<path d="m4 8 9 7L19 2l6 13 10-7-4 20H8Z"/><path d="M9 23h21" stroke="white"/><circle cx="19" cy="17" r="3" fill="#cf3d48"/>',
      star:'<path d="m17 0 5 12 13 5-13 5-5 13-5-13L0 17l12-5Z"/><circle cx="17" cy="17" r="5" fill="#180d34"/>',
      flame:'<path d="M16 0c9 13-2 15 8 19l4-9c16 22-3 30-14 24C-2 25 8 18 9 10l5 8C18 12 12 7 16 0Z"/><path d="M17 18c8 8 6 15-1 15s-6-8 1-15" fill="#fff39b"/>',
      skull:'<path d="m3 8 8-6h14l8 6-3 17-7 3v6H12v-6L5 25Z"/><path d="m9 12 7 2-2 7-6-2Zm17 0-7 2 2 7 6-2Z" fill="#1a0a11"/><path d="m18 21-3 5h6Z" fill="#1a0a11"/>',
      orbit:'<ellipse cx="17" cy="17" rx="18" ry="7" transform="rotate(-35 17 17)" fill="none"/><circle cx="17" cy="17" r="10"/><circle cx="23" cy="12" r="3" fill="#fff1a4"/>',
      spike:'<path d="M2 0 20 10 30 4 26 21 36 31 15 26 6 35 9 15Z"/><path d="m5 4 15 16 10 10" stroke="#ffb1b1" fill="none"/>',
      gear:'<path d="m11 2 11 0 1 6 7-2 5 9-5 4 4 6-7 8-6-4-4 6-10-4 1-7-7-3 1-10 7-1Z"/><circle cx="17" cy="18" r="8" fill="#102127"/><circle cx="17" cy="18" r="3"/>',
      badge:'<path d="m17 1 5 10 12 1-7 10 3 12-13-5-13 5 3-12-7-10 12-1Z"/><circle cx="17" cy="18" r="7" fill="#312019"/><path d="m17 12 2 4 5 1-4 3 1 5-4-3-4 3 1-5-4-3 5-1Z"/>',
      circuit:'<path d="M3 4h24l8 8v18H15L3 18Z"/><path d="M8 9h13v8h9M8 15v10h14" fill="none" stroke="#73fcff"/><circle cx="24" cy="25" r="3" fill="#e570ff"/>',
      wood:'<path d="m2 4 28-2 4 30-30 3Z"/><path d="m7 8 21 20M8 15l12 14M15 7l13 13" fill="none" stroke="#4d2c16"/><circle cx="8" cy="8" r="2" fill="#eee5cc"/>',
      gem:'<path d="m17 0 15 9 1 17-16 10L1 26 2 9Z"/><path d="m8 11 18 0-9 17Z" fill="#e33565"/><path d="M17 0 8 11 1 26M32 9H2M33 26 26 11 17 0" fill="none"/>',
      treasure:'<path d="M2 6h30v24H2Z"/><path d="m8 9 7 7-7 9-5-9Z" fill="#5de4ff"/><path d="m24 9 7 7-7 9-5-9Z" fill="#e35dfb"/><circle cx="17" cy="5" r="5" fill="#eb5267"/>',
      dragon:'<path d="M2 27C-3 12 16 0 31 8L24 1l12 4-1 18-11-8c-12-3-15 7-9 12l9-3-5 10C10 39 5 34 2 27Z"/><path d="m24 10 7 3-6 3Z" fill="#ffef6c"/>',
      dots:'<path d="m17 0 4 9 9 4-9 4-4 9-4-9-9-4 9-4Z"/><circle cx="17" cy="17" r="3" fill="#1b1510"/><circle cx="8" cy="7" r="2"/><circle cx="27" cy="8" r="2.4"/><circle cx="7" cy="27" r="2.4"/>',
      neon:'<path d="M6 30V9h9M28 4v26H10" fill="none" stroke-width="4"/><path d="M17 10v14M10 17h14" stroke-width="3"/><circle cx="17" cy="17" r="3"/>',
      deco:'<path d="M17 1v32M1 17h32M5 5l24 24M29 5 5 29" fill="none" stroke-width="2.4"/><path d="m17 8 5 9-5 9-5-9Z"/>',
      diamond:'<path d="m17 0 12 17-12 17L5 17Z" fill="none" stroke-width="4"/><path d="m17 7 7 10-7 10-7-10Z"/><circle cx="17" cy="17" r="2.5" fill="#1b1510"/>',
      aurora:'<path d="M1 27Q8 9 17 17T33 6" fill="none" stroke-width="4"/><circle cx="7" cy="11" r="2.2"/><circle cx="27" cy="24" r="1.8"/><circle cx="30" cy="5" r="1.6"/>',
      blaze:'<path d="M17 0c7 10 12 14 12 22S24 34 17 34 5 30 5 22 10 10 17 0Z"/><path d="M17 15c3 5 4 6 4 9a4 4 0 0 1-8 0c0-3 1-4 4-9Z" fill="#fff2a8"/>',
      wave:'<path d="M0 12q8-9 16 0t16 0M0 25q8-9 16 0t16 0" fill="none" stroke-width="3"/><circle cx="17" cy="4" r="2.4"/>',
      blocks:'<path d="M4 4h10v10H4Zm12 10h10v10H16ZM4 24h10v7H4Z"/><path d="M27 4h4v4h-4Z" fill="#fff" stroke="none"/>'
    };
    const ornament=ornaments[motif];
    return `<svg class="reward-frame-art" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${uid}" x2="1" y2="1"><stop stop-color="${light}"/><stop offset=".28" stop-color="${dark}"/><stop offset=".52" stop-color="${light}"/><stop offset=".75" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><path d="M22 13h76l9 9v76l-9 9H22l-9-9V22Z" fill="none" stroke="#05080e" stroke-width="11"/><path d="M22 13h76l9 9v76l-9 9H22l-9-9V22Z" fill="none" stroke="url(#${uid})" stroke-width="7"/><path d="M25 21h70l4 4v70l-4 4H25l-4-4V25Z" fill="none" stroke="${light}" stroke-opacity=".65"/><g fill="url(#${uid})" stroke="${dark}" stroke-width="1.1">${[0,90,180,270].map(angle=>`<g transform="rotate(${angle} 60 60) translate(5 5) scale(.77)">${ornament}</g>`).join('')}</g><path d="m60 7 6 7-6 8-6-8Z" fill="${light}" stroke="${dark}"/><path d="m60 99 4 6-4 6-4-6Z" fill="${light}"/></svg>`;
  }
  function avatar(id) {
    const set=Seasons.find(id);if(set)return heroAvatar(set,id.startsWith('event_'));
    const config={sentinel:['#27a8d7','#09243c'],ranger:['#7bd985','#133f32'],astronaut:['#b6caff','#20284f'],mage:['#c78cff','#381959'],cybercat:['#69f8e8','#30217b'],phoenix:['#ffbe51','#6c1c33'],
      comet:['#4f7dff','#0a1230'],wasp:['#c084ff','#170a2e'],red_sentinel:['#ff5a6e','#2a0710'],emerald:['#56e39f','#04140c'],
      thunder:['#ffd94d','#191309'],nebula:['#a8fbff','#06030f'],prism:['#c9d8ee','#10141d'],phantom:['#e9e6f5','#0b0714']}[id]||['#27a8d7','#09243c'];
    const [light,dark]=config;
    const faces={
      sentinel:'<path d="m28 30 22-15 22 15-4 40-18 16-18-16Z"/><path d="m33 42 17 5 17-5-3 18-14 10-14-10Z" fill="#071923"/><path d="M37 49h9m8 0h9" stroke="#e2fcff" stroke-width="3"/><path d="m50 19-5 23h10Z" fill="#f3e1a2"/>',
      ranger:'<path d="M20 77c0-38 10-58 30-62 20 4 30 24 30 62L50 91Z"/><path d="m50 28 19 40-19 13-19-13Z" fill="#112d28"/><path d="m35 52 11 3m8 0 11-3" stroke="#b7ffd4" stroke-width="3"/><path d="M29 75 50 84 71 75" fill="none" stroke="#decc7c"/>',
      astronaut:'<path d="M20 78V48a30 30 0 0 1 60 0v30Z"/><rect x="27" y="32" width="46" height="39" rx="16" fill="#101b3f"/><path d="M34 46c6-10 16-11 27-7" fill="none" stroke="#c8f3ff" stroke-width="4"/><path d="M27 78h46v9H27Z" fill="#6f83b8"/><circle cx="64" cy="59" r="4" fill="#f7bd64"/>',
      mage:'<path d="m50 8 29 49H21Z"/><path d="M12 57q38-14 76 0l-38 9Z"/><path d="m30 65 20 26 20-26Z" fill="#eee7ff"/><path d="m34 62 12 2m8 0 12-2" stroke="#f4ccff" stroke-width="3"/><path d="m50 29 3 7 7 2-7 3-3 7-3-7-7-3 7-2Z" fill="#fff1b5"/>',
      cybercat:'<path d="M23 12 43 30h14l20-18-2 38 7 20-32 18-32-18 7-20Z"/><path d="m29 21 9 16-9 4Zm42 0-9 16 9 4Z" fill="#f28cff"/><path d="m29 52 15 4m12 0 15-4" stroke="#061628" stroke-width="5"/><path d="m44 66 6 6 6-6Z" fill="#fff"/><path d="M14 65h19m34 0h19" stroke="#a5fff7"/>',
      phoenix:'<path d="M50 87C19 77 10 48 14 23l28 27-8-38 20 21L76 8l-9 41 21-23c5 31-7 48-38 61Z"/><path d="M50 75 36 53l17-20 12 15-10 4Z" fill="#fff0a1"/><path d="m54 40 4 3-5 2Z" fill="#4a1830"/>',
      comet:'<path d="M18 100Q10 70 32 60L50 72 68 60Q90 70 82 100Z" fill="#152a63"/><path d="M30 100Q30 77 50 73Q70 77 70 100Z"/><rect x="45" y="56" width="10" height="12" fill="#e6b189"/><ellipse cx="50" cy="40" rx="17" ry="19" fill="#f0c19a"/><path d="M31 36Q32 17 50 17Q68 17 69 36Q63 25 50 25Q37 25 31 36Z" fill="#141428"/><path d="M31 38Q50 31 69 38Q70 47 61 50Q56 45 50 46Q44 45 39 50Q30 47 31 38Z" fill="#f5c542"/><ellipse cx="42" cy="42" rx="4.6" ry="4" fill="#fff"/><ellipse cx="58" cy="42" rx="4.6" ry="4" fill="#fff"/><circle cx="42.4" cy="42.4" r="2" fill="#12203f" stroke="none"/><circle cx="57.6" cy="42.4" r="2" fill="#12203f" stroke="none"/><path d="M45 53Q50 57 55 53" fill="none" stroke="#7a3b2a" stroke-width="1.6" stroke-linecap="round"/><path d="m50 80 2.2 4.6 5 .7-3.6 3.5.9 5-4.5-2.4-4.5 2.4.9-5-3.6-3.5 5-.7Z" fill="#ffd45e" stroke-width="1.2"/>',
      wasp:'<ellipse cx="20" cy="55" rx="15" ry="26" transform="rotate(-24 20 55)" fill="#d9c8ff" opacity=".22"/><ellipse cx="80" cy="55" rx="15" ry="26" transform="rotate(24 80 55)" fill="#d9c8ff" opacity=".22"/><path d="M28 100Q28 74 50 70Q72 74 72 100Z" fill="#5b2ea8"/><path d="M34 100Q38 88 50 86Q62 88 66 100Z" fill="#ffcf3f"/><rect x="45" y="58" width="10" height="11" fill="#f1c39d"/><path d="M30 44Q27 21 50 18Q73 21 70 44Q70 58 50 62Q30 58 30 44Z" fill="#2a1352"/><ellipse cx="50" cy="44" rx="16" ry="16" fill="#f6cba6"/><path d="M34 40Q38 25 50 25Q62 25 66 40Q59 31 50 31Q41 31 34 40Z" fill="#3a1a6e"/><path d="M41 31Q38 17 31 11" fill="none" stroke="#f0c420" stroke-width="2.2" stroke-linecap="round"/><circle cx="31" cy="11" r="3" fill="#ffe27a" stroke-width="1.6"/><path d="M59 31Q62 17 69 11" fill="none" stroke="#f0c420" stroke-width="2.2" stroke-linecap="round"/><circle cx="69" cy="11" r="3" fill="#ffe27a" stroke-width="1.6"/><circle cx="42" cy="43" r="7.5" fill="#ffe27a" stroke-width="2.2"/><circle cx="58" cy="43" r="7.5" fill="#ffe27a" stroke-width="2.2"/><path d="M49 42h2" stroke-width="2"/><circle cx="39.5" cy="40.5" r="2.2" fill="#fff" stroke="none"/><circle cx="55.5" cy="40.5" r="2.2" fill="#fff" stroke="none"/><path d="M46 55Q50 58 54 55" fill="none" stroke="#8a4a33" stroke-width="1.6" stroke-linecap="round"/><path d="M50 82l4 7 8-2-3 8-9 2-4-8Z" fill="#ffcf3f" stroke-width="1.2"/>',
      red_sentinel:'<path d="M24 100Q24 72 50 68Q76 72 76 100Z" fill="#c9d2e3"/><path d="M24 100Q24 84 34 78L50 86 66 78Q76 84 76 100Z" fill="#a71a2b"/><path d="M34 33Q34 17 50 17Q66 17 66 33L65 51Q58 60 50 60Q42 60 35 51Z" fill="#c81f2e"/><path d="M34 37Q50 32 66 37L65 46Q50 51 35 46Z" fill="#dfe6f2"/><path d="M39 40Q45 38.5 48 40L47 43.5Q44 44.5 39 43Z" fill="#0d1b2a"/><path d="M61 40Q55 38.5 52 40L53 43.5Q56 44.5 61 43Z" fill="#0d1b2a"/><circle cx="43.5" cy="41.8" r="1.5" fill="#7df3ff" stroke="none"/><circle cx="56.5" cy="41.8" r="1.5" fill="#7df3ff" stroke="none"/><path d="M44 52h12M45 55h10" stroke="#7d1020" stroke-width="1.6" stroke-linecap="round"/><path d="M50 78l5 4-5 4-5-4Z" fill="#e8eefb" stroke-width="1.2"/>',
      emerald:'<path d="M17 100Q15 62 29 45Q35 20 50 14Q65 20 71 45Q85 62 83 100Z" fill="#1c6342"/><ellipse cx="50" cy="45" rx="14" ry="17" fill="#07130d"/><ellipse cx="43" cy="44" rx="3.4" ry="2.6" fill="#8dffb8" stroke="none"/><ellipse cx="57" cy="44" rx="3.4" ry="2.6" fill="#8dffb8" stroke="none"/><path d="M50 18Q61 22 66 44" fill="none" stroke="#d8b35a" stroke-width="2"/><circle cx="50" cy="69" r="4" fill="#d8b35a" stroke-width="1.5"/><path d="M50 74v14" stroke="#d8b35a" stroke-width="2"/><path d="M42 92h16" stroke="#0a2a1b" stroke-width="3"/>',
      thunder:'<path d="M26 100Q26 74 50 70Q74 74 74 100Z" fill="#1a1a20"/><rect x="45" y="57" width="10" height="11" fill="#e0ac82"/><ellipse cx="50" cy="39" rx="17" ry="19" fill="#f5c531"/><path d="M56 20 37 45h11l-7 21 23-30H52Z" fill="#14121a"/><path d="M36 37 45 40 42 46 33 43Z" fill="#fff"/><path d="M64 37 55 40 58 46 67 43Z" fill="#fff"/><path d="m50 80 2.4 5 5.4.7-4 3.8 1 5.3-4.8-2.6-4.8 2.6 1-5.3-4-3.8 5.4-.7Z" fill="#f5c531"/><path d="M44 55Q50 58 56 55" fill="none" stroke="#8a5a20" stroke-width="1.8" stroke-linecap="round"/>',
      nebula:'<path d="M30 44Q24 16 50 14Q76 16 70 44Q76 60 66 68L50 60 34 68Q24 60 30 44Z" fill="#8a5bff"/><path d="M28 100Q28 76 50 72Q72 76 72 100Z" fill="#241a4d"/><ellipse cx="50" cy="44" rx="15" ry="17" fill="#3a2a6b"/><ellipse cx="43" cy="43" rx="3.8" ry="2.8" fill="#a8fbff" stroke="none"/><ellipse cx="57" cy="43" rx="3.8" ry="2.8" fill="#a8fbff" stroke="none"/><path d="M46 54Q50 57 54 54" fill="none" stroke="#b39cff" stroke-width="1.6" stroke-linecap="round"/><circle cx="50" cy="84" r="3" fill="#a8fbff" stroke="none"/><circle cx="50" cy="84" r="6" fill="none" stroke="#a8fbff" stroke-opacity=".5" stroke-width="1.2"/><circle cx="38" cy="33" r="1.2" fill="#fff" stroke="none"/><circle cx="63" cy="31" r="1" fill="#fff" stroke="none"/>',
      prism:'<path d="M24 100Q24 73 50 69Q76 73 76 100Z" fill="#2a3446"/><path d="M50 69h26Q76 73 76 100H50Z" fill="#3d4a60"/><rect x="45" y="57" width="10" height="11" fill="#d9a77f"/><path d="M33 33Q33 17 50 17V60Q42 60 35 51Z" fill="#e8b98f"/><path d="M50 17Q67 17 67 33L66 51Q59 60 50 60Z" fill="#c9d8ee"/><path d="M50 17v43" stroke-width="2"/><ellipse cx="42" cy="41" rx="4.4" ry="3.6" fill="#fff"/><circle cx="42.3" cy="41.3" r="1.9" fill="#20304a" stroke="none"/><circle cx="58" cy="41" r="5" fill="#131a26"/><circle cx="58" cy="41" r="2.4" fill="#57f0ff" stroke="none"/><path d="M57 51h9M58 47l6-3M58 55l6 3" stroke="#57f0ff" stroke-width="1.4" stroke-linecap="round"/>',
      phantom:'<path d="M20 100Q20 70 34 62Q36 24 50 16Q64 24 66 62Q80 70 80 100Z" fill="#2a2040"/><path d="M33 46Q34 22 50 18Q66 22 67 46Q67 58 50 64Q33 58 33 46Z" fill="#e9e6f5"/><path d="M37 44Q50 38 63 44Q64 54 50 60Q36 54 37 44Z" fill="#120b22"/><ellipse cx="44" cy="47" rx="3.2" ry="4.4" fill="#c07bff" stroke="none"/><ellipse cx="56" cy="47" rx="3.2" ry="4.4" fill="#c07bff" stroke="none"/><path d="M50 64v10M42 80h16" stroke="#8b6bc4" stroke-width="2"/>'
    };
    return `<svg class="reward-avatar-art" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="${dark}"/><circle cx="50" cy="50" r="43" fill="none" stroke="${light}" opacity=".25"/><g fill="${light}" stroke="${dark}" stroke-width="1.5">${faces[id]||faces.sentinel}</g></svg>`;
  }
  if(root.document) {
    const style=document.createElement('style');style.id='character-reward-themes';
    style.textContent=Seasons.SETS.flatMap(set=>['hero_','event_'].map(prefix=>{
      const id=prefix+set.id, accent=prefix==='event_'?'#ffdf83':set.light;
      return `:root[data-site-theme="${id}"]{--bg:color-mix(in srgb,${set.dark} 20%,#050609);--bg2:color-mix(in srgb,${set.dark} 32%,#0b0d14);--card:color-mix(in srgb,${set.dark} 42%,#11141c);--card2:color-mix(in srgb,${set.dark} 52%,#151a25);--borda:color-mix(in srgb,${set.light} 30%,#242633);--txt:#fff8ef;--txt2:#c4c5d3;--acento:${accent};--acento2:${set.light}}:root[data-site-theme="${id}"] body{background-image:radial-gradient(ellipse at top right,${set.dark}44,transparent 65%)}[data-preview-theme="${id}"]{--preview-bg:${set.dark};--preview-accent:${accent}}`;
    })).join('');document.head.append(style);
  }
  root.EQRewardArt={frame,avatar};
})(globalThis);
