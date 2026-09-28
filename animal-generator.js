const $ = (id) => document.getElementById(id);
const generateButton = $('generateAnimalVideo');
const topicInput = $('animalTopic');
const styleSelect = $('animalStyle');
const durationSelect = $('animalDuration');
const batchSelect = $('animalBatchCount');
const soundsToggle = $('animalSounds');
const statusEl = $('animalGeneratorStatus');
const progressEl = $('animalGeneratorProgress');
const sourceResults = $('animalSourceResults');
const presetButtons = [...document.querySelectorAll('[data-animal-preset]')];

let activePreset = 'lions';
let running = false;

const PRESETS = {
  lions: {
    label: 'Lions', emoji: '🦁', query: 'lion wildlife', soundQuery: 'lion roar animal sound',
    titles: { documentary: 'Inside the World of Lions 🦁', cute: 'Lion Moments That Are Surprisingly Sweet 🦁', dramatic: 'Powerful Lion Moments You Have to See 🦁', calm: 'A Quiet Moment With Lions 🦁' },
    stories: { documentary: 'Meet the lion, one of the most recognizable big cats. Lions are highly social compared with most cat species and often live in groups called prides. Watch how these powerful animals move, rest and interact.', cute: 'Even powerful lions have gentle moments. From curious cubs to relaxed family interactions, these scenes show a softer side of life in a pride.', dramatic: 'Strength, focus and presence define these lion moments. Every movement shows why lions have become one of the most iconic animals of the savanna.', calm: 'Slow down and watch lions in quieter moments. Resting, observing and moving together are all part of daily life for these social big cats.' },
    captions: ['Meet the lions 🦁', 'Powerful, social big cats', 'Life in a pride', 'Wildlife worth protecting']
  },
  wildlife: {
    label: 'Wild Animals', emoji: '🦒', query: 'wild animals wildlife nature', soundQuery: 'wildlife animal nature sound',
    titles: { documentary: 'Wild Animals in Their World 🌍', cute: 'Unexpectedly Cute Wildlife Moments 🐾', dramatic: 'Wildlife Moments That Feel Unreal 🌍', calm: 'Peaceful Wildlife Moments From Nature 🌿' },
    stories: { documentary: 'Wild animals survive by reading their surroundings, conserving energy and responding quickly to change. Every species has its own strategy for finding food, staying safe and raising young.', cute: 'Wildlife can be powerful, graceful and unexpectedly adorable. These moments capture curiosity, play and the small behaviors that make animals fascinating to watch.', dramatic: 'Nature is full of speed, strength and split-second decisions. These wildlife moments show animals responding to a world that never stands still.', calm: 'Nature has its own rhythm. Watch these wild animals move through their environment and enjoy a few peaceful moments away from the rush of everyday life.' },
    captions: ['Wildlife up close 🌍', 'Every species has a strategy', 'Nature never stands still', 'Protect wild places']
  },
  kittens: {
    label: 'Cute Kittens', emoji: '🐱', query: 'cute kitten cat playing', soundQuery: 'cat meow kitten sound',
    titles: { documentary: 'Why Kittens Play So Much 🐱', cute: 'Cute Kittens Being Absolutely Adorable 🐱❤️', dramatic: 'Tiny Kittens, Maximum Chaos 🐱', calm: 'Relaxing Kitten Moments 🐱' },
    stories: { documentary: 'Kittens learn about their world through play, stalking, pouncing and exploration. Those tiny games help them practise coordination and social skills as they grow.', cute: 'Tiny paws, curious faces and endless play. These kitten moments are all about the little things that make young cats so entertaining to watch.', dramatic: 'They may be tiny, but kittens can turn any room into an adventure. One second is calm and the next is full-speed playtime.', calm: 'A few peaceful kitten moments can make any day feel lighter. Enjoy the tiny paws, soft stretches and curious looks.' },
    captions: ['Tiny paws, big curiosity 🐱', 'Play is how kittens learn', 'Pounce. Explore. Repeat.', 'Too cute to skip ❤️']
  },
  puppies: {
    label: 'Cute Puppies', emoji: '🐶', query: 'cute puppy dog playing', soundQuery: 'dog bark puppy sound',
    titles: { documentary: 'How Puppies Learn Through Play 🐶', cute: 'The Cutest Puppy Moments 🐶❤️', dramatic: 'Puppy Energy Is Unmatched 🐶', calm: 'Wholesome Puppy Moments 🐶' },
    stories: { documentary: 'Puppies learn through play, scent and social interaction. Exploring new sights and sounds helps them build confidence and understand the world around them.', cute: 'Big curiosity in a tiny package. These puppy moments bring together playful energy, happy expressions and the kind of chaos that is hard not to smile at.', dramatic: 'Puppies have one setting: full adventure. Every toy, sound and movement can become the start of a brand-new mission.', calm: 'Sometimes the best puppy moments are the quiet ones. A soft stretch, a curious look and a peaceful rest can be just as memorable as playtime.' },
    captions: ['Puppy mode: ON 🐶', 'Learning through play', 'Curious about everything', 'Wholesome overload ❤️']
  }
};

