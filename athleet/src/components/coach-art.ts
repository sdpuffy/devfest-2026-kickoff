// Layered SVG art for the coaches: original, fan-made characters.
// Every coach shares one 320px rig (same joints and pivots), so the poses in lib/coach-motion.ts
// and the animated layers in animated-coach.tsx work for all of them. Only the look changes.

export type CoachLook = {
  skin: string;
  shade: string;
  hair: string;
  /** Jersey/top color. Also used for the movement demos and as the coach's main color. */
  kit: string;
  /** Piping, shorts trim and emblem color. */
  trim: string;
  /** Leg color: skin for shorts, a fabric color for pants or leggings. */
  legs: string;
  shoe: string;
  build: 'power' | 'normal';
  sleeves: boolean;
  skirt?: boolean;
  /** Drawn behind the head (ponytails, buns, long hair). */
  backHair: string;
  /** Drawn over the head (hairline, fringe, headbands). */
  frontHair: string;
  /** Beards, freckles, earrings: drawn on the face. */
  face: string;
  /** Chest emblem. */
  emblem: string;
  /** Glasses etc., layered above the eyes. */
  detail?: string;
};

export const COACH_LOOKS: Record<string, CoachLook> = {
  // Basketball veteran. Teal and orange, a globe emblem (Atlas carries the world), trimmed beard.
  atlas: {
    skin: '#8d5a3b', shade: '#6b412c', hair: '#1e1b24', kit: '#1f8a8a', trim: '#f28c28', legs: '#8d5a3b', shoe: '#f28c28',
    build: 'normal', sleeves: false,
    backHair: '',
    frontHair: '<path d="M106 104q-5-48 54-48t54 48l-7-15q-47-21-94 0Z" fill="#1e1b24"/>',
    face: '<path d="M140 166q20 14 40 0l-2 13q-18 10-36 0Z" fill="#1e1b24"/><path d="M142 154q18-7 36 0" fill="none" stroke="#1e1b24" stroke-width="6" stroke-linecap="round"/>',
    emblem: '<circle cx="160" cy="211" r="13" fill="none" stroke="#f28c28" stroke-width="4"/><ellipse cx="160" cy="211" rx="6" ry="13" fill="none" stroke="#f28c28" stroke-width="3"/><path d="M147 211h26" stroke="#f28c28" stroke-width="3"/>',
  },
  // Old-school power lifter. Indigo and steel, a riveted shield, buzz cut and a full beard.
  ironside: {
    skin: '#c98b62', shade: '#a56c4a', hair: '#5a3a22', kit: '#3d4f8a', trim: '#c0c8d0', legs: '#c98b62', shoe: '#2b2f3a',
    build: 'power', sleeves: false,
    backHair: '',
    frontHair: '<path d="M107 102q-2-44 53-44t53 44q-52-26-106 0Z" fill="#5a3a22" opacity=".9"/>',
    face: '<path d="M106 128q2 54 54 58 52-4 54-58l-11 12q-7 24-21 26-12-9-22-9t-22 9q-14-2-21-26Z" fill="#5a3a22"/>',
    emblem: '<path d="M146 197h28v15q0 13-14 20-14-7-14-20Z" fill="#c0c8d0"/><g fill="#3d4f8a"><circle cx="151" cy="202" r="2.2"/><circle cx="169" cy="202" r="2.2"/></g><path d="M160 203v20m-7-10h14" stroke="#3d4f8a" stroke-width="3" stroke-linecap="round"/>',
  },
  // Sprinter. Flame red with gold, a flame emblem, spiky hair with gold tips.
  blaze: {
    skin: '#6e4630', shade: '#52321f', hair: '#151318', kit: '#e2462f', trim: '#ffd23f', legs: '#6e4630', shoe: '#ffd23f',
    build: 'normal', sleeves: false,
    backHair: '',
    frontHair: '<path d="M106 104q-3-30 13-42l7 10 9-19 11 15 13-21 11 19 13-15 6 17q22 10 25 36l-12-14q-41-15-83 0Z" fill="#151318"/><path d="M135 56l-3 8m28-15-1 9m23-3-3 8" stroke="#ffd23f" stroke-width="4" stroke-linecap="round"/>',
    face: '',
    emblem: '<path d="M160 195q13 11 8 23 7-4 7-11 7 13-4 23-11 7-22-2-8-11 3-23 0 9 6 9-4-10 2-19Z" fill="#ffd23f"/>',
  },
  // Midfield captain. Royal blue and white, a forward chevron, swept-up quiff and stubble.
  vanguard: {
    skin: '#c48a63', shade: '#a06d4c', hair: '#2a211c', kit: '#2f6fd0', trim: '#fff3d5', legs: '#c48a63', shoe: '#fff3d5',
    build: 'normal', sleeves: true,
    backHair: '',
    frontHair: '<path d="M105 108q-7-35 12-48 19-14 49-11 34 3 44 27 6 15 2 31l-8-17q-24-7-47-2l11-15q-31 9-51 31Z" fill="#2a211c"/><path d="M150 54q25-4 44 12" fill="none" stroke="#4a3b31" stroke-width="4" stroke-linecap="round"/>',
    face: '<path d="M116 158q44 40 88 0" fill="none" stroke="#2a211c" stroke-width="12" opacity=".18" stroke-linecap="round"/>',
    emblem: '<path d="M147 216l13-14 13 14m-26 12 13-14 13 14" fill="none" stroke="#fff3d5" stroke-width="5" stroke-linecap="round" stroke-linejoin="round"/>',
  },
  // Tennis competitor. Violet and ball-lime, a tennis ball emblem, high puff ponytail.
  rally: {
    skin: '#9a6040', shade: '#77452d', hair: '#2b1d19', kit: '#7b3fa0', trim: '#c6f04a', legs: '#9a6040', shoe: '#fff3d5',
    build: 'normal', sleeves: false, skirt: true,
    backHair: '<circle cx="160" cy="40" r="27" fill="#2b1d19"/><circle cx="142" cy="34" r="12" fill="#2b1d19"/><circle cx="178" cy="34" r="12" fill="#2b1d19"/>',
    frontHair: '<path d="M106 104q-4-48 54-48t54 48q-9-19-54-25-45 6-54 25Z" fill="#2b1d19"/>',
    face: '<circle cx="104" cy="140" r="4" fill="#c6f04a"/><circle cx="216" cy="140" r="4" fill="#c6f04a"/>',
    emblem: '<circle cx="160" cy="211" r="11" fill="#c6f04a"/><path d="M151 204q8 7 0 14m18-14q-8 7 0 14" fill="none" stroke="#fff3d5" stroke-width="2.5"/>',
  },
  // Martial artist. White gi with crimson piping, black belt, sleek bob with a crimson clip.
  strike: {
    skin: '#e3b48e', shade: '#c58f6d', hair: '#1c1a20', kit: '#ece7da', trim: '#d63a3a', legs: '#ece7da', shoe: '#e3b48e',
    build: 'normal', sleeves: true,
    backHair: '<path d="M101 152q-11-62 21-86h76q32 24 21 86l-17 4V98H118v58Z" fill="#1c1a20"/>',
    frontHair: '<path d="M106 106q-4-50 54-50t54 50q-8-6-12-15-18 15-42 3-20 14-46 7Z" fill="#1c1a20"/><path d="M182 74l18-8m-16 14 18-8" stroke="#d63a3a" stroke-width="5" stroke-linecap="round"/>',
    face: '',
    emblem: '<path d="M138 176l22 26 22-26" fill="none" stroke="#c9c1ad" stroke-width="5"/><path d="M113 226q47 10 94 0v9q-47 10-94 0Z" fill="#1c1a20"/><path d="M160 233l-8 16m8-16 8 16" stroke="#1c1a20" stroke-width="5" stroke-linecap="round"/>',
  },
  // Everyday gym grinder. Mustard and charcoal, an anvil emblem, messy bun and round glasses.
  anvil: {
    skin: '#e8b48c', shade: '#c78c6c', hair: '#8a5a2b', kit: '#d9a21b', trim: '#2f3a45', legs: '#2f3a45', shoe: '#2f3a45',
    build: 'normal', sleeves: true,
    backHair: '<circle cx="160" cy="46" r="21" fill="#8a5a2b"/><path d="M146 38q8-8 18-4m-5 21q10-2 14-11" fill="none" stroke="#6b4420" stroke-width="3" stroke-linecap="round"/>',
    frontHair: '<path d="M106 108q-6-50 56-52 58 2 52 52l-10-18q-30-2-48-20-14 20-50 38Z" fill="#8a5a2b"/>',
    face: '<g fill="#c78c6c" opacity=".7"><circle cx="122" cy="138" r="1.8"/><circle cx="128" cy="143" r="1.8"/><circle cx="198" cy="138" r="1.8"/><circle cx="192" cy="143" r="1.8"/></g>',
    emblem: '<path d="M140 200h38v8l-7 3v5h-6v5h8v6h-30v-6h8v-5h-4q-3-9-11-11Z" fill="#2f3a45"/>',
    detail: '<g fill="none" stroke="#2f3a45" stroke-width="3.5"><circle cx="135" cy="119" r="22"/><circle cx="185" cy="119" r="22"/><path d="M157 116q3-3 6 0m-50-4-9-3m103 3 9-3"/></g>',
  },
};

