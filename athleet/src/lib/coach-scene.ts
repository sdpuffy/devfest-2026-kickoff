import * as THREE from 'three';
import type { sampleSpeech } from '@/lib/speech-animation';

export type CoachMotion = 'idle' | 'talking' | 'exercise' | 'celebrate' | 'thinking';

/** A locally built, articulated stylized character; no remote models or textures. */
export function createCoachScene() {
  const scene = new THREE.Scene();
  scene.background = new THREE.Color('#191812');
  scene.add(new THREE.HemisphereLight(0xffffff, 0x6b5633, 1.7));
  const key = new THREE.DirectionalLight(0xffecd0, 2.4);
  key.position.set(3, 5, 5); scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd46b, 1.7);
  rim.position.set(-3, 2, -2); scene.add(rim);
  const camera = new THREE.PerspectiveCamera(36, 1, 0.1, 50);
  camera.position.set(0, 2.95, 4.2); camera.lookAt(0, 2.58, 0);
  const skin = new THREE.MeshStandardMaterial({ color: '#70452f', roughness: 0.85 });
  const gold = new THREE.MeshStandardMaterial({ color: '#ffbd32', roughness: 0.7 });
  const purple = new THREE.MeshStandardMaterial({ color: '#6637a0' });
  const court = new THREE.MeshStandardMaterial({ color: '#3d3520' });
  const lips = new THREE.MeshStandardMaterial({ color: '#6b3d2d', roughness: .85 });
  const dark = new THREE.MeshStandardMaterial({ color: '#211815' });
  const white = new THREE.MeshStandardMaterial({ color: '#fff8e8' });
  const black = new THREE.MeshStandardMaterial({ color: '#100e13' });
  function ellipsoid(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 24, 16), material);
    mesh.position.set(x, y, z); mesh.scale.set(sx, sy, sz); parent.add(mesh); return mesh;
  }
  function box(parent: THREE.Object3D, material: THREE.Material, x: number, y: number, z: number, sx: number, sy: number, sz: number) {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(sx, sy, sz), material);
    mesh.position.set(x, y, z); parent.add(mesh); return mesh;
  }
  const floor = new THREE.Mesh(new THREE.CylinderGeometry(1.55, 1.65, 0.08, 64), court);
  floor.position.y = -0.08; scene.add(floor);
  const ring = new THREE.Mesh(new THREE.TorusGeometry(1.45, 0.015, 8, 64), gold);
  ring.rotation.x = Math.PI / 2; ring.position.y = -0.025; scene.add(ring);
  const body = new THREE.Group(); scene.add(body);
  ellipsoid(body, gold, 0, 1.9, 0, 0.59, 0.65, 0.32);
  box(body, purple, 0, 1.34, 0, 0.92, 0.15, 0.49);
  // Jersey number 23 made from geometry, so it renders identically on native and web.
  const segments = [[0, .12, .10, .025], [.045, .06, .025, .10], [0, 0, .10, .025], [-.045, -.06, .025, .10], [0, -.12, .10, .025]];
  for (const [x, y, w, h] of segments) box(body, purple, x - .1, y + 1.95, .302, w, h, .025);
  for (const [x, y, w, h] of segments) box(body, purple, (y === -.06 ? .045 : x) + .1, y + 1.95, .302, w, h, .025);
  ellipsoid(body, skin, 0, 2.52, 0, .23, .25, .22);
  const head = new THREE.Group(); head.position.set(0, 3.02, 0); body.add(head);
  // Broader temples, a long squared jaw, close-cropped hair and a sculpted full beard.
  ellipsoid(head, skin, 0, .02, 0, .365, .47, .31);
  ellipsoid(head, skin, 0, -.19, .035, .32, .29, .29);
  ellipsoid(head, dark, 0, .34, -.055, .342, .16, .28);
  for (const sign of [-1, 1]) {
    ellipsoid(head, dark, sign * .285, .22, -.02, .066, .18, .22);
    ellipsoid(head, skin, sign * .365, -.005, 0, .068, .125, .085);
    ellipsoid(head, skin, sign * .205, -.075, .21, .13, .135, .10);
    ellipsoid(head, dark, sign * .265, -.16, .12, .085, .24, .19);
  }
  const jaw = new THREE.Group(); head.add(jaw);
  ellipsoid(jaw, dark, 0, -.32, .11, .29, .20, .245);
  // Subtle curls along the beard's silhouette keep it from reading as a flat patch.
  for (let i = 0; i < 13; i++) {
    const angle = Math.PI * i / 12;
    ellipsoid(jaw, dark, Math.cos(angle) * .255, -.30 - Math.sin(angle) * .16, .23, .047, .061, .065);
  }
  ellipsoid(head, skin, 0, .015, .29, .07, .15, .075);
  ellipsoid(head, skin, 0, -.085, .342, .105, .066, .072);
  for (const sign of [-1, 1]) ellipsoid(head, dark, sign * .059, -.11, .375, .025, .014, .012);
  const mouth = ellipsoid(head, black, 0, -.225, .35, .135, .012, .035);
  const upperLip = ellipsoid(head, lips, 0, -.205, .373, .135, .025, .023);
  const lowerLip = ellipsoid(jaw, lips, 0, -.244, .374, .13, .027, .023);
  const teeth = box(head, white, 0, -.218, .377, .19, .028, .012);
  teeth.visible = false;
  for (const sign of [-1, 1]) {
    const moustache = ellipsoid(head, dark, sign * .073, -.172, .345, .082, .031, .031);
    moustache.rotation.z = sign * -.12;
  }
  const eyes: THREE.Group[] = [];
  const brows: THREE.Mesh[] = [];
  for (const sign of [-1, 1]) {
    const eye = new THREE.Group(); eye.position.set(sign * .145, .078, .282); head.add(eye); eyes.push(eye);
    ellipsoid(eye, white, 0, 0, 0, .079, .032, .032);
    ellipsoid(eye, dark, 0, 0, .027, .032, .031, .015);
    ellipsoid(eye, black, 0, 0, .039, .018, .023, .008);
    ellipsoid(eye, white, -.009, .012, .046, .007, .008, .004);
    const brow = ellipsoid(head, dark, sign * .145, .15, .284, .101, .029, .032);
    brow.rotation.z = sign * -.10; brows.push(brow);
  }
  const arms: THREE.Group[] = [], legs: THREE.Group[] = [], knees: THREE.Group[] = [];
  for (const sign of [-1, 1]) {
    const arm = new THREE.Group(); arm.position.set(sign * .57, 2.27, 0); body.add(arm); arms.push(arm);
    ellipsoid(arm, skin, sign * .05, -.23, 0, .215, .34, .21);
    ellipsoid(arm, sign === -1 ? purple : skin, sign * .08, -.64, .015, .14, .28, .15);
    ellipsoid(arm, skin, sign * .08, -.88, .02, .15, .17, .12);
    const leg = new THREE.Group(); leg.position.set(sign * .24, 1.33, 0); body.add(leg); legs.push(leg);
    ellipsoid(leg, gold, 0, -.20, 0, .24, .32, .25);
    ellipsoid(leg, skin, 0, -.41, 0, .16, .24, .17);
    const knee = new THREE.Group(); knee.position.y = -.56; leg.add(knee); knees.push(knee);
    ellipsoid(knee, skin, 0, -.24, 0, .12, .28, .13);
    ellipsoid(knee, white, 0, -.51, .08, .18, .13, .28);
  }
  let previousTime = 0;
  let opening = 0, lipWidth = 1, smile = 0, browLift = 0;
  const lookAt = new THREE.Vector3(0, 2.58, 0);
  return {
    scene, camera,
    animate(t: number, state: CoachMotion, reduced: boolean, speech: ReturnType<typeof sampleSpeech>) {
      const dt = Math.min(.05, Math.max(0, t - previousTime));
      previousTime = t;
      const blend = 1 - Math.exp(-dt * 22);
      const talking = state === 'talking';
      opening = THREE.MathUtils.lerp(opening, talking ? speech.open : 0, blend);
      lipWidth = THREE.MathUtils.lerp(lipWidth, talking ? speech.width : 1, blend);
      smile = THREE.MathUtils.lerp(smile, state === 'celebrate' ? 1 : talking ? speech.smile : .12, blend);
      browLift = THREE.MathUtils.lerp(browLift, talking ? speech.brow : state === 'thinking' ? -.5 : .1, blend);
      const wide = state === 'exercise' || state === 'celebrate';
      const cameraBlend = reduced ? 1 : 1 - Math.exp(-dt * 4);
      camera.position.lerp(new THREE.Vector3(0, wide ? 2.3 : 2.95, wide ? 7.8 : 4.2), cameraBlend);
      lookAt.lerp(new THREE.Vector3(0, wide ? 1.7 : 2.58, 0), cameraBlend);
      camera.lookAt(lookAt);
      const moving = reduced ? 0 : 1;
      const squat = state === 'exercise' ? (Math.sin(t * 2.8) + 1) * .5 * moving : 0;
      body.position.y = -.32 * squat + Math.sin(t * 2) * .015 * moving;
      body.rotation.y = Math.sin(t * .7) * .08 * moving;
      head.rotation.z = state === 'thinking' ? .14 : Math.sin(t * 1.6) * .025 * moving;
      head.rotation.x = talking ? -speech.emphasis * .045 * moving : 0;
      mouth.scale.y = .012 + opening * .085;
      mouth.scale.x = .135 * lipWidth + smile * .018;
      mouth.position.y = -.225 - opening * .035;
      jaw.position.y = -opening * .075;
      lowerLip.scale.x = upperLip.scale.x = .135 * lipWidth + smile * .018;
      upperLip.position.y = -.205 + smile * .008;
      lowerLip.position.y = -.244 - opening * .025;
      teeth.visible = opening > .28 || smile > .6;
      teeth.scale.x = lipWidth;
      eyes.forEach(eye => { eye.scale.y = t % 4.5 > 4.35 && !reduced ? .12 : 1 - smile * .18; });
      brows.forEach((brow, i) => {
        brow.position.y = .15 + browLift * .035;
        brow.rotation.z = (i === 0 ? 1 : -1) * (.1 - browLift * .13);
      });
      arms.forEach((arm, i) => {
        arm.rotation.x = -squat * 1.25;
        arm.rotation.z = (i === 0 ? 1 : -1) * (state === 'celebrate' ? 2.5 : state === 'talking' ? .22 + speech.emphasis * .18 * moving : .12);
      });
      legs.forEach(leg => { leg.rotation.x = -squat * .85; });
      knees.forEach(knee => { knee.rotation.x = squat * 1.65; });
    },
    dispose() {
      scene.traverse(node => {
        if (node instanceof THREE.Mesh) node.geometry.dispose();
      });
      [skin, gold, purple, court, lips, dark, white, black].forEach(material => material.dispose());
    },
  };
}
