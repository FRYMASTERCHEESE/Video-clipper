const $ = (id) => document.getElementById(id);
const STORAGE_KEY = 'clipfree.charity.settings.v1';
const nameInput = $('charityName');
const urlInput = $('charityDonationUrl');
const saveButton = $('saveCharitySettings');
const statusEl = $('charitySettingsStatus');
const messageEl = $('donationMessage');
const donationButtons = [...document.querySelectorAll('.donate-action')];

function loadSettings() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY) || '{}') || {}; }
  catch { return {}; }
}

function validDonationUrl(value) {
  try {
    const u = new URL(value);
    return ['https:', 'http:'].includes(u.protocol) ? u.toString() : '';
  } catch { return ''; }
}

function applySettings() {
  const settings = loadSettings();
  if (nameInput) nameInput.value = settings.name || '';
  if (urlInput) urlInput.value = settings.url || '';
  const label = settings.name ? `Donate to ${settings.name} ❤️` : 'Donate to charity ❤️';
  donationButtons.forEach(btn => btn.textContent = label);
  if (messageEl) {
    messageEl.textContent = settings.name
      ? `Donations open ${settings.name}'s donation page directly. ClipFree does not collect or hold the payment.`
      : 'Connect an official charity or fundraiser donation page in Setup. ClipFree does not collect or hold the donation.';
  }
  if (statusEl) {
    statusEl.className = `notice ${settings.url ? 'good' : 'subtle'}`;
    statusEl.textContent = settings.url
      ? `Donation button is connected${settings.name ? ` to ${settings.name}` : ''}. Payments go through the linked donation page, not ClipFree.`
      : 'No donation link has been configured yet.';
  }
}

if (saveButton) saveButton.addEventListener('click', () => {
  const name = (nameInput?.value || '').trim();
  const url = validDonationUrl((urlInput?.value || '').trim());
  if (!url) {
    if (statusEl) {
      statusEl.className = 'notice bad';
      statusEl.textContent = 'Enter a valid official donation URL beginning with https://';
    }
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify({ name, url }));
  applySettings();
});

donationButtons.forEach(btn => btn.addEventListener('click', () => {
  const settings = loadSettings();
  const url = validDonationUrl(settings.url || '');
  if (url) {
    window.open(url, '_blank', 'noopener,noreferrer');
    return;
  }
  document.querySelector('#setup')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  if (statusEl) {
    statusEl.className = 'notice bad';
    statusEl.textContent = 'Add the official charity or fundraiser donation link here first.';
  }
}));

applySettings();

/* --------------------------------------------------------------------------
   ClipFree relevance + mobile popup reliability patch
   - Rejects false-positive military "African Lion" footage for animal searches.
   - Ranks true animal footage first.
   - Prefers smaller files for more reliable Android processing.
   - Opens/refreshes Google authorization directly from the user's batch click
     before long searches/downloads, avoiding mobile popup blockers.
   - Skips a broken source and keeps looking instead of stopping the whole batch.
   -------------------------------------------------------------------------- */

