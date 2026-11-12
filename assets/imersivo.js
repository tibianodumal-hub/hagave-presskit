/* HAGAVE · mundo imersivo
   Um único mundo 3D (Three.js) atrás do site: um vinil gigante feito de partículas,
   um campo de ondas sonoras embaixo e poeira no ar. A rolagem da página é a "agulha":
   cada seção é um capítulo, e a câmera viaja entre eles. Quando This Is America toca,
   o grave faz o mundo pulsar e o agudo faz brilhar.

   Tudo aqui é opcional: se a internet não baixar as bibliotecas, se o aparelho não tiver
   WebGL2 ou se a pessoa pedir menos movimento, o site continua igual ao de antes.
   Bibliotecas (versões fixas, via import map no index.html): three 0.186.0, gsap 3.13.0, lenis 1.3.4.
*/

const raiz = document.documentElement;
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
const estreitoMQ = matchMedia('(max-width: 860px)');
const econ = !!(navigator.connection && navigator.connection.saveData);
const fraco = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const TIER = (estreitoMQ.matches || !fino || fraco || econ) ? 'leve' : 'alto';

/* ---------------------------------------------------------------------------
   Capítulos: cada seção do site é um ponto da viagem.
   camera: posição, alvo e lente. mundo: brilho, névoa, giro do disco, onda, bloom.
--------------------------------------------------------------------------- */
const CAPITULOS = [
  { id: 'topo',       nome: 'After the noise',
    camera: { pos: [0, 1.5, 17],     alvo: [0, 0.35, 0],    fov: 38 },
    mundo:  { brilho: 1.0,  perto: 7,   longe: 62, giro: 0.16, onda: 0.55, bloom: 0.75 } },
  { id: 'bio',        nome: 'Bio',
    camera: { pos: [-11, 5.2, 9.5],  alvo: [3, -0.8, -1],   fov: 42 },
    mundo:  { brilho: 0.55, perto: 4,   longe: 46, giro: 0.12, onda: 0.5,  bloom: 0.5 } },
  { id: 'trajetoria', nome: 'Trajetória',
    camera: { pos: [7.4, 0.8, 4.6],  alvo: [-3, -0.05, -3.4], fov: 50 },
    mundo:  { brilho: 0.62, perto: 1.4, longe: 30, giro: 0.2,  onda: 0.4,  bloom: 0.55 } },
  { id: 'music',      nome: 'Music',
    camera: { pos: [-7.5, 8.5, 9.5], alvo: [-12.5, -2.2, -1.5], fov: 40 },
    mundo:  { brilho: 0.72, perto: 4,   longe: 44, giro: 0.3,  onda: 0.7,  bloom: 0.7 } },
  { id: 'sets',       nome: 'Sets',
    camera: { pos: [-6, 2.3, -11],   alvo: [10, -1.6, -34], fov: 48 },
    mundo:  { brilho: 0.85, perto: 3,   longe: 55, giro: 0.14, onda: 1.15, bloom: 0.6 } },
  { id: 'fotos',      nome: 'Fotos',
    camera: { pos: [0, 7, 30],       alvo: [0, -0.5, -4],   fov: 34 },
    mundo:  { brilho: 0.36, perto: 6,   longe: 34, giro: 0.1,  onda: 0.45, bloom: 0.4 } },
  { id: 'booking',    nome: 'Booking',
    camera: { pos: [0.01, 19, 2.6],  alvo: [0, 0, 0],       fov: 40 },
    mundo:  { brilho: 0.8,  perto: 8,   longe: 46, giro: 0.15, onda: 0.6,  bloom: 0.75 } }
];

const secoes = CAPITULOS.map(c => document.getElementById(c.id)).filter(Boolean);
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const damp = (a, b, l, dt) => a + (b - a) * (1 - Math.exp(-l * dt));
const lerp = (a, b, t) => a + (b - a) * t;
const suave = t => t * t * (3 - 2 * t);

