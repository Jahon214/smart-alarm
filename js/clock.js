// js/clock.js - 7 High-Precision Watchmaker Clock Engines & Fullscreen Bedside Mode

const uzDays = ['Yakshanba', 'Dushanba', 'Seshanba', 'Chorshanba', 'Payshanba', 'Juma', 'Shanba'];
const uzMonths = ['Yanvar', 'Fevral', 'Mart', 'Aprel', 'May', 'Iyun', 'Iyul', 'Avgust', 'Sentabr', 'Oktabr', 'Noyabr', 'Dekabr'];

let is24Hour = true;
let currentStyle = 'neon';
let onMinuteTickCallback = null;
let lastNotifiedMinute = '';

export function pad2(n) {
  return String(n).padStart(2, '0');
}

export function initClock(savedStyle = 'neon', saved24h = true, onMinuteTick = null) {
  currentStyle = savedStyle;
  is24Hour = saved24h;
  onMinuteTickCallback = onMinuteTick;

  setClockStyle(currentStyle);
  updateClock();
  setInterval(updateClock, 200);
}

export function toggleTimeFormat() {
  is24Hour = !is24Hour;
  localStorage.setItem('smart_alarm_is24h', JSON.stringify(is24Hour));
  updateClock();
  return is24Hour;
}

export function getIs24Hour() {
  return is24Hour;
}

export function setClockStyle(styleName) {
  currentStyle = styleName;
  localStorage.setItem('smart_alarm_clock_style', styleName);

  const views = {
    neon: 'clockViewNeon',
    flip: 'clockViewFlip',
    analog: 'clockViewAnalog',
    orbital: 'clockViewOrbital',
    minimal: 'clockViewMinimal',
    tourbillon: 'clockViewTourbillon',
    holo: 'clockViewHolo'
  };

  Object.keys(views).forEach(k => {
    const el = document.getElementById(views[k]);
    if (!el) return;
    if (k === styleName) {
      el.classList.remove('hidden');
      el.classList.add('flex');
    } else {
      el.classList.add('hidden');
      el.classList.remove('flex');
    }
  });

  document.querySelectorAll('.clock-style-btn').forEach(btn => {
    if (btn.dataset.style === styleName) {
      btn.className = 'clock-style-btn px-3.5 py-1.5 rounded-xl text-xs font-bold accent-bg text-white shadow-lg transition';
    } else {
      btn.className = 'clock-style-btn px-3.5 py-1.5 rounded-xl text-xs font-semibold bg-slate-800/80 text-slate-300 hover:text-white transition';
    }
  });
}

