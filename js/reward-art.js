/* Original vector cosmetics: crisp previews and the same artwork on equipped avatars. */
(function(root) {
  'use strict';
  let sequence=0;
  const palettes={
    default:['#8492a6','#d9e3f0','metal'],bronze:['#a65b32','#f4c598','metal'],silver:['#7a92b0','#eff8ff','metal'],
    steel:['#1473bd','#9aeaff','metal'],verdant:['#277b24','#b1f86b','leaf'],ice:['#168dcc','#beffff','ice'],gold:['#bd6b09','#ffe582','crown'],
    arcana:['#7d19c6','#eeb2ff','star'],flames:['#d33509','#ffcf33','flame'],skull:['#7f1524','#c0cbd3','skull'],cosmic:['#5135bc','#ffca63','orbit'],
    crimson:['#8c071d','#ff5471','spike'],gear:['#256a76','#a8e6eb','gear'],sheriff:['#a75609','#ffcf79','badge'],outlaw:['#572261','#dc85de','badge'],
    jade:['#078453','#9cfbc7','leaf'],cyborg:['#165bb5','#88dbff','circuit'],gamer:['#631adb','#35f6ed','circuit'],western:['#553225','#d6b38a','wood'],
    ruby:['#9b1737','#ffc07e','gem'],treasure:['#ae720a','#fff39a','treasure'],royal:['#25357c','#bfcaff','crown'],dragon_frame:['#a42712','#ffd18c','dragon']
  };
  function frame(id) {
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
      dragon:'<path d="M2 27C-3 12 16 0 31 8L24 1l12 4-1 18-11-8c-12-3-15 7-9 12l9-3-5 10C10 39 5 34 2 27Z"/><path d="m24 10 7 3-6 3Z" fill="#ffef6c"/>'
    };
    const ornament=ornaments[motif];
    return `<svg class="reward-frame-art" viewBox="0 0 120 120" aria-hidden="true"><defs><linearGradient id="${uid}" x2="1" y2="1"><stop stop-color="${light}"/><stop offset=".28" stop-color="${dark}"/><stop offset=".52" stop-color="${light}"/><stop offset=".75" stop-color="${dark}"/><stop offset="1" stop-color="${light}"/></linearGradient></defs><path d="M22 13h76l9 9v76l-9 9H22l-9-9V22Z" fill="none" stroke="#05080e" stroke-width="11"/><path d="M22 13h76l9 9v76l-9 9H22l-9-9V22Z" fill="none" stroke="url(#${uid})" stroke-width="7"/><path d="M25 21h70l4 4v70l-4 4H25l-4-4V25Z" fill="none" stroke="${light}" stroke-opacity=".65"/><g fill="url(#${uid})" stroke="${dark}" stroke-width="1.1">${[0,90,180,270].map(angle=>`<g transform="rotate(${angle} 60 60) translate(5 5) scale(.77)">${ornament}</g>`).join('')}</g><path d="m60 7 6 7-6 8-6-8Z" fill="${light}" stroke="${dark}"/><path d="m60 99 4 6-4 6-4-6Z" fill="${light}"/></svg>`;
  }
  function avatar(id) {
    const config={sentinel:['#27a8d7','#09243c'],ranger:['#7bd985','#133f32'],astronaut:['#b6caff','#20284f'],mage:['#c78cff','#381959'],cybercat:['#69f8e8','#30217b'],phoenix:['#ffbe51','#6c1c33']}[id]||['#27a8d7','#09243c'];
    const [light,dark]=config;
    const faces={
      sentinel:'<path d="m28 30 22-15 22 15-4 40-18 16-18-16Z"/><path d="m33 42 17 5 17-5-3 18-14 10-14-10Z" fill="#071923"/><path d="M37 49h9m8 0h9" stroke="#e2fcff" stroke-width="3"/><path d="m50 19-5 23h10Z" fill="#f3e1a2"/>',
      ranger:'<path d="M20 77c0-38 10-58 30-62 20 4 30 24 30 62L50 91Z"/><path d="m50 28 19 40-19 13-19-13Z" fill="#112d28"/><path d="m35 52 11 3m8 0 11-3" stroke="#b7ffd4" stroke-width="3"/><path d="M29 75 50 84 71 75" fill="none" stroke="#decc7c"/>',
      astronaut:'<path d="M20 78V48a30 30 0 0 1 60 0v30Z"/><rect x="27" y="32" width="46" height="39" rx="16" fill="#101b3f"/><path d="M34 46c6-10 16-11 27-7" fill="none" stroke="#c8f3ff" stroke-width="4"/><path d="M27 78h46v9H27Z" fill="#6f83b8"/><circle cx="64" cy="59" r="4" fill="#f7bd64"/>',
      mage:'<path d="m50 8 29 49H21Z"/><path d="M12 57q38-14 76 0l-38 9Z"/><path d="m30 65 20 26 20-26Z" fill="#eee7ff"/><path d="m34 62 12 2m8 0 12-2" stroke="#f4ccff" stroke-width="3"/><path d="m50 29 3 7 7 2-7 3-3 7-3-7-7-3 7-2Z" fill="#fff1b5"/>',
      cybercat:'<path d="M23 12 43 30h14l20-18-2 38 7 20-32 18-32-18 7-20Z"/><path d="m29 21 9 16-9 4Zm42 0-9 16 9 4Z" fill="#f28cff"/><path d="m29 52 15 4m12 0 15-4" stroke="#061628" stroke-width="5"/><path d="m44 66 6 6 6-6Z" fill="#fff"/><path d="M14 65h19m34 0h19" stroke="#a5fff7"/>',
      phoenix:'<path d="M50 87C19 77 10 48 14 23l28 27-8-38 20 21L76 8l-9 41 21-23c5 31-7 48-38 61Z"/><path d="M50 75 36 53l17-20 12 15-10 4Z" fill="#fff0a1"/><path d="m54 40 4 3-5 2Z" fill="#4a1830"/>'
    };
    return `<svg class="reward-avatar-art" viewBox="0 0 100 100" aria-hidden="true"><rect width="100" height="100" rx="22" fill="${dark}"/><circle cx="50" cy="50" r="43" fill="none" stroke="${light}" opacity=".25"/><g fill="${light}" stroke="${dark}" stroke-width="1.5">${faces[id]||faces.sentinel}</g></svg>`;
  }
  root.EQRewardArt={frame,avatar};
})(globalThis);