(() => {
  const sleep = (ms) => new Promise(resolve => setTimeout(resolve, ms));

  async function waitForClipFree(timeout = 12000) {
    const start = Date.now();
    while (!window.ClipFreeYouTube?.searchCommonsDownloadable) {
      if (Date.now() - start > timeout) return null;
      await sleep(120);
    }
    return window.ClipFreeYouTube;
  }

  function esc(value = '') {
    return String(value).replace(/[&<>'"]/g, ch => ({
      '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;'
    }[ch]));
  }

  function cleanWords(value = '') {
    return String(value).toLowerCase()
      .replace(/[^a-z0-9\s-]/g, ' ')
      .split(/\s+/)
      .map(x => x.trim())
      .filter(x => x.length >= 3);
  }

  const FALSE_POSITIVE_RE = /\b(army|soldiers?|military|armed forces|u\.?s\.? forces|special operations?|weapon|weapons|rifle|rifles|machine gun|combat|casualty|casualties|aeromedical|evacuation|training|exercise african lion|african lion 20\d{2}|qualification|tactical|b-roll|mtrs|nato|setaf|morocco|tunisian|tunisia|maneuver|lethality|warfare)\b/i;
  const ANIMAL_CONTEXT_RE = /\b(wildlife|animal|animals|nature|zoo|safari|savanna|habitat|predator|mammal|rescue|sanctuary|national park|refuge|forest|wild)\b/i;

  const SPECIES = {
    lion: {
      query: /\b(lion|lions|lioness|lionesses|lion cub|lion cubs|panthera leo)\b/i,
      text: /\b(lion|lions|lioness|lionesses|lion cub|lion cubs|panthera leo|pride of lions)\b/i,
      searches: ['lion wildlife animal', 'Panthera leo wildlife', 'lioness lion cub wildlife', 'lions savanna wildlife']
    },
    cat: {
      query: /\b(cat|cats|kitten|kittens|feline)\b/i,
      text: /\b(cat|cats|kitten|kittens|feline|domestic cat)\b/i,
      searches: ['cute kittens cats', 'kitten playing cat', 'domestic cat kitten']
    },
    dog: {
      query: /\b(dog|dogs|puppy|puppies|canine)\b/i,
      text: /\b(dog|dogs|puppy|puppies|canine|domestic dog)\b/i,
      searches: ['cute puppies dogs', 'puppy playing dog', 'domestic dog puppy']
    },
    tiger: {
      query: /\b(tiger|tigers)\b/i,
      text: /\b(tiger|tigers|panthera tigris)\b/i,
      searches: ['tiger wildlife animal', 'Panthera tigris wildlife']
    },
    elephant: {
      query: /\b(elephant|elephants)\b/i,
      text: /\b(elephant|elephants|loxodonta|elephas)\b/i,
      searches: ['elephant wildlife animal', 'elephants safari wildlife']
    },
    wolf: {
      query: /\b(wolf|wolves)\b/i,
      text: /\b(wolf|wolves|canis lupus)\b/i,
      searches: ['wolf wildlife animal', 'wolves nature wildlife']
    },
    bear: {
      query: /\b(bear|bears)\b/i,
      text: /\b(bear|bears|ursus)\b/i,
      searches: ['bear wildlife animal', 'bears nature wildlife']
    },
  };

  function profileFor(query = '') {
    for (const [name, profile] of Object.entries(SPECIES)) {
      if (profile.query.test(query)) return { name, ...profile };
    }
    return null;
  }

  function isAnimalIntent(query = '') {
    return Boolean(profileFor(query) || /\b(animal|animals|wildlife|pet|pets|nature|safari|zoo|kitten|puppy)\b/i.test(query));
  }

  function searchableText(item) {
    return `${item?.title || ''} ${item?.creator || ''} ${item?.attribution || ''}`;
  }

  function relevanceScore(item, query) {
    const text = searchableText(item);
    if (FALSE_POSITIVE_RE.test(text)) return -1000;

    const profile = profileFor(query);
    const words = [...new Set(cleanWords(query).filter(w => !['with','from','into','this','that','video','shorts'].includes(w)))];
    let score = 0;

    if (profile) {
      if (profile.text.test(text)) score += 9;
      else return -1000; // species searches must actually mention the animal
    } else if (isAnimalIntent(query)) {
      if (ANIMAL_CONTEXT_RE.test(text)) score += 5;
      else {
        const anySpecies = Object.values(SPECIES).some(p => p.text.test(text));
        if (anySpecies) score += 5;
        else return -1000;
      }
    }

    for (const word of words) {
      const singular = word.endsWith('s') ? word.slice(0, -1) : word;
      if (new RegExp(`\\b${singular}s?\\b`, 'i').test(text)) score += 2;
    }

    if (ANIMAL_CONTEXT_RE.test(text)) score += 3;

    const mb = Number(item?.size || 0) / 1024 / 1024;
    if (mb > 0 && mb <= 12) score += 3;
    else if (mb <= 22) score += 2;
    else if (mb <= 32) score += 1;
    else if (mb > 36) score -= 5;

    return score;
  }

  function uniqueItems(items) {
    const seen = new Set();
    return items.filter(item => {
      const key = item?.fileUrl || item?.sourceUrl || item?.title;
      if (!key || seen.has(key)) return false;
      seen.add(key);
      return true;
    });
  }

  async function installPatch() {
    const yt = await waitForClipFree();
    if (!yt) return;

    if (yt.__clipfreeRelevancePatchInstalled) return;
    yt.__clipfreeRelevancePatchInstalled = true;

    const originalSearch = yt.searchCommonsDownloadable.bind(yt);

    async function strictSearch(query, limit = 12) {
      const rawQuery = String(query || '').trim();
      if (!rawQuery) return originalSearch(query, limit);

      if (!isAnimalIntent(rawQuery)) {
        const plain = await originalSearch(rawQuery, Math.min(20, Math.max(limit, 12)));
        return plain
          .filter(item => !FALSE_POSITIVE_RE.test(searchableText(item)))
          .filter(item => !item.size || item.size <= 36 * 1024 * 1024)
          .sort((a,b) => Number(a.size || 0) - Number(b.size || 0))
          .slice(0, limit);
      }

      const profile = profileFor(rawQuery);
      const searches = [
        `${rawQuery} wildlife animal`,
        ...(profile?.searches || []),
        rawQuery
      ];

      const gathered = [];
      for (const q of [...new Set(searches)]) {
        try {
          const found = await originalSearch(q, 20);
          gathered.push(...found);
        } catch (err) {
          console.warn('ClipFree relevance search skipped one query', q, err);
        }
        if (gathered.length >= 45) break;
      }

      return uniqueItems(gathered)
        .map(item => ({ item, score: relevanceScore(item, rawQuery) }))
        .filter(x => x.score >= 5)
        .filter(x => !x.item.size || x.item.size <= 36 * 1024 * 1024)
        .sort((a,b) => b.score - a.score || Number(a.item.size || 0) - Number(b.item.size || 0))
        .map(x => x.item)
        .slice(0, Math.max(1, Math.min(20, limit)));
    }

    yt.searchCommonsDownloadable = strictSearch;

    function connectedNow() {
      const disconnect = document.getElementById('disconnectYoutube');
      const status = document.getElementById('youtubeConnectionStatus')?.textContent || '';
      return Boolean((disconnect && !disconnect.classList.contains('hidden')) || /^Connected to /i.test(status.trim()));
    }

    async function connectFromUserClick() {
      // Calling this before any long search/download keeps the OAuth popup tied
      // to the user's actual tap, which mobile browsers are much less likely to block.
      await yt.connectYoutube();
      if (!connectedNow()) {
        throw new Error('YouTube connection did not finish. Tap Connect YouTube once, approve Google access, then try FULL AUTO again.');
      }
    }

    async function downloadReliable(item, index = 0) {
      const response = await fetch(item.fileUrl, { mode: 'cors', cache: 'no-store' });
      if (!response.ok) throw new Error(`Download failed (${response.status}).`);
      const blob = await response.blob();
      if (!blob.size) throw new Error('The source returned an empty video file.');
      if (blob.size > 36 * 1024 * 1024) throw new Error('Source is too large for reliable phone processing.');

      const raw = String(item.title || `animal-${index}.webm`);
      const ext = raw.match(/\.([a-z0-9]{2,5})$/i)?.[1]
        || (String(item.mime).includes('mp4') ? 'mp4' : String(item.mime).includes('ogg') ? 'ogv' : 'webm');
      const base = raw.replace(/\.[^.]+$/, '').replace(/[^a-z0-9 _.-]+/gi, '').trim().slice(0, 70) || `animal-${index}`;
      return new File([blob], `${base}.${ext}`, { type: item.mime || blob.type || 'video/webm' });
    }

    function setNotice(el, text, kind = 'subtle') {
      if (!el) return;
      el.className = `notice ${kind}`;
      el.textContent = text;
    }

    function setAutoStatus(title, detail, progress = null, kind = 'subtle') {
      const t = document.getElementById('autoStatusText');
      const d = document.getElementById('autoStatusDetail');
      const p = document.getElementById('autoProgressBar');
      if (t) t.textContent = title;
      if (d) {
        d.className = `notice ${kind}`;
        d.textContent = detail;
      }
      if (p && progress != null) p.style.width = `${Math.max(0, Math.min(100, progress))}%`;
    }

    function renderResults(items) {
      const root = document.getElementById('commonsResults');
      if (!root) return;
      window.__clipfreeCommonsResults = items;

      if (!items.length) {
        root.innerHTML = '<div class="notice subtle">No true animal matches were found. ClipFree filtered unrelated military/training results. Try a simpler animal topic such as “lions”, “lion cubs”, “kittens” or “puppies”.</div>';
        return;
      }

      root.innerHTML = items.map((item, index) => `
        <article class="video-result">
          ${item.thumbUrl ? `<img src="${esc(item.thumbUrl)}" alt="" loading="lazy" />` : ''}
          <div class="result-body">
            <h3>${esc(String(item.title || '').replace(/\.[a-z0-9]{2,5}$/i, ''))}</h3>
            <p>${esc(item.creator || 'Wikimedia Commons')} • ${esc(item.license || '')}${item.size ? ` • ${(item.size / 1024 / 1024).toFixed(1)} MB` : ''}</p>
            <div class="result-actions">
              <button data-patch-use="${index}">Use + FULL AUTO</button>
              <a href="${esc(item.sourceUrl || '#')}" target="_blank" rel="noopener">Open source</a>
            </div>
          </div>
        </article>
      `).join('');

      root.querySelectorAll('[data-patch-use]').forEach(btn => btn.addEventListener('click', async () => {
        const item = items[Number(btn.dataset.patchUse)];
        if (!item) return;
        btn.disabled = true;
        try {
          await connectFromUserClick();
          const file = await downloadReliable(item, Number(btn.dataset.patchUse));
          await yt.startFullAutoWithFile(file, item);
        } catch (err) {
          setAutoStatus('FULL AUTO stopped', err?.message || String(err), 0, 'bad');
        } finally {
          btn.disabled = false;
        }
      }));
    }

    const autoFind = document.getElementById('autoFindCreateUpload');
    if (autoFind) {
      autoFind.addEventListener('click', async (event) => {
        event.preventDefault();
        event.stopImmediatePropagation();

        const topicInput = document.getElementById('autoTopic');
        const batchSelect = document.getElementById('autoBatchCount');
        const finderStatus = document.getElementById('autoFinderStatus');
        const topic = (topicInput?.value || '').trim() || 'wildlife animals';
        const wanted = Math.max(1, Math.min(8, Number(batchSelect?.value) || 1));

        autoFind.disabled = true;
        try {
          setAutoStatus('Connecting YouTube', 'Refreshing Google authorization before the search so Android does not block the popup later.', 2);
          await connectFromUserClick();

          setAutoStatus('Finding true matches', `Searching for real animal footage matching “${topic}”…`, 5);
          setNotice(finderStatus, `Searching and filtering unrelated results for “${topic}”…`);

          const items = await strictSearch(topic, 20);
          renderResults(items);

          if (!items.length) throw new Error('No matching animal videos passed the relevance filter. Try a simpler animal topic.');

          setNotice(finderStatus, `Found ${items.length} matching animal videos. Unrelated military/training results were removed.`, 'good');

          let success = 0;
          let attempted = 0;
          const errors = [];

          for (const item of items) {
            if (success >= wanted) break;
            attempted += 1;
            const number = success + 1;
            setAutoStatus(`Batch ${number}/${wanted}`, `Downloading a verified animal match: “${String(item.title || '').replace(/\.[a-z0-9]{2,5}$/i, '')}”`, 8 + Math.round((success / wanted) * 84), 'good');

            try {
              const file = await downloadReliable(item, attempted - 1);
              await yt.startFullAutoWithFile(file, item);
              success += 1;
            } catch (err) {
              console.warn('Skipping source that failed to load/process', item?.title, err);
              errors.push(`${item?.title || 'source'}: ${err?.message || err}`);
              setAutoStatus(`Skipping one source`, 'That source did not load reliably on this phone, so ClipFree is automatically trying the next matching video.', 8 + Math.round((success / wanted) * 84), 'subtle');
              await sleep(250);
            }
          }

          if (!success) {
            throw new Error('Matching videos were found, but none loaded reliably on this phone. Try 1 Short first or use a simpler topic.');
          }

          if (success < wanted) {
            setAutoStatus('Batch partly complete', `${success}/${wanted} Shorts completed. ClipFree skipped sources that failed to load instead of stopping the whole batch.`, 100, 'good');
          } else {
            setAutoStatus('Batch complete', `${success} matching animal Short${success === 1 ? '' : 's'} completed.`, 100, 'good');
          }
        } catch (err) {
          console.error(err);
          setNotice(finderStatus, err?.message || String(err), 'bad');
          setAutoStatus('FULL AUTO stopped', err?.message || String(err), 0, 'bad');
        } finally {
          autoFind.disabled = false;
        }
      }, true);
    }

    const animalButton = document.getElementById('generateAnimalVideo');
    if (animalButton) {
      animalButton.addEventListener('click', async (event) => {
        if (animalButton.dataset.authPrimed === '1') {
          animalButton.dataset.authPrimed = '0';
          return; // let the original animal-generator click handler run
        }
        if (connectedNow()) return; // already connected; original handler can continue

        event.preventDefault();
        event.stopImmediatePropagation();
        animalButton.disabled = true;
        const animalStatus = document.getElementById('animalGeneratorStatus');
        setNotice(animalStatus, 'Connecting YouTube first so the browser will not block Google later…');

        try {
          await connectFromUserClick();
          animalButton.dataset.authPrimed = '1';
          animalButton.disabled = false;
          animalButton.click();
        } catch (err) {
          setNotice(animalStatus, err?.message || String(err), 'bad');
          animalButton.disabled = false;
        }
      }, true);
    }
  }

  installPatch().catch(err => console.warn('ClipFree site patch could not start', err));
})();
/* --------------------------------------------------------------------------
   ClipFree YouTube Discovery Optimizer
   A pre-publish scoring + metadata optimizer based on YouTube's documented
   search/discovery principles: relevance, engagement readiness, packaging,
   clear titles/descriptions, and viewer-first Shorts presentation.
   This is a readiness score, not a promise of ranking.
   -------------------------------------------------------------------------- */