function esc(value = '') { return String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch])); }
function setStatus(text, progress = null, kind = 'subtle') { if (statusEl) { statusEl.textContent = text; statusEl.className = `notice ${kind}`; } if (progressEl && progress !== null) progressEl.style.width = `${Math.max(0, Math.min(100, progress))}%`; }
function setPreset(name) { if (!PRESETS[name]) return; activePreset = name; presetButtons.forEach(btn => btn.classList.toggle('active', btn.dataset.animalPreset === name)); if (topicInput && !topicInput.value.trim()) topicInput.placeholder = `e.g. ${PRESETS[name].query}`; }
presetButtons.forEach(btn => btn.addEventListener('click', () => setPreset(btn.dataset.animalPreset)));
function stripHtml(value = '') { const box = document.createElement('div'); box.innerHTML = String(value || ''); return (box.textContent || box.innerText || '').replace(/\s+/g, ' ').trim(); }
function commonsFilePageUrl(title) { return `https://commons.wikimedia.org/wiki/${encodeURIComponent(String(title || '').replace(/ /g, '_')).replace(/%2F/g, '/')}`; }
function metaValue(meta, key) { return stripHtml(meta?.[key]?.value || ''); }
function simpleReuseLicense(license = '') { const value = String(license || '').toLowerCase(); return value.includes('public domain') || value.includes('cc0') || value.includes('public domain mark'); }

async function searchCommonsAudio(query, limit = 12) {
  const url = new URL('https://commons.wikimedia.org/w/api.php');
  const params = { action:'query', generator:'search', gsrsearch:`${query} filetype:audio filesize:<15360`, gsrnamespace:'6', gsrlimit:String(Math.max(1,Math.min(20,limit))), prop:'imageinfo', iiprop:'url|size|mime|mediatype|extmetadata', format:'json', formatversion:'2', origin:'*' };
  Object.entries(params).forEach(([k,v]) => url.searchParams.set(k,v));
  const response = await fetch(url.toString(), {mode:'cors',cache:'no-store'});
  const data = await response.json().catch(() => ({}));
  if (!response.ok || data?.error) throw new Error(data?.error?.info || `Wikimedia audio search failed (${response.status}).`);
  return (data?.query?.pages || []).map(page => {
    const info = page.imageinfo?.[0] || {}; const meta = info.extmetadata || {};
    const title = String(page.title || 'Animal sound').replace(/^File:/i,'');
    const creator = metaValue(meta,'Artist') || metaValue(meta,'Credit') || 'Wikimedia Commons contributor';
    const license = metaValue(meta,'LicenseShortName') || metaValue(meta,'UsageTerms') || 'See source page for licence';
    const licenseUrl = metaValue(meta,'LicenseUrl'); const sourceUrl = commonsFilePageUrl(page.title);
    return { title, creator, license, licenseUrl, sourceUrl, fileUrl:info.url || '', mime:info.mime || 'audio/ogg', size:Number(info.size || 0), attribution:`“${title}” — ${creator}. Source: Wikimedia Commons. Licence: ${license}${licenseUrl ? ` (${licenseUrl})` : ''}. ${sourceUrl}` };
  }).filter(item => item.fileUrl && String(item.mime).startsWith('audio/') && (!item.size || item.size <= 15*1024*1024) && simpleReuseLicense(item.license));
}

