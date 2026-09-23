// ClipFree AI — Originality Guard
// Automated safeguards designed to make externally sourced Shorts more meaningfully transformed.
// No code can guarantee YouTube Partner Program approval or monetization.

import { FFmpeg } from 'https://unpkg.com/@ffmpeg/ffmpeg@0.12.10/dist/esm/index.js';
import { fetchFile, toBlobURL } from 'https://unpkg.com/@ffmpeg/util@0.12.1/dist/esm/index.js';

const GUARD_VERSION = '2026-09-24-v1';
const STORY_KEY = 'clipfree.originality.stories.v1';
const SOURCE_KEY = 'clipfree.originality.sources.v1';

const sleep = ms => new Promise(resolve => setTimeout(resolve, ms));
const clean = (value = '') => String(value || '').replace(/\s+/g, ' ').trim();
const lower = (value = '') => clean(value).toLowerCase();

const SUBJECTS = [
  { key:'lion', re:/\b(lion|lions|lioness|lionesses|panthera leo)\b/i, label:'lions' },
  { key:'moose', re:/\b(moose|alces alces)\b/i, label:'moose' },
  { key:'tiger', re:/\b(tiger|tigers|panthera tigris)\b/i, label:'tigers' },
  { key:'elephant', re:/\b(elephant|elephants|loxodonta|elephas)\b/i, label:'elephants' },
  { key:'kitten', re:/\b(kitten|kittens|cat|cats|feline)\b/i, label:'kittens' },
  { key:'puppy', re:/\b(puppy|puppies|dog|dogs|canine)\b/i, label:'puppies' },
  { key:'wolf', re:/\b(wolf|wolves|canis lupus)\b/i, label:'wolves' },
  { key:'bear', re:/\b(bear|bears|ursus)\b/i, label:'bears' },
];