/* ---------------------------------------------------------------------------
   Maestro da rolagem (baseado no scroll-conductor da skill build-threejs-scroll-worlds):
   transforma a posição da rolagem num número de capítulo fracionado (ex.: 2,35).
   O valor exato serve para menu/acessibilidade; o suavizado, para a câmera.
--------------------------------------------------------------------------- */
const maestro = (() => {
  let ancoras = [], exato = 0, larguraMedida = 0;
  const maxRolagem = () => Math.max(1, document.documentElement.scrollHeight - innerHeight);
  function mede() {
    const max = maxRolagem();
    larguraMedida = innerWidth;
    ancoras = secoes.map((el, i) => {
      if (i === 0) return 0;
      if (i === secoes.length - 1) return max;
      const r = el.getBoundingClientRect();
      return clamp(r.top + scrollY + r.height * 0.5 - innerHeight * 0.5, 0, max);
    });
    for (let i = 1; i < ancoras.length; i++) ancoras[i] = Math.max(ancoras[i], ancoras[i - 1] + 1);
    le();
  }
  function progresso(y) {
    y = clamp(y, 0, maxRolagem());
    for (let i = 0; i < ancoras.length - 1; i++) {
      if (y <= ancoras[i + 1]) return i + clamp((y - ancoras[i]) / Math.max(1, ancoras[i + 1] - ancoras[i]), 0, 1);
    }
    return ancoras.length - 1;
  }
  function le() { exato = progresso(scrollY); ouvintes.forEach(f => f(exato)); }
  const ouvintes = [];
  addEventListener('scroll', le, { passive: true });
  addEventListener('resize', () => {
    if (!fino && innerWidth === larguraMedida) return; // barra do navegador do celular: ignora
    mede();
  }, { passive: true });
  addEventListener('load', mede);
  if ('ResizeObserver' in window) { const ro = new ResizeObserver(() => mede()); secoes.forEach(s => ro.observe(s)); }
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(mede);
  mede();
  return { mede, get exato() { return exato; }, aoMudar: f => ouvintes.push(f), get ancoras() { return ancoras; } };
})();

/* ---------------------------------------------------------------------------
   Menu: marca o capítulo atual (aria-current) + trilho de capítulos no canto.
--------------------------------------------------------------------------- */
(() => {
  const links = Array.from(document.querySelectorAll('.cab nav a[href^="#"]'));
  const trilho = document.createElement('div');
  trilho.className = 'trilho';
  trilho.setAttribute('aria-hidden', 'true');
  trilho.innerHTML = CAPITULOS.map((c, i) =>
    `<span class="trilho-item" data-i="${i}"><i></i><b>${String(i + 1).padStart(2, '0')}</b><em>${c.nome}</em></span>`).join('');
  document.body.appendChild(trilho);
  const itens = Array.from(trilho.children);
  let atual = -1;
  // capítulo do menu = a seção que cruza a linha a 40% da altura da tela (exato, sem suavização)
  function marca() {
    const linha = innerHeight * 0.4;
    let i = 0;
    secoes.forEach((el, k) => { if (el.getBoundingClientRect().top <= linha) i = k; });
    if (i === atual) return;
    atual = i;
    const id = CAPITULOS[i].id;
    links.forEach(a => { if (a.getAttribute('href') === '#' + id) a.setAttribute('aria-current', 'true'); else a.removeAttribute('aria-current'); });
    itens.forEach((el, k) => el.classList.toggle('ativo', k === i));
    raiz.dataset.capitulo = id;
  }
  maestro.aoMudar(marca);
  marca();
})();

/* ---------------------------------------------------------------------------
   Loop do topo: pausa quando sai da tela (economiza bateria), volta quando reaparece.
--------------------------------------------------------------------------- */
(() => {
  const ab = document.querySelector('.abertura');
  if (!ab || !('IntersectionObserver' in window)) return;
  new IntersectionObserver(es => es.forEach(e => {
    const v = ab.querySelector('video');
    if (!v) return; // já virou a animação WebP
    if (e.isIntersecting) { if (v.paused) { const p = v.play(); if (p && p.catch) p.catch(() => {}); } }
    else if (!v.paused) v.pause();
  }), { threshold: 0 }).observe(ab);
})();

