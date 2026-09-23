// ClipFree AI — Category Pages Wizard
// Step-by-step setup with Back/Next buttons. It fills the existing ClipFree controls.

(() => {
  const $ = id => document.getElementById(id);
  const pages = [...document.querySelectorAll('[data-wizard-page]')];
  const dots = [...document.querySelectorAll('[data-wizard-dot]')];
  const choices = [...document.querySelectorAll('.category-choice')];
  const back = $('wizardBack');
  const next = $('wizardNext');
  const label = $('wizardPageLabel');
  const summary = $('wizardSummary');

  if (!pages.length || !back || !next) return;

  let page = 0;
  let category = '';
  let topic = '';
  let style = 'documentary';

  const categoryNames = {
    lions:'Lions', wildlife:'Wildlife', kittens:'Kittens', puppies:'Puppies',
    tigers:'Tigers', elephants:'Elephants', wolves:'Wolves', bears:'Bears'
  };

  const presetMap = {
    lions:'lions',
    wildlife:'wildlife',
    kittens:'kittens',
    puppies:'puppies',
    tigers:'wildlife',
    elephants:'wildlife',
    wolves:'wildlife',
    bears:'wildlife'
  };

  function addStyles() {
    if (document.getElementById('categoryWizardStyles')) return;
    const styleEl = document.createElement('style');
    styleEl.id = 'categoryWizardStyles';
    styleEl.textContent = `
      .category-wizard-card{overflow:hidden}
      .category-wizard-progress{display:flex;justify-content:center;gap:12px;margin:0 0 20px}
      .category-wizard-progress span{width:34px;height:34px;border-radius:50%;display:grid;place-items:center;background:#1a1725;border:1px solid #3b315d;color:#9b9baa;font-weight:800}
      .category-wizard-progress span.active{background:#6d47ff;color:#fff;border-color:#8d72ff}
      .category-wizard-page{display:none}
      .category-wizard-page.active{display:block}
      .category-choice-grid{display:grid;grid-template-columns:repeat(4,minmax(0,1fr));gap:12px;margin-top:16px}
      .category-choice{appearance:none;text-align:left;border:1px solid #373347;background:#111019;color:#fff;padding:16px;border-radius:14px;min-height:112px;cursor:pointer;font:inherit}
      .category-choice:hover,.category-choice.selected{border-color:#8d72ff;background:#1a1630;transform:translateY(-1px)}
      .category-choice strong,.category-choice span{display:block}.category-choice strong{margin:8px 0 4px}.category-choice span{font-size:.78rem;color:#aaa6b6;line-height:1.35}
      .category-wizard-nav{display:flex;align-items:center;justify-content:space-between;gap:12px;margin-top:24px;padding-top:18px;border-top:1px solid #272432}
      #wizardPageLabel{font-size:.84rem;color:#9b9baa;font-weight:700}
      .wizard-final-actions{display:flex;gap:12px;flex-wrap:wrap;margin-top:16px}
      .category-wizard-form{margin-top:12px}
      @media(max-width:820px){.category-choice-grid{grid-template-columns:repeat(2,minmax(0,1fr))}}
      @media(max-width:520px){.category-choice-grid{grid-template-columns:1fr}.category-wizard-nav{position:sticky;bottom:8px;background:#0b0b10;padding:12px;border:1px solid #272432;border-radius:14px;z-index:5}}
    `;
    document.head.appendChild(styleEl);
  }

  function render() {
    pages.forEach((el, i) => el.classList.toggle('active', i === page));
    dots.forEach((el, i) => el.classList.toggle('active', i <= page));
    back.disabled = page === 0;
    next.style.display = page === pages.length - 1 ? 'none' : '';
    label.textContent = `Page ${page + 1} of ${pages.length}`;
    if (page === 3) refreshSummary();
  }

  function setChoice(groupSelector, selected) {
    document.querySelectorAll(groupSelector).forEach(btn => {
      btn.classList.toggle('selected', btn === selected);
    });
  }

  function setValue(id, value) {
    const el = $(id);
    if (!el || value == null) return;
    el.value = String(value);
    el.dispatchEvent(new Event('input', { bubbles:true }));
    el.dispatchEvent(new Event('change', { bubbles:true }));
  }

  function clickPreset(preset) {
    const btn = document.querySelector(`[data-animal-preset="${preset}"]`);
    if (btn) btn.click();
  }

  function applyToClipFree() {
    const batch = $('wizardBatchCount')?.value || '3';
    const privacy = $('wizardPrivacy')?.value || 'private';

    setValue('autoTopic', topic);
    setValue('autoBatchCount', batch);
    setValue('autoPrivacy', privacy);

    setValue('animalTopic', topic);
    setValue('animalBatchCount', batch);
    setValue('animalStyle', style);
    clickPreset(presetMap[category] || 'wildlife');

    // Premium Auto reads these for packaging metadata.
    window.ClipFreeWizardSelection = {
      category,
      categoryName: categoryNames[category] || category,
      topic,
      style,
      batchCount: Number(batch),
      privacy,
      targetMarkets: ['United States','Canada','United Kingdom','Australia','New Zealand'],
      metadataLanguage: 'en'
    };
  }

  function refreshSummary() {
    applyToClipFree();
    const batch = $('wizardBatchCount')?.value || '3';
    const privacy = $('wizardPrivacy')?.value || 'private';
    const name = categoryNames[category] || 'Not chosen';
    summary.innerHTML = `
      <strong>Ready:</strong> ${name} • ${style} • ${batch} Short${batch === '1' ? '' : 's'} • ${privacy}<br>
      <span style="color:#aaa6b6">Automatic titles, brighter text thumbnails, English metadata, tags and hashtags stay enabled.</span>
    `;
  }

  choices.forEach(btn => {
    btn.addEventListener('click', () => {
      if (btn.dataset.category) {
        category = btn.dataset.category;
        topic = btn.dataset.topic || '';
        setChoice('[data-category]', btn);
      }
      if (btn.dataset.style) {
        style = btn.dataset.style;
        setChoice('[data-style]', btn);
      }
    });
  });

  next.addEventListener('click', () => {
    if (page === 0 && !category) {
      alert('Choose a category first.');
      return;
    }
    if (page === 1 && !style) {
      alert('Choose a style first.');
      return;
    }
    page = Math.min(pages.length - 1, page + 1);
    render();
  });

  back.addEventListener('click', () => {
    page = Math.max(0, page - 1);
    render();
  });

  $('wizardStartAnimal')?.addEventListener('click', () => {
    applyToClipFree();
    document.querySelector('#animal-generator')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  $('wizardStartAuto')?.addEventListener('click', () => {
    applyToClipFree();
    document.querySelector('#autopilot')?.scrollIntoView({ behavior:'smooth', block:'start' });
  });

  $('wizardBatchCount')?.addEventListener('change', refreshSummary);
  $('wizardPrivacy')?.addEventListener('change', refreshSummary);

  addStyles();
  render();
})();
