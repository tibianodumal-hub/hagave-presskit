/* HAGAVE · mundo imersivo
   Um único mundo 3D (Three.js) atrás do site: um vinil gigante feito de partículas,
   um campo de ondas sonoras embaixo e poeira no ar. A rolagem da página é a "agulha":
   cada seção é um capítulo, e a câmera viaja entre eles. Quando This Is America toca,
   o grave faz o mundo pulsar e o agudo faz brilhar.

   Tudo aqui é opcional: se a internet não baixar as bibliotecas, se o aparelho não tiver
   WebGL2 ou se a pessoa pedir menos movimento, o site continua igual ao de antes.
   Bibliotecas (versões fixas, endereços completos do jsDelivr "+esm", sem import map — assim funciona
   também em iPhone antigo e nos navegadores de dentro do Instagram/TikTok): three 0.186.0, gsap 3.13.0, lenis 1.3.4.
   Os addons do three (+esm) importam exatamente /npm/three@0.186.0/+esm, a mesma instância usada aqui.

   Diagnóstico: o resultado fica em <html data-mundo="...">; com ?diag no endereço aparece um painel.
*/
const CDN = 'https://cdn.jsdelivr.net/npm/';
const URL_THREE = CDN + 'three@0.186.0/+esm';
const addon = nome => CDN + 'three@0.186.0/examples/jsm/postprocessing/' + nome + '.js/+esm';
const URL_GSAP = CDN + 'gsap@3.13.0/+esm';
const URL_ST = CDN + 'gsap@3.13.0/ScrollTrigger/+esm';
const URL_LENIS = CDN + 'lenis@1.3.4/+esm';

const DIAG = { motivo: 'carregando', erro: '', three: false, gsap: false, lenis: false, webgl2: null, gpu: '', fps: 0, tier: '', dpr: 0, pontoMax: 0 };
window.__diag = DIAG;
function marcaMundo(motivo, detalhe) {
  DIAG.motivo = motivo;
  if (detalhe) DIAG.erro = String(detalhe && detalhe.message || detalhe).slice(0, 160);
  document.documentElement.dataset.mundo = motivo;
  try { console.info('[HAGAVE 3D] ' + motivo + (detalhe ? ' — ' + DIAG.erro : '')); } catch (e) {}
}
addEventListener('error', e => { DIAG.erro = String(e.message || e.error || 'erro').slice(0, 160); });
addEventListener('unhandledrejection', e => { DIAG.erro = String((e.reason && e.reason.message) || e.reason || 'promessa').slice(0, 160); });

const raiz = document.documentElement;
const reduz = matchMedia('(prefers-reduced-motion: reduce)').matches;
const fino = matchMedia('(hover: hover) and (pointer: fine)').matches;
const estreitoMQ = matchMedia('(max-width: 860px)');
const econ = !!(navigator.connection && navigator.connection.saveData);
const fraco = (navigator.hardwareConcurrency || 8) <= 4 || (navigator.deviceMemory || 8) <= 4;
const TIER = (estreitoMQ.matches || !fino || fraco || econ) ? 'leve' : 'alto';
// Regra única: celular/tablet = toque como ponteiro principal OU tela até 860 px.
// Nesses aparelhos NÃO existe mundo 3D (nem baixa three/gsap/lenis): o loop do topo é o principal
// e atrás do conteúdo fica só uma camada de textura com glitch (decisão do HV).
const CELULAR = matchMedia('(pointer: coarse)').matches || innerWidth <= 860;