async function downloadAudio(item, index=0) {
  if (!item?.fileUrl) return null;
  const response = await fetch(item.fileUrl,{mode:'cors',cache:'no-store'}); if (!response.ok) throw new Error(`Animal sound could not be downloaded (${response.status}).`);
  const blob = await response.blob(); if (blob.size > 15*1024*1024) throw new Error('Animal sound recording is too large for reliable phone processing.');
  const ext = item.title.match(/\.([a-z0-9]{2,5})$/i)?.[1] || (item.mime?.includes('wav')?'wav':item.mime?.includes('mpeg')?'mp3':'ogg');
  return new File([blob],`animal_sound_${index}.${ext}`,{type:item.mime || blob.type || 'audio/ogg'});
}

function buildStory(preset,style,customTopic){ const base=preset.stories[style] || preset.stories.documentary; if(!customTopic) return base; return `${customTopic}. ${base}`; }
function buildMeta(preset,style,customTopic,sources,sound=null,batchIndex=0,duration=24){
  const story=buildStory(preset,style,customTopic); const baseTitle=preset.titles[style] || preset.titles.documentary; const cleanTopic=String(customTopic || '').trim(); const numberedTitle=cleanTopic ? `${cleanTopic} ${preset.emoji}` : baseTitle;
  const sourceCredits=sources.map((item,i)=>`${i+1}. ${item.attribution}`).join('\n'); const soundCredit=sound?.attribution ? `\nReal animal audio: ${sound.attribution}` : ''; const query=cleanTopic || preset.query;
  return { kind:'animal-generator', title:numberedTitle.slice(0,80), story, captions:[...preset.captions], provider:'ClipFree AI Animal Generator + Wikimedia Commons', attribution:`ClipFree AI created this vertical Short from reusable source media.\n${sourceCredits}${soundCredit}`, searchTopic:query, targetDuration:duration, preset:activePreset, presetLabel:preset.label, batchIndex, realAnimalSound:Boolean(sound), sources:sources.map(x=>({title:x.title,creator:x.creator,license:x.license,sourceUrl:x.sourceUrl})), sound:sound ? {title:sound.title,creator:sound.creator,license:sound.license,sourceUrl:sound.sourceUrl}:null };
}

function renderSources(items){ if(!sourceResults) return; if(!items.length){ sourceResults.innerHTML='<div class="notice subtle">No suitable sources found yet.</div>'; return; } sourceResults.innerHTML=items.map(item=>`<article class="animal-source-item">${item.thumbUrl ? `<img src="${esc(item.thumbUrl)}" alt="" loading="lazy" />` : ''}<div><strong>${esc(item.title)}</strong><small>${esc(item.creator)} • ${esc(item.license)}${item.size ? ` • ${(item.size/1024/1024).toFixed(1)} MB` : ''}</small><a href="${esc(item.sourceUrl)}" target="_blank" rel="noopener">Review source</a></div></article>`).join(''); }

async function downloadSource(item,index){ const response=await fetch(item.fileUrl,{mode:'cors',cache:'no-store'}); if(!response.ok) throw new Error(`Source ${index+1} could not be downloaded (${response.status}).`); const blob=await response.blob(); if(blob.size>35*1024*1024) throw new Error('One source clip is too large for reliable phone processing. Try again for a different set.'); const ext=item.title.match(/\.([a-z0-9]{2,5})$/i)?.[1] || (item.mime?.includes('mp4')?'mp4':item.mime?.includes('ogg')?'ogv':'webm'); return new File([blob],`animal_source_${index}.${ext}`,{type:item.mime || blob.type || 'video/webm'}); }