function svg(markup: string) {
  return { uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="320" height="320" viewBox="0 0 320 320">${markup}</svg>`)}` };
}
type Layer = ReturnType<typeof svg>;
export type CoachArt = Record<
  'left' | 'right' | 'leftThigh' | 'rightThigh' | 'leftShin' | 'rightShin' | 'leftShoe' | 'rightShoe'
  | 'floor' | 'body' | 'head' | 'eyes' | 'brows' | 'mouth' | 'confetti' | 'detail',
  Layer
>;

// Layers every coach shares.
const shared = {
  floor: svg('<ellipse cx="160" cy="301" rx="94" ry="10" fill="#28251d"/>'),
  eyes: svg('<ellipse cx="135" cy="116" rx="17" ry="21" fill="#fff9e9"/><ellipse cx="185" cy="116" rx="17" ry="21" fill="#fff9e9"/><g fill="#202a43"><ellipse cx="138" cy="118" rx="9" ry="14"/><ellipse cx="182" cy="118" rx="9" ry="14"/></g><g fill="#fff9e9"><circle cx="141" cy="112" r="4"/><circle cx="185" cy="112" r="4"/></g>'),
  mouth: svg('<path d="M144 160q16 5 32 0-1 20-16 20t-16-20" fill="#120f18"/><path d="M146 161q14 3 28 0l-3 6h-22Z" fill="#fff3d5"/><path d="M151 176q9-9 18 0-9 6-18 0" fill="#ef685b"/>'),
  confetti: svg('<g fill="#ffcf32"><path d="M58 69l5 13 14 5-14 5-5 14-5-14-14-5 14-5Z"/><path d="M261 44l4 11 11 4-11 4-4 11-4-11-11-4 11-4Z"/></g><g fill="none" stroke-width="6" stroke-linecap="round"><path d="M42 146l8 7m217-30 10-8" stroke="#ef685b"/><path d="M87 45l5 11m135-24-4 12" stroke="#81b7c9"/></g>'),
};

