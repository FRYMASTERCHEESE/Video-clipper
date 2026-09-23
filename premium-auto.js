// ClipFree AI — Premium Auto Packaging
// Adds automatic unique titles, high-contrast thumbnail treatment, concise thumbnail text,
// English-first metadata packaging, and duplicate-title prevention.
// It does NOT fake engagement or guarantee RPM/CTR/ranking.

const PREMIUM_TARGET_MARKETS = [
  'United States',
  'Canada',
  'United Kingdom',
  'Australia',
  'New Zealand'
];

const USED_TITLE_KEY = 'clipfree-premium-used-titles-v1';

function clean(value = '') {
  return String(value || '')
    .replace(/\.(webm|mp4|mov|ogg|ogv|m4v)\b/ig, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function readUsedTitles() {
  try {
    const raw = JSON.parse(sessionStorage.getItem(USED_TITLE_KEY) || '[]');
    return new Set(Array.isArray(raw) ? raw.map(x => String(x).toLowerCase()) : []);
  } catch {
    return new Set();
  }
}

function saveUsedTitles(set) {
  try { sessionStorage.setItem(USED_TITLE_KEY, JSON.stringify([...set].slice(-150))); } catch {}
}

const usedTitles = readUsedTitles();

const SUBJECTS = [
  { key:'lion', re:/\b(lion|lions|lioness|lionesses|panthera leo)\b/i, label:'Lions', singular:'Lion', thumb:'WILD LIONS' },
  { key:'moose', re:/\b(moose|alces alces)\b/i, label:'Moose', singular:'Moose', thumb:'WILD MOOSE' },
  { key:'tiger', re:/\b(tiger|tigers|panthera tigris)\b/i, label:'Tigers', singular:'Tiger', thumb:'WILD TIGER' },
  { key:'elephant', re:/\b(elephant|elephants|loxodonta|elephas)\b/i, label:'Elephants', singular:'Elephant', thumb:'WILD ELEPHANTS' },
  { key:'kitten', re:/\b(kitten|kittens|cat|cats|feline)\b/i, label:'Kittens', singular:'Kitten', thumb:'CUTE KITTENS' },
  { key:'puppy', re:/\b(puppy|puppies|dog|dogs|canine)\b/i, label:'Puppies', singular:'Puppy', thumb:'CUTE PUPPIES' },
  { key:'wolf', re:/\b(wolf|wolves|canis lupus)\b/i, label:'Wolves', singular:'Wolf', thumb:'WILD WOLVES' },
  { key:'bear', re:/\b(bear|bears|ursus)\b/i, label:'Bears', singular:'Bear', thumb:'WILD BEARS' },
];

const ACTIONS = [
  { re:/\b(fight|fighting|clash|battle)\b/i, label:'Powerful Wildlife Clash', thumb:'WILDLIFE CLASH' },
  { re:/\b(roar|roaring)\b/i, label:'Powerful Roar', thumb:'POWERFUL ROAR' },
  { re:/\b(play|playing|playful)\b/i, label:'Playful Moment', thumb:'PLAYFUL MOMENT' },
  { re:/\b(eat|eating|feeding)\b/i, label:'Feeding Moment', thumb:'FEEDING TIME' },
  { re:/\b(drink|drinking|waterhole|watering hole)\b/i, label:'Waterhole Moment', thumb:'AT THE WATER' },
  { re:/\b(run|running|chase|chasing)\b/i, label:'Wildlife in Motion', thumb:'ON THE MOVE' },
  { re:/\b(rest|resting|sleep|sleeping)\b/i, label:'Quiet Wildlife Moment', thumb:'QUIET MOMENT' },
  { re:/\b(cub|cubs|baby|young)\b/i, label:'Family Moment', thumb:'FAMILY MOMENT' },
];

function sourceText(detail) {
  const s = detail?.source || window.ClipFreeSource || {};
  return clean([
    detail?.title,
    detail?.description,
    s?.title,
    s?.searchTopic,
    s?.story,
    ...(Array.isArray(s?.sources) ? s.sources.map(x => x?.title || '') : [])
  ].filter(Boolean).join(' '));
}

function verifiedSourceAction(detail) {
  const s = detail?.source || window.ClipFreeSource || {};
  const sourceTitles = [
    s?.title,
    ...(Array.isArray(s?.sources) ? s.sources.map(x => x?.title || '') : [])
  ].filter(Boolean).join(' ');
  return ACTIONS.find(a => a.re.test(sourceTitles)) || null;
}

function detectSubject(detail) {
  const text = sourceText(detail);
  return SUBJECTS.find(s => s.re.test(text)) || null;
}

function variantsFor(subject, action) {
  if (subject?.key === 'kitten') {
    if (action?.label === 'Playful Moment') {
      return ['Cute Kittens Playing Together','Playful Kittens in Action','Tiny Kittens at Play','Kitten Playtime You Have to See','Adorable Kittens Playing'];
    }
    return ['Cute Kittens Being Adorable','Tiny Kittens, Big Personality','Wholesome Kitten Moment','Cute Kittens You Have to See','Tiny Paws, Big Curiosity','Adorable Kitten Short','Kittens Being Too Cute'];
  }

  if (subject?.key === 'puppy') {
    if (action?.label === 'Playful Moment') {
      return ['Cute Puppies Playing Together','Playful Puppies in Action','Puppy Playtime You Have to See','Happy Puppies at Play','Adorable Puppies Playing'];
    }
    return ['Cute Puppies You Have to See','Wholesome Puppy Moment','Puppy Energy Is Unmatched','Adorable Puppy Short','Tiny Paws, Big Adventure','Happy Puppy Moment','Cute Puppies Being Adorable'];
  }

  if (subject && action) {
    return [
      `${subject.label}: ${action.label}`,
      `${action.label}: ${subject.label}`,
      `${subject.label} in the Wild: ${action.label}`,
      `Wild ${subject.label}: ${action.label}`,
      `${subject.singular} Wildlife: ${action.label}`
    ];
  }

  if (subject) {
    return [
      `${subject.label} in the Wild`,
      `Wild ${subject.label}: Nature Moment`,
      `${subject.singular} Wildlife in Nature`,
      `Life of ${subject.label} in the Wild`,
      `Wild ${subject.label}: Animal Short`,
      `${subject.label}: A Wildlife Moment`,
      `Nature With ${subject.label}`,
      `${subject.label} in Their World`
    ];
  }

  return [
    'Wildlife Moment From Nature',
    'Wild Animals in Their World',
    'A Moment From the Wild',
    'Nature and Wildlife Short',
    'Wildlife You Have to See',
    'Animals in the Wild'
  ];
}

function reserveUniqueTitle(variants, preferredIndex = 0) {
  const safe = variants.map(clean).filter(Boolean);
  for (let offset = 0; offset < safe.length; offset++) {
    const candidate = safe[(preferredIndex + offset) % safe.length].slice(0, 68);
    const key = candidate.toLowerCase();
    if (!usedTitles.has(key)) {
      usedTitles.add(key);
      saveUsedTitles(usedTitles);
      return candidate;
    }
  }
  const base = safe[preferredIndex % Math.max(1, safe.length)] || 'Wildlife Moment';
  let n = 2;
  while (usedTitles.has(`${base} ${n}`.toLowerCase())) n++;
  const candidate = `${base} ${n}`.slice(0, 68);
  usedTitles.add(candidate.toLowerCase());
  saveUsedTitles(usedTitles);
  return candidate;
}

function titleFor(detail) {
  if (detail.__premiumTitle) return detail.__premiumTitle;
  const subject = detectSubject(detail);
  const action = verifiedSourceAction(detail);
  const idx = Math.max(0, Number(detail?.source?.batchIndex ?? detail?.batchIndex ?? 0));
  const title = reserveUniqueTitle(variantsFor(subject, action), idx);
  detail.__premiumTitle = title;
  return title;
}

function thumbnailTextFor(detail, title) {
  if (detail.__premiumThumbText) return detail.__premiumThumbText;
  const subject = detectSubject(detail);
  const action = verifiedSourceAction(detail);
  let text = action?.thumb || subject?.thumb || clean(title).split(/\s+/).slice(0, 4).join(' ').toUpperCase();
  text = clean(text).split(/\s+/).slice(0, 4).join(' ').toUpperCase();
  detail.__premiumThumbText = text || 'WILDLIFE MOMENT';
  return detail.__premiumThumbText;
}

function hashtagsFor(detail) {
  const subject = detectSubject(detail);
  const specific = subject ? `#${subject.label.replace(/[^a-z0-9]/gi,'')}` : '#Wildlife';
  return ['#Shorts', specific, '#Wildlife', '#Animals', '#Nature']
    .filter((x, i, a) => x && a.indexOf(x) === i)
    .slice(0, 5);
}

function tagsFor(detail) {
  const subject = detectSubject(detail);
  const action = verifiedSourceAction(detail);
  const existing = String(detail?.tags || document.querySelector('#seoTags')?.value || '')
    .split(',')
    .map(x => clean(x).toLowerCase())
    .filter(Boolean);

  const extra = [
    subject?.singular?.toLowerCase(),
    subject ? `${subject.singular.toLowerCase()} wildlife` : '',
    subject ? `${subject.label.toLowerCase()} in the wild` : '',
    action?.label?.toLowerCase(),
    'wildlife shorts',
    'animal shorts',
    'wildlife video',
    'nature',
    'animals',
    'youtube shorts'
  ].filter(Boolean);

  return [...new Set([...existing, ...extra])].filter(x => x.length <= 45).slice(0, 15);
}

function descriptionFor(detail, title) {
  const subject = detectSubject(detail);
  const action = verifiedSourceAction(detail);
  const hashtags = hashtagsFor(detail);

  const old = String(detail?.description || document.querySelector('#seoDescription')?.value || '').trim();
  const attributionMatch = old.match(/(?:\n\n)?Source\s*\/?\s*attribution:[\s\S]*$/i);
  const attribution = attributionMatch ? `\n\n${attributionMatch[0].trim()}` : '';

  let intro;
  if (subject?.key === 'kitten') intro = 'A quick kitten Short featuring real animal footage, playful moments and clear English captions.';
  else if (subject?.key === 'puppy') intro = 'A quick puppy Short featuring real animal footage, playful moments and clear English captions.';
  else if (subject && action) intro = `${subject.label} in a real wildlife moment featuring ${action.label.toLowerCase()}.`;
  else if (subject) intro = `${subject.label} in a short wildlife moment featuring real animal footage.`;
  else intro = 'A short wildlife moment featuring real animal footage and clear English metadata.';

  const audienceLine = 'Packaged in clear international English for broad English-speaking wildlife audiences.';
  const subscribe = 'Subscribe for more wildlife and animal Shorts.';
  return `${title}\n\n${intro}\n\n${audienceLine}\n\n${subscribe}\n\n${hashtags.join(' ')}${attribution}`.slice(0, 5000);
}

function syncFields(detail) {
  const mappings = [
    ['#seoTitle', detail.title],
    ['#seoDescription', detail.description],
    ['#seoTags', detail.tags],
    ['#seoHashtags', detail.hashtags],
    ['#uploadTitle', detail.title],
    ['#uploadDescription', detail.description],
    ['#uploadTags', detail.tags],
  ];
  for (const [selector, value] of mappings) {
    const el = document.querySelector(selector);
    if (el && value != null) {
      el.value = String(value);
      el.dispatchEvent(new Event('input', { bubbles:true }));
      el.dispatchEvent(new Event('change', { bubbles:true }));
    }
  }
}

function applyPremiumMetadata(detail) {
  const title = titleFor(detail);
  const hashtags = hashtagsFor(detail);
  detail.title = title;
  detail.description = descriptionFor(detail, title);
  detail.tags = tagsFor(detail).join(', ');
  detail.hashtags = hashtags.join(' ');
  detail.thumbnailText = thumbnailTextFor(detail, title);
  detail.metadataLanguage = 'en';
  detail.targetMarkets = [...PREMIUM_TARGET_MARKETS];

  if (window.ClipFreeExport && window.ClipFreeExport !== detail) {
    Object.assign(window.ClipFreeExport, {
      title: detail.title,
      description: detail.description,
      tags: detail.tags,
      hashtags: detail.hashtags,
      thumbnailText: detail.thumbnailText,
      metadataLanguage: detail.metadataLanguage,
      targetMarkets: detail.targetMarkets
    });
  }
  syncFields(detail);
}

function drawCover(ctx, image, width, height) {
  const iw = image.width, ih = image.height;
  const target = width / height, source = iw / ih;
  let sx = 0, sy = 0, sw = iw, sh = ih;
  if (source > target) {
    sw = ih * target;
    sx = (iw - sw) / 2;
  } else {
    sh = iw / target;
    sy = (ih - sh) / 2;
  }
  ctx.drawImage(image, sx, sy, sw, sh, 0, 0, width, height);
}

function wrapText(ctx, text, maxWidth, maxLines = 2) {
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

async function enhanceThumbnail(blob, headline) {
  if (!(blob instanceof Blob)) return blob;
  try {
    const bitmap = await createImageBitmap(blob);
    const canvas = document.createElement('canvas');
    canvas.width = 1280;
    canvas.height = 720;
    const ctx = canvas.getContext('2d');

    ctx.imageSmoothingEnabled = true;
    ctx.imageSmoothingQuality = 'high';
    ctx.filter = 'brightness(1.12) contrast(1.20) saturate(1.18)';
    drawCover(ctx, bitmap, canvas.width, canvas.height);
    ctx.filter = 'none';

    // Cover older title treatment so the new short headline stays clean and readable.
    const gradient = ctx.createLinearGradient(0, 330, 0, 720);
    gradient.addColorStop(0, 'rgba(0,0,0,0.02)');
    gradient.addColorStop(0.35, 'rgba(0,0,0,0.42)');
    gradient.addColorStop(1, 'rgba(0,0,0,0.88)');
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 300, 1280, 420);

    ctx.font = '800 29px Arial, sans-serif';
    ctx.fillStyle = 'rgba(0,0,0,.62)';
    ctx.fillRect(70, 385, 275, 62);
    ctx.fillStyle = '#ffffff';
    ctx.fillText('WILDLIFE SHORT', 91, 426);

    ctx.font = '900 92px Arial, sans-serif';
    ctx.textAlign = 'left';
    ctx.textBaseline = 'bottom';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = 'rgba(0,0,0,.94)';
    ctx.lineWidth = 15;
    ctx.fillStyle = '#ffffff';
    ctx.shadowColor = 'rgba(0,0,0,.75)';
    ctx.shadowBlur = 14;

    const lines = wrapText(ctx, headline, 1110, 2);
    const lineHeight = 102;
    const y0 = 655 - (lines.length - 1) * lineHeight;
    lines.forEach((line, i) => {
      const y = y0 + i * lineHeight;
      ctx.strokeText(line, 80, y, 1110);
      ctx.fillText(line, 80, y, 1110);
    });

    ctx.shadowBlur = 0;
    ctx.fillStyle = '#ffd54a';
    ctx.fillRect(80, 682, 260, 10);

    bitmap.close?.();
    return await new Promise(resolve => canvas.toBlob(resolve, 'image/jpeg', 0.95));
  } catch (err) {
    console.warn('Premium thumbnail enhancement skipped', err);
    return blob;
  }
}

function updateTargetingBadge() {
  if (document.querySelector('#clipfreePremiumAudienceBadge')) return;
  const score = document.querySelector('#clipfreeDiscoveryScore');
  const seo = document.querySelector('.seo-panel');
  const host = score || seo;
  if (!host) return;
  const note = document.createElement('div');
  note.id = 'clipfreePremiumAudienceBadge';
  note.style.cssText = 'margin:10px 16px 0;padding:10px 12px;border:1px solid #3b315d;border-radius:10px;background:#12101c;color:#c7bbff;font-size:.78rem;line-height:1.45';
  note.textContent = 'AUTO audience strategy: clear international English • US • Canada • UK • Australia • New Zealand. YouTube still decides distribution from viewer interest and performance.';
  host.parentNode?.insertBefore(note, host.nextSibling);
}

// Run AFTER site.js's capture-phase optimizer but BEFORE youtube.js's normal bubble listener.
// First pass pauses the upload event long enough to improve the thumbnail asynchronously.
// Second pass lets the normal YouTube upload flow continue.
window.addEventListener('clipfree-export-ready', async (event) => {
  const detail = event.detail || window.ClipFreeExport;
  if (!detail) return;

  if (detail.__premiumProcessed) {
    if (!detail.__originalityProcessed) applyPremiumMetadata(detail);
    updateTargetingBadge();
    return;
  }

  event.stopImmediatePropagation();
  event.stopPropagation();

  try {
    applyPremiumMetadata(detail);
    if (detail.thumbnailBlob) {
      detail.thumbnailBlob = await enhanceThumbnail(detail.thumbnailBlob, detail.thumbnailText);
      if (window.ClipFreeExport) window.ClipFreeExport.thumbnailBlob = detail.thumbnailBlob;
    }
  } catch (err) {
    console.warn('ClipFree Premium Auto packaging skipped', err);
  } finally {
    detail.__premiumProcessed = true;
    updateTargetingBadge();
    window.dispatchEvent(new CustomEvent('clipfree-export-ready', { detail }));
  }
}, true);

window.addEventListener('DOMContentLoaded', () => {
  document.documentElement.lang = 'en';
  setTimeout(updateTargetingBadge, 500);
  setTimeout(updateTargetingBadge, 2000);
});

window.ClipFreePremiumAuto = {
  targetMarkets: [...PREMIUM_TARGET_MARKETS],
  version: '2026-09-24',
  mode: 'automatic'
};