const FACTS = {
  lion: [
    'Lions are unusually social for cats and often live in groups called prides.',
    'Lions use vocal calls, scent and body language to communicate with one another.',
    'Rest is an important part of a lion’s day because conserving energy matters for large predators.',
    'Lionesses often form the long-term social core of a pride.',
    'Young lions learn important social and survival skills through play and interaction.',
    'A lion’s mane can make an adult male look larger and can vary in colour and fullness.',
    'Lions are most strongly associated with African savannas and grasslands, although a small wild population also survives in India.',
    'Habitat loss and conflict with people are among the pressures facing wild lion populations.'
  ],
  moose: [
    'Moose are the largest living members of the deer family.',
    'Adult male moose grow antlers that are shed and regrown on a seasonal cycle.',
    'Moose are strong swimmers and can move confidently through lakes, rivers and wetlands.',
    'Their long legs help them travel through deep snow, brush and wet ground.',
    'Moose feed mainly on leaves, twigs, shrubs and aquatic plants.',
    'Their large bodies are well adapted to cool climates, so heat can be challenging for them.',
    'A moose’s broad muzzle helps it browse a wide range of vegetation.',
    'Wetlands and forest edges can provide important feeding habitat for moose.'
  ],
  tiger: [
    'Every tiger has a stripe pattern that is individually distinctive.',
    'Tigers are generally solitary cats and rely heavily on stealth when moving through habitat.',
    'Tigers are powerful swimmers and often use water to cool down or move through their territory.',
    'Their striped coat helps break up the outline of the body in vegetation and changing light.',
    'Tigers communicate through scent marks, vocal sounds and visual signals.',
    'A tiger’s strong forelimbs and muscular body are adaptations for close-range hunting.',
    'Wild tigers occupy several kinds of habitat across Asia, from forests to grasslands and wetlands.',
    'Habitat loss and illegal wildlife trade remain major threats to wild tiger populations.'
  ],
  elephant: [
    'Elephants use their trunks for breathing, smelling, touching, drinking and handling objects.',
    'Elephant family groups often centre on experienced adult females and their relatives.',
    'Elephants communicate with touch, body language and sounds, including some very low-frequency calls.',
    'Their large ears help with communication and can also help release body heat.',
    'Elephants can shape ecosystems by moving vegetation, opening paths and dispersing seeds.',
    'Young elephants learn social behaviour by staying close to older members of the group.',
    'Elephants have highly mobile trunks with fine muscular control despite their great strength.',
    'Protecting connected habitat is important because elephants may travel long distances.'
  ],
  wolf: [
    'Wolves are social canids that often live in family-based groups.',
    'Howls can help wolves communicate across long distances.',
    'Body posture, facial expression and scent are important parts of wolf communication.',
    'Cooperation can help wolves defend territory, raise young and find food.',
    'Young wolves learn social skills through play and interaction with other pack members.',
    'Wolves can travel long distances while searching for food or moving through their territory.',
    'Their dense coats help insulate them in cold conditions.',
    'As large predators, wolves can influence prey behaviour and wider ecosystem relationships.'
  ],
  bear: [
    'Bear diets vary widely by species, season and habitat.',
    'Bears have an especially strong sense of smell that helps them investigate their surroundings.',
    'Different bear species are adapted to very different habitats, from forests to Arctic coastlines.',
    'Many bears spend large amounts of time searching for seasonally available foods.',
    'Claws can help bears dig, climb, tear into food and move through difficult terrain.',
    'Mother bears invest heavily in protecting and raising their cubs.',
    'Winter dormancy patterns vary among bear species and climates.',
    'Protecting habitat and reducing conflict with people are important for many wild bear populations.'
  ],
  kitten: [
    'Play helps kittens practise coordination, balance and social behaviour.',
    'A kitten’s whiskers are sensitive touch organs that provide information about nearby objects and spaces.',
    'Young cats spend a large amount of time sleeping while their bodies and nervous systems develop.',
    'Pouncing and stalking games help kittens practise movements used by adult cats.',
    'Kittens communicate with posture, facial expression, scent and vocal sounds.',
    'Early positive social experiences can influence how comfortably a kitten responds to new situations.',
    'Cats have highly flexible spines that contribute to their agility.',
    'A kitten’s curiosity is part of how it learns about its environment.'
  ],
  puppy: [
    'Play helps puppies practise movement, communication and social skills.',
    'Dogs experience much of the world through an exceptionally sensitive sense of smell.',
    'Puppies use posture, facial expression, movement and vocal sounds to communicate.',
    'Positive early social experiences can help puppies become more confident around new situations.',
    'Chewing and mouthing are normal ways for young dogs to explore their surroundings.',
    'Puppies need plenty of sleep while their bodies and brains are developing.',
    'Different dog breeds can vary greatly in size, coat, energy level and inherited behaviour.',
    'Short training sessions can help young dogs learn while keeping the experience positive.'
  ],
  wildlife: [
    'Wild animals continually balance the need to find food with the need to conserve energy and stay safe.',
    'Body language, sound and scent are common ways animals communicate.',
    'Habitat influences how animals move, feed, shelter and raise young.',
    'Many behaviours that look simple are adaptations shaped by survival in a particular environment.',
    'Young animals often learn through a mixture of instinct, observation and play.',
    'Timing matters in nature: temperature, daylight and season can change when animals are most active.',
    'Healthy habitats provide food, shelter, breeding areas and safe movement routes.',
    'Wildlife conservation often depends on protecting habitat as well as reducing direct threats to animals.'
  ]
};

const HOOKS = [
  subject => `A closer look at ${subject} and the adaptations that shape their lives.`,
  subject => `There is more happening in the lives of ${subject} than a quick clip can show.`,
  subject => `These ${subject} offer a useful glimpse into how animals adapt to their environment.`,
  subject => `Watch the footage, then notice the behaviours and adaptations that help ${subject} survive.`,
  subject => `This wildlife moment is a chance to learn a little more about ${subject}.`,
  subject => `A short visual story about ${subject}, their behaviour and their environment.`,
  subject => `Beyond the image, these facts help explain how ${subject} live.`,
  subject => `A few seconds of wildlife footage can reveal a much bigger natural-history story.`
];

const ANGLES = [
  'social behaviour','communication','adaptation','movement and energy',
  'family and learning','habitat','survival strategy','conservation'
];