/* ---------------------------------------------------------------------------
   Capítulos: cada seção do site é um ponto da viagem.
   camera: posição, alvo e lente. mundo: brilho, névoa, giro do disco, onda, bloom.
--------------------------------------------------------------------------- */
const CAPITULOS = [
  { id: 'topo',       nome: 'After the noise',
    camera: { pos: [0, 1.5, 17],     alvo: [0, 0.35, 0],    fov: 38, mobile: { pos: [0, 2.6, 19], alvo: [0, 3.4, 0], fov: 54 } },
    mundo:  { brilho: 1.0,  perto: 7,   longe: 62, giro: 0.16, onda: 0.55, bloom: 0.75 } },
  { id: 'bio',        nome: 'Bio',
    camera: { pos: [-11, 5.2, 9.5],  alvo: [3, -0.8, -1],   fov: 42, mobile: { pos: [-7.5, 7.5, 12.5], alvo: [0, -0.6, 0], fov: 54 } },
    mundo:  { brilho: 0.55, perto: 4,   longe: 46, giro: 0.12, onda: 0.5,  bloom: 0.5 } },
  { id: 'trajetoria', nome: 'Trajetória',
    camera: { pos: [7.4, 0.8, 4.6],  alvo: [-3, -0.05, -3.4], fov: 50, mobile: { pos: [5, 1.5, 7.5], alvo: [-1, 0, -2], fov: 62 } },
    mundo:  { brilho: 0.62, perto: 1.4, longe: 30, giro: 0.2,  onda: 0.4,  bloom: 0.55 } },
  { id: 'music',      nome: 'Music',
    camera: { pos: [-7.5, 8.5, 9.5], alvo: [-12.5, -2.2, -1.5], fov: 40, mobile: { pos: [0.01, 15, 5.5], alvo: [0, 0, 0], fov: 56 } },
    mundo:  { brilho: 0.72, perto: 4,   longe: 44, giro: 0.3,  onda: 0.7,  bloom: 0.7 } },
  { id: 'sets',       nome: 'Sets',
    camera: { pos: [-6, 2.3, -11],   alvo: [10, -1.6, -34], fov: 48, mobile: { pos: [-5, 3.2, -6], alvo: [8, -1.6, -30], fov: 60 } },
    mundo:  { brilho: 0.85, perto: 3,   longe: 55, giro: 0.14, onda: 1.15, bloom: 0.6 } },
  { id: 'fotos',      nome: 'Fotos',
    camera: { pos: [0, 7, 30],       alvo: [0, -0.5, -4],   fov: 34, mobile: { pos: [0, 9, 32], alvo: [0, 0, 0], fov: 46 } },
    mundo:  { brilho: 0.36, perto: 6,   longe: 34, giro: 0.1,  onda: 0.45, bloom: 0.4 } },
  { id: 'booking',    nome: 'Booking',
    camera: { pos: [0.01, 19, 2.6],  alvo: [0, 0, 0],       fov: 40, mobile: { pos: [0.01, 17, 2.5], alvo: [0, 0, 0], fov: 56 } },
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
    [{ gsap }, { ScrollTrigger }, { default: Lenis }] = await Promise.all([import(URL_GSAP), import(URL_ST), import(URL_LENIS)]);
    DIAG.gsap = true; DIAG.lenis = true;
  } catch (e) { DIAG.erro = 'gsap/lenis: ' + (e && e.message || e); return; }
  try { iniciaMovimentoCom(gsap, ScrollTrigger, Lenis); } catch (e) { DIAG.erro = 'movimento: ' + (e && e.message || e); }
}
function iniciaMovimentoCom(gsap, ScrollTrigger, Lenis) {
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
  uniform float uGlitch, uGSemente, uGDir, uPontoMax;   // glitch: intensidade (0..1), sorteio do passo, direção da rolagem
  uniform vec3 uGlA, uGlB;                   // magenta #ff2a6d e ciano #05d9e8 (os mesmos do glitch do site)
  varying vec3 vCor; varying float vAlfa;
  float hash(float n){ return fract(sin(n) * 43758.5453); }
  void finaliza(vec3 p, float tam, vec3 cor, float alfa, float sem){
    vec4 mv = modelViewMatrix * vec4(p, 1.0);
    float prof = -mv.z;
    if (uGlitch > 0.001) {
      // GLITCH ESPACIAL: o mundo é fatiado em faixas horizontais da tela; algumas faixas
      // "rasgam" para o lado e são empurradas em profundidade (perto/longe), na direção da rolagem.
      vec4 c0 = projectionMatrix * mv;
      vec2 ndc = c0.xy / max(c0.w, 0.001);
      float faixa = floor((ndc.y * 0.5 + 0.5) * 16.0 + hash(uGSemente) * 4.0);
      float hf = hash(faixa * 7.13 + uGSemente * 31.7);
      float rasga = step(1.0 - uGlitch * 0.6, hf);
      float longe = smoothstep(uPerto, uLonge, prof);
      mv.x += rasga * ((hf - 0.5) * 2.0 + uGDir * 0.6) * uGlitch * prof * 0.09;
      mv.z += rasga * (hash(faixa + uGSemente * 3.3) - 0.5) * uGlitch * prof * 0.45;
      // separação de cor por partícula: metade desliza para um lado tingida de magenta, metade para o outro em ciano;
      // mais forte nas bordas da tela e no fundo
      float lado = step(0.5, fract(sem * 13.37)) * 2.0 - 1.0;
      float borda = 0.35 + 0.65 * abs(ndc.x) + 0.6 * longe;
      mv.x += lado * uGlitch * prof * 0.012 * borda;
      float lum = dot(cor, vec3(0.333));
      vec3 tinta = (lado > 0.0 ? uGlA : uGlB) * lum * 2.2;
      cor = mix(cor, tinta, clamp(uGlitch * (0.45 + 0.5 * rasga) * borda, 0.0, 0.9));
      prof = -mv.z;
    }
    gl_Position = projectionMatrix * mv;
    float px = tam * uEscala / max(prof, 0.001);
    gl_PointSize = clamp(px, 1.0, uPontoMax);
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
    finaliza(p, tam, cor, alfa, aSemente);
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
    finaliza(p, 0.07, cor, 0.8 * clareira, aSemente);
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
    finaliza(p, 0.05 + aSemente * 0.04, cor, 0.5, aSemente);
  }
`;

// glitch na tela do mundo (só no canvas, nunca no texto): faixas que rasgam, separação RGB mais forte
// nas bordas e na direção da rolagem, linhas de varredura que tremem.
const GLITCH_TELA = {
  uniforms: { tDiffuse: { value: null }, uG: { value: 0 }, uSemente: { value: 0 }, uDir: { value: 0 } },
  vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }`,
  fragmentShader: /* glsl */`
    uniform sampler2D tDiffuse; uniform float uG, uSemente, uDir; varying vec2 vUv;
    float h(float n){ return fract(sin(n) * 43758.5453); }
    void main(){
      vec2 uv = vUv;
      float faixa = floor(uv.y * 22.0 + h(uSemente) * 5.0);
      float hf = h(faixa * 3.17 + uSemente * 17.3);
      float rasga = step(1.0 - uG * 0.45, hf);
      uv.x += rasga * ((hf - 0.5) * 0.14 + uDir * 0.03) * uG;
      vec2 c = vUv - 0.5;
      float borda = 0.25 + dot(c, c) * 3.0;
      vec2 off = vec2(uG * 0.012 * borda + rasga * 0.008 * uG + uDir * 0.004 * uG, 0.0);
      vec4 base = texture2D(tDiffuse, uv);
      float r = texture2D(tDiffuse, uv + off).r;
      float b = texture2D(tDiffuse, uv - off).b;
      vec3 col = vec3(r, base.g, b);
      col *= 1.0 - uG * 0.22 * step(0.5, fract(vUv.y * 220.0 + h(uSemente + 1.0) * 9.0));
      gl_FragColor = vec4(col, base.a);
    }`
};

