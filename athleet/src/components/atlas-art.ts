// Shared 320px canvas, flat colors and rounded silhouettes match mascot-art.
function svg(markup: string) {
  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">${markup}</svg>`)}` };
}
const skin = '#985b3c';
const shadow = '#75422f';
const ink = '#282331';
function arm(left: boolean) {
  const path = left ? 'M112 181Q85 194 83 222' : 'M208 181Q235 194 237 222';
  return svg(`<path d="${path}" fill="none" stroke="${shadow}" stroke-width="29" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${skin}" stroke-width="23" stroke-linecap="round"/>${left ? '<path d="M86 204L83 221" stroke="#69449a" stroke-width="25" stroke-linecap="round"/>' : ''}<circle cx="${left ? 82 : 238}" cy="230" r="14" fill="${skin}"/><path d="M${left ? 77 : 233} 229l5 4" stroke="${shadow}" stroke-width="3" stroke-linecap="round"/>`);
}
function leg(left: boolean, part: 'thigh' | 'shin' | 'shoe') {
  const x = left ? 137 : 183;
  if (part === 'thigh') return svg(`<path d="M${x} 244V272" stroke="${skin}" stroke-width="23" stroke-linecap="round"/>`);
  if (part === 'shin') return svg(`<path d="M${x} 272V291" stroke="${skin}" stroke-width="19" stroke-linecap="round"/><path d="M${x-10} 282h20" stroke="#fff3d5" stroke-width="14"/><path d="M${x-10} 280h20" stroke="#69449a" stroke-width="4"/>`);
  return svg(`<path d="M${x-11} 286Q${x} 280 ${x+12} 288l${left ? '-2' : '16'} 8q5 8-8 9h-31q-10-2-6-10Z" fill="#24345e"/><path d="M${x-22} 300h39" stroke="#fff3d5" stroke-width="7" stroke-linecap="round"/><path d="M${x-6} 288l12 4m-15 1 13 4" stroke="#fff3d5" stroke-width="3" stroke-linecap="round"/>`);
}
export const atlasArt = {
  left: arm(true), right: arm(false), leftThigh: leg(true, 'thigh'), rightThigh: leg(false, 'thigh'), leftShin: leg(true, 'shin'), rightShin: leg(false, 'shin'), leftShoe: leg(true, 'shoe'), rightShoe: leg(false, 'shoe'),
  floor: svg('<ellipse cx="160" cy="301" rx="94" ry="10" fill="#28251d"/>'),
  body: svg(`<path d="M145 158h30v28h-30Z" fill="${shadow}"/><path d="M117 174Q160 165 203 174l10 63q-53 18-106 0Z" fill="#ffcf32"/><path d="M116 180l-7 49m95-49 7 49" stroke="#e9ae10" stroke-width="8"/><path d="M130 174q30 28 60 0" fill="none" stroke="#fff3d5" stroke-width="10"/><path d="M130 174q30 28 60 0" fill="none" stroke="#69449a" stroke-width="4"/><path d="M109 237l-3 18 44 5 10-14 10 14 44-5-3-18" fill="#ffcf32" stroke="#69449a" stroke-width="5" stroke-linejoin="round"/><g fill="none" stroke="#69449a" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"><path d="M137 207q15-10 16 3 0 7-17 17h18M168 204h16l-10 10q15-2 10 10-4 7-17 1"/></g>`),
  head: svg(`<ellipse cx="104" cy="124" rx="12" ry="17" fill="${skin}"/><ellipse cx="216" cy="124" rx="12" ry="17" fill="${skin}"/><path d="M106 106q-2-46 54-46t54 46v34q-3 44-54 46-50-2-54-46Z" fill="${skin}"/><path d="M107 106q-11-53 53-53 62 0 54 53l-9-17q-43-18-89 0Z" fill="${ink}"/><path d="M121 77q38-17 77 0" fill="none" stroke="#44313a" stroke-width="5" stroke-linecap="round"/><ellipse cx="120" cy="144" rx="10" ry="6" fill="#b16a46"/><ellipse cx="200" cy="144" rx="10" ry="6" fill="#b16a46"/><path d="M108 132l15 17q37 19 74 0l15-17-2 29q-12 33-50 34-40-1-50-34Z" fill="${ink}"/><path d="M154 121l-5 22q10 7 21-1" fill="none" stroke="${shadow}" stroke-width="5" stroke-linecap="round"/><path d="M137 153q12-7 23-2 12-5 24 2" fill="none" stroke="${ink}" stroke-width="8" stroke-linecap="round"/>`),
  eyes: svg(`<ellipse cx="135" cy="116" rx="17" ry="21" fill="#fff9e9"/><ellipse cx="185" cy="116" rx="17" ry="21" fill="#fff9e9"/><g fill="#202a43"><ellipse cx="138" cy="118" rx="9" ry="14"/><ellipse cx="182" cy="118" rx="9" ry="14"/></g><g fill="#fff9e9"><circle cx="141" cy="112" r="4"/><circle cx="185" cy="112" r="4"/></g>`),
  brows: svg(`<path d="M119 93q14-7 29-1m24 0q15-6 29 1" fill="none" stroke="${ink}" stroke-width="7" stroke-linecap="round"/>`),
  mouth: svg('<path d="M144 160q16 5 32 0-1 20-16 20t-16-20" fill="#120f18"/><path d="M146 161q14 3 28 0l-3 6h-22Z" fill="#fff3d5"/><path d="M151 176q9-9 18 0-9 6-18 0" fill="#ef685b"/>'),
  confetti: svg('<g fill="#ffcf32"><path d="M58 69l5 13 14 5-14 5-5 14-5-14-14-5 14-5Z"/><path d="M261 44l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z"/></g><g fill="none" stroke-width="6" stroke-linecap="round"><path d="M42 146l8 7m217-30 10-8" stroke="#ef685b"/><path d="M87 45l5 11m135-24-4 12" stroke="#81b7c9"/></g>'),
};