function loadSet(key) {
  try {
    const items = JSON.parse(sessionStorage.getItem(key) || '[]');
    return new Set(Array.isArray(items) ? items : []);
  } catch { return new Set(); }
}
function saveSet(key, set) {
  try { sessionStorage.setItem(key, JSON.stringify([...set].slice(-120))); } catch {}
}
const usedStories = loadSet(STORY_KEY);
const usedSources = loadSet(SOURCE_KEY);

function sourceText(source = null) {
  return clean([
    source?.presetLabel, source?.searchTopic, source?.title, source?.story,
    ...(Array.isArray(source?.sources) ? source.sources.map(x => x?.title || '') : [])
  ].filter(Boolean).join(' '));
}
function detectSubject(source = null) {
  const text = sourceText(source);
  return SUBJECTS.find(item => item.re.test(text)) || { key:'wildlife', label:'wildlife' };
}
function sourceFingerprint(source = null) {
  const items = Array.isArray(source?.sources) && source.sources.length
    ? source.sources.map(x => x?.sourceUrl || x?.title || '')
    : [source?.sourceUrl || source?.title || source?.attribution || ''];
  return items.map(lower).filter(Boolean).sort().join('|');
}
function isExternallySourced(source = null) {
  if (!source) return false;
  const text = `${source?.provider || ''} ${source?.attribution || ''} ${source?.sourceUrl || ''}`;
  return /wikimedia|commons|creative commons|public domain|cc0|cc by/i.test(text) ||
    (Array.isArray(source?.sources) && source.sources.length > 0);
}
function compactCaption(text, max = 88) {
  let x = clean(text);
  if (x.length <= max) return x;
  return x.slice(0, max - 1).replace(/\s+\S*$/, '') + '…';
}

function buildOriginalCommentary(source = null, attempt = 0) {
  const subject = detectSubject(source);
  const facts = FACTS[subject.key] || FACTS.wildlife;
  const batchIndex = Math.max(0, Number(source?.batchIndex || 0));
  const seed = (batchIndex * 3 + attempt * 2) % facts.length;
  const hook = HOOKS[(batchIndex + attempt) % HOOKS.length](subject.label);
  const angle = ANGLES[(batchIndex + attempt) % ANGLES.length];
  const selected = [];
  for (let i = 0; i < 4; i++) selected.push(facts[(seed + i) % facts.length]);

  const story = `${hook} ${selected.join(' ')} This Short focuses on ${angle} rather than simply reposting the source footage.`;
  const fingerprint = lower(story).replace(/[^a-z0-9 ]/g, '').slice(0, 500);
  if (usedStories.has(fingerprint) && attempt < 10) return buildOriginalCommentary(source, attempt + 1);

  usedStories.add(fingerprint);
  saveSet(STORY_KEY, usedStories);
  return {
    subject, angle, story,
    captions: [
      compactCaption(hook, 92),
      compactCaption(selected[0], 92),
      compactCaption(selected[1], 92),
      compactCaption(selected[2], 92),
      compactCaption(selected[3], 92)
    ]
  };
}

function ensureGuardPanel() {
  let panel = document.getElementById('clipfreeOriginalityGuard');
  if (panel) return panel;
  const target = document.getElementById('category-wizard') ||
    document.getElementById('autopilot') || document.querySelector('main');
  if (!target) return null;
  panel = document.createElement('section');
  panel.id = 'clipfreeOriginalityGuard';
  panel.style.cssText = 'margin:18px auto;max-width:1180px;padding:16px 18px;border:1px solid #2f634a;border-radius:14px;background:#0d1813;color:#d9f7e7';
  panel.innerHTML = `
    <strong style="display:block;font-size:1rem;margin-bottom:6px">🛡️ Originality Guard: ON</strong>
    <div data-originality-status style="font-size:.82rem;line-height:1.5;color:#b8d7c5">
      External footage gets a unique educational storyline, visible commentary cards, duplicate checks and attribution preservation. Riskier items are kept Private for review.
    </div>`;
  target.parentNode?.insertBefore(panel, target);
  return panel;
}
function updateGuardUI(message, kind = 'good') {
  const panel = ensureGuardPanel();
  const status = panel?.querySelector('[data-originality-status]');
  if (!status) return;
  status.textContent = message;
  status.style.color = kind === 'warn' ? '#ffd58a' : kind === 'working' ? '#c7bbff' : '#b8d7c5';
}
function forcePrivate(reason) {
  const auto = document.getElementById('autoPrivacy');
  const upload = document.getElementById('uploadPrivacy');
  if (auto) { auto.value = 'private'; auto.dispatchEvent(new Event('change', { bubbles:true })); }
  if (upload) { upload.value = 'private'; upload.dispatchEvent(new Event('change', { bubbles:true })); }
  updateGuardUI(reason, 'warn');
}

