const el = (id)=>document.getElementById(id);
const timeEl = el('time');
const secEl = el('seconds');
const ampmEl = el('ampm');
const dateEl = el('date');

const hHand = el('hHand');
const mHand = el('mHand');
const sHand = el('sHand');
const analog = el('analog');

const themeSel = el('theme');
const accentInp = el('accent');
const fontSize = el('fontSize');
const modeSel = el('mode');
const tzSel = el('tz');
const formatSel = el('format');
const showSeconds = el('showSeconds');
const dateStyle = el('dateStyle');

const alarmEnable = el('alarmEnable');
const alarmTime = el('alarmTime');
const beep = el('beep');

const resetBtn = el('resetBtn');
const exportBtn = el('exportBtn');

const digitalBox = el('digital');

const defaultSettings = {
  theme: 'dark',
  accent: '#5b9dff',
  fontSize: 40,
  mode: 'both',
  tz: Intl.DateTimeFormat().resolvedOptions().timeZone,
  format: '24',
  showSeconds: true,
  dateStyle: 'full',
  alarm: { enabled:false, time:'' }
};

function loadSettings(){
  try{
    const raw = localStorage.getItem('clock.settings');
    return raw ? JSON.parse(raw) : {...defaultSettings};
  }catch{ return {...defaultSettings}; }
}
function saveSettings(){
  const s = getSettingsFromUI();
  localStorage.setItem('clock.settings', JSON.stringify(s));
}

function getSettingsFromUI(){
  return {
    theme: themeSel.value,
    accent: accentInp.value,
    fontSize: parseInt(fontSize.value,10),
    mode: modeSel.value,
    tz: tzSel.value,
    format: formatSel.value,
    showSeconds: showSeconds.checked,
    dateStyle: dateStyle.value,
    alarm: { enabled: alarmEnable.checked, time: alarmTime.value }
  };
}

function applySettings(s){
  const autoDark = window.matchMedia && window.matchMedia('(prefers-color-scheme: dark)').matches;
  document.documentElement.setAttribute('data-theme', s.theme === 'auto' ? (autoDark ? 'dark' : 'light') : s.theme);
  document.documentElement.style.setProperty('--accent', s.accent);
  timeEl.style.fontSize = s.fontSize + 'px';
  const analogWrap = analog.closest('.analog-wrap');
  const digitalWrap = digitalBox;
  analogWrap.style.display = (s.mode === 'digital') ? 'none' : 'grid';
  digitalWrap.style.display = (s.mode === 'analog') ? 'none' : 'flex';
  secEl.style.display = s.showSeconds ? 'inline' : 'none';
  themeSel.value = s.theme;
  accentInp.value = s.accent;
  fontSize.value = s.fontSize;
  modeSel.value = s.mode;
  tzSel.value = s.tz;
  formatSel.value = s.format;
  showSeconds.checked = s.showSeconds;
  dateStyle.value = s.dateStyle;
  alarmEnable.checked = s.alarm.enabled;
  alarmTime.value = s.alarm.time || '';
}

function populateTimezones(){
  const current = Intl.DateTimeFormat().resolvedOptions().timeZone;
  const list = [
    'UTC','Europe/London','Europe/Paris','Europe/Berlin','Europe/Moscow',
    'Asia/Kolkata','Asia/Dubai','Asia/Tokyo','Asia/Shanghai','Asia/Singapore',
    'Australia/Sydney','Pacific/Auckland',
    'America/New_York','America/Chicago','America/Denver','America/Los_Angeles','America/Sao_Paulo',
    current
  ];
  const unique = Array.from(new Set(list)).sort((a,b)=>a.localeCompare(b));
  tzSel.innerHTML = unique.map(z=>`<option value="${z}">${z}</option>`).join('');
  tzSel.value = current;
}

function buildTicks(){
  for(let i=0;i<60;i++){
    const t = document.createElement('div');
    t.className = 'tick' + (i%5===0?' major':'');
    t.style.transform = `translate(-50%,-50%) rotate(${i*6}deg)`;
    analog.appendChild(t);
  }
}

let lastAlarmFire = '';

function update(){
  const s = getSettingsFromUI();
  const now = new Date();
  const fmt = new Intl.DateTimeFormat('en-GB', {
    timeZone: s.tz,
    hour: '2-digit', minute: '2-digit', second: '2-digit',
    hour12: s.format === '12'
  }).formatToParts(now);

  const get = (type)=>fmt.find(p=>p.type===type)?.value ?? '';
  let hour = get('hour');
  let minute = get('minute');
  let second = get('second');
  const dayPeriod = get('dayPeriod') || '';

  timeEl.textContent = `${hour}:${minute}`;
  secEl.textContent = second;
  ampmEl.textContent = s.format==='12' ? dayPeriod.toUpperCase() : '';

  const dateStr = new Intl.DateTimeFormat(undefined, { dateStyle: s.dateStyle, timeZone: s.tz }).format(now);
  dateEl.textContent = dateStr;

  const h = parseInt(hour,10) % (s.format==='12'?12:24);
  const m = parseInt(minute,10);
  const sec = parseInt(second,10);
  const hourAngle = (h%12) * 30 + m * 0.5;
  const minAngle = m * 6 + sec * 0.1;
  const secAngle = sec * 6;
  hHand.style.transform = `translate(-50%,-95%) rotate(${hourAngle}deg)`;
  mHand.style.transform = `translate(-50%,-95%) rotate(${minAngle}deg)`;
  sHand.style.transform = `translate(-50%,-95%) rotate(${secAngle}deg)`;

  if(s.alarm.enabled && s.alarm.time){
    const twentyFour = new Intl.DateTimeFormat('en-GB', {hour:'2-digit', minute:'2-digit', hour12:false, timeZone:s.tz}).format(now);
    if(twentyFour === s.alarm.time && lastAlarmFire !== twentyFour){
      lastAlarmFire = twentyFour;
      try{ beep.currentTime = 0; beep.play(); }catch{}
      digitalBox.animate(
        [ {filter:'none'}, {filter:'brightness(1.4) saturate(1.2)'}, {filter:'none'} ],
        {duration:1200, iterations:2}
      );
    }
  }
}

function bind(){
  [themeSel, accentInp, fontSize, modeSel, tzSel, formatSel, showSeconds, dateStyle, alarmEnable, alarmTime].forEach(ctrl=>{
    ctrl.addEventListener('input', ()=>{ applySettings(getSettingsFromUI()); saveSettings(); });
    ctrl.addEventListener('change', ()=>{ applySettings(getSettingsFromUI()); saveSettings(); });
  });
  resetBtn.addEventListener('click', ()=>{ localStorage.removeItem('clock.settings'); const s={...defaultSettings}; applySettings(s); saveSettings(); });
  exportBtn.addEventListener('click', ()=>{
    const blob = new Blob([JSON.stringify(getSettingsFromUI(), null, 2)], {type:'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url; a.download = 'clock-settings.json'; a.click();
    setTimeout(()=>URL.revokeObjectURL(url), 1000);
  });
  if(window.matchMedia){
    window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', ()=>{
      const s = getSettingsFromUI();
      if(s.theme==='auto') applySettings(s);
    });
  }
}

populateTimezones();
buildTicks();
const saved = loadSettings();
applySettings(saved);
bind();
saveSettings();

setInterval(update, 200);
update();