/* ---------------------------------------------------------------------------
   Áudio: lê o analisador que o player do site já cria (não existe um segundo player).
   kick/sub -> pulso; agudos -> brilho. Sem analisador, o mundo só "respira".
--------------------------------------------------------------------------- */
const audio = (() => {
  let dados = null, media = 0, pulso = 0, grave = 0, medio = 0, agudo = 0;
  function atualiza(dt, t) {
    const m = window.__musica;
    const tocando = !!(m && m.au && !m.au.paused);
    const an = m && m.analisador ? m.analisador() : null;
    let g = 0, md = 0, ag = 0;
    if (tocando && an) {
      if (!dados || dados.length !== an.frequencyBinCount) dados = new Uint8Array(an.frequencyBinCount);
      an.getByteFrequencyData(dados);
      const n = dados.length; // fftSize 256 -> 128 faixas de ~172 Hz
      g = (dados[0] + dados[1] + dados[2] * 0.5) / (255 * 2.5);
      let s = 0; for (let i = 3; i < 24; i++) s += dados[i]; md = s / (21 * 255);
      s = 0; const a0 = Math.floor(n * 0.3), a1 = Math.floor(n * 0.75); for (let i = a0; i < a1; i++) s += dados[i]; ag = s / ((a1 - a0) * 255);
    } else if (tocando) {
      g = 0.25 + 0.1 * Math.sin(t * 1.3); md = 0.25; ag = 0.1;
    }
    media = damp(media, g, 1.6, dt);
    const golpe = clamp((g - media * 1.04) * 5, 0, 1);
    pulso = Math.max(pulso * Math.exp(-dt * 7), golpe);
    grave = damp(grave, g, 10, dt); medio = damp(medio, md, 6, dt); agudo = damp(agudo, ag * 2.2, 14, dt);
    return { tocando, pulso, grave, medio, agudo: clamp(agudo, 0, 1) };
  }
  return { atualiza };
})();