function uniqueSuitableSources(items){ const seen=new Set(); return (items || []).filter(item=>{ const key=String(item?.sourceUrl || item?.fileUrl || item?.title || '').trim(); if(!key || seen.has(key)) return false; seen.add(key); return !item.size || item.size <= 28*1024*1024; }); }

const CLIPFREE_SOURCE_HISTORY_KEY='clipfree_source_history_v5';
const CLIPFREE_VARIETY_CURSOR_KEY='clipfree_variety_cursor_v2';

const VARIETY_QUERIES=[
'lion wildlife','tiger wildlife','leopard wildlife','cheetah wildlife','jaguar wildlife',
'cougar mountain lion wildlife','snow leopard wildlife','lynx wildlife','bobcat wildlife',
'wolf wildlife','coyote wildlife','red fox wildlife','arctic fox wildlife','fennec fox wildlife',
'brown bear wildlife','black bear wildlife','polar bear wildlife','grizzly bear wildlife',
'elephant wildlife','giraffe wildlife','zebra wildlife','rhinoceros wildlife','hippopotamus wildlife',
'bison wildlife','buffalo wildlife','moose wildlife','elk wildlife','deer wildlife','reindeer wildlife',
'caribou wildlife','pronghorn wildlife','antelope wildlife','gazelle wildlife','wildebeest wildlife',
'ibex wildlife','bighorn sheep wildlife','mountain goat wildlife','wild boar wildlife',
'kangaroo wildlife','wallaby wildlife','koala wildlife','wombat wildlife','tasmanian devil wildlife',
'platypus wildlife','echidna wildlife','sloth wildlife','anteater wildlife','armadillo wildlife',
'capybara wildlife','beaver wildlife','otter wildlife','badger wildlife','wolverine wildlife',
'raccoon wildlife','skunk wildlife','porcupine wildlife','rabbit wildlife','hare wildlife',
'squirrel wildlife','chipmunk wildlife','marmot wildlife','prairie dog wildlife',
'gorilla wildlife','chimpanzee wildlife','orangutan wildlife','baboon wildlife','macaque wildlife',
'lemur wildlife','gibbon wildlife','howler monkey wildlife','spider monkey wildlife',
'african wild dog wildlife','hyena wildlife','jackal wildlife','meerkat wildlife','mongoose wildlife',
'camel wildlife','llama wildlife','alpaca wildlife','wild horse wildlife','wild donkey wildlife',
'crocodile wildlife','alligator wildlife','komodo dragon wildlife','iguana wildlife','monitor lizard wildlife',
'chameleon wildlife','gecko wildlife','tortoise wildlife','sea turtle wildlife',
'python snake wildlife','cobra wildlife','rattlesnake wildlife','boa constrictor wildlife',
'bald eagle wildlife','golden eagle wildlife','hawk wildlife','falcon wildlife','osprey wildlife',
'owl wildlife','vulture wildlife','condor wildlife','raven wildlife','crow wildlife',
'parrot wildlife','macaw wildlife','toucan wildlife','hornbill wildlife','kingfisher wildlife',
'woodpecker wildlife','hummingbird wildlife','flamingo wildlife','pelican wildlife','heron wildlife',
'stork wildlife','crane wildlife','swan wildlife','goose wildlife','duck wildlife',
'penguin wildlife','albatross wildlife','puffin wildlife','seagull wildlife',
'shark wildlife','great white shark wildlife','hammerhead shark wildlife','whale shark wildlife',
'blue whale wildlife','humpback whale wildlife','orca wildlife','dolphin wildlife','porpoise wildlife',
'seal wildlife','sea lion wildlife','walrus wildlife','manatee wildlife','dugong wildlife',
'octopus wildlife','squid wildlife','jellyfish wildlife','seahorse wildlife','stingray wildlife',
'manta ray wildlife','eel wildlife','salmon wildlife','trout wildlife','tuna wildlife',
'clownfish wildlife','reef fish wildlife','coral reef wildlife',
'frog wildlife','tree frog wildlife','toad wildlife','salamander wildlife','newt wildlife',
'butterfly wildlife','dragonfly wildlife','bee wildlife','beetle wildlife','mantis wildlife',
'spider wildlife','scorpion wildlife','crab wildlife','lobster wildlife',
'savanna wildlife','forest wildlife','rainforest wildlife','desert wildlife','wetland wildlife',
'river wildlife','lake wildlife','mountain wildlife','arctic wildlife','tundra wildlife',
'coastal wildlife','ocean wildlife','grassland wildlife','prairie wildlife','woodland wildlife'
];

