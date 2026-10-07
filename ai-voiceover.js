/* ClipFree AI — UNIQUE BRAND NARRATION v35
   Keeps one familiar narrator voice for channel consistency,
   but generates a different animal-specific script for every Short.
*/
(() => {
  'use strict';

  const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  const IMPORT_URLS = [
    'https://esm.run/kokoro-js@1.2.1',
    'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
  ];

  // Keep one recognizable channel voice by default.
  const BRAND_VOICE = 'af_heart';
  const AVAILABLE_VOICES = ['af_heart', 'af_bella', 'am_michael', 'am_fenrir', 'bf_emma'];

  const HISTORY_KEY = 'clipfree_unique_voiceover_history_v35';
  const SEQUENCE_KEY = 'clipfree_voiceover_sequence_v35';

  let ttsPromise = null;
  let modulePromise = null;

  const clean = value => String(value || '').replace(/\s+/g, ' ').trim();

  function setStatus(message) {
    const el =
      document.getElementById('animalGeneratorStatus') ||
      document.getElementById('simpleStatus');
    if (el) el.textContent = message;
  }

  async function loadModule() {
    if (modulePromise) return modulePromise;

    modulePromise = (async () => {
      let lastError = null;

      for (const url of IMPORT_URLS) {
        try {
          const mod = await import(url);
          if (mod?.KokoroTTS) return mod;
        } catch (err) {
          lastError = err;
          console.warn('ClipFree voice module import failed:', url, err);
        }
      }

      throw lastError || new Error('The local AI voice module could not be loaded.');
    })();

    return modulePromise;
  }

  async function loadTts() {
    if (ttsPromise) return ttsPromise;

    ttsPromise = (async () => {
      setStatus('Loading the local AI narrator for the first time…');
      const { KokoroTTS } = await loadModule();

      const memory = Number(navigator.deviceMemory || 4);
      const primaryDtype = memory >= 6 ? 'q8' : 'q4';

      try {
        return await KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: primaryDtype,
          device: 'wasm'
        });
      } catch (err) {
        console.warn('Higher-quality Kokoro profile failed; using q4 fallback', err);
        return KokoroTTS.from_pretrained(MODEL_ID, {
          dtype: 'q4',
          device: 'wasm'
        });
      }
    })();

    try {
      return await ttsPromise;
    } catch (err) {
      ttsPromise = null;
      throw err;
    }
  }

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['sea lion', /\bsea lion\b/i],
    ['polar bear', /\bpolar bear\b/i],
    ['grizzly bear', /\bgrizzly bear\b/i],
    ['rusty patched bumble bee', /\brusty patched bumble bee\b/i],
    ['leafcutter bee', /\bleafcutter bee\b/i],
    ['bumble bee', /\b(bumble ?bee|bumblebee|bombus)\b/i],
    ['monarch butterfly', /\bmonarch butterfly\b/i],
    ['whale shark', /\bwhale shark\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\b(cheetah|acinonyx jubatus)\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['lynx', /\blynx\b/i],
    ['bobcat', /\bbobcat\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\b(coyote|canis latrans)\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\b(bear|ursus)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['rhino', /\b(rhino|rhinoceros)\b/i],
    ['hippo', /\b(hippo|hippopotamus)\b/i],
    ['moose', /\bmoose\b/i],
    ['elk', /\belk\b/i],
    ['deer', /\b(deer|stag|doe|buck|reindeer|caribou)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['antelope', /\b(antelope|gazelle|pronghorn|wildebeest)\b/i],
    ['kangaroo', /\bkangaroo\b/i],
    ['koala', /\bkoala\b/i],
    ['otter', /\botter\b/i],
    ['rabbit', /\b(rabbit|hare)\b/i],
    ['squirrel', /\bsquirrel\b/i],
    ['gorilla', /\bgorilla\b/i],
    ['chimpanzee', /\bchimpanzee\b/i],
    ['orangutan', /\borangutan\b/i],
    ['monkey', /\b(monkey|macaque|baboon|gibbon|lemur)\b/i],
    ['hyena', /\b(hyena|hyaena)\b/i],
    ['meerkat', /\bmeerkat\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['turtle', /\b(turtle|tortoise)\b/i],
    ['snake', /\b(snake|python|cobra|rattlesnake|boa)\b/i],
    ['eagle', /\beagle\b/i],
    ['hawk', /\bhawk\b/i],
    ['falcon', /\bfalcon\b/i],
    ['owl', /\bowl\b/i],
    ['penguin', /\bpenguin\b/i],
    ['shark', /\b(shark|great white|hammerhead)\b/i],
    ['whale', /\b(whale|orca)\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\bseal\b/i],
    ['frog', /\b(frog|toad)\b/i],
    ['butterfly', /\bbutterfly\b/i],
    ['bee', /\bbee\b/i],
    ['dragonfly', /\bdragonfly\b/i],
    ['beetle', /\bbeetle\b/i],
    ['spider', /\bspider\b/i],
    ['crab', /\bcrab\b/i],
    ['fish', /\b(fish|salmon|trout|tuna)\b/i],
    ['kitten', /\b(kitten|cat)\b/i],
    ['puppy', /\b(puppy|dog)\b/i]
  ];

  const ACTIONS = [
    ['drinking', /\b(drink|drinking|waterhole|watering|water hole)\b/i],
    ['roaming', /\b(roam|roaming|wandering)\b/i],
    ['walking', /\bwalk|walking\b/i],
    ['running', /\brun|running|sprinting\b/i],
    ['swimming', /\bswim|swimming\b/i],
    ['feeding', /\b(feed|feeding|eating|grazing|foraging)\b/i],
    ['resting', /\b(rest|resting|sleeping)\b/i],
    ['playing', /\b(play|playing)\b/i],
    ['climbing', /\b(climb|climbing)\b/i],
    ['flying', /\b(fly|flying|soaring)\b/i],
    ['hunting', /\b(hunt|hunting|stalking)\b/i]
  ];

  const HABITATS = [
    ['savanna', /\b(savanna|savannah)\b/i],
    ['forest', /\b(forest|woodland|woods)\b/i],
    ['wetland', /\b(wetland|marsh|swamp)\b/i],
    ['desert', /\bdesert\b/i],
    ['grassland', /\b(grassland|prairie|steppe)\b/i],
    ['river', /\b(river|stream)\b/i],
    ['lake', /\blake\b/i],
    ['ocean', /\b(ocean|sea|marine)\b/i],
    ['mountains', /\b(mountain|alpine)\b/i],
    ['coast', /\b(coast|coastal|shore|beach)\b/i],
    ['Arctic', /\b(arctic|tundra|ice)\b/i]
  ];

  function sourceText(source, preset, customTopic) {
    return [
      source?.title,
      source?.creator,
      source?.sourceUrl,
      source?.description,
      source?.subject,
      source?.provider,
      source?.__clipfreeDetectedAnimal,
      source?.__clipfreeRequestedQuery,
      preset?.label,
      preset?.query,
      customTopic
    ].filter(Boolean).join(' ');
  }

  function detect(list, text, fallback = '') {
    return list.find(([, re]) => re.test(String(text || '')))?.[0] || fallback;
  }

  function sourceLabel(source, preset, customTopic) {
    const text = sourceText(source, preset, customTopic);
    const detected = detect(ANIMALS, text, '');
    if (detected) return detected;

    const label = clean(preset?.label || '');
    if (/wild animals?/i.test(label)) return 'wild animal';
    return label ? label.toLowerCase() : 'wild animal';
  }

  function hashText(value='') {
    let h = 2166136261 >>> 0;
    const s = String(value || '');
    for (let i = 0; i < s.length; i++) {
      h ^= s.charCodeAt(i);
      h = Math.imul(h, 16777619);
    }
    return h >>> 0;
  }

  function nextSequence() {
    try {
      const current = Math.max(0, Number(localStorage.getItem(SEQUENCE_KEY) || 0));
      const next = current + 1;
      localStorage.setItem(SEQUENCE_KEY, String(next));
      return next;
    } catch {
      return Date.now();
    }
  }

  function loadHistory() {
    try {
      const value = JSON.parse(localStorage.getItem(HISTORY_KEY) || '[]');
      return Array.isArray(value) ? value : [];
    } catch {
      return [];
    }
  }

  function saveHistory(text) {
    try {
      const old = loadHistory();
      old.unshift(text);
      localStorage.setItem(
        HISTORY_KEY,
        JSON.stringify([...new Set(old)].slice(0, 500))
      );
    } catch {}
  }

  function poolFor({ animal, action, habitat }) {
    const place = habitat ? ` in the ${habitat}` : ' in the wild';
    const actionPhrase = action ? ` while ${action}` : '';

    return {
      hooks: [
        `Look closely at this ${animal}${place}.`,
        `Watch this ${animal} for the next few seconds.`,
        `This ${animal} moment is easy to miss if you look away.`,
        `Here is a closer look at a ${animal}${place}.`,
        `Notice what this ${animal} does next.`,
        `Take a second look at this ${animal}.`,
        `This real ${animal} encounter has a lot happening in a short moment.`,
        `Watch the movement of this ${animal} carefully.`,
        `A simple wildlife moment can reveal a lot about a ${animal}.`,
        `This ${animal} caught the camera at exactly the right moment.`,
        `There is more happening in this ${animal} clip than you might notice at first.`,
        `Keep your eyes on this ${animal}.`
      ],

      observations: [
        `Its direction and pace keep changing as the scene unfolds.`,
        `The smallest movements make this wildlife moment feel completely different from the last one.`,
        `Watch how it uses the space around it instead of only focusing on the animal itself.`,
        `Its body position gives you clues about where its attention is going.`,
        `The background matters too, because the environment shapes every wildlife encounter.`,
        `Look at the timing of each movement and how quickly the scene changes.`,
        `This is the kind of natural behavior that makes real wildlife footage interesting to replay.`,
        `Notice the posture, movement, and pauses rather than watching only the biggest action.`,
        `Every few seconds there is another small detail worth catching.`,
        `The scene feels simple at first, but the movement makes it more interesting on a second watch.`,
        `Real animal footage is unpredictable, which is why no two encounters look exactly the same.`,
        `The way this ${animal} moves through the frame is what makes this clip stand out.`,
        action
          ? `In this clip, the ${animal} is ${action}, and its movement keeps changing through the scene.`
          : `The ${animal} keeps responding to its surroundings throughout the clip.`,
        habitat
          ? `The ${habitat} setting adds important context to what the ${animal} is doing.`
          : `The surroundings give useful context to the animal's movement.`
      ],

      closers: [
        `What detail did you notice first?`,
        `Did you spot something different on the second watch?`,
        `Would you have noticed that movement in real time?`,
        `Which part of this encounter stood out to you most?`,
        `Watch it once more and focus on the animal's direction.`,
        `There is usually one detail you only notice on a replay.`,
        `Follow Wildlife Encounters TV for another real wildlife moment.`,
        `More real wildlife encounters are coming next.`,
        `Would you keep watching if you saw this in the wild?`,
        `Replay it and see if you catch a detail you missed the first time.`
      ]
    };
  }

  function candidateNarration(options, salt = 0) {
    const duration = Math.max(10, Number(options.duration) || 30);
    const text = sourceText(options.source, options.preset, options.customTopic);
    const animal = sourceLabel(options.source, options.preset, options.customTopic);
    const action = detect(ACTIONS, text, '');
    const habitat = detect(HABITATS, text, '');

    const sequence = Math.max(
      1,
      Number(options.__clipfreeNarrationSequence || options.batchIndex || 0) + 1
    );

    const seed = (
      hashText(text) +
      (sequence * 2654435761) +
      (salt * 2246822519)
    ) >>> 0;

    const pools = poolFor({ animal, action, habitat });

    const hook = pools.hooks[seed % pools.hooks.length];

    const chosen = [hook];
    const used = new Set([hook]);

    const targetWords = Math.max(18, Math.round(duration * 1.65));
    let count = hook.split(/\s+/).filter(Boolean).length;

    let offset = Math.floor(seed / 7);

    while (count < targetWords && chosen.length < 5) {
      const line = pools.observations[offset % pools.observations.length];
      offset += 3;

      if (!line || used.has(line)) continue;
      used.add(line);
      chosen.push(line);
      count += line.split(/\s+/).filter(Boolean).length;
    }

    // Add a closer only when there is enough duration for it.
    if (duration >= 18) {
      const closer = pools.closers[(seed + sequence) % pools.closers.length];
      if (!used.has(closer)) chosen.push(closer);
    }

    return clean(chosen.join(' '));
  }

  function fitNarration(options = {}) {
    const history = new Set(loadHistory());

    for (let salt = 0; salt < 24; salt++) {
      const narration = candidateNarration(options, salt);
      if (!history.has(narration)) return narration;
    }

    // Extremely unlikely fallback, but still guarantees the exact script differs.
    return clean(
      `${candidateNarration(options, 29)} This encounter was captured in a different wildlife moment.`
    );
  }

  async function generate(options = {}) {
    const sequence = nextSequence();

    const narration = fitNarration({
      ...options,
      __clipfreeNarrationSequence: sequence
    });

    saveHistory(narration);

    // Keep the same recognizable narrator for brand consistency.
    const voice = clean(options.voice || BRAND_VOICE);

    setStatus(`Creating unique animal-specific AI narration • script ${sequence}…`);

    const tts = await loadTts();

    const audio = await tts.generate(narration, {
      voice,
      speed: 1.0
    });

    const blob = audio?.toBlob?.();
    if (!blob || blob.size < 2048) {
      throw new Error('The local AI narrator did not return a usable audio file.');
    }

    const file = new File(
      [blob],
      `clipfree-unique-ai-narration-${Date.now()}-${sequence}.wav`,
      { type: 'audio/wav' }
    );

    return {
      file,
      text: narration,
      voice,
      provider: 'Kokoro-82M via kokoro-js',
      local: true,
      originalScript: true,
      uniqueScript: true,
      narrationSequence: sequence,
      watermark: false
    };
  }

  window.ClipFreeVoiceover = {
    version: '35.0',
    generate,
    buildNarration: fitNarration,
    voices: [...AVAILABLE_VOICES],
    defaultVoice: BRAND_VOICE,
    model: MODEL_ID,
    uniqueScripts: true,
    persistentSequence: true,
    licenseNote:
      'Kokoro-82M and kokoro-js are Apache-2.0 licensed. ClipFree creates a source-specific narration script for each Short.'
  };

  console.info('ClipFree Unique Brand Narration v35 is ready.');
})();