/* ---------------------------------------------------------------------------
   Rolagem suave (Lenis) + revelações (GSAP ScrollTrigger). Desligado com "menos movimento".
--------------------------------------------------------------------------- */
async function iniciaMovimento() {
  if (reduz) return;
  let gsap, ScrollTrigger, Lenis;
  try {
    [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([
      import('gsap'), import('gsap/ScrollTrigger'), import('lenis')
    ]);
  } catch (e) { return; }
  gsap.registerPlugin(ScrollTrigger);

  const lenis = new Lenis({ lerp: 0.1, smoothWheel: true, wheelMultiplier: 0.95, autoRaf: false, anchors: false,
    prevent: node => !!(node && node.closest && node.closest('dialog')) });
  lenis.on('scroll', ScrollTrigger.update);
  gsap.ticker.add(time => lenis.raf(time * 1000));
  gsap.ticker.lagSmoothing(0);
  window.__lenis = lenis;

  // links do menu (#bio, #music...) deslizam com a mesma suavidade
  document.addEventListener('click', e => {
    const a = e.target.closest && e.target.closest('a[href^="#"]');
    if (!a || e.defaultPrevented || e.metaKey || e.ctrlKey || e.shiftKey) return;
    const hash = a.getAttribute('href');
    if (hash.length < 2 || hash === '#downloads' || hash === '#videos') return;
    const alvo = document.querySelector(hash);
    if (!alvo) return;
    e.preventDefault();
    const margem = parseFloat(getComputedStyle(alvo).scrollMarginTop) || 0;
    lenis.scrollTo(alvo, { offset: -margem, duration: 1.5, easing: t => 1 - Math.pow(1 - t, 4),
      onComplete: () => { if (!alvo.hasAttribute('tabindex')) alvo.setAttribute('tabindex', '-1'); alvo.focus({ preventScroll: true }); } });
    history.pushState(null, '', hash);
  });

  // painel Downloads aberto = página parada por baixo
  const painel = document.getElementById('downloads');
  if (painel) new MutationObserver(() => { painel.open ? lenis.stop() : lenis.start(); }).observe(painel, { attributes: true, attributeFilter: ['open'] });

  // abertura: o barulho (o loop) se dissolve no mundo enquanto a câmera desce
  const midia = document.querySelector('.abertura-midia'), lema = document.querySelector('.lema');
  if (midia) {
    gsap.timeline({ scrollTrigger: { trigger: '.abertura', start: 'top top', end: 'bottom top', scrub: 0.9 } })
      .to(midia, { opacity: 0.08, scale: 1.06, ease: 'none' }, 0)
      .to(lema, { yPercent: -160, opacity: 0, ease: 'none' }, 0);
  }

  // títulos de capítulo: entram uma vez, de baixo, com a nota logo depois
  gsap.utils.toArray('main section .cabecalho').forEach(cab => {
    const h = cab.querySelector('h2'), nota = cab.querySelector('.nota');
    const tl = gsap.timeline({ scrollTrigger: { trigger: cab, start: 'top 88%', once: true } });
    tl.fromTo(h, { yPercent: 60, autoAlpha: 0, clipPath: 'inset(0 0 100% 0)' },
                 { yPercent: 0, autoAlpha: 1, clipPath: 'inset(0 0 0% 0)', duration: 1, ease: 'power4.out', clearProps: 'clipPath' });
    if (nota) tl.fromTo(nota, { y: 14, autoAlpha: 0 }, { y: 0, autoAlpha: 1, duration: 0.8, ease: 'power3.out' }, 0.18);
  });

  addEventListener('load', () => ScrollTrigger.refresh());
  maestro.mede();
}

/* ---------------------------------------------------------------------------
   Mundo 3D
--------------------------------------------------------------------------- */
function temWebGL2() {
  try { const c = document.createElement('canvas'); return !!c.getContext('webgl2'); } catch (e) { return false; }
}

const VERT_COMUM = /* glsl */`
  uniform float uTime, uEscala, uBrilho, uPerto, uLonge, uPulso, uGrave, uMedio, uAgudo, uRot, uOnda;
  varying vec3 vCor; varying float vAlfa;
  float hash(float n){ return fract(sin(n) * 43758.5453); }
  void finaliza(vec3 p, float tam, vec3 cor, float alfa){
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float prof = -mv.z;
    gl_Position = projectionMatrix * mv;
    float px = tam * uEscala / max(prof, 0.001);
    gl_PointSize = clamp(px, 1.0, 26.0);
    float nevoa = 1.0 - smoothstep(uPerto, uLonge, prof);
    float pertoDemais = smoothstep(0.25, 1.4, prof);
    float sub = clamp(px / 1.6, 0.25, 1.0);       // ponto menor que 1,6 px: apaga um pouco em vez de piscar
    vCor = cor; vAlfa = alfa * nevoa * pertoDemais * sub * uBrilho;
  }
`;
const FRAG = /* glsl */`
  varying vec3 vCor; varying float vAlfa;
  void main(){
    vec2 c = gl_PointCoord - 0.5;
    float d = length(c);
    float a = smoothstep(0.5, 0.0, d);
    a *= a;
    if (a * vAlfa < 0.002) discard;
    gl_FragColor = vec4(vCor, a * vAlfa);
    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

// vinil: anéis de sulcos que giram, selo magenta no centro, reflexo em dois "leques"
const VERT_DISCO = VERT_COMUM + /* glsl */`
  attribute float aRaio, aAng, aSemente, aTipo, aLuz;
  uniform vec3 uSulco, uMagenta, uBranco;
  void main(){
    float ang = aAng + uRot;
    vec3 p = vec3(cos(ang) * aRaio, 0.0, sin(ang) * aRaio);
    float queda = exp(-aRaio * 0.32);
    p.y += uPulso * 0.55 * queda * (0.65 + 0.35 * sin(aRaio * 2.4 - uTime * 3.0));
    p.y += uGrave * 0.14 * sin(aRaio * 4.2 - uTime * 7.0);
    p.y += 0.018 * sin(aRaio * 9.0 + uTime * 0.6);
    float brilhoLeque = pow(abs(cos(ang - 0.7)), 26.0);           // reflexo fixo no mundo: o disco gira por baixo dele
    float sulco = aLuz * (0.45 + 1.6 * brilhoLeque);
    vec3 cor = uSulco * sulco;
    float alfa = 0.85;
    float tam = 0.034;
    if (aTipo > 0.5 && aTipo < 1.5) { cor = mix(uMagenta, uBranco, step(0.93, aSemente) * 0.6) * (0.9 + uPulso * 0.9); tam = 0.05; alfa = 0.9; }
    if (aTipo > 1.5) { cor = uBranco * (0.7 + 0.8 * brilhoLeque); tam = 0.045; }
    float faisca = step(0.993 - uAgudo * 0.03, hash(aSemente * 97.0 + floor(uTime * 14.0)));
    cor += mix(uBranco, uMagenta, step(0.5, aSemente)) * faisca * uAgudo * 2.2;
    tam *= 1.0 + uPulso * 0.45 * queda + faisca * uAgudo * 1.5;
    finaliza(p, tam, cor, alfa);
  }
`;

// campo de ondas: uma grade de pontos que ondula como um sinal de áudio
const VERT_CAMPO = VERT_COMUM + /* glsl */`
  attribute float aSemente;
  uniform vec3 uSulco, uMagenta;
  void main(){
    vec3 p = position;
    float w = sin(p.x * 0.22 + uTime * 0.35) * 0.6 + sin(p.z * 0.17 - uTime * 0.25) * 0.7 + sin((p.x + p.z) * 0.11 + uTime * 0.2) * 0.8;
    float d = length(p.xz);
    float anel = sin(d * 0.85 - uTime * 1.4 - uPulso * 1.5) * smoothstep(7.5, 12.0, d);
    float alt = uOnda * (w * 0.38 + anel * (0.22 + uMedio * 1.4)) + uPulso * 0.5 * exp(-d * 0.08) * smoothstep(7.0, 10.0, d);
    p.y += alt;
    float crista = smoothstep(0.35, 1.2, alt);
    vec3 cor = mix(uSulco * 0.55, uMagenta * 1.4, crista);
    float clareira = smoothstep(6.8, 9.5, d);      // espaço livre embaixo do disco
    finaliza(p, 0.07, cor, 0.8 * clareira);
  }
`;

// poeira: partículas soltas que sobem devagar, brilham nos agudos
const VERT_POEIRA = VERT_COMUM + /* glsl */`
  attribute float aSemente;
  uniform vec3 uBranco, uMagenta;
  void main(){
    vec3 p = position;
    p.y = mod(p.y + uTime * (0.08 + aSemente * 0.18), 20.0) - 5.0;
    p.x += sin(uTime * 0.2 + aSemente * 30.0) * 0.4;
    float pisca = 0.5 + 0.5 * sin(uTime * (1.0 + aSemente * 3.0) + aSemente * 50.0);
    vec3 cor = mix(uBranco, uMagenta, step(0.82, aSemente)) * (0.35 + 0.65 * pisca + uAgudo * 1.5);
    finaliza(p, 0.05 + aSemente * 0.04, cor, 0.5);
  }
`;

async function iniciaMundo() {
  const canvas = document.getElementById('mundo');
  if (!canvas) return;
  if (!temWebGL2()) { raiz.classList.add('sem-3d'); return; }

  let THREE;
  try { THREE = await import('three'); } catch (e) { raiz.classList.add('sem-3d'); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: TIER === 'alto' ? 'high-performance' : 'low-power' });
  } catch (e) { raiz.classList.add('sem-3d'); return; }

  const DPR_MAX = TIER === 'alto' ? 1.75 : 1.25;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
  renderer.setPixelRatio(dpr);
  renderer.setSize(innerWidth, innerHeight, false);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.NoToneMapping;

  const cena = new THREE.Scene();
  cena.background = new THREE.Color('#110c0a');
  const camera = new THREE.PerspectiveCamera(40, innerWidth / innerHeight, 0.1, 140);

  const U = {
    uTime: { value: 0 }, uEscala: { value: 1 }, uBrilho: { value: 1 }, uPerto: { value: 6 }, uLonge: { value: 60 },
    uPulso: { value: 0 }, uGrave: { value: 0 }, uMedio: { value: 0 }, uAgudo: { value: 0 }, uRot: { value: 0 }, uOnda: { value: 0.6 },
    uSulco: { value: new THREE.Color('#efe8e2') }, uMagenta: { value: new THREE.Color('#c23d7a') }, uBranco: { value: new THREE.Color('#fff4ee') }
  };
  const material = vert => new THREE.ShaderMaterial({
    uniforms: U, vertexShader: vert, fragmentShader: FRAG,
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending
  });

  const fator = TIER === 'alto' ? 1 : 0.42;
  let semente = 7;
  const aleat = () => { semente = (semente * 16807) % 2147483647; return (semente - 1) / 2147483646; };

  // --- vinil ---
  {
    const raio = [], ang = [], sem = [], tipo = [], luz = [];
    const ANEIS = Math.round(150 * Math.sqrt(fator));
    const R0 = 1.3, R1 = 6.0;
    for (let i = 0; i < ANEIS; i++) {
      const r = R0 + (R1 - R0) * (i / (ANEIS - 1));
      const faixa = (i % 30 === 0 || i % 30 === 1) ? 1.15 : 0.32 + 0.22 * aleat();   // intervalos entre faixas brilham mais
      const n = Math.round(r * 62 * Math.sqrt(fator));
      const fase = aleat() * Math.PI * 2;
      for (let k = 0; k < n; k++) { raio.push(r + (aleat() - 0.5) * 0.01); ang.push(fase + (k / n) * Math.PI * 2); sem.push(aleat()); tipo.push(0); luz.push(faixa); }
    }
    const SELO = Math.round(2200 * fator);
    for (let k = 0; k < SELO; k++) { const r = 0.12 + Math.sqrt(aleat()) * 1.02; raio.push(r); ang.push(aleat() * Math.PI * 2); sem.push(aleat()); tipo.push(1); luz.push(1); }
    const BORDA = Math.round(900 * Math.sqrt(fator));
    for (let k = 0; k < BORDA; k++) { raio.push(6.08); ang.push((k / BORDA) * Math.PI * 2); sem.push(aleat()); tipo.push(2); luz.push(1); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(new Float32Array(raio.length * 3), 3));
    g.setAttribute('aRaio', new THREE.Float32BufferAttribute(raio, 1));
    g.setAttribute('aAng', new THREE.Float32BufferAttribute(ang, 1));
    g.setAttribute('aSemente', new THREE.Float32BufferAttribute(sem, 1));
    g.setAttribute('aTipo', new THREE.Float32BufferAttribute(tipo, 1));
    g.setAttribute('aLuz', new THREE.Float32BufferAttribute(luz, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(), 7.5);
    const disco = new THREE.Points(g, material(VERT_DISCO));
    disco.name = 'vinil';
    cena.add(disco);
  }

  // --- campo de ondas ---
  {
    const NX = Math.round(190 * Math.sqrt(fator)), NZ = Math.round(110 * Math.sqrt(fator));
    const pos = new Float32Array(NX * NZ * 3), sem = new Float32Array(NX * NZ);
    let j = 0;
    for (let z = 0; z < NZ; z++) for (let x = 0; x < NX; x++) {
      pos[j * 3] = -38 + 76 * (x / (NX - 1)) + (aleat() - 0.5) * 0.15;
      pos[j * 3 + 1] = -2.4;
      pos[j * 3 + 2] = -72 + 88 * (z / (NZ - 1)) + (aleat() - 0.5) * 0.15;
      sem[j++] = aleat();
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSemente', new THREE.BufferAttribute(sem, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, -2, -28), 70);
    const campo = new THREE.Points(g, material(VERT_CAMPO));
    campo.name = 'campo-de-ondas';
    cena.add(campo);
  }

  // --- poeira ---
  {
    const N = Math.round(2400 * fator);
    const pos = new Float32Array(N * 3), sem = new Float32Array(N);
    for (let i = 0; i < N; i++) { pos[i * 3] = (aleat() - 0.5) * 70; pos[i * 3 + 1] = aleat() * 20 - 5; pos[i * 3 + 2] = -60 + aleat() * 85; sem[i] = aleat(); }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('aSemente', new THREE.BufferAttribute(sem, 1));
    g.boundingSphere = new THREE.Sphere(new THREE.Vector3(0, 5, -18), 70);
    const poeira = new THREE.Points(g, material(VERT_POEIRA));
    poeira.name = 'poeira';
    cena.add(poeira);
  }

  // --- pós-processamento (só no tier alto): bloom suave ---
  let composer = null, bloom = null;
  if (TIER === 'alto') {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }] = await Promise.all([
        import('three/addons/postprocessing/EffectComposer.js'), import('three/addons/postprocessing/RenderPass.js'),
        import('three/addons/postprocessing/UnrealBloomPass.js'), import('three/addons/postprocessing/OutputPass.js')
      ]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(cena, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.55, 0.12);
      composer.addPass(bloom);
      composer.addPass(new OutputPass());
      composer.setSize(innerWidth, innerHeight);
    } catch (e) { composer = null; bloom = null; }
  }

  // --- câmera: curvas pelos pontos de cada capítulo ---
  let curvaPos, curvaAlvo, fovs;
  function montaCurvas() {
    const celular = estreitoMQ.matches || innerHeight > innerWidth;
    const P = [], A = [];
    fovs = [];
    CAPITULOS.forEach(c => {
      const alvo = new THREE.Vector3(...c.camera.alvo);
      const pos = new THREE.Vector3(...c.camera.pos);
      if (celular) pos.sub(alvo).multiplyScalar(1.28).add(alvo);  // celular: afasta a câmera para caber o mesmo enquadramento
      P.push(pos); A.push(alvo); fovs.push(c.camera.fov + (celular ? 8 : 0));
    });
    curvaPos = new THREE.CatmullRomCurve3(P, false, 'centripetal', 0.5);
    curvaAlvo = new THREE.CatmullRomCurve3(A, false, 'centripetal', 0.5);
  }
  montaCurvas();
  estreitoMQ.addEventListener('change', montaCurvas);

  const N = CAPITULOS.length - 1;
  const vPos = new THREE.Vector3(), vAlvo = new THREE.Vector3(), vDir = new THREE.Vector3(), vLado = new THREE.Vector3(), CIMA = new THREE.Vector3(0, 1, 0);
  function estadoMundo(p) {
    const i = clamp(Math.floor(p), 0, N), k = Math.min(N, i + 1), t = suave(clamp(p - i, 0, 1));
    const a = CAPITULOS[i].mundo, b = CAPITULOS[k].mundo, o = {};
    for (const chave in a) o[chave] = lerp(a[chave], b[chave], t);
    o.fov = lerp(fovs[i], fovs[k], t);
    return o;
  }

  // --- mouse/toque: leve paralaxe ---
  let mx = 0, my = 0, px = 0, py = 0;
  if (!reduz) addEventListener('pointermove', e => { mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1; }, { passive: true });

  // --- tamanho ---
  function tamanho() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight); }
    pedeQuadro();
  }
  let ultimaLargura = innerWidth, ultimaAltura = innerHeight;
  addEventListener('resize', () => {
    // no celular a barra de endereço muda a altura o tempo todo: só refaz se mudar de verdade
    if (!fino && innerWidth === ultimaLargura && Math.abs(innerHeight - ultimaAltura) < 140) return;
    ultimaLargura = innerWidth; ultimaAltura = innerHeight;
    tamanho();
  }, { passive: true });

  // --- laço de desenho ---
  let suavizado = maestro.exato, tempo = reduz ? 14 : 0, rot = 0, antes = 0, raf = 0, rodando = false, pendente = false;
  let somaDt = 0, quadros = 0, rebaixou = 0;
  const painel = document.getElementById('downloads');
  const pausado = () => document.hidden || (painel && painel.open) || contextoPerdido;
  let contextoPerdido = false;

  function desenha(dt) {
    const exato = maestro.exato;
    // com "menos movimento" a câmera fica parada no capítulo mais próximo
    suavizado = reduz ? Math.round(exato) : damp(suavizado, exato, 4.2, dt);
    if (Math.abs(suavizado - exato) < 1e-4) suavizado = exato;
    const s = clamp(suavizado, 0, N);
    const w = estadoMundo(s);

    const som = reduz ? { tocando: false, pulso: 0, grave: 0, medio: 0, agudo: 0 } : audio.atualiza(dt, tempo);
    if (!reduz) {
      tempo += dt;
      rot += dt * (w.giro + (som.tocando ? 0.42 : 0));
      px = damp(px, mx, 2.2, dt); py = damp(py, my, 2.2, dt);
    }

    curvaPos.getPoint(s / N, vPos);
    curvaAlvo.getPoint(s / N, vAlvo);
    vDir.subVectors(vAlvo, vPos).normalize();
    vLado.crossVectors(vDir, CIMA).normalize();
    vPos.addScaledVector(vLado, px * 0.55).addScaledVector(CIMA, -py * 0.32);
    camera.position.copy(vPos);
    camera.lookAt(vAlvo);
    const fov = w.fov - som.pulso * 0.6;
    if (Math.abs(camera.fov - fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }

    U.uTime.value = tempo;
    U.uRot.value = rot;
    U.uBrilho.value = w.brilho * (1 + som.grave * 0.25);
    U.uPerto.value = w.perto; U.uLonge.value = w.longe;
    U.uOnda.value = w.onda;
    U.uPulso.value = som.pulso; U.uGrave.value = som.grave; U.uMedio.value = som.medio; U.uAgudo.value = som.agudo;
    U.uEscala.value = renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));

    if (composer && bloom) { bloom.strength = w.bloom * (1 + som.pulso * 0.6); composer.render(); }
    else renderer.render(cena, camera);
  }

  function quadro(agora) {
    raf = 0;
    if (!rodando || pausado()) { rodando = false; return; }
    const dt = antes ? Math.min((agora - antes) / 1000, 1 / 30) : 1 / 60;
    const bruto = antes ? (agora - antes) : 16;
    antes = agora;
    desenha(dt);
    // governador de qualidade: se ficar pesado por ~2 s, baixa a resolução e tira o bloom
    somaDt += bruto; quadros++;
    if (quadros >= 120) {
      const media = somaDt / quadros; somaDt = 0; quadros = 0;
      if (media > 26 && rebaixou < 2) {
        rebaixou++;
        if (rebaixou === 1 && composer) { composer = null; bloom = null; }
        dpr = Math.max(1, dpr - 0.35);
        tamanho();
      }
    }
    raf = requestAnimationFrame(quadro);
  }
  function liga() {
    if (reduz) { pedeQuadro(); return; }
    if (rodando || pausado()) return;
    rodando = true; antes = 0; raf = requestAnimationFrame(quadro);
  }
  // modo "menos movimento": desenha só quando algo muda (rolagem/tamanho)
  function pedeQuadro() {
    if (!reduz || pendente || pausado()) return;
    pendente = true;
    requestAnimationFrame(() => { pendente = false; desenha(0); });
  }
  if (reduz) maestro.aoMudar(pedeQuadro);

  document.addEventListener('visibilitychange', () => { if (!document.hidden) liga(); });
  if (painel) {
    painel.addEventListener('close', liga);
    new MutationObserver(() => { if (!painel.open) liga(); }).observe(painel, { attributes: true, attributeFilter: ['open'] });
  }

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    contextoPerdido = true; rodando = false;
    raiz.classList.remove('mundo-3d'); raiz.classList.add('sem-3d');
  });

  // aquece os shaders antes de mostrar (evita travadinha no primeiro quadro)
  try { if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) await renderer.compileAsync(cena, camera); else renderer.compile(cena, camera); } catch (e) {}
  desenha(1 / 60);
  raiz.classList.add('mundo-3d');
  liga();

  window.__mundo = { tier: TIER, info: () => ({ ...renderer.info.render, dpr, bloom: !!composer, pontos: cena.children.reduce((s, o) => s + o.geometry.attributes.aSemente.count, 0) }) };
}

iniciaMovimento();
iniciaMundo();
