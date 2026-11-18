import { atlasArt } from './atlas-art';

type Look = { skin: string; shade: string; hair: string; kit: string; trim: string; style: 'power' | 'track' | 'soccer' | 'tennis' | 'martial' | 'gym' };
const looks: Record<string, Look> = {
  ironside: { skin: '#945436', shade: '#703b2b', hair: '#30262b', kit: '#bc4941', trim: '#fff3d5', style: 'power' },
  blaze: { skin: '#875336', shade: '#653c2c', hair: '#26252b', kit: '#ffcf32', trim: '#258556', style: 'track' },
  vanguard: { skin: '#d79a70', shade: '#b97755', hair: '#332c2c', kit: '#bf4142', trim: '#78a36a', style: 'soccer' },
  rally: { skin: '#a8673e', shade: '#82472f', hair: '#382823', kit: '#294267', trim: '#ffcf32', style: 'tennis' },
  strike: { skin: '#ecc09a', shade: '#ce9675', hair: '#44302c', kit: '#3879b3', trim: '#ffcf69', style: 'martial' },
  anvil: { skin: '#e6b18b', shade: '#c78c6c', hair: '#634331', kit: '#424f60', trim: '#ec6956', style: 'gym' },
};
function svg(markup: string) {
  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">${markup}</svg>`)}` };
}
const empty = svg('');
export type CoachArt = typeof atlasArt & { detail: ReturnType<typeof svg> };
function makeCoach(p: Look): CoachArt {
  const { skin, shade, hair, kit, trim, style } = p;
  const power = style === 'power';
  const arm = (left: boolean) => {
    const path = left ? 'M112 181Q85 194 83 222' : 'M208 181Q235 194 237 222';
    const x = left ? 82 : 238;
    return svg(`<path d="${path}" fill="none" stroke="${shade}" stroke-width="${power ? 36 : 26}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${skin}" stroke-width="${power ? 29 : 21}" stroke-linecap="round"/>${style === 'gym' || style === 'martial' || style === 'soccer' ? `<path d="${left ? 'M112 181L100 188' : 'M208 181L220 188'}" stroke="${kit}" stroke-width="29" stroke-linecap="round"/>` : ''}<path d="M${x} 220v6" stroke="${trim}" stroke-width="24"/><circle cx="${x}" cy="232" r="13" fill="${skin}"/><path d="M${x-4} 232l5 3" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>${power ? `<path d="M${left ? 92 : 228} 190q${left ? '-12' : '12'} 8 0 14" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>` : ''}`);
  };
  const leg = (left: boolean, part: 'thigh' | 'shin' | 'shoe') => {
    const x = left ? 137 : 183;
    const pants = style === 'martial' || style === 'gym';
    if (part === 'thigh') return svg(`<path d="M${x} 244V272" stroke="${pants ? kit : skin}" stroke-width="23" stroke-linecap="round"/>`);
    if (part === 'shin') return svg(`<path d="M${x} 272V291" stroke="${pants ? kit : skin}" stroke-width="19" stroke-linecap="round"/><path d="M${x-10} 282h20" stroke="#fff3d5" stroke-width="14"/><path d="M${x-10} 280h20" stroke="${trim}" stroke-width="4"/>`);
    return svg(`<path d="M${x-11} 286Q${x} 280 ${x+12} 288l${left ? '-2' : '16'} 8q5 8-8 9h-31q-10-2-6-10Z" fill="${kit}"/><path d="M${x-22} 300h39" stroke="#fff3d5" stroke-width="7" stroke-linecap="round"/><path d="M${x-6} 288l12 4m-15 1 13 4" stroke="#fff3d5" stroke-width="3" stroke-linecap="round"/>`);
  };
  const badge = {
    power: '<path d="M139 215h42m-40-8v16m-7-13v10m45-13v16m7-13v10" fill="none" stroke="#fff3d5" stroke-width="6" stroke-linecap="round"/>',
    track: '<path d="M165 196l-20 22h13l-5 17 24-25h-14l6-14Z" fill="#258556"/>',
    soccer: '<path d="M151 204h22l-16 25" fill="none" stroke="#fff3d5" stroke-width="7" stroke-linecap="round" stroke-linejoin="round"/>',
    tennis: '<ellipse cx="162" cy="211" rx="10" ry="14" transform="rotate(30 162 211)" fill="none" stroke="#86becd" stroke-width="4"/><path d="M156 221l-7 12m7-27 13 8m-13 0 9 5" stroke="#86becd" stroke-width="3" stroke-linecap="round"/>',
    martial: `<path d="M143 179l39 23-33 27m-38 8h100m-51 0 8 19" fill="none" stroke="${trim}" stroke-width="5" stroke-linejoin="round"/><circle cx="175" cy="203" r="3" fill="${trim}"/>`,
    gym: '<path d="M145 184l15 15 15-15" fill="#ec6956"/><path d="M142 190v30m36-30v30" stroke="#b5c5cc" stroke-width="3" stroke-linecap="round"/><path d="M151 225h18m-18-5v10m18-10v10" stroke="#81b7c9" stroke-width="4" stroke-linecap="round"/>',
  }[style];
  const rearHair = style === 'tennis'
    ? `<path d="M101 158Q72 116 96 83Q89 55 117 51Q128 27 151 44Q175 23 193 45Q224 43 226 73Q251 89 230 119Q249 153 217 177Z" fill="${hair}"/><path d="M103 76q-12 10-4 20m19-39q-12 0-12 11m83-13q15-2 17 12m20 24q12 8 3 22" fill="none" stroke="#674331" stroke-width="5" stroke-linecap="round"/>`
    : style === 'martial' ? `<circle cx="111" cy="70" r="24" fill="${hair}"/><circle cx="209" cy="70" r="24" fill="${hair}"/><path d="M96 72q15-27 28-5m73 0q15-22 28 5" fill="none" stroke="#ffcf69" stroke-width="5"/><path d="M99 87l-14 67m134-67 15 67" stroke="#a4cedb" stroke-width="8" stroke-linecap="round"/>`
    : style === 'gym' ? `<path d="M174 63q45-27 47 16l-4 78q1 20 15 28-35-1-37-38Z" fill="${hair}"/><circle cx="171" cy="57" r="23" fill="${hair}"/><path d="M153 59q17-8 33 0" stroke="#ec6956" stroke-width="7"/>` : '';
  const frontHair = style === 'power' ? `<path d="M129 72q24-12 49-2" fill="none" stroke="#b77b51" stroke-width="6" stroke-linecap="round"/>`
    : style === 'track' ? `<path d="M107 100q-6-45 53-45t53 45l-12-18q-41-15-82 0Z" fill="${hair}"/>`
    : style === 'soccer' ? `<path d="M106 106q-11-37 8-49l17 6 14-18 18 11 21-14 12 13q27 4 19 47l-11-21q-37 3-62-7-8 22-27 17Z" fill="${hair}"/><path d="M132 68l28-7m-10 13 31-9" stroke="#675044" stroke-width="4" stroke-linecap="round"/>`
    : style === 'tennis' ? `<path d="M108 102q-7-46 52-46t53 46l-13-19h-80Z" fill="${hair}"/><path d="M106 83q55-20 108 0v17q-54-18-108 0Z" fill="#ffcf32"/><path d="M102 102q61-26 116 0l-8 10q-51-18-102 0Z" fill="#ffe885"/>`
    : `<path d="M105 116q-15-57 48-61 64-6 63 58l-13-20q-20-1-31-22-6 28-38 39l13-23q-13 22-33 28Z" fill="${hair}"/><path d="M122 86q9-17 26-21m36 2q21 9 23 22" fill="none" stroke="${style === 'gym' ? '#997043' : '#735043'}" stroke-width="5" stroke-linecap="round"/>`;
  const beard = style === 'track' ? `<path d="M144 177q16 9 32 0l-4 8q-13 5-24 0Z" fill="${hair}"/>` : style === 'power' ? `<path d="M151 181q9 4 18 0" stroke="${hair}" stroke-width="5" stroke-linecap="round"/>` : '';
  return {
    ...atlasArt,
    left: arm(true), right: arm(false), leftThigh: leg(true, 'thigh'), rightThigh: leg(false, 'thigh'), leftShin: leg(true, 'shin'), rightShin: leg(false, 'shin'), leftShoe: leg(true, 'shoe'), rightShoe: leg(false, 'shoe'),
    body: svg(`<path d="M145 158h30v28h-30Z" fill="${shade}"/><path d="M${power ? 109 : 117} 174Q160 165 ${power ? 211 : 203} 174l${power ? 5 : 10} 63q-56 18-112 0Z" fill="${kit}"/><path d="M116 180l-7 49m95-49 7 49" stroke="${trim}" stroke-width="6"/><path d="M130 174q30 28 60 0" fill="none" stroke="#fff3d5" stroke-width="8"/><path d="M130 174q30 28 60 0" fill="none" stroke="${trim}" stroke-width="4"/><path d="M109 237l-3 18 44 5 10-14 10 14 44-5-3-18" fill="${style === 'track' ? trim : kit}" stroke="${style === 'track' ? kit : trim}" stroke-width="5" stroke-linejoin="round"/>${style === 'tennis' ? `<path d="M111 235l-10 24q59 13 118 0l-10-24Z" fill="${kit}"/><path d="M103 257q57 14 114 0" stroke="${trim}" stroke-width="4" fill="none"/>` : ''}${badge}`),
    head: svg(`${rearHair}<ellipse cx="104" cy="124" rx="12" ry="17" fill="${skin}"/><ellipse cx="216" cy="124" rx="12" ry="17" fill="${skin}"/><path d="M106 106q-2-46 54-46t54 46v34q-3 44-54 46-50-2-54-46Z" fill="${skin}"/>${frontHair}<ellipse cx="120" cy="144" rx="10" ry="6" fill="${shade}" opacity=".4"/><ellipse cx="200" cy="144" rx="10" ry="6" fill="${shade}" opacity=".4"/><path d="M155 124l-4 18q9 5 17-1" fill="none" stroke="${shade}" stroke-width="4" stroke-linecap="round"/>${beard}`),
    brows: svg(`<path d="M119 93q14-7 29-1m24 0q15-6 29 1" fill="none" stroke="${hair}" stroke-width="${power ? 7 : 5}" stroke-linecap="round"/>`),
    detail: style === 'gym' ? svg('<g fill="none" stroke="#394448" stroke-width="3.5"><circle cx="135" cy="119" r="22"/><circle cx="185" cy="119" r="22"/><path d="M157 116q3-3 6 0m-50-4-9-3m103 3 9-3"/></g>') : empty,
  };
}
export const coachArt: Record<string, CoachArt> = {
  atlas: { ...atlasArt, detail: empty },
  ...Object.fromEntries(Object.entries(looks).map(([id, look]) => [id, makeCoach(look)])),
};

// Static portraits use the same face layers as the animated session characters.
function markup(layer: ReturnType<typeof svg>) {
  return decodeURIComponent(layer.uri.split(',')[1]).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}
export const coachPortraits = Object.fromEntries(Object.entries(coachArt).map(([id, art]) => [id, {
  uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="160" height="160" viewBox="80 38 160 160"><rect x="80" y="38" width="160" height="160" fill="#28251d"/>${markup(art.head)}${markup(art.eyes)}${markup(art.brows)}${markup(art.detail)}<g transform="translate(160 160) scale(1 .14) translate(-160 -160)">${markup(art.mouth)}</g></svg>`)}`,
}]));