async function iniciaMundo() {
  const canvas = document.getElementById('mundo');
  if (!canvas) return;
  DIAG.webgl2 = temWebGL2();
  if (!DIAG.webgl2) { raiz.classList.add('sem-3d'); marcaMundo('sem-webgl2'); return; }

  let THREE;
  try { THREE = await import(URL_THREE); DIAG.three = true; }
  catch (e) { raiz.classList.add('sem-3d'); marcaMundo('import-falhou', e); return; }

  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, antialias: false, alpha: false, powerPreference: TIER === 'alto' ? 'high-performance' : 'default' });
  } catch (e) { raiz.classList.add('sem-3d'); marcaMundo('erro:renderer', e); return; }
  try {
    const gl = renderer.getContext();
    const info = gl.getExtension('WEBGL_debug_renderer_info');
    DIAG.gpu = String(info ? gl.getParameter(info.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER)).slice(0, 80);
    const faixa = gl.getParameter(gl.ALIASED_POINT_SIZE_RANGE);
    DIAG.pontoMax = faixa ? faixa[1] : 64;
  } catch (e) { DIAG.pontoMax = 64; }
  DIAG.tier = TIER;

  const DPR_MAX = TIER === 'alto' ? 1.75 : 1.25;
  let dpr = Math.min(window.devicePixelRatio || 1, DPR_MAX);
  DIAG.dpr = dpr;
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
    uSulco: { value: new THREE.Color('#efe8e2') }, uMagenta: { value: new THREE.Color('#c23d7a') }, uBranco: { value: new THREE.Color('#fff4ee') },
    uPontoMax: { value: Math.max(1, Math.min(26, DIAG.pontoMax || 26)) },
    uGlitch: { value: 0 }, uGSemente: { value: 0 }, uGDir: { value: 0 },
    uGlA: { value: new THREE.Color('#ff2a6d') }, uGlB: { value: new THREE.Color('#05d9e8') }
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
  let composer = null, bloom = null, eco = null, passeGlitch = null;
  if (TIER === 'alto') {
    try {
      const [{ EffectComposer }, { RenderPass }, { UnrealBloomPass }, { OutputPass }, { ShaderPass }, { AfterimagePass }] = await Promise.all([
        import(addon('EffectComposer')), import(addon('RenderPass')), import(addon('UnrealBloomPass')),
        import(addon('OutputPass')), import(addon('ShaderPass')), import(addon('AfterimagePass'))
      ]);
      composer = new EffectComposer(renderer);
      composer.addPass(new RenderPass(cena, camera));
      bloom = new UnrealBloomPass(new THREE.Vector2(innerWidth, innerHeight), 0.7, 0.55, 0.12);
      composer.addPass(bloom);
      // eco do quadro anterior (datamosh rápido) e o passe de glitch: só ligados durante uma rajada
      eco = new AfterimagePass(0.0); eco.enabled = false; composer.addPass(eco);
      passeGlitch = new ShaderPass(GLITCH_TELA); passeGlitch.enabled = false; composer.addPass(passeGlitch);
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
      // celular em pé: enquadramento próprio (o disco fica visível atrás do conteúdo, não cortado)
      const cam = celular && c.camera.mobile ? c.camera.mobile : c.camera;
      P.push(new THREE.Vector3(...cam.pos)); A.push(new THREE.Vector3(...cam.alvo)); fovs.push(cam.fov);
    });
    curvaPos = new THREE.CatmullRomCurve3(P, false, 'centripetal', 0.5);
    curvaAlvo = new THREE.CatmullRomCurve3(A, false, 'centripetal', 0.5);
  }
  montaCurvas();
  estreitoMQ.addEventListener('change', montaCurvas);

  const N = CAPITULOS.length - 1;
  const CALMO_POS = new THREE.Vector3(0, 6.5, 21), CALMO_ALVO = new THREE.Vector3(0, -0.3, 0);
  const vPos = new THREE.Vector3(), vAlvo = new THREE.Vector3(), vDir = new THREE.Vector3(), vLado = new THREE.Vector3(), CIMA = new THREE.Vector3(0, 1, 0);
  function estadoMundo(p) {
    const i = clamp(Math.floor(p), 0, N), k = Math.min(N, i + 1), t = suave(clamp(p - i, 0, 1));
    const a = CAPITULOS[i].mundo, b = CAPITULOS[k].mundo, o = {};
    for (const chave in a) o[chave] = lerp(a[chave], b[chave], t);
    o.fov = lerp(fovs[i], fovs[k], t);
    return o;
  }

  // --- interação: mouse (PC), inclinação do celular, arrastar e tocar (celular) ---
  // Nada aqui bloqueia a rolagem: todos os ouvintes são "passive" e nunca chamam preventDefault.
  let mx = 0, my = 0, px = 0, py = 0;
  let giroExtra = 0, orbita = 0, orbitaAlvo = 0, toque = 0;
  if (!reduz) {
    addEventListener('pointermove', e => {
      if (e.pointerType !== 'mouse') return;
      mx = (e.clientX / innerWidth) * 2 - 1; my = (e.clientY / innerHeight) * 2 - 1;
    }, { passive: true });

    // inclinação do aparelho -> mesma paralaxe da câmera (o "zero" acompanha devagar como a pessoa segura o celular)
    let g0 = null, b0 = null, ultimaInclinacao = 0;
    const inclinou = e => {
      if (e.gamma == null || e.beta == null) return;
      const agora = performance.now(), dt = ultimaInclinacao ? Math.min((agora - ultimaInclinacao) / 1000, 0.25) : 0;
      ultimaInclinacao = agora;
      if (g0 === null) { g0 = e.gamma; b0 = e.beta; }
      g0 = damp(g0, e.gamma, 0.25, dt); b0 = damp(b0, e.beta, 0.25, dt);
      mx = clamp((e.gamma - g0) / 18, -1, 1);
      my = clamp((e.beta - b0) / 18, -1, 1);
    };
    let pediuInclinacao = false;
    const ligaInclinacao = () => {
      if (pediuInclinacao || fino || typeof DeviceOrientationEvent === 'undefined') return;
      pediuInclinacao = true;
      if (typeof DeviceOrientationEvent.requestPermission === 'function') {
        // iPhone: só pode pedir dentro de um toque. Se negar, segue sem inclinação.
        DeviceOrientationEvent.requestPermission()
          .then(r => { if (r === 'granted') addEventListener('deviceorientation', inclinou, { passive: true }); })
          .catch(() => {});
      } else addEventListener('deviceorientation', inclinou, { passive: true });
    };
    if (!fino && typeof DeviceOrientationEvent !== 'undefined' && typeof DeviceOrientationEvent.requestPermission !== 'function') ligaInclinacao();
    ['touchend', 'click'].forEach(ev => document.addEventListener(ev, ligaInclinacao, { passive: true, capture: true }));

    // arrastar o dedo na horizontal: gira o disco com inércia e orbita a câmera um pouco
    let tx = 0, ty = 0, tUlt = 0, horizontal = null, moveu = false;
    const ignora = el => !!(el && el.closest && el.closest('.sets, .aovivo, dialog, input, iframe'));
    document.addEventListener('touchstart', e => {
      const t = e.touches[0]; if (!t || e.touches.length > 1) return;
      tx = t.clientX; ty = t.clientY; tUlt = t.clientX; horizontal = ignora(e.target) ? false : null; moveu = false;
    }, { passive: true });
    document.addEventListener('touchmove', e => {
      const t = e.touches[0]; if (!t) return;
      const dx = t.clientX - tx, dy = t.clientY - ty;
      if (Math.abs(dx) > 6 || Math.abs(dy) > 6) moveu = true;
      if (horizontal === null && (Math.abs(dx) > 10 || Math.abs(dy) > 10)) horizontal = Math.abs(dx) > Math.abs(dy) * 1.2;
      if (horizontal) {
        const passo = (t.clientX - tUlt) / innerWidth;
        giroExtra += passo * 9;
        orbitaAlvo = clamp(orbitaAlvo + passo * 1.6, -0.75, 0.75);
      }
      tUlt = t.clientX;
    }, { passive: true });
    // tocar num espaço vazio (fora de link/botão) solta uma onda no mundo
    document.addEventListener('touchend', e => {
      if (moveu) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, video, iframe, [role="button"], dialog')) return;
      toque = 1;
    }, { passive: true });
    document.addEventListener('click', e => {
      if (!fino) return;
      if (e.target && e.target.closest && e.target.closest('a, button, input, video, iframe, [role="button"], dialog')) return;
      toque = 0.8;
    }, { passive: true });
  }

  // --- tamanho ---
  function tamanho() {
    camera.aspect = innerWidth / innerHeight;
    camera.updateProjectionMatrix();
    renderer.setPixelRatio(dpr);
    renderer.setSize(innerWidth, innerHeight, false);
    if (composer) { composer.setPixelRatio(dpr); composer.setSize(innerWidth, innerHeight); }
    montaCurvas();   // girar o celular troca o enquadramento (retrato/paisagem)
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
  let somaDt = 0, quadros = 0, rebaixou = 0, quadrosDesenhados = 0;
  const painel = document.getElementById('downloads');
  const pausado = () => document.hidden || (painel && painel.open) || contextoPerdido;
  let contextoPerdido = false;

  // --- GLITCH: rajadas curtas (80–300 ms), nunca constante ---
  //  (a) sorteio a cada 4–9 s, sutil; (b) troca de capítulo, mais forte; (c) kick forte com a música;
  //  (d) rolagem rápida rasga na direção do movimento. Máx. ~2,5 rajadas/s (abaixo do limite de 3 flashes/s).
  //  Com "menos movimento": nenhum glitch.
  const glitch = { nivel: 0, fim: 0, forca: 0, proxIdle: 3 + Math.random() * 4, ultimaRajada: -9, capitulo: -1, ultimoExato: maestro.exato, vel: 0, dir: 0, semente: 0 };
  function rajada(t, forca, dur) {
    if (reduz || t - glitch.ultimaRajada < 0.4) return;
    glitch.forca = t < glitch.fim ? Math.max(forca, glitch.forca) : forca; glitch.ultimaRajada = t; glitch.fim = t + dur;
  }
  function atualizaGlitch(dt, t, som) {
    if (reduz) return 0;
    const ex = maestro.exato, d = ex - glitch.ultimoExato; glitch.ultimoExato = ex;
    glitch.vel = damp(glitch.vel, dt > 0 ? Math.abs(d) / dt : 0, 8, dt);
    if (Math.abs(d) > 1e-4) glitch.dir = Math.sign(d);
    const cap = Math.round(ex);
    if (glitch.capitulo !== -1 && cap !== glitch.capitulo) rajada(t, 0.95, 0.24 + Math.random() * 0.06);
    glitch.capitulo = cap;
    if (t > glitch.proxIdle) { rajada(t, 0.28 + Math.random() * 0.2, 0.08 + Math.random() * 0.1); glitch.proxIdle = t + 4 + Math.random() * 5; }
    if (som.tocando && som.pulso > 0.8 && t - glitch.ultimaRajada > 1.1) rajada(t, 0.55, 0.12);
    // degraus: a intensidade pula em passos (como o glitch do site, que usa steps())
    let alvo = 0;
    if (t < glitch.fim) alvo = glitch.forca * (0.55 + 0.45 * Math.floor(Math.random() * 3) / 2);
    const porVelocidade = clamp((glitch.vel - 0.35) * 0.45, 0, 0.55);
    glitch.nivel = Math.max(alvo, porVelocidade);
    glitch.semente = Math.floor(t * 16) + (t < glitch.fim ? 0.37 : 0);
    return glitch.nivel;
  }

  function desenha(dt) {
    const exato = maestro.exato;
    // "menos movimento": a câmera acompanha a rolagem bem devagar (sem trancos)
    suavizado = damp(suavizado, exato, reduz ? 1.6 : 4.2, dt);
    if (Math.abs(suavizado - exato) < 1e-4) suavizado = exato;
    const s = clamp(suavizado, 0, N);
    const w = estadoMundo(s);

    const som = reduz ? { tocando: false, pulso: 0, grave: 0, medio: 0, agudo: 0 } : audio.atualiza(dt, tempo);
    if (reduz) {
      // modo calmo: disco gira devagar, partículas derivam, nada pisca, nada pula
      tempo += dt * 0.4;
      rot += dt * w.giro * 0.5;
    } else {
      tempo += dt;
      rot += dt * (w.giro + (som.tocando ? 0.42 : 0)) + giroExtra * dt;
      giroExtra *= Math.exp(-dt * 1.6);                 // inércia do giro com o dedo
      orbitaAlvo = damp(orbitaAlvo, 0, 0.7, dt);        // a órbita volta devagar para o enquadramento do capítulo
      orbita = damp(orbita, orbitaAlvo, 4, dt);
      toque *= Math.exp(-dt * 3.2);
      som.pulso = Math.max(som.pulso, toque);
      px = damp(px, mx, 2.2, dt); py = damp(py, my, 2.2, dt);
    }

    curvaPos.getPoint(s / N, vPos);
    curvaAlvo.getPoint(s / N, vAlvo);
    if (reduz) { vPos.lerp(CALMO_POS, 0.7); vAlvo.lerp(CALMO_ALVO, 0.7); }   // modo calmo: viagem com amplitude pequena
    if (orbita) vPos.sub(vAlvo).applyAxisAngle(CIMA, orbita).add(vAlvo);
    vDir.subVectors(vAlvo, vPos).normalize();
    vLado.crossVectors(vDir, CIMA).normalize();
    vPos.addScaledVector(vLado, px * 0.55).addScaledVector(CIMA, -py * 0.32);
    camera.position.copy(vPos);
    camera.lookAt(vAlvo);
    const g = atualizaGlitch(dt, tempo, som);
    if (g > 0.05 && tempo < glitch.fim) camera.position.addScaledVector(vDir, (Math.sin(glitch.semente * 12.9898) * 0.5) * g * 0.8);   // tranco curto em profundidade
    const fov = reduz ? lerp(w.fov, 46, 0.7) : w.fov - som.pulso * 0.6;
    if (Math.abs(camera.fov - fov) > 0.001) { camera.fov = fov; camera.updateProjectionMatrix(); }

    U.uTime.value = tempo;
    U.uRot.value = rot;
    U.uBrilho.value = w.brilho * (1 + som.grave * 0.25) * (TIER === 'leve' ? 1.3 : 1);   // menos pontos no celular: cada um brilha mais
    U.uPerto.value = w.perto; U.uLonge.value = w.longe;
    U.uOnda.value = w.onda;
    U.uPulso.value = som.pulso; U.uGrave.value = som.grave; U.uMedio.value = som.medio; U.uAgudo.value = som.agudo;
    U.uEscala.value = (TIER === 'leve' ? 1.35 : 1) * renderer.domElement.height / (2 * Math.tan(THREE.MathUtils.degToRad(camera.fov) / 2));
    quadrosDesenhados++;

    U.uGlitch.value = g; U.uGSemente.value = glitch.semente; U.uGDir.value = glitch.dir;
    if (passeGlitch) {
      const ligado = g > 0.02;
      passeGlitch.enabled = ligado; eco.enabled = ligado && g > 0.3;
      passeGlitch.uniforms.uG.value = g; passeGlitch.uniforms.uSemente.value = glitch.semente; passeGlitch.uniforms.uDir.value = glitch.dir;
      eco.damp = 0.82 * g;
    }
    // "quadro perdido": numa rajada forte, às vezes segura a imagem anterior por um quadro
    if (g > 0.6 && Math.random() < 0.12) return;
    if (composer && bloom) { bloom.strength = w.bloom * (1 + som.pulso * 0.6); composer.render(); }
    else renderer.render(cena, camera);
  }

  const META = reduz ? 1 / 30 : 0;       // modo calmo: 30 quadros por segundo bastam
  let fpsT = 0, fpsN = 0;
  function quadro(agora) {
    raf = 0;
    if (!rodando || pausado()) { rodando = false; return; }
    if (META && antes && (agora - antes) < META * 1000 - 2) { raf = requestAnimationFrame(quadro); return; }
    fpsN++; if (agora - fpsT > 1000) { DIAG.fps = Math.round(fpsN * 1000 / Math.max(1, agora - fpsT)); fpsT = agora; fpsN = 0; }
    const dt = antes ? Math.min((agora - antes) / 1000, 1 / 20) : 1 / 60;
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
    if (rodando || pausado()) return;
    rodando = true; antes = 0; raf = requestAnimationFrame(quadro);
  }
  function pedeQuadro() {
    if (rodando || pendente || pausado()) return;
    pendente = true;
    requestAnimationFrame(() => { pendente = false; desenha(1 / 60); });
  }

  document.addEventListener('visibilitychange', () => { if (!document.hidden) liga(); });
  if (painel) {
    painel.addEventListener('close', liga);
    new MutationObserver(() => { if (!painel.open) liga(); }).observe(painel, { attributes: true, attributeFilter: ['open'] });
  }

  canvas.addEventListener('webglcontextlost', e => {
    e.preventDefault();
    contextoPerdido = true; rodando = false;
    raiz.classList.remove('mundo-3d'); raiz.classList.add('sem-3d');
    marcaMundo('erro:contexto-webgl-perdido');
  });

  // aquece os shaders antes de mostrar (evita travadinha no primeiro quadro)
  try {
    if (renderer.compileAsync && renderer.extensions.has('KHR_parallel_shader_compile')) {
      await Promise.race([renderer.compileAsync(cena, camera), new Promise(r => setTimeout(r, 2500))]);
    } else renderer.compile(cena, camera);
  } catch (e) {}
  try { desenha(1 / 60); }
  catch (e) { raiz.classList.add('sem-3d'); marcaMundo('erro:primeiro-quadro', e); return; }
  const gl = renderer.getContext();
  if (gl.isContextLost && gl.isContextLost()) { raiz.classList.add('sem-3d'); marcaMundo('erro:contexto-webgl-perdido'); return; }
  raiz.classList.add('mundo-3d');
  marcaMundo(reduz ? 'reduzido' : 'ok');   // reduzido = funcionando no modo calmo
  liga();

  window.__mundo = { tier: TIER, glitch: () => glitch.nivel, forcaGlitch: (f = 0.9, d = 0.3) => { glitch.ultimaRajada = -9; rajada(tempo, f, d); }, quadros: () => quadrosDesenhados, perdeContexto: () => { const x = renderer.getContext().getExtension('WEBGL_lose_context'); if (x) x.loseContext(); }, info: () => ({ ...renderer.info.render, dpr, bloom: !!composer, pontos: cena.children.reduce((s, o) => s + o.geometry.attributes.aSemente.count, 0) }) };
}