function prepareSource(source, file) {
  if (!source || !isExternallySourced(source)) return source;
  const meta = { ...source };
  const sourceCount = Math.max(
    1,
    Number(file?.clipfreeSourceCount || 0),
    Array.isArray(meta.sources) ? meta.sources.length : 0
  );
  const commentary = buildOriginalCommentary(meta);

  meta.kind = 'animal-generator';
  meta.story = commentary.story;
  meta.captions = commentary.captions;
  meta.targetDuration = Math.max(15, Math.min(30, Number(meta.targetDuration || 24)));
  meta.originalitySummary =
    `Original educational angle: ${commentary.angle}. This edit adds a new explanatory storyline and on-screen educational commentary to licensed source footage.`;
  meta.originalityAngle = commentary.angle;
  meta.originalitySubject = commentary.subject.label;
  meta.originalityCaptions = [...commentary.captions];
  meta.originalityGuard = { enabled:true, version:GUARD_VERSION, sourceCount, externalSource:true };

  const fp = sourceFingerprint(meta);
  if (fp && usedSources.has(fp)) {
    meta.originalityGuard.repeatedSourceCombination = true;
    forcePrivate('Repeated source combination detected — this Short will stay Private for review.');
  }
  if (fp) { usedSources.add(fp); saveSet(SOURCE_KEY, usedSources); }

  if (!meta.attribution && !(Array.isArray(meta.sources) && meta.sources.length)) {
    meta.originalityGuard.missingAttribution = true;
    forcePrivate('Source attribution could not be confirmed — this Short will stay Private.');
  }
  if (sourceCount < 2) {
    meta.originalityGuard.singleExternalSource = true;
    forcePrivate('Single-source reused footage detected — Originality Guard will add commentary, but the upload stays Private for manual review.');
  }
  return meta;
}

let guardFFmpeg = null;
async function ensureGuardFFmpeg() {
  if (guardFFmpeg?.loaded) return guardFFmpeg;
  updateGuardUI('Loading originality video engine…', 'working');
  guardFFmpeg = new FFmpeg();
  const baseURL = 'https://unpkg.com/@ffmpeg/core@0.12.6/dist/esm';
  const classWorkerURL = new URL('./ffmpeg-worker.js', window.location.href).href;
  await guardFFmpeg.load({
    coreURL: await toBlobURL(`${baseURL}/ffmpeg-core.js`, 'text/javascript'),
    wasmURL: await toBlobURL(`${baseURL}/ffmpeg-core.wasm`, 'application/wasm'),
    classWorkerURL,
  });
  return guardFFmpeg;
}

function wrapCanvasText(ctx, text, maxWidth, maxLines = 3) {
  const words = clean(text).split(/\s+/).filter(Boolean);
  const lines = [];
  let line = '';
  for (const word of words) {
    const test = line ? `${line} ${word}` : word;
    if (ctx.measureText(test).width <= maxWidth) line = test;
    else {
      if (line) lines.push(line);
      line = word;
      if (lines.length >= maxLines - 1) break;
    }
  }
  if (line && lines.length < maxLines) lines.push(line);
  return lines;
}

