const $ = (id) => document.getElementById(id);
const generateButton = $('generateAnimalVideo');
const topicInput = $('animalTopic');
const styleSelect = $('animalStyle');
const durationSelect = $('animalDuration');
const statusEl = $('animalGeneratorStatus');
const progressEl = $('animalGeneratorProgress');
const sourceResults = $('animalSourceResults');
const presetButtons = [...document.querySelectorAll('[data-animal-preset]')];

let activePreset = 'lions';
let running = false;

const PRESETS = {
  lions: {
    label: 'Lions',
    emoji: '🦁',
    query: 'lion wildlife',
    titles: {
      documentary: 'Inside the World of Lions 🦁',
      cute: 'Lion Moments That Are Surprisingly Sweet 🦁',
      dramatic: 'Powerful Lion Moments You Have to See 🦁',
      calm: 'A Quiet Moment With Lions 🦁',
    },
    stories: {
      documentary: 'Meet the lion, one of the most recognizable big cats. Lions are highly social compared with most cat species and often live in groups called prides. Watch how these powerful animals move, rest and interact.',
      cute: 'Even powerful lions have gentle moments. From curious cubs to relaxed family interactions, these scenes show a softer side of life in a pride.',
      dramatic: 'Strength, focus and presence define these lion moments. Every movement shows why lions have become one of the most iconic animals of the savanna.',
      calm: 'Slow down and watch lions in quieter moments. Resting, observing and moving together are all part of daily life for these social big cats.',
    },
    captions: ['Meet the lions 🦁', 'Powerful, social big cats', 'Life in a pride', 'Wildlife worth protecting'],
  },
  wildlife: {
    label: 'Wild Animals',
    emoji: '🦒',
    query: 'wild animals wildlife nature',
    titles: {
      documentary: 'Wild Animals in Their World 🌍',
      cute: 'Unexpectedly Cute Wildlife Moments 🐾',
      dramatic: 'Wildlife Moments That Feel Unreal 🌍',
      calm: 'Peaceful Wildlife Moments From Nature 🌿',
    },
    stories: {
      documentary: 'Wild animals survive by reading their surroundings, conserving energy and responding quickly to change. Every species has its own strategy for finding food, staying safe and raising young.',
      cute: 'Wildlife can be powerful, graceful and unexpectedly adorable. These moments capture curiosity, play and the small behaviors that make animals fascinating to watch.',
      dramatic: 'Nature is full of speed, strength and split-second decisions. These wildlife moments show animals responding to a world that never stands still.',
      calm: 'Nature has its own rhythm. Watch these wild animals move through their environment and enjoy a few peaceful moments away from the rush of everyday life.',
    },
    captions: ['Wildlife up close 🌍', 'Every species has a strategy', 'Nature never stands still', 'Protect wild places'],
  },
  kittens: {
    label: 'Cute Kittens',
    emoji: '🐱',
    query: 'cute kitten cat playing',
    titles: {
      documentary: 'Why Kittens Play So Much 🐱',
      cute: 'Cute Kittens Being Absolutely Adorable 🐱❤️',
      dramatic: 'Tiny Kittens, Maximum Chaos 🐱',
      calm: 'Relaxing Kitten Moments 🐱',
    },
    stories: {
      documentary: 'Kittens learn about their world through play, stalking, pouncing and exploration. Those tiny games help them practise coordination and social skills as they grow.',
      cute: 'Tiny paws, curious faces and endless play. These kitten moments are all about the little things that make young cats so entertaining to watch.',
      dramatic: 'They may be tiny, but kittens can turn any room into an adventure. One second is calm and the next is full-speed playtime.',
      calm: 'A few peaceful kitten moments can make any day feel lighter. Enjoy the tiny paws, soft stretches and curious looks.',
    },
    captions: ['Tiny paws, big curiosity 🐱', 'Play is how kittens learn', 'Pounce. Explore. Repeat.', 'Too cute to skip ❤️'],
  },
  puppies: {
    label: 'Cute Puppies',
    emoji: '🐶',
    query: 'cute puppy dog playing',
    titles: {
      documentary: 'How Puppies Learn Through Play 🐶',
      cute: 'The Cutest Puppy Moments 🐶❤️',
      dramatic: 'Puppy Energy Is Unmatched 🐶',
      calm: 'Wholesome Puppy Moments 🐶',
    },
    stories: {
      documentary: 'Puppies learn through play, scent and social interaction. Exploring new sights and sounds helps them build confidence and understand the world around them.',
      cute: 'Big curiosity in a tiny package. These puppy moments bring together playful energy, happy expressions and the kind of chaos that is hard not to smile at.',
      dramatic: 'Puppies have one setting: full adventure. Every toy, sound and movement can become the start of a brand-new mission.',
      calm: 'Sometimes the best puppy moments are the quiet ones. A soft stretch, a curious look and a peaceful rest can be just as memorable as playtime.',
    },
    captions: ['Puppy mode: ON 🐶', 'Learning through play', 'Curious about everything', 'Wholesome overload ❤️'],
  },
};

function esc(value = '') {
  return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]));
}

function setStatus(text, progress = null, kind = 'subtle') {
  if (statusEl) {
    statusEl.textContent = text;
    statusEl.className = `notice ${kind}`;
  }
  if (progressEl && progress !== null) progressEl.style.width = `${Math.max(0, Math.min(100, progress))}%`;
}

function setPreset(name) {
  if (!PRESETS[name]) return;
  activePreset = name;
  presetButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.animalPreset === name));
  if (topicInput && !topicInput.value.trim()) topicInput.placeholder = `e.g. ${PRESETS[name].query}`;
}

