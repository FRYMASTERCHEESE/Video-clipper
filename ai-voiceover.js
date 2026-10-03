/* ClipFree AI — ORIGINAL LOCAL AI VOICEOVER v6
   Generates an original narration for every animal Short in the browser.
   Kokoro-82M / kokoro-js run locally after the model is downloaded.
   No music, no copied narration, no app watermark.
*/
(() => {
  'use strict';

  const MODEL_ID = 'onnx-community/Kokoro-82M-v1.0-ONNX';
  const IMPORT_URLS = [
    'https://esm.run/kokoro-js@1.2.1',
    'https://cdn.jsdelivr.net/npm/kokoro-js@1.2.1/+esm'
  ];

  // Rotate good-quality voices so batches do not all sound identical.
  const VOICES = ['af_heart', 'af_bella', 'am_michael', 'am_fenrir', 'bf_emma'];
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

      // q8 gives the stronger voice quality on devices with enough memory.
      // q4 remains the low-memory fallback. Model files are browser-cached.
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
      // Allow a clean retry later if the network/model load was interrupted.
      ttsPromise = null;
      throw err;
    }
  }

  const ANIMALS = [
    ['mountain lion', /\b(mountain lion|cougar|puma)\b/i],
    ['lion', /\b(lion|lioness|panthera leo)\b/i],
    ['tiger', /\b(tiger|panthera tigris)\b/i],
    ['leopard', /\b(leopard|panthera pardus)\b/i],
    ['cheetah', /\b(cheetah|acinonyx jubatus)\b/i],
    ['jaguar', /\bjaguar\b/i],
    ['wolf', /\b(wolf|wolves|canis lupus)\b/i],
    ['coyote', /\b(coyote|canis latrans)\b/i],
    ['fox', /\bfox\b/i],
    ['bear', /\b(bear|grizzly|polar bear)\b/i],
    ['elephant', /\belephant\b/i],
    ['giraffe', /\bgiraffe\b/i],
    ['zebra', /\bzebra\b/i],
    ['moose', /\bmoose\b/i],
    ['deer', /\b(deer|stag|doe|buck)\b/i],
    ['bison', /\b(bison|buffalo)\b/i],
    ['hyena', /\bhyena\b/i],
    ['crocodile', /\bcrocodile\b/i],
    ['alligator', /\balligator\b/i],
    ['eagle', /\beagle\b/i],
    ['owl', /\bowl\b/i],
    ['shark', /\bshark\b/i],
    ['whale', /\bwhale\b/i],
    ['dolphin', /\bdolphin\b/i],
    ['seal', /\b(seal|sea lion)\b/i],
    ['kitten', /\b(kitten|cat)\b/i],
    ['puppy', /\b(puppy|dog)\b/i]
  ];

  const ACTIONS = [
    ['drinking', /\b(drink|drinking|waterhole|watering|water hole)\b/i],
    ['roaming', /\b(roam|roaming|wandering)\b/i],
    ['walking', /\bwalk|walking\b/i],
    ['running', /\brun|running|sprinting\b/i],
    ['swimming', /\bswim|swimming\b/i],
    ['feeding', /\bfeed|feeding|eating|grazing\b/i],
    ['resting', /\brest|resting|sleeping\b/i],
    ['playing', /\bplay|playing\b/i],
    ['climbing', /\bclimb|climbing\b/i],
    ['flying', /\bfly|flying|soaring\b/i],
    ['hunting', /\bhunt|hunting|stalking\b/i]
  ];

  const HABITATS = [
    ['savanna', /\b(savanna|savannah)\b/i],
    ['forest', /\b(forest|woodland|woods)\b/i],
    ['wetland', /\b(wetland|marsh|swamp)\b/i],
    ['desert', /\bdesert\b/i],
    ['grassland', /\b(grassland|prairie|steppe)\b/i],
    ['river', /\briver|stream\b/i],
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
      preset?.label,
      preset?.query,
      customTopic
    ].filter(Boolean).join(' ');
  }

  function detect(list, text, fallback = '') {
    return list.find(([, re]) => re.test(text))?.[0] || fallback;
  }

  function sourceLabel(source, preset, customTopic) {
    const text = sourceText(source, preset, customTopic);
    const detected = detect(ANIMALS, text, '');
    if (detected) return detected;
    const label = clean(preset?.label || '');
    if (/wild animals?/i.test(label)) return 'wild animal';
    return label ? label.toLowerCase() : 'wild animal';
  }

  function sentencePool({ animal, action, habitat, style }) {
    const place = habitat ? ` in the ${habitat}` : ' in the wild';
    const behavior = action ? ` ${action}` : ' moving through its surroundings';

    const pools = {
      dramatic: [
        `Watch closely. This ${animal} is${behavior}${place}, and every movement changes the scene.`,
        `Notice the posture, pace, and direction as this ${animal} reacts to what is around it.`,
        `Wildlife moments can change in seconds, which is what makes real animal behavior so compelling.`,
        `Keep watching to the end and look for the small details you might miss the first time.`
      ],
      calm: [
        `Take a quiet look at this ${animal}${place}.`,
        `Watch the natural rhythm of its movement and the way it responds to the environment.`,
        `Small changes in direction, posture, and attention can make a wildlife moment fascinating.`,
        `Enjoy this peaceful encounter and notice something new on a second watch.`
      ],
      cute: [
        `Here is a close look at this ${animal}${place}.`,
        `Watch the little movements, expressions, and changes in attention as the moment unfolds.`,
        `The most memorable animal clips are often built from simple, natural behavior.`,
        `Stay to the end and see which detail becomes your favorite part.`
      ],
      documentary: [
        `You are watching a real ${animal}${place}.`,
        `In this moment, it is${behavior}, while constantly responding to its surroundings.`,
        `Body position, pace, and direction are useful clues when you are watching animal behavior.`,
        `Look closely and see how much detail appears when you watch the scene a second time.`
      ]
    };
    return pools[style] || pools.documentary;
  }

  function fitNarration(options) {
    const duration = Math.max(10, Number(options.duration) || 30);
    const text = sourceText(options.source, options.preset, options.customTopic);
    const animal = sourceLabel(options.source, options.preset, options.customTopic);
    const action = detect(ACTIONS, text, '');
    const habitat = detect(HABITATS, text, '');
    const style = clean(options.style || 'documentary').toLowerCase();

    const hooks = [
      `Wait until you see how this ${animal} moves.`,
      `Look closely at this ${animal}.`,
      `This wildlife moment is worth a second look.`,
      `Watch what this ${animal} does next.`,
      `Here is a real ${animal} moment from the wild.`
    ];

    const closers = [
      `If you enjoy real wildlife moments, follow Wildlife Encounters TV for the next one.`,
      `Watch again and see what detail you notice the second time.`,
      `Follow for more real animal moments and wildlife Shorts.`,
      `There is always another detail hiding in real wildlife footage.`
    ];

    const idx = Math.max(0, Number(options.batchIndex || 0));
    const sentences = [
      hooks[idx % hooks.length],
      ...sentencePool({ animal, action, habitat, style }),
      closers[idx % closers.length]
    ];

    // Aim for roughly 85–90% of the Short. The v7 video engine pads silence
    // after narration instead of looping or cutting spoken words.
    const targetWords = Math.max(16, Math.round(duration * 1.75));
    const chosen = [];
    let count = 0;

    for (const sentence of sentences) {
      chosen.push(sentence);
      count += sentence.split(/\s+/).filter(Boolean).length;
      if (count >= targetWords) break;
    }

    // For longer requested clips, add non-repetitive observation lines.
    const extra = [
      `Real wildlife is unpredictable, so the smallest change in movement can completely change the story of a scene.`,
      `The best way to watch is to focus on where the animal looks, how quickly it moves, and how it uses the space around it.`,
      `No two encounters unfold exactly the same way, which is why genuine animal footage can be so rewarding to study.`
    ];
    let p = 0;
    while (count < targetWords && p < extra.length) {
      chosen.push(extra[(idx + p) % extra.length]);
      count += extra[(idx + p) % extra.length].split(/\s+/).filter(Boolean).length;
      p += 1;
    }

    return clean(chosen.join(' '));
  }

  async function generate(options = {}) {
    const narration = fitNarration(options);
    const voiceIndex = Math.max(0, Number(options.batchIndex || 0)) % VOICES.length;
    const voice = VOICES[voiceIndex];

    setStatus(`Creating original AI narration (${voiceIndex + 1}/${VOICES.length} voice style)…`);
    const tts = await loadTts();

    const audio = await tts.generate(narration, {
      voice,
      // Slightly slower helps the narration naturally fill the Short and
      // reduces any chance of the audio being looped by the montage mixer.
      speed: 1.0
    });

    const blob = audio?.toBlob?.();
    if (!blob || blob.size < 2048) {
      throw new Error('The local AI narrator did not return a usable audio file.');
    }

    const file = new File(
      [blob],
      `clipfree-original-ai-narration-${Date.now()}-${voiceIndex}.wav`,
      { type: 'audio/wav' }
    );

    return {
      file,
      text: narration,
      voice,
      provider: 'Kokoro-82M via kokoro-js',
      local: true,
      originalScript: true,
      watermark: false
    };
  }

  window.ClipFreeVoiceover = {
    version: '10.0',
    generate,
    buildNarration: fitNarration,
    voices: [...VOICES],
    model: MODEL_ID,
    licenseNote: 'Kokoro-82M and kokoro-js are Apache-2.0 licensed; narration text is created specifically for each ClipFree Short.'
  };

  console.info('ClipFree Original AI Voiceover v6 is ready.');
})();