async function makeCommentaryCard(text, label = 'WILDLIFE NOTE') {
  const canvas = document.createElement('canvas');
  canvas.width = 720; canvas.height = 1280;
  const ctx = canvas.getContext('2d');
  ctx.clearRect(0, 0, canvas.width, canvas.height);

  const grad = ctx.createLinearGradient(0, 860, 0, 1280);
  grad.addColorStop(0, 'rgba(0,0,0,0)');
  grad.addColorStop(0.30, 'rgba(0,0,0,.64)');
  grad.addColorStop(1, 'rgba(0,0,0,.92)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 820, 720, 460);

  ctx.fillStyle = 'rgba(255,213,74,.98)';
  ctx.fillRect(42, 918, 180, 7);
  ctx.font = '800 24px Arial, sans-serif';
  ctx.fillStyle = '#ffd54a';
  ctx.fillText(label, 42, 970);

  ctx.font = '800 44px Arial, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.strokeStyle = 'rgba(0,0,0,.95)';
  ctx.lineWidth = 8;
  ctx.lineJoin = 'round';
  ctx.shadowColor = 'rgba(0,0,0,.72)';
  ctx.shadowBlur = 10;

  const lines = wrapCanvasText(ctx, text, 635, 4);
  let y = 1035;
  for (const line of lines) {
    ctx.strokeText(line, 42, y, 635);
    ctx.fillText(line, 42, y, 635);
    y += 58;
  }
  ctx.shadowBlur = 0;
  ctx.font = '700 19px Arial, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,.78)';
  ctx.fillText('Original educational commentary', 42, 1240);
  return await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
}

async function blobDuration(blob) {
  return new Promise(resolve => {
    const video = document.createElement('video');
    const url = URL.createObjectURL(blob);
    video.preload = 'metadata';
    video.onloadedmetadata = () => {
      const d = Number(video.duration || 0);
      URL.revokeObjectURL(url);
      resolve(Number.isFinite(d) && d > 0 ? d : 24);
    };
    video.onerror = () => { URL.revokeObjectURL(url); resolve(24); };
    video.src = url;
  });
}

async function addVisibleCommentary(blob, captions) {
  if (!(blob instanceof Blob) || !captions?.length) return blob;
  const ff = await ensureGuardFFmpeg();
  const input = 'originality_input.mp4';
  const output = 'originality_output.mp4';
  const cards = captions.slice(0, 5);
  const duration = await blobDuration(blob);

  try { await ff.deleteFile(input); } catch {}
  try { await ff.deleteFile(output); } catch {}
  await ff.writeFile(input, await fetchFile(blob));

  for (let i = 0; i < cards.length; i++) {
    const name = `originality_card_${i}.png`;
    try { await ff.deleteFile(name); } catch {}
    const cardBlob = await makeCommentaryCard(cards[i], i === 0 ? 'STORY HOOK' : 'WILDLIFE NOTE');
    await ff.writeFile(name, await fetchFile(cardBlob));
  }

  const args = ['-i', input];
  for (let i = 0; i < cards.length; i++) args.push('-loop', '1', '-i', `originality_card_${i}.png`);

  const cardSpan = duration / cards.length;
  const filters = ['[0:v]scale=720:1280:force_original_aspect_ratio=increase,crop=720:1280[base]'];
  let prev = 'base';
  for (let i = 0; i < cards.length; i++) {
    const start = Math.max(0, i * cardSpan + 0.15);
    const end = Math.min(duration - 0.05, (i + 1) * cardSpan - 0.15);
    const out = `v${i}`;
    filters.push(`[${prev}][${i + 1}:v]overlay=0:0:enable='between(t,${start.toFixed(2)},${end.toFixed(2)})'[${out}]`);
    prev = out;
  }

  args.push(
    '-filter_complex', filters.join(';'),
    '-map', `[${prev}]`, '-map', '0:a?',
    '-t', duration.toFixed(2),
    '-c:v', 'libx264', '-preset', 'ultrafast', '-crf', '23',
    '-pix_fmt', 'yuv420p',
    '-c:a', 'aac', '-b:a', '128k',
    '-movflags', '+faststart',
    output
  );

  updateGuardUI('Adding original educational commentary to the video…', 'working');
  await ff.exec(args);
  const data = await ff.readFile(output);
  return new Blob([data.buffer], { type:'video/mp4' });
}

function appendOriginalityDescription(detail) {
  const source = detail?.source;
  if (!source?.originalityGuard?.enabled) return;
  const summary = clean(source.originalitySummary || '');
  if (!summary) return;

  let description = String(detail.description || '').trim();
  if (!description.toLowerCase().includes('original educational angle:')) {
    const attributionPos = description.search(/\n\nSource\s*\/?\s*attribution:/i);
    if (attributionPos >= 0) {
      description = `${description.slice(0, attributionPos).trim()}\n\n${summary}\n\n${description.slice(attributionPos).trim()}`;
    } else {
      description = `${description}\n\n${summary}`.trim();
    }
  }
  detail.description = description.slice(0, 5000);

  const seoDescription = document.getElementById('seoDescription');
  const uploadDescription = document.getElementById('uploadDescription');
  if (seoDescription) seoDescription.value = detail.description;
  if (uploadDescription) uploadDescription.value = detail.description;
}

async function installWrappers() {
  const deadline = Date.now() + 20000;
  while ((!window.ClipFreeAutomation?.loadVideoFile || !window.ClipFreeAutomation?.createMontageFromFiles) && Date.now() < deadline) {
    await sleep(100);
  }
  if (!window.ClipFreeAutomation?.loadVideoFile) {
    updateGuardUI('Originality Guard could not attach to the video engine. Refresh the page.', 'warn');
    return;
  }

  if (!window.ClipFreeAutomation.__originalityWrapped) {
    const originalLoad = window.ClipFreeAutomation.loadVideoFile;
    window.ClipFreeAutomation.loadVideoFile = async function(file, source, automatic) {
      return originalLoad.call(this, file, prepareSource(source, file), automatic);
    };

    if (window.ClipFreeAutomation.createMontageFromFiles) {
      const originalMontage = window.ClipFreeAutomation.createMontageFromFiles;
      window.ClipFreeAutomation.createMontageFromFiles = async function(files, options = {}) {
        const usable = Array.from(files || []).filter(Boolean);
        const result = await originalMontage.call(this, files, options);
        try { result.clipfreeSourceCount = Math.max(1, usable.length); } catch {}
        return result;
      };
    }
    window.ClipFreeAutomation.__originalityWrapped = true;
  }
  updateGuardUI('Originality Guard is active: unique educational storyline + visible commentary + duplicate/source checks + attribution preservation.');
}

window.addEventListener('clipfree-export-ready', async event => {
  const detail = event.detail || window.ClipFreeExport;
  if (!detail?.source?.originalityGuard?.enabled) return;
  if (!detail.__premiumProcessed) return;

  if (detail.__originalityProcessed) {
    appendOriginalityDescription(detail);
    return;
  }

  event.stopImmediatePropagation();
  event.stopPropagation();

  try {
    appendOriginalityDescription(detail);
    const captions = detail.source.originalityCaptions || detail.source.captions || [];
    detail.blob = await addVisibleCommentary(detail.blob, captions);
    detail.visualCommentaryApplied = true;
    if (window.ClipFreeExport) {
      window.ClipFreeExport.blob = detail.blob;
      window.ClipFreeExport.visualCommentaryApplied = true;
    }
    updateGuardUI('Originality Guard completed: this Short now contains visible original educational commentary.', 'good');
  } catch (err) {
    console.warn('Originality Guard video transformation failed', err);
    detail.visualCommentaryApplied = false;
    forcePrivate('Visible commentary rendering failed on this device, so the upload has been forced to Private for review.');
  } finally {
    detail.__originalityProcessed = true;
    window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
  }
}, true);

window.addEventListener('DOMContentLoaded', () => {
  ensureGuardPanel();
  installWrappers().catch(err => {
    console.warn(err);
    updateGuardUI('Originality Guard could not initialise. Refresh the page before publishing.', 'warn');
  });
});

window.ClipFreeOriginalityGuard = {
  version: GUARD_VERSION,
  policyGoal: 'increase meaningful transformation of externally sourced content',
  guarantee: false
};