presetButtons.forEach(btn => btn.addEventListener('click', () => setPreset(btn.dataset.animalPreset)));

function buildStory(preset, style, customTopic) {
  const base = preset.stories[style] || preset.stories.documentary;
  if (!customTopic) return base;
  return `${customTopic}. ${base}`;
}

function buildMeta(preset, style, customTopic, sources) {
  const story = buildStory(preset, style, customTopic);
  const baseTitle = preset.titles[style] || preset.titles.documentary;
  const sourceCredits = sources.map((item, i) => `${i + 1}. ${item.attribution}`).join('\n');
  const query = customTopic || preset.query;
  return {
    kind: 'animal-generator',
    title: customTopic ? `${customTopic} ${preset.emoji}`.slice(0, 80) : baseTitle,
    story,
    captions: [...preset.captions],
    provider: 'ClipFree AI Animal Generator + Wikimedia Commons',
    attribution: `ClipFree AI created this montage from reusable source media.\n${sourceCredits}`,
    searchTopic: query,
    sources: sources.map(x => ({ title: x.title, creator: x.creator, license: x.license, sourceUrl: x.sourceUrl })),
  };
}

function renderSources(items) {
  if (!sourceResults) return;
  if (!items.length) {
    sourceResults.innerHTML = '<div class="notice subtle">No suitable sources found yet.</div>';
    return;
  }
  sourceResults.innerHTML = items.map(item => `
    <article class="animal-source-item">
      ${item.thumbUrl ? `<img src="${esc(item.thumbUrl)}" alt="" loading="lazy" />` : ''}
      <div><strong>${esc(item.title)}</strong><small>${esc(item.creator)} • ${esc(item.license)}${item.size ? ` • ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</small><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">Review source</a></div>
    </article>`).join('');
}

async function downloadSource(item, index) {
  const response = await fetch(item.fileUrl, { mode: 'cors', cache: 'no-store' });
  if (!response.ok) throw new Error(`Source ${index + 1} could not be downloaded (${response.status}).`);
  const blob = await response.blob();
  if (blob.size > 35 * 1024 * 1024) throw new Error('One source clip is too large for reliable phone processing. Try again for a different set.');
  const ext = item.title.match(/\.([a-z0-9]{2,5})$/i)?.[1] || (item.mime?.includes('mp4') ? 'mp4' : item.mime?.includes('ogg') ? 'ogv' : 'webm');
  return new File([blob], `animal_source_${index}.${ext}`, { type: item.mime || blob.type || 'video/webm' });
}

async function generateAnimalShort() {
  if (running) return;
  if (!window.ClipFreeYouTube?.searchCommonsDownloadable || !window.ClipFreeAutomation?.createMontageFromFiles) {
    setStatus('The video tools are still loading. Wait a few seconds and try again.', 0, 'bad');
    return;
  }
  running = true;
  generateButton.disabled = true;
  const preset = PRESETS[activePreset] || PRESETS.lions;
  const style = styleSelect?.value || 'documentary';
  const duration = Math.max(12, Math.min(30, Number(durationSelect?.value) || 24));
  const customTopic = (topicInput?.value || '').trim();
  const query = customTopic || preset.query;

  try {
    setStatus(`Finding reusable ${preset.label.toLowerCase()} clips…`, 5);
    let items = await window.ClipFreeYouTube.searchCommonsDownloadable(query, 20);
    let suitable = items.filter(x => !x.size || x.size <= 28 * 1024 * 1024);
    if (suitable.length < 2 && customTopic) {
      setStatus('Trying a broader animal search…', 9);
      items = await window.ClipFreeYouTube.searchCommonsDownloadable(preset.query, 20);
      suitable = items.filter(x => !x.size || x.size <= 28 * 1024 * 1024);
    }
    if (!suitable.length) throw new Error('No small reusable animal videos were found. Try another preset or a broader topic.');

    const chosen = suitable.slice(0, Math.min(3, suitable.length));
    renderSources(chosen);
    setStatus(`Downloading ${chosen.length} reusable source clip${chosen.length === 1 ? '' : 's'}…`, 15);
    const files = [];
    for (let i = 0; i < chosen.length; i++) {
      setStatus(`Downloading source ${i + 1} of ${chosen.length}…`, 15 + Math.round((i / chosen.length) * 20));
      try { files.push(await downloadSource(chosen[i], i)); }
      catch (err) { console.warn(err); }
    }
    if (!files.length) throw new Error('The reusable source clips could not be downloaded on this device.');

    setStatus('Creating a fresh vertical animal montage…', 40, 'good');
    const montage = await window.ClipFreeAutomation.createMontageFromFiles(files, {
      duration,
      filename: `clipfree-${activePreset}-short.mp4`,
    });
    const meta = buildMeta(preset, style, customTopic, chosen.slice(0, files.length));
    setStatus('Montage created. Starting automatic SEO, captions, thumbnail and YouTube upload…', 62, 'good');
    await window.ClipFreeYouTube.startFullAutoWithFile(montage, meta);
    setStatus('Animal Short handed to FULL AUTO. Keep this tab open until the upload finishes.', 72, 'good');
  } catch (err) {
    console.error(err);
    setStatus(err?.message || String(err), 0, 'bad');
  } finally {
    running = false;
    generateButton.disabled = false;
  }
}

if (generateButton) generateButton.addEventListener('click', generateAnimalShort);
setPreset(activePreset);
