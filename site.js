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