function sourceKey(item){ return String(item?.sourceUrl || item?.fileUrl || item?.title || '').trim(); }

function loadSourceHistory(){
  try{
    const raw=JSON.parse(localStorage.getItem(CLIPFREE_SOURCE_HISTORY_KEY)||'[]');
    return new Set(Array.isArray(raw)?raw.filter(Boolean):[]);
  }catch{return new Set();}
}

function saveSourceHistory(set){
  try{ localStorage.setItem(CLIPFREE_SOURCE_HISTORY_KEY,JSON.stringify([...set].slice(-5000))); }catch{}
}

function rememberSource(item){
  const key=sourceKey(item); if(!key) return;
  const used=loadSourceHistory(); used.add(key); saveSourceHistory(used);
}

async function blockedSourceSet(){
  const blocked=loadSourceHistory();
  try{
    const urls=await window.ClipFreeYouTube?.getUploadedSourceUrls?.(500);
    for(const url of urls || []) blocked.add(String(url));
  }catch(err){ console.warn('Could not scan old YouTube source URLs',err); }
  return blocked;
}

function nextVarietyQueries(count){
  let cursor=Number(localStorage.getItem(CLIPFREE_VARIETY_CURSOR_KEY)||0);
  if(!Number.isFinite(cursor) || cursor<0) cursor=0;
  const out=[];
  for(let i=0;i<count;i++) out.push(VARIETY_QUERIES[(cursor+i)%VARIETY_QUERIES.length]);
  cursor=(cursor+count)%VARIETY_QUERIES.length;
  try{ localStorage.setItem(CLIPFREE_VARIETY_CURSOR_KEY,String(cursor)); }catch{}
  return out;
}

async function findOneUnusedSource(query,blocked,alreadyChosen){
  const variants=[
    query,
    `${query} nature`,
    `${query} habitat`,
    `${query} public domain`,
    `${query} animal behavior`
  ];
  for(const q of variants){
    let results=[];
    try{ results=await window.ClipFreeYouTube.searchCommonsDownloadable(q,20); }catch(err){ console.warn('Source search skipped',q,err); }
    for(const item of uniqueSuitableSources(results)){
      const key=sourceKey(item);
      if(!key || blocked.has(key) || alreadyChosen.has(key)) continue;
      return item;
    }
  }
  return null;
}

async function collectBatchSources({query,preset,batchCount,customTopic,varietyMode}){
  const blocked=await blockedSourceSet();
  const selected=[];
  const selectedKeys=new Set();

  const queries=varietyMode
    ? nextVarietyQueries(batchCount)
    : Array.from({length:batchCount},(_,i)=> i===0 ? query : `${query} ${['nature','wildlife','habitat','behavior','in the wild','animal'][i%6]}`);

  for(let i=0;i<queries.length;i++){
    const item=await findOneUnusedSource(queries[i],blocked,selectedKeys);
    if(item){
      selected.push(item);
      selectedKeys.add(sourceKey(item));
      continue;
    }

    // Broader fallback still refuses anything already used.
    const fallback=await findOneUnusedSource(preset.query,blocked,selectedKeys);
    if(fallback){
      selected.push(fallback);
      selectedKeys.add(sourceKey(fallback));
    }
  }

  if(selected.length<batchCount){
    throw new Error(`ClipFree found ${selected.length}/${batchCount} unused Public Domain/CC0 source videos. It stopped instead of repeating old footage. Try again; Source Vault will rotate to more searches.`);
  }
  return selected;
}