/* ---------------------------------------------------------------------------
   Celular/tablet: camada de textura com glitch no FUNDO (atrás do conteúdo, z-index 0).
   Aparece só nos vãos e áreas transparentes; o loop do topo e as fotos ficam por cima, intactos.
   Canvas 2D em baixa resolução: grão + linhas de varredura; de vez em quando (e em rolagem rápida)
   uma rajada de 80–300 ms com faixas deslocadas e rasgos magenta/ciano. Sem clarão branco,
   no máximo ~2,5 rajadas/s. "Menos movimento": textura parada, sem glitch.
--------------------------------------------------------------------------- */
function iniciaFundoCelular() {
  const c = document.createElement('canvas');
  c.className = 'fundo-glitch'; c.setAttribute('aria-hidden', 'true');
  document.body.insertBefore(c, document.body.firstChild);
  const g = c.getContext('2d', { alpha: false });
  if (!g) { DIAG.fundo = 'sem canvas 2D'; return; }
  const ESC = 0.5;                       // meia resolução: barato e com cara de vídeo antigo
  let W = 0, H = 0;
  const base = document.createElement('canvas'), gb = base.getContext('2d');
  function monta() {
    W = Math.max(1, Math.round(innerWidth * ESC)); H = Math.max(1, Math.round(innerHeight * ESC));
    c.width = W; c.height = H; base.width = W; base.height = H * 2;   // 2x de altura para rolar o grão
    gb.fillStyle = '#110c0a'; gb.fillRect(0, 0, W, H * 2);
    const img = gb.getImageData(0, 0, W, H * 2), d = img.data;
    for (let k = 0; k < d.length; k += 4) {
      const n = Math.random(), lin = ((k / 4 / W | 0) % 3 === 0) ? -5 : 0;   // grão + linha de varredura a cada 3 px
      const v = n > 0.985 ? 26 : n * 9;
      d[k] = 17 + v + lin; d[k + 1] = 12 + v * 0.9 + lin; d[k + 2] = 10 + v * 0.85 + lin;
    }
    gb.putImageData(img, 0, 0);
    desenha(0);
  }
  let fim = 0, ultima = -9, forca = 0, proxima = 2 + Math.random() * 4, t = 0;
  function rajada(f, dur) { if (reduz || t - ultima < 0.4) return; ultima = t; fim = t + dur; forca = f; }
  function desenha(dt) {
    t += dt;
    const ativo = t < fim, gl = ativo ? forca * (0.55 + 0.45 * ((Math.random() * 3) | 0) / 2) : 0;
    const off = reduz ? 0 : ((t * 24) | 0) % H;          // o grão "corre" devagar
    g.drawImage(base, 0, off, W, H, 0, 0, W, H);
    if (gl > 0) {
      const semente = (t * 16) | 0;
      const rnd = k => { const v = Math.sin(semente * 12.9898 + k * 78.233) * 43758.5453; return v - Math.floor(v); };
      const faixas = 3 + ((gl * 6) | 0);
      for (let i = 0; i < faixas; i++) {          // faixas do fundo deslocadas para o lado
        const y = (rnd(i) * H) | 0, h = 1 + ((rnd(i + 20) * H * 0.06) | 0), dx = ((rnd(i + 40) - 0.5) * W * 0.25 * gl) | 0;
        g.drawImage(c, 0, y, W, h, dx, y, W, h);
      }
      g.globalCompositeOperation = 'lighter';
      for (let i = 0; i < 2 + ((gl * 4) | 0); i++) {   // rasgos RGB: magenta e ciano lado a lado
        const y = (rnd(i + 60) * H) | 0, w = (0.25 + rnd(i + 70) * 0.6) * W, x = rnd(i + 80) * (W - w), h = 1 + ((rnd(i + 90) * 2) | 0);
        g.fillStyle = `rgba(255,42,109,${0.35 * gl})`; g.fillRect(x - 2, y, w, h);
        g.fillStyle = `rgba(5,217,232,${0.3 * gl})`; g.fillRect(x + 2, y + h, w, h);
      }
      g.globalCompositeOperation = 'source-over';
      g.fillStyle = `rgba(0,0,0,${0.25 * gl})`;          // linhas de varredura tremendo
      for (let y = (semente % 4); y < H; y += 4) g.fillRect(0, y, W, 1);
    }
    DIAG.fundoGlitch = gl;
  }
  let raf = 0, antes = 0, yAntes = scrollY, tAntes = performance.now();
  function quadro(agora) {
    raf = 0;
    if (document.hidden) return;
    const ativo = t < fim;
    // em repouso ~10 fps (só o grão correndo); durante a rajada ~25 fps
    const passo = ativo ? 40 : 100;
    if (agora - antes >= passo) {
      const dt = antes ? Math.min((agora - antes) / 1000, 0.2) : 0.04; antes = agora;
      if (t > proxima) { rajada(0.5 + Math.random() * 0.4, 0.08 + Math.random() * 0.22); proxima = t + 3 + Math.random() * 4; }
      desenha(dt); DIAG.fps = Math.round(1000 / passo);
    }
    raf = requestAnimationFrame(quadro);
  }
  addEventListener('scroll', () => {   // rolagem rápida: rajada curta
    const agora = performance.now(), v = Math.abs(scrollY - yAntes) / Math.max(1, agora - tAntes);
    yAntes = scrollY; tAntes = agora;
    if (v > 2.2) rajada(0.85, 0.12 + Math.random() * 0.1);
  }, { passive: true });
  let larg = innerWidth;
  addEventListener('resize', () => { if (innerWidth !== larg || Math.abs(innerHeight * ESC - H) > 80) { larg = innerWidth; monta(); } }, { passive: true });
  monta();
  DIAG.fundo = reduz ? 'textura parada (menos movimento)' : 'textura + glitch';
  window.__fundo = { rajada: (f = 0.9, d = 0.3) => { ultima = -9; rajada(f, d); }, nivel: () => DIAG.fundoGlitch || 0 };
  if (!reduz) {
    document.addEventListener('visibilitychange', () => { if (!document.hidden && !raf) { antes = 0; raf = requestAnimationFrame(quadro); } });
    raf = requestAnimationFrame(quadro);
  }
}