(() => {
  const $ = (id) => document.getElementById(id);

  const seoTitle = $('seoTitle');
  const seoDescription = $('seoDescription');
  const seoTags = $('seoTags');
  const seoHashtags = $('seoHashtags');

  if (!seoTitle || !seoDescription || !seoTags || !seoHashtags) return;

  const clean = (value = '') => String(value)
    .replace(/\.[a-z0-9]{2,5}\b/ig, '')
    .replace(/[_]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();

  const lower = (value = '') => clean(value).toLowerCase();

  const unique = (items = []) => [...new Set(items.map(x => clean(x)).filter(Boolean))];

  const htmlEsc = (value = '') => String(value).replace(/[&<>'"]/g, ch => ({
    '&':'&amp;', '<':'&lt;', '>':'&gt;', "'":'&#039;', '"':'&quot;'
  }[ch]));

  const titleCase = (value = '') => {
    const small = new Set(['a','an','and','as','at','but','by','for','in','of','on','or','the','to','with']);
    return clean(value).split(/\s+/).map((word, i) => {
      if (!word) return word;
      if (i && small.has(word.toLowerCase())) return word.toLowerCase();
      return word.charAt(0).toUpperCase() + word.slice(1);
    }).join(' ');
  };

  const PROFILES = [
    {
      key:'lion', re:/\b(lion|lions|lioness|lionesses|lion cubs?|panthera leo)\b/i,
      label:'Lions', singular:'lion', emoji:'🦁',
      tags:['lion','lions','lion wildlife','african lion','lion pride','lioness','big cats','panthera leo','wildlife shorts','lion shorts'],
      hashtags:['#Shorts','#Lions','#Wildlife','#BigCats'],
      searches:['lion wildlife','lions in the wild','african lions','lion pride','big cats','lion shorts']
    },
    {
      key:'moose', re:/\b(moose|alces alces)\b/i,
      label:'Moose', singular:'moose', emoji:'🫎',
      tags:['moose','moose wildlife','moose in the wild','alces alces','wildlife','wild animals','nature','wildlife shorts','moose shorts'],
      hashtags:['#Shorts','#Moose','#Wildlife','#Nature'],
      searches:['moose wildlife','moose in the wild','alces alces','wildlife shorts']
    },
    {
      key:'tiger', re:/\b(tiger|tigers|panthera tigris)\b/i,
      label:'Tigers', singular:'tiger', emoji:'🐅',
      tags:['tiger','tigers','tiger wildlife','tiger in the wild','big cats','panthera tigris','wildlife','wildlife shorts','tiger shorts'],
      hashtags:['#Shorts','#Tigers','#Wildlife','#BigCats'],
      searches:['tiger wildlife','tigers in the wild','big cats','tiger shorts']
    },
    {
      key:'elephant', re:/\b(elephant|elephants|loxodonta|elephas)\b/i,
      label:'Elephants', singular:'elephant', emoji:'🐘',
      tags:['elephant','elephants','elephant wildlife','elephants in the wild','safari animals','wildlife','wild animals','wildlife shorts','elephant shorts'],
      hashtags:['#Shorts','#Elephants','#Wildlife','#Safari'],
      searches:['elephant wildlife','elephants in the wild','safari animals','elephant shorts']
    },
    {
      key:'kitten', re:/\b(kitten|kittens|cat|cats|feline)\b/i,
      label:'Cute Kittens', singular:'kitten', emoji:'🐱',
      tags:['cute kittens','kittens','kitten','cats','cute cats','kittens playing','cat videos','kitten shorts','cute animal shorts'],
      hashtags:['#Shorts','#Kittens','#Cats','#CuteAnimals'],
      searches:['cute kittens','kittens playing','cute cats','kitten shorts','cat videos']
    },
    {
      key:'puppy', re:/\b(puppy|puppies|dog|dogs|canine)\b/i,
      label:'Cute Puppies', singular:'puppy', emoji:'🐶',
      tags:['cute puppies','puppies','puppy','dogs','cute dogs','puppies playing','dog videos','puppy shorts','cute animal shorts'],
      hashtags:['#Shorts','#Puppies','#Dogs','#CuteAnimals'],
      searches:['cute puppies','puppies playing','cute dogs','puppy shorts','dog videos']
    },
    {
      key:'wolf', re:/\b(wolf|wolves|canis lupus)\b/i,
      label:'Wolves', singular:'wolf', emoji:'🐺',
      tags:['wolf','wolves','wolf wildlife','wolves in the wild','canis lupus','wildlife','predators','wildlife shorts','wolf shorts'],
      hashtags:['#Shorts','#Wolves','#Wildlife','#Nature'],
      searches:['wolf wildlife','wolves in the wild','canis lupus','wolf shorts']
    },
    {
      key:'bear', re:/\b(bear|bears|ursus)\b/i,
      label:'Bears', singular:'bear', emoji:'🐻',
      tags:['bear','bears','bear wildlife','bears in the wild','wildlife','wild animals','nature','wildlife shorts','bear shorts'],
      hashtags:['#Shorts','#Bears','#Wildlife','#Nature'],
      searches:['bear wildlife','bears in the wild','wildlife shorts','bear shorts']
    },
  ];

  const ACTIONS = [
    {re:/\b(fight|fighting|clash|battle)\b/i, phrase:'fight', title:'Powerful Clash'},
    {re:/\b(play|playing|playful)\b/i, phrase:'playing', title:'Playful Moment'},
    {re:/\b(roar|roaring)\b/i, phrase:'roaring', title:'Powerful Roar'},
    {re:/\b(eat|eating|feeding)\b/i, phrase:'eating', title:'Feeding Moment'},
    {re:/\b(drink|drinking|waterhole|watering hole)\b/i, phrase:'at the waterhole', title:'Waterhole Moment'},
    {re:/\b(run|running|chase|chasing)\b/i, phrase:'running', title:'Fast Wildlife Moment'},
    {re:/\b(rest|resting|sleep|sleeping)\b/i, phrase:'resting', title:'Quiet Wildlife Moment'},
    {re:/\b(cub|cubs|baby)\b/i, phrase:'with cubs', title:'Family Moment'},
  ];

  function sourceText(source = null) {
    const parts = [
      source?.searchTopic,
      source?.title,
      source?.story,
      ...(Array.isArray(source?.sources) ? source.sources.map(x => x?.title || '') : []),
      $('autoTopic')?.value,
      $('animalTopic')?.value,
    ];
    return clean(parts.filter(Boolean).join(' '));
  }

  function detectProfile(text = '') {
    return PROFILES.find(p => p.re.test(text)) || null;
  }

  function detectVerifiedAction(source = null) {
    // Only use an action in the optimized title when it appears in source titles.
    // This avoids claiming "fight" merely because the user searched for it.
    const titles = [
      source?.title,
      ...(Array.isArray(source?.sources) ? source.sources.map(x => x?.title || '') : []),
    ].filter(Boolean).join(' ');
    return ACTIONS.find(a => a.re.test(titles)) || null;
  }

  function genericTopic(source = null, currentTitle = '') {
    const raw = clean(source?.searchTopic || source?.title || $('autoTopic')?.value || $('animalTopic')?.value || currentTitle || '');
    return raw.replace(/\b(video|shorts?|webm|mp4|mov|ogg)\b/ig, '').replace(/\s+/g, ' ').trim();
  }

  function optimizedTitle(profile, action, topic, currentTitle = '') {
    let title = '';
    if (profile?.key === 'kitten') {
      title = action?.phrase === 'playing'
        ? `Cute Kittens Playing Together ${profile.emoji} #Shorts`
        : `Cute Kittens Being Adorable ${profile.emoji} #Shorts`;
    } else if (profile?.key === 'puppy') {
      title = action?.phrase === 'playing'
        ? `Cute Puppies Playing Together ${profile.emoji} #Shorts`
        : `Cute Puppies You Have to See ${profile.emoji} #Shorts`;
    } else if (profile) {
      const base = profile.key === 'lion' ? 'Lions in the Wild'
        : profile.key === 'moose' ? 'Moose in the Wild'
        : `${profile.label} in the Wild`;
      title = action
        ? `${profile.label}: ${action.title} ${profile.emoji} #Shorts`
        : `${base}: Amazing Wildlife Moment ${profile.emoji} #Shorts`;
    } else {
      const safe = titleCase(topic || currentTitle || 'Amazing Wildlife Moment');
      title = `${safe.slice(0, 52)} #Shorts`;
    }

    title = clean(title);
    if (title.length > 70) {
      title = title.slice(0, 67).replace(/\s+\S*$/, '') + '…';
    }
    return title;
  }

  function buildSearchPhrases(profile, action, topic) {
    const phrases = [];
    if (profile) phrases.push(...profile.searches);
    if (profile && action) {
      if (action.phrase === 'fight') phrases.unshift(`${profile.singular} fight`, `${profile.label.toLowerCase()} fighting`);
      else if (action.phrase === 'playing') phrases.unshift(`${profile.singular} playing`, `${profile.label.toLowerCase()} playing`);
      else if (action.phrase === 'roaring') phrases.unshift(`${profile.singular} roaring`);
      else if (action.phrase === 'eating') phrases.unshift(`${profile.singular} eating`);
    }
    if (topic && topic.length <= 55) phrases.unshift(topic.toLowerCase());
    return unique(phrases).slice(0, 8);
  }

  function buildTags(profile, action, topic, searchPhrases) {
    const tags = [];
    tags.push(...(profile?.tags || []));
    tags.push(...searchPhrases);
    if (topic) tags.push(topic);
    if (action && profile) tags.push(`${profile.singular} ${action.phrase}`);
    tags.push('youtube shorts');
    return unique(tags)
      .filter(x => x.length <= 45)
      .slice(0, 15);
  }

  function buildHashtags(profile, topic) {
    if (profile) return profile.hashtags.slice(0, 5);
    const first = clean(topic).split(/\s+/).slice(0, 2).join('');
    return unique(['#Shorts', first ? `#${first.replace(/[^a-z0-9]/gi,'')}` : '', '#Wildlife', '#Animals']).filter(Boolean).slice(0, 5);
  }

  function channelName() {
    return clean(document.querySelector('#channelSnapshot h3')?.textContent || 'Wildlife Encounters TV');
  }

  function buildDescription(profile, action, topic, title, hashtags, source = null) {
    const primary = profile
      ? (profile.key === 'kitten' ? 'cute kittens' : profile.key === 'puppy' ? 'cute puppies' : `${profile.singular} wildlife`)
      : (topic || clean(title).replace(/#Shorts/ig, ''));

    let first = '';
    if (profile?.key === 'kitten') first = 'Cute kittens in a quick animal Short made for cat lovers.';
    else if (profile?.key === 'puppy') first = 'Cute puppies in a quick animal Short made for dog lovers.';
    else if (profile && action?.phrase === 'fight') first = `${title.replace(/\s*#Shorts\b/i,'')} — a close wildlife look at ${profile.label.toLowerCase()} in action.`;
    else if (profile) first = `${profile.label} in the wild in a short wildlife moment featuring real animal footage.`;
    else first = `${title.replace(/\s*#Shorts\b/i,'')} — a quick Short focused on ${primary}.`;

    const related = profile?.searches?.slice(0, 2).join(' and ') || topic || 'wildlife';
    const second = `This video is about ${primary} and related ${related} moments, with the subject shown immediately for a fast, viewer-first Short.`;
    const subscribe = `Subscribe to ${channelName()} for more wildlife and animal Shorts.`;
    const attribution = source?.attribution ? `\n\nSource / attribution:\n${source.attribution}` : '';
    return `${first}\n\n${second}\n\n${subscribe}\n\n${hashtags.join(' ')}${attribution}`.slice(0, 5000);
  }

  function buildPack(detail = {}) {
    const source = detail?.source || window.ClipFreeSource || null;
    const combined = sourceText(source) || clean(detail?.title || seoTitle.value);
    const profile = detectProfile(combined);
    const action = detectVerifiedAction(source);
    const topic = genericTopic(source, detail?.title || seoTitle.value);
    const title = optimizedTitle(profile, action, topic, detail?.title || seoTitle.value);
    const searches = buildSearchPhrases(profile, action, topic);
    const tags = buildTags(profile, action, topic, searches);
    const hashtags = buildHashtags(profile, topic);
    const description = buildDescription(profile, action, topic, title, hashtags, source);
    return { title, description, tags, hashtags, searches, profile, action, topic, source };
  }

  function primaryPhrase(pack) {
    if (pack.profile?.key === 'kitten') return 'cute kittens';
    if (pack.profile?.key === 'puppy') return 'cute puppies';
    if (pack.profile) return pack.profile.singular;
    return clean(pack.searches?.[0] || pack.topic || '').toLowerCase();
  }

  function containsPhrase(haystack, phrase) {
    if (!phrase) return false;
    const h = lower(haystack);
    const p = lower(phrase);
    return h.includes(p) || p.split(/\s+/).every(w => h.includes(w));
  }

  function scorePack(pack, current = null) {
    const title = current?.title ?? pack.title;
    const description = current?.description ?? pack.description;
    const tags = current?.tags ?? pack.tags;
    const hashtags = current?.hashtags ?? pack.hashtags;

    const tagList = Array.isArray(tags) ? tags : String(tags || '').split(',').map(x => x.trim()).filter(Boolean);
    const hashList = Array.isArray(hashtags) ? hashtags : String(hashtags || '').split(/\s+/).filter(x => /^#/.test(x));
    const primary = primaryPhrase(pack);

    let search = 0;
    if (containsPhrase(title, primary)) search += 12;
    if (containsPhrase(description.slice(0, 240), primary)) search += 8;
    if (lower(title).indexOf(primary.split(/\s+/)[0]) >= 0 && lower(title).indexOf(primary.split(/\s+/)[0]) <= 24) search += 5;
    const relatedHits = pack.searches.filter(q => containsPhrase(`${title} ${description} ${tagList.join(' ')}`, q)).length;
    search += Math.min(6, relatedHits * 2);
    if (tagList.some(t => containsPhrase(t, primary))) search += 2;
    if (hashList.some(h => containsPhrase(h.replace('#',''), primary))) search += 2;
    search = Math.min(35, search);

    let packaging = 0;
    if (title.length >= 32 && title.length <= 70) packaging += 6;
    if (!/\.(webm|mp4|mov|ogg|ogv)\b/i.test(title)) packaging += 4;
    if (!/[!?]{2,}|\.{3,}/.test(title)) packaging += 3;
    if (pack.profile && containsPhrase(title.slice(0, 35), pack.profile.singular)) packaging += 5;
    else if (!pack.profile && title.length) packaging += 3;
    if (/\b(amazing|powerful|cute|wild|moment|clash|playing|roar|wildlife)\b/i.test(title)) packaging += 4;
    if ((title.match(/[\u{1F300}-\u{1FAFF}]/gu) || []).length <= 2) packaging += 3;
    packaging = Math.min(25, packaging);

    let feed = 0;
    const ratio = $('ratio')?.value || '9:16';
    const start = Number($('startTime')?.value || 0);
    const end = Number($('endTime')?.value || 0);
    const duration = Math.max(0, end - start) || Number(pack.source?.targetDuration || 0);
    if (ratio === '9:16' || pack.source?.kind === 'animal-generator') feed += 7;
    if (!duration || duration <= 45) feed += 6;
    else if (duration <= 60) feed += 4;
    if (/#Shorts\b/i.test(title) || hashList.some(x => /^#shorts$/i.test(x))) feed += 3;
    if (pack.source?.captions?.length || pack.source?.story || /\b(amazing|powerful|cute|wild|clash|playing|roar)\b/i.test(title)) feed += 5;
    if (window.ClipFreeExport?.thumbnailBlob || pack.source?.kind === 'animal-generator') feed += 4;
    feed = Math.min(25, feed);

    let metadata = 0;
    if (description.length >= 120 && description.length <= 1800) metadata += 4;
    if (containsPhrase(description.slice(0, 240), primary)) metadata += 3;
    if (tagList.length >= 6 && tagList.length <= 15) metadata += 3;
    if (hashList.length >= 3 && hashList.length <= 5) metadata += 2;
    if (!pack.source?.attribution || /source\s*\/?\s*attribution|wikimedia commons/i.test(description)) metadata += 3;
    metadata = Math.min(15, metadata);

    return {
      total: Math.min(100, search + packaging + feed + metadata),
      search, packaging, feed, metadata
    };
  }

  function ensurePanel() {
    let panel = $('clipfreeDiscoveryScore');
    if (panel) return panel;

    const seoPanel = document.querySelector('.seo-panel');
    const grid = seoPanel?.querySelector('.seo-grid');
    if (!seoPanel || !grid) return null;

    const style = document.createElement('style');
    style.textContent = `
      .clipfree-score-card{margin:16px 16px 0;padding:16px;border:1px solid #3b315d;border-radius:14px;background:linear-gradient(180deg,#151124,#0d0d13)}
      .clipfree-score-top{display:flex;align-items:center;justify-content:space-between;gap:14px}
      .clipfree-score-top h4{margin:0 0 4px;font-size:1rem}.clipfree-score-top p{margin:0;color:#9b9baa;font-size:.78rem;line-height:1.4}
      .clipfree-score-number{font-size:2rem;font-weight:900;color:#fff;min-width:74px;text-align:right}
      .clipfree-score-number small{font-size:.78rem;color:#9b9baa;font-weight:700}
      .clipfree-score-bars{display:grid;grid-template-columns:repeat(4,1fr);gap:8px;margin-top:14px}
      .clipfree-score-part{background:#0b0b11;border:1px solid #262634;border-radius:10px;padding:10px}
      .clipfree-score-part span{display:block;color:#9b9baa;font-size:.7rem}.clipfree-score-part strong{display:block;margin-top:3px;font-size:.95rem}
      .clipfree-search-chips{display:flex;gap:6px;flex-wrap:wrap;margin-top:12px}
      .clipfree-search-chips span{font-size:.72rem;padding:6px 8px;border-radius:999px;background:#1b1630;color:#c7bbff;border:1px solid #403262}
      .clipfree-score-note{margin:10px 0 0;color:#838394;font-size:.72rem;line-height:1.4}
      @media(max-width:700px){.clipfree-score-bars{grid-template-columns:1fr 1fr}}
    `;
    document.head.appendChild(style);

    panel = document.createElement('section');
    panel.id = 'clipfreeDiscoveryScore';
    panel.className = 'clipfree-score-card';
    panel.innerHTML = `
      <div class="clipfree-score-top">
        <div><h4>ClipFree Discovery Score</h4><p>Pre-publish Search + Shorts Feed readiness</p></div>
        <div class="clipfree-score-number"><span data-score-total>—</span><small>/100</small></div>
      </div>
      <div class="clipfree-score-bars">
        <div class="clipfree-score-part"><span>Search</span><strong data-score-search>—/35</strong></div>
        <div class="clipfree-score-part"><span>Packaging</span><strong data-score-packaging>—/25</strong></div>
        <div class="clipfree-score-part"><span>Shorts Feed</span><strong data-score-feed>—/25</strong></div>
        <div class="clipfree-score-part"><span>Metadata</span><strong data-score-metadata>—/15</strong></div>
      </div>
      <div class="clipfree-search-chips" data-search-chips></div>
      <p class="clipfree-score-note">This scores optimization readiness, not guaranteed ranking. Real distribution still depends on viewers choosing to watch, watch duration, percentage viewed and satisfaction.</p>
    `;
    seoPanel.insertBefore(panel, grid);
    return panel;
  }

  let lastPack = null;

  function updateScore(pack = lastPack) {
    if (!pack) return;
    lastPack = pack;
    const panel = ensurePanel();
    if (!panel) return;

    const score = scorePack(pack, {
      title: seoTitle.value,
      description: seoDescription.value,
      tags: seoTags.value,
      hashtags: seoHashtags.value,
    });

    panel.querySelector('[data-score-total]').textContent = score.total;
    panel.querySelector('[data-score-search]').textContent = `${score.search}/35`;
    panel.querySelector('[data-score-packaging]').textContent = `${score.packaging}/25`;
    panel.querySelector('[data-score-feed]').textContent = `${score.feed}/25`;
    panel.querySelector('[data-score-metadata]').textContent = `${score.metadata}/15`;
    panel.querySelector('[data-search-chips]').innerHTML =
      `<strong style="font-size:.72rem;color:#aaaab7;align-self:center">Target searches:</strong>` +
      pack.searches.slice(0, 6).map(x => `<span>${htmlEsc(x)}</span>`).join('');
  }

  function applyPack(pack, detail = null) {
    lastPack = pack;

    seoTitle.value = pack.title;
    seoDescription.value = pack.description;
    seoTags.value = pack.tags.join(', ');
    seoHashtags.value = pack.hashtags.join(' ');

    // Keep the YouTube Upload form synchronized so FULL AUTO uses the optimized metadata.
    const uploadTitle = $('uploadTitle');
    const uploadDescription = $('uploadDescription');
    const uploadTags = $('uploadTags');
    if (uploadTitle) uploadTitle.value = pack.title;
    if (uploadDescription) uploadDescription.value = pack.description;
    if (uploadTags) uploadTags.value = pack.tags.join(', ');

    if (detail && typeof detail === 'object') {
      detail.title = pack.title;
      detail.description = pack.description;
      detail.tags = pack.tags.join(', ');
      detail.hashtags = pack.hashtags.join(' ');
      detail.discoveryScore = scorePack(pack);
      detail.targetSearches = [...pack.searches];
    }

    if (window.ClipFreeExport && (!detail || window.ClipFreeExport === detail)) {
      window.ClipFreeExport.title = pack.title;
      window.ClipFreeExport.description = pack.description;
      window.ClipFreeExport.tags = pack.tags.join(', ');
      window.ClipFreeExport.hashtags = pack.hashtags.join(' ');
      window.ClipFreeExport.discoveryScore = scorePack(pack);
      window.ClipFreeExport.targetSearches = [...pack.searches];
    }

    updateScore(pack);
  }

  // Capture phase means this runs before YouTube's normal export-ready handler,
  // so FULL AUTO uploads receive the optimized title/description/tags.
  window.addEventListener('clipfree-export-ready', (event) => {
    try {
      const pack = buildPack(event.detail || {});
      applyPack(pack, event.detail || null);
    } catch (err) {
      console.warn('ClipFree Discovery Optimizer skipped', err);
    }
  }, true);

  [seoTitle, seoDescription, seoTags, seoHashtags].forEach(el => {
    el.addEventListener('input', () => updateScore());
    el.addEventListener('change', () => updateScore());
  });

  // Show the panel immediately, then populate it once metadata exists.
  ensurePanel();
})();