async function generateAnimalShort(){
  if(running) return;
  if(!window.ClipFreeYouTube?.searchCommonsDownloadable || !window.ClipFreeAutomation?.createMontageFromFiles){ setStatus('The video tools are still loading. Wait a few seconds and try again.',0,'bad'); return; }
  running=true; generateButton.disabled=true;
  const preset=PRESETS[activePreset] || PRESETS.lions; const style=styleSelect?.value || 'documentary'; const duration=Math.max(12,Math.min(30,Number(durationSelect?.value)||24)); const batchCount=Math.max(1,Math.min(8,Number(batchSelect?.value)||1)); const useSounds=soundsToggle?.checked!==false; const customTopic=(topicInput?.value || '').trim(); const query=customTopic || preset.query;
  try{
    const varietyMode=Boolean(window.ClipFreeVarietyMode);
    setStatus(varietyMode
      ? `Source Vault: finding ${batchCount} DIFFERENT unused wildlife videos…`
      : `Finding ${batchCount} unique unused ${preset.label.toLowerCase()} videos…`,4);
    const suitable=await collectBatchSources({query,preset,batchCount,customTopic,varietyMode});

    let soundItems=[]; if(useSounds){ setStatus('Finding real open-licensed animal sounds…',9); try{ soundItems=await searchCommonsAudio(preset.soundQuery || `${query} animal sound`,12); }catch(err){ console.warn('Animal audio search skipped',err); } }

    for(let batchIndex=0;batchIndex<batchCount;batchIndex++){
      const baseProgress=10+Math.round((batchIndex/batchCount)*84); setStatus(`Short ${batchIndex+1}/${batchCount}: choosing one unique source video…`,baseProgress,'good');
      const chosen=[suitable[batchIndex]]; renderSources(chosen);
      const files=[]; setStatus(`Short ${batchIndex+1}/${batchCount}: downloading source video…`,baseProgress+3); try{ files.push(await downloadSource(chosen[0],0)); }catch(err){ console.warn(err); }
      if(!files.length) throw new Error(`Short ${batchIndex+1}: the reusable source clip could not be downloaded on this device.`);

      let soundItem=null,audioFile=null; if(useSounds && soundItems.length){ soundItem=soundItems[batchIndex % soundItems.length]; setStatus(`Short ${batchIndex+1}/${batchCount}: adding real animal sound…`,baseProgress+9,'good'); try{ audioFile=await downloadAudio(soundItem,batchIndex); }catch(err){ console.warn('Animal sound download skipped',err); soundItem=null; } }

      setStatus(`Short ${batchIndex+1}/${batchCount}: creating vertical 9:16 video…`,baseProgress+12,'good');
      const montage=await window.ClipFreeAutomation.createMontageFromFiles(files,{duration,audioFile,filename:`clipfree-${activePreset}-short-${batchIndex+1}.mp4`});
      if(!montage.clipfreeUsedAnimalSound) soundItem=null;
      const meta=buildMeta(preset,style,customTopic,chosen,soundItem,batchIndex,duration);
      setStatus(`Short ${batchIndex+1}/${batchCount}: SEO, captions, thumbnail + YouTube upload…`,baseProgress+18,'good');
      const uploadResult=await window.ClipFreeYouTube.startFullAutoWithFile(montage,meta);
      if(!uploadResult?.id) throw new Error(`Short ${batchIndex+1}: YouTube did not return a video ID, so it is not counted as uploaded.`);
      rememberSource(chosen[0]);
      setStatus(`Short ${batchIndex+1}/${batchCount} confirmed on YouTube. Source permanently added to the no-repeat history.`,baseProgress+24,'good');
    }
    setStatus(`${batchCount} animal Short${batchCount===1?'':'s'} confirmed on YouTube ❤️`,100,'good');
  }catch(err){ console.error(err); setStatus(err?.message || String(err),0,'bad'); }
  finally{ running=false; generateButton.disabled=false; }
}

if(generateButton) generateButton.addEventListener('click',generateAnimalShort);
setPreset(activePreset);