if (CELULAR) {
  // celular/tablet: nada de WebGL, three, gsap ou lenis
  DIAG.tier = 'celular';
  marcaMundo('celular');
  try { iniciaFundoCelular(); } catch (e) { DIAG.erro = 'fundo: ' + (e && e.message || e); }
} else {
  iniciaMovimento().catch(e => { DIAG.erro = 'movimento: ' + (e && e.message || e); });
  iniciaMundo().catch(e => { raiz.classList.add('sem-3d'); marcaMundo('erro:' + ((e && e.message) || e).toString().slice(0, 60), e); });
}

/* ---------------------------------------------------------------------------
   ?diag — painel de diagnóstico (para o HV mandar print do celular)
--------------------------------------------------------------------------- */
if (/[?&]diag\b/.test(location.search)) {
  const caixa = document.createElement('pre');
  caixa.className = 'diag';
  caixa.setAttribute('role', 'status');
  caixa.title = 'Toque para fechar';
  document.body.appendChild(caixa);
  let fechado = false;
  caixa.addEventListener('click', () => { fechado = true; caixa.remove(); });
  const ua = navigator.userAgent;
  const curto = (ua.match(/(iPhone OS [\d_]+|Android [\d.]+|Windows NT [\d.]+|Mac OS X [\d_]+)/) || [''])[0] + ' · ' +
    ((ua.match(/(Instagram|FBAN|FBAV|TikTok|SamsungBrowser\/[\d.]+|CriOS\/[\d]+|FxiOS\/[\d]+|EdgA?\/[\d]+|Chrome\/[\d]+|Version\/[\d.]+ Mobile|Safari)/) || [''])[0]);
  const sim = v => v ? 'sim' : 'não';
  const mapa = !!(window.HTMLScriptElement && HTMLScriptElement.supports && HTMLScriptElement.supports('importmap'));
  const pinta = () => {
    if (fechado) return;
    const m = window.__musica && window.__musica.au;
    caixa.textContent = [
      'HAGAVE 3D · diag (toque p/ fechar)',
      'mundo: ' + DIAG.motivo,
      'ua: ' + curto,
      'webgl2: ' + (DIAG.webgl2 === null ? '?' : sim(DIAG.webgl2)) + ' · gpu: ' + (DIAG.gpu || '?'),
      'import map nativo: ' + sim(mapa) + ' (não é mais necessário)',
      'tier: ' + (DIAG.tier || TIER) + ' · dpr: ' + (DIAG.dpr || '?') + '/' + (window.devicePixelRatio || 1) + ' · ponto máx: ' + DIAG.pontoMax,
      'menos movimento: ' + sim(reduz) + ' · economia de dados: ' + sim(econ),
      'fps: ' + DIAG.fps + ' · quadros: ' + (window.__mundo ? window.__mundo.quadros() : 0),
      'three: ' + sim(DIAG.three) + ' · gsap: ' + sim(DIAG.gsap) + ' · lenis: ' + sim(DIAG.lenis),
      'música: ' + (m ? (m.paused ? 'pausada' : 'tocando') + ' ' + m.currentTime.toFixed(1) + 's' : '?'),
      'fundo celular: ' + (DIAG.fundo || '—') + (DIAG.fundo ? ' · glitch agora: ' + (DIAG.fundoGlitch || 0).toFixed(2) : ''),
      'último erro: ' + (DIAG.erro || '—')
    ].join('\n');
  };
  pinta(); setInterval(pinta, 500);
}