export function updateClock() {
  const now = new Date();
  const rawH = now.getHours();
  const m = now.getMinutes();
  const s = now.getSeconds();
  const ms = now.getMilliseconds();

  let displayH = rawH;
  let ampm = rawH >= 12 ? 'PM' : 'AM';
  if (!is24Hour) {
    displayH = rawH % 12 || 12;
  }

  const hStr = pad2(displayH);
  const mStr = pad2(m);
  const sStr = pad2(s);

  // Date localization in Uzbek
  const dayName = uzDays[now.getDay()];
  const monthName = uzMonths[now.getMonth()];
  const dateBadge = document.getElementById('liveDateBadge');
  if (dateBadge) {
    dateBadge.textContent = `${dayName}, ${now.getDate()}-${monthName}`;
  }

  // 1. NEON CYBER PRO
  const neonH = document.getElementById('neonHours');
  const neonM = document.getElementById('neonMinutes');
  const neonS = document.getElementById('neonSeconds');
  const neonAmPm = document.getElementById('neonAmPm');
  const neonBar = document.getElementById('neonSecBar');

  if (neonH) neonH.textContent = hStr;
  if (neonM) neonM.textContent = mStr;
  if (neonS) neonS.textContent = sStr;
  if (neonAmPm) {
    if (is24Hour) {
      neonAmPm.classList.add('hidden');
    } else {
      neonAmPm.classList.remove('hidden');
      neonAmPm.textContent = ampm;
    }
  }
  if (neonBar) {
    neonBar.style.width = `${((s + ms / 1000) / 60) * 100}%`;
  }

  // 2. 3D FLIP STUDIYA
  const flipH = document.getElementById('flipHours');
  const flipM = document.getElementById('flipMinutes');
  const flipS = document.getElementById('flipSeconds');
  if (flipH) flipH.textContent = hStr;
  if (flipM) flipM.textContent = mStr;
  if (flipS) flipS.textContent = sStr;

  // 3. SHVEYTSARIYA ANALOG CHRONO
  const secAngle = (s + ms / 1000) * 6;
  const minAngle = (m + s / 60) * 6;
  const hourAngle = ((rawH % 12) + m / 60) * 30;

  const aHour = document.getElementById('analogHourHand');
  const aMin = document.getElementById('analogMinHand');
  const aSec = document.getElementById('analogSecHand');
  const aDig = document.getElementById('analogDigitalSub');

  if (aHour) aHour.setAttribute('transform', `rotate(${hourAngle} 100 100)`);
  if (aMin) aMin.setAttribute('transform', `rotate(${minAngle} 100 100)`);
  if (aSec) aSec.setAttribute('transform', `rotate(${secAngle} 100 100)`);
  if (aDig) aDig.textContent = `${hStr}:${mStr}:${sStr} ${!is24Hour ? ampm : ''}`;

  // 4. KOSMIK HALQA (ORBITAL RINGS)
  const hourCirc = 597;
  const minCirc = 477;
  const secCirc = 358;
  const oHour = document.getElementById('orbitalHourRing');
  const oMin = document.getElementById('orbitalMinRing');
  const oSec = document.getElementById('orbitalSecRing');
  const oCenter = document.getElementById('orbitalCenterTime');
  const oCenterSec = document.getElementById('orbitalCenterSec');

  if (oHour) oHour.style.strokeDashoffset = String(hourCirc - (rawH / 24) * hourCirc);
  if (oMin) oMin.style.strokeDashoffset = String(minCirc - (m / 60) * minCirc);
  if (oSec) oSec.style.strokeDashoffset = String(secCirc - (s / 60) * secCirc);
  if (oCenter) oCenter.textContent = `${hStr}:${mStr}`;
  if (oCenterSec) oCenterSec.textContent = `.${sStr}s`;

  // 5. MINIMALIST TUNGI
  const minTime = document.getElementById('minimalTime');
  const minSec = document.getElementById('minimalSec');
  if (minTime) minTime.textContent = `${hStr}:${mStr}`;
  if (minSec) minSec.textContent = sStr;

  // 6. QIROLLIK OLTIN TURBILLON
  const tHour = document.getElementById('tourbHourHand');
  const tMin = document.getElementById('tourbMinHand');
  const tSec = document.getElementById('tourbSecHand');
  const tDig = document.getElementById('tourbDigitalTime');

  if (tHour) tHour.setAttribute('transform', `rotate(${hourAngle} 100 100)`);
  if (tMin) tMin.setAttribute('transform', `rotate(${minAngle} 100 100)`);
  if (tSec) tSec.setAttribute('transform', `rotate(${secAngle} 100 100)`);
  if (tDig) tDig.textContent = `${hStr}:${mStr}:${sStr}`;

  // 7. 3D GOLOGRAMMA QUANTUM HUD
  const hH = document.getElementById('holoHours');
  const hM = document.getElementById('holoMinutes');
  const hS = document.getElementById('holoSeconds');
  if (hH) hH.textContent = hStr;
  if (hM) hM.textContent = mStr;
  if (hS) hS.textContent = sStr;

  for (let b = 1; b <= 8; b++) {
    const barEl = document.getElementById('holoBar' + b);
    if (barEl) {
      const wave = 25 + Math.abs(Math.sin((now.getTime() / 280) + b * 0.9)) * 75;
      barEl.style.height = `${Math.round(wave)}%`;
    }
  }

  // Check alarm tick (every minute transition at 00 sec)
  const currentHM = `${pad2(rawH)}:${mStr}`;
  if (s === 0 && lastNotifiedMinute !== currentHM) {
    lastNotifiedMinute = currentHM;
    if (onMinuteTickCallback) {
      onMinuteTickCallback(currentHM);
    }
  }
}

export function toggleNightstandMode() {
  const isNight = document.body.classList.toggle('fullscreen-nightstand');
  if (isNight) {
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(() => {});
    }
  } else {
    if (document.exitFullscreen && document.fullscreenElement) {
      document.exitFullscreen().catch(() => {});
    }
  }
  return isNight;
}