function makeCoach(look: CoachLook): CoachArt {
  const { skin, shade, hair, kit, trim, legs, shoe, build, sleeves, skirt } = look;
  const power = build === 'power';
  const arm = (left: boolean) => {
    const path = left ? 'M112 181Q85 194 83 222' : 'M208 181Q235 194 237 222';
    const x = left ? 82 : 238;
    const sleeve = sleeves ? `<path d="${left ? 'M112 181L100 188' : 'M208 181L220 188'}" stroke="${kit}" stroke-width="${power ? 36 : 29}" stroke-linecap="round"/>` : '';
    const muscle = power ? `<path d="M${left ? 92 : 228} 190q${left ? '-12' : '12'} 8 0 14" fill="none" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>` : '';
    return svg(`<path d="${path}" fill="none" stroke="${shade}" stroke-width="${power ? 36 : 26}" stroke-linecap="round"/><path d="${path}" fill="none" stroke="${skin}" stroke-width="${power ? 29 : 21}" stroke-linecap="round"/>${sleeve}<path d="M${x} 220v6" stroke="${trim}" stroke-width="24"/><circle cx="${x}" cy="232" r="13" fill="${skin}"/><path d="M${x - 4} 232l5 3" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>${muscle}`);
  };
  const leg = (left: boolean, part: 'thigh' | 'shin' | 'shoe') => {
    const x = left ? 137 : 183;
    if (part === 'thigh') return svg(`<path d="M${x} 244V272" stroke="${legs}" stroke-width="23" stroke-linecap="round"/>`);
    if (part === 'shin') {
      const sock = legs === skin ? `<path d="M${x - 10} 282h20" stroke="#fff3d5" stroke-width="14"/><path d="M${x - 10} 280h20" stroke="${trim}" stroke-width="4"/>` : '';
      return svg(`<path d="M${x} 272V291" stroke="${legs}" stroke-width="19" stroke-linecap="round"/>${sock}`);
    }
    if (shoe === skin) return svg(`<path d="M${x - 11} 288Q${x} 283 ${x + 10} 290l${left ? '-2' : '12'} 7q3 6-7 7h-27q-8-2-4-8Z" fill="${skin}"/><path d="M${x - 16} 300h30" stroke="${shade}" stroke-width="3" stroke-linecap="round"/>`);
    return svg(`<path d="M${x - 11} 286Q${x} 280 ${x + 12} 288l${left ? '-2' : '16'} 8q5 8-8 9h-31q-10-2-6-10Z" fill="${shoe}"/><path d="M${x - 22} 300h39" stroke="#fff3d5" stroke-width="7" stroke-linecap="round"/><path d="M${x - 6} 288l12 4m-15 1 13 4" stroke="${shoe === '#fff3d5' ? kit : '#fff3d5'}" stroke-width="3" stroke-linecap="round"/>`);
  };
  const shorts = skirt
    ? `<path d="M111 235l-10 24q59 13 118 0l-10-24Z" fill="${kit}"/><path d="M103 257q57 14 114 0" stroke="${trim}" stroke-width="4" fill="none"/>`
    : `<path d="M109 237l-3 18 44 5 10-14 10 14 44-5-3-18" fill="${legs === skin ? kit : legs}" stroke="${trim}" stroke-width="5" stroke-linejoin="round"/>`;
  return {
    ...shared,
    left: arm(true), right: arm(false),
    leftThigh: leg(true, 'thigh'), rightThigh: leg(false, 'thigh'),
    leftShin: leg(true, 'shin'), rightShin: leg(false, 'shin'),
    leftShoe: leg(true, 'shoe'), rightShoe: leg(false, 'shoe'),
    body: svg(`<path d="M145 158h30v28h-30Z" fill="${shade}"/><path d="M${power ? 109 : 117} 174Q160 165 ${power ? 211 : 203} 174l${power ? 5 : 10} 63q-56 18-112 0Z" fill="${kit}"/><path d="M116 180l-7 49m95-49 7 49" stroke="${trim}" stroke-width="6"/><path d="M130 174q30 28 60 0" fill="none" stroke="${skin}" stroke-width="8"/><path d="M130 174q30 28 60 0" fill="none" stroke="${trim}" stroke-width="4"/>${shorts}${look.emblem}`),
    head: svg(`${look.backHair}<ellipse cx="104" cy="124" rx="12" ry="17" fill="${skin}"/><ellipse cx="216" cy="124" rx="12" ry="17" fill="${skin}"/><path d="M106 106q-2-46 54-46t54 46v34q-3 44-54 46-50-2-54-46Z" fill="${skin}"/>${look.frontHair}<ellipse cx="120" cy="144" rx="10" ry="6" fill="${shade}" opacity=".4"/><ellipse cx="200" cy="144" rx="10" ry="6" fill="${shade}" opacity=".4"/><path d="M155 124l-4 18q9 5 17-1" fill="none" stroke="${shade}" stroke-width="4" stroke-linecap="round"/>${look.face}`),
    brows: svg(`<path d="M119 93q14-7 29-1m24 0q15-6 29 1" fill="none" stroke="${hair}" stroke-width="${power ? 7 : 5}" stroke-linecap="round"/>`),
    detail: svg(look.detail ?? ''),
  };
}

export const coachArt: Record<string, CoachArt> = Object.fromEntries(
  Object.entries(COACH_LOOKS).map(([id, look]) => [id, makeCoach(look)]),
);

// Static portraits use the same face layers as the animated session characters.
function markup(layer: Layer) {
  return decodeURIComponent(layer.uri.split(',')[1]).replace(/^<svg[^>]*>/, '').replace(/<\/svg>$/, '');
}
export const coachPortraits = Object.fromEntries(Object.entries(coachArt).map(([id, art]) => [id, {
  uri: `data:image/svg+xml;utf8,${encodeURIComponent(`<svg xmlns="http://www.w3.org/2000/svg" width="176" height="176" viewBox="72 14 176 176"><rect x="72" y="14" width="176" height="176" fill="${COACH_LOOKS[id].kit}"/><rect x="72" y="14" width="176" height="176" fill="#16140f" opacity=".55"/>${markup(art.head)}${markup(art.eyes)}${markup(art.brows)}${markup(art.detail)}<g transform="translate(160 160) scale(1 .14) translate(-160 -160)">${markup(art.mouth)}</g></svg>`)}`,
}]));
