// js/sleep.js - 2-Button Sleep Counter & Biometric Sleep Cycles Engine

import { playFeedbackTone } from './audio.js';
import { pad2 } from './clock.js';

let sleepModeTab = 'live'; // 'live' | 'manual'
let isSleeping = false;
let sleepElapsedSeconds = 0;
let sleepIntervalId = null;
let sleepStartedAtTimestamp = null;

let sleepHistory = [];

const DEFAULT_HISTORY = [
  { id: 'slp-1', date: 'Kecha (28-Okt)', durationText: '7 soat 45 daqiqa', totalMinutes: 465, quality: "A'lo (97%)", mode: '23:15 → 07:00' },
  { id: 'slp-2', date: '27-Oktabr', durationText: '6 soat 50 daqiqa', totalMinutes: 410, quality: "Yaxshi (85%)", mode: '23:50 → 06:40' },
  { id: 'slp-3', date: '26-Oktabr', durationText: '8 soat 15 daqiqa', totalMinutes: 495, quality: "Mukammal (100%)", mode: '22:45 → 07:00' }
];

export function initSleepTracker(showToastFn) {
  loadStoredSleepState();
  renderLiveSleepDisplay();
  renderSleepHistory();
  updateSleepStatsSummary();

  // If a sleep session was active before reload, resume counting!
  if (isSleeping && sleepStartedAtTimestamp) {
    const now = Date.now();
    const elapsed = Math.floor((now - sleepStartedAtTimestamp) / 1000);
    sleepElapsedSeconds = Math.max(0, elapsed);
    resumeSleepTimer(showToastFn);
  }
}

function loadStoredSleepState() {
  try {
    const storedHist = localStorage.getItem('smart_alarm_sleep_history');
    if (storedHist) {
      sleepHistory = JSON.parse(storedHist);
    } else {
      sleepHistory = [...DEFAULT_HISTORY];
      localStorage.setItem('smart_alarm_sleep_history', JSON.stringify(sleepHistory));
    }

    const storedActive = localStorage.getItem('smart_alarm_active_sleep');
    if (storedActive) {
      const activeData = JSON.parse(storedActive);
      if (activeData.isSleeping && activeData.startedAt) {
        isSleeping = true;
        sleepStartedAtTimestamp = activeData.startedAt;
      }
    }
  } catch (e) {
    sleepHistory = [...DEFAULT_HISTORY];
  }
}

function persistActiveState() {
  if (isSleeping) {
    localStorage.setItem('smart_alarm_active_sleep', JSON.stringify({
      isSleeping: true,
      startedAt: sleepStartedAtTimestamp
    }));
  } else {
    localStorage.removeItem('smart_alarm_active_sleep');
  }
}

function persistHistory() {
  localStorage.setItem('smart_alarm_sleep_history', JSON.stringify(sleepHistory));
  updateSleepStatsSummary();
}

export function formatSleepDuration(totalSecs) {
  const hrs = Math.floor(totalSecs / 3600);
  const mins = Math.floor((totalSecs % 3600) / 60);
  const secs = totalSecs % 60;
  return { hrs, mins, secs };
}

function renderLiveSleepDisplay() {
  const { hrs, mins, secs } = formatSleepDuration(sleepElapsedSeconds);
  const elH = document.getElementById('sleepLiveHours');
  const elM = document.getElementById('sleepLiveMinutes');
  const elS = document.getElementById('sleepLiveSeconds');
  if (elH) elH.textContent = pad2(hrs);
  if (elM) elM.textContent = pad2(mins);
  if (elS) elS.textContent = pad2(secs);
}

export function evaluateSleepQuality(totalMinutes) {
  const hours = totalMinutes / 60;
  if (hours >= 7.5 && hours <= 9.2) {
    return {
      badge: "A'lo (98%)",
      score: 98,
      advice: "Me'yordagi mukammal va to'liq uyqu!",
      cycles: Math.max(1, Math.round(totalMinutes / 90))
    };
  } else if (hours >= 6.0 && hours < 7.5) {
    return {
      badge: "Yaxshi (85%)",
      score: 85,
      advice: "Yaxshi ko'rsatkich, lekin yana 1 soat uxlash yanada quvvat beradi",
      cycles: Math.max(1, Math.round(totalMinutes / 90))
    };
  } else if (hours > 9.2) {
    return {
      badge: "Ko'p uyqu (88%)",
      score: 88,
      advice: "Yetarlicha dam oldingiz, kunga bardam kirishing!",
      cycles: Math.max(1, Math.round(totalMinutes / 90))
    };
  } else {
    return {
      badge: "Kam uyqu (55%)",
      score: 55,
      advice: "Organizm to'liq tiklanmadi, bugun kechqurun ertaroq uxlang",
      cycles: Math.max(1, Math.round(totalMinutes / 90))
    };
  }
}

export function updateSleepResultDisplay(hours, minutes, seconds, modeLabel) {
  const totalMinutes = hours * 60 + minutes + (seconds >= 30 ? 1 : 0);
  const evalInfo = evaluateSleepQuality(totalMinutes);

  let mainStr = '';
  if (hours > 0) {
    mainStr = `${hours} soat ${minutes} daqiqa uxladingiz`;
  } else if (minutes > 0) {
    mainStr = `${minutes} daqiqa ${seconds} soniya uxladingiz`;
  } else {
    mainStr = `${seconds} soniya uxladingiz`;
  }

  const elMain = document.getElementById('sleepResultMainText');
  const elBadge = document.getElementById('sleepQualityBadge');
  const elSub = document.getElementById('sleepResultSubText');
  const elAdvice = document.getElementById('sleepAdviceText');
  const elScore = document.getElementById('sleepScorePercent');
  const elCirc = document.getElementById('sleepScoreCircle');

  if (elMain) elMain.textContent = mainStr;
  if (elBadge) elBadge.textContent = evalInfo.badge;
  if (elSub) {
    elSub.textContent = `Me'yor: 8 soat • Uyqu sikli: ~${evalInfo.cycles} to'liq faza • Usul: ${modeLabel}`;
  }
  if (elAdvice) elAdvice.textContent = evalInfo.advice;
  if (elScore) elScore.textContent = `${evalInfo.score}%`;

  if (elCirc) {
    const circ = 126;
    elCirc.style.strokeDashoffset = String(Math.round(circ - (evalInfo.score / 100) * circ));
  }

  // Sleep stages breakdown
  const deepM = Math.round(totalMinutes * 0.30);
  const remM = Math.round(totalMinutes * 0.25);
  const lightM = Math.max(0, totalMinutes - deepM - remM);

  const elDeep = document.getElementById('deepSleepText');
  const elRem = document.getElementById('remSleepText');
  const elLight = document.getElementById('lightSleepText');

  if (elDeep) elDeep.textContent = `${Math.floor(deepM / 60)}s ${deepM % 60}d`;
  if (elRem) elRem.textContent = `${Math.floor(remM / 60)}s ${remM % 60}d`;
  if (elLight) elLight.textContent = `${Math.floor(lightM / 60)}s ${lightM % 60}d`;

  // Append to history
  const now = new Date();
  const timeTag = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
  sleepHistory.unshift({
    id: 'slp-' + Date.now(),
    date: `Bugun (${timeTag})`,
    durationText: hours > 0 ? `${hours} soat ${minutes} daqiqa` : `${minutes} daq ${seconds}s`,
    totalMinutes: totalMinutes,
    quality: evalInfo.badge,
    mode: modeLabel
  });

  if (sleepHistory.length > 20) sleepHistory.pop();
  persistHistory();
  renderSleepHistory();
}

// 1-Tugma: Uyquni Boshlash / Hozirgi Uyquni Hisoblash
export function handleSleepButton1(showToast) {
  playFeedbackTone('click');

  if (sleepModeTab === 'manual') {
    const startVal = document.getElementById('inputSleepStart').value || '23:00';
    const endVal = document.getElementById('inputSleepEnd').value || '07:00';
    const [sh, sm] = startVal.split(':').map(Number);
    const [eh, em] = endVal.split(':').map(Number);

    let startMins = sh * 60 + sm;
    let endMins = eh * 60 + em;
    if (endMins <= startMins) {
      endMins += 24 * 60; // Crossed midnight
    }
    const diffMins = endMins - startMins;
    const hrs = Math.floor(diffMins / 60);
    const mins = diffMins % 60;

    updateSleepResultDisplay(hrs, mins, 0, `${startVal} → ${endVal}`);
    showToast(`Hisoblandi: ${hrs} soat ${mins} daqiqa uyqu!`);
    return;
  }

  // Live Timer Mode
  if (!isSleeping) {
    isSleeping = true;
    sleepStartedAtTimestamp = Date.now();
    persistActiveState();
    resumeSleepTimer(showToast);
    showToast('🌙 Uyqu hisoblagich boshlandi! Shiringina tushlar ko\'ring!');
  } else {
    // Intermediate check
    const { hrs, mins, secs } = formatSleepDuration(sleepElapsedSeconds);
    updateSleepResultDisplay(hrs, mins, secs, 'Jonli oraliq natija');
    showToast(`Oraliq hisob: ${hrs} soat ${mins} daqiqa ${secs} soniya`);
  }
}

function resumeSleepTimer(showToast) {
  if (sleepIntervalId) clearInterval(sleepIntervalId);
  sleepIntervalId = setInterval(() => {
    sleepElapsedSeconds++;
    renderLiveSleepDisplay();
  }, 1000);

  const statusText = document.getElementById('sleepStatusText');
  const dot = document.getElementById('sleepDot');
  const btn1Label = document.getElementById('btnSleepAction1Label');
  const banner = document.getElementById('sleepLiveBanner');

  if (statusText) statusText.textContent = "Uyqu vaqti jonli sanalmoqda (Uxlayapti)...";
  if (dot) dot.className = "w-2.5 h-2.5 rounded-full bg-emerald-400 animate-ping";
  if (btn1Label) btn1Label.textContent = "1-Tugma: Hozirgi Uyquni Hisoblash";
  if (banner) {
    banner.innerHTML = 'Uyqu holati: <span class="text-emerald-400 font-bold">Uxlayapti (jonli hisob)</span>';
  }
}

// 2-Tugma: Hisoblab To'xtatish & Tozalash / O'chirish
export function handleSleepButton2(showToast) {
  playFeedbackTone('click');

  if (sleepModeTab === 'manual') {
    document.getElementById('inputSleepStart').value = '23:00';
    document.getElementById('inputSleepEnd').value = '07:00';
    document.getElementById('sleepResultMainText').textContent = '0 soat 0 daqiqa (Tozalandi)';
    document.getElementById('sleepResultSubText').textContent = 'Yangi hisoblash uchun 1-tugmani bosing';
    document.getElementById('sleepQualityBadge').textContent = 'Tozalangan';
    showToast('Hisoblagich tozalandi va o\'chirildi!');
    return;
  }

  if (isSleeping || sleepElapsedSeconds > 0) {
    if (sleepIntervalId) {
      clearInterval(sleepIntervalId);
      sleepIntervalId = null;
    }
    const { hrs, mins, secs } = formatSleepDuration(sleepElapsedSeconds);
    updateSleepResultDisplay(hrs, mins, secs, 'Yakuniy hisob');

    // Reset to 00:00:00
    isSleeping = false;
    sleepStartedAtTimestamp = null;
    sleepElapsedSeconds = 0;
    persistActiveState();
    renderLiveSleepDisplay();

    const statusText = document.getElementById('sleepStatusText');
    const dot = document.getElementById('sleepDot');
    const btn1Label = document.getElementById('btnSleepAction1Label');
    const banner = document.getElementById('sleepLiveBanner');

    if (statusText) statusText.textContent = "Uyqu yakunlandi, tahlil qilindi va 00:00:00 ga tozalandi";
    if (dot) dot.className = "w-2 h-2 rounded-full bg-slate-400";
    if (btn1Label) btn1Label.textContent = "1-Tugma: Uyquni Boshlash & Sanash";
    if (banner) {
      banner.innerHTML = 'Uyqu holati: <span class="text-slate-200 font-semibold">Uyg\'oq (natija saqlandi)</span>';
    }

    showToast(`To'xtatildi va o'chirildi! Jami: ${hrs} soat ${mins} daqiqa`);
  } else {
    sleepElapsedSeconds = 0;
    renderLiveSleepDisplay();
    document.getElementById('sleepResultMainText').textContent = '0 soat 0 daqiqa (Tozalandi)';
    showToast('Hisoblagich 00:00:00 holatiga tozalandi');
  }
}

export function quickAddSeconds(secs, showToast) {
  sleepElapsedSeconds += secs;
  renderLiveSleepDisplay();
  const { hrs, mins } = formatSleepDuration(sleepElapsedSeconds);
  showToast(`+${Math.round(secs / 60)} daqiqa qo'shildi (Jami: ${hrs}s ${mins}d)`);
}

export function setSleepModeTab(mode) {
  sleepModeTab = mode;
  const tabLive = document.getElementById('tabModeLive');
  const tabManual = document.getElementById('tabModeManual');
  const panelLive = document.getElementById('panelSleepLive');
  const panelManual = document.getElementById('panelSleepManual');

  if (mode === 'live') {
    tabLive.className = 'px-3 py-1.5 rounded-lg accent-bg text-white shadow transition';
    tabManual.className = 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition';
    panelLive.classList.remove('hidden');
    panelManual.classList.add('hidden');
    document.getElementById('btnSleepAction1Label').textContent =
      isSleeping ? '1-Tugma: Hozirgi Uyquni Hisoblash' : '1-Tugma: Uyquni Boshlash & Sanash';
    document.getElementById('btnSleepAction2Label').textContent = '2-Tugma: Hisoblab To\'xtatish & O\'chirish';
  } else {
    tabManual.className = 'px-3 py-1.5 rounded-lg accent-bg text-white shadow transition';
    tabLive.className = 'px-3 py-1.5 rounded-lg text-slate-400 hover:text-white transition';
    panelManual.classList.remove('hidden');
    panelLive.classList.add('hidden');
    document.getElementById('btnSleepAction1Label').textContent = '1-Tugma: Nechi Soat Uxlaganini Hisoblash';
    document.getElementById('btnSleepAction2Label').textContent = '2-Tugma: Natijani O\'chirish & Tozalash';
  }
}

export function clearAllSleepHistory(showToast) {
  sleepHistory = [];
  persistHistory();
  renderSleepHistory();
  showToast('Uyqu tarixi to\'liq tozalandi');
}

export function renderSleepHistory() {
  const container = document.getElementById('sleepHistoryContainer');
  if (!container) return;

  if (sleepHistory.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-3 text-center">Hozircha saqlangan uyqu tarixi mavjud emas</div>`;
    return;
  }

  container.innerHTML = sleepHistory.map(item => `
    <div class="bg-slate-900/80 hover:bg-slate-800/80 px-3.5 py-2.5 rounded-xl border border-slate-800/90 flex items-center justify-between text-xs transition">
      <div>
        <span class="font-bold text-white">${item.durationText}</span>
        <span class="text-slate-400 ml-2 text-[11px]">(${item.mode})</span>
      </div>
      <div class="flex items-center gap-2">
        <span class="text-[11px] px-2 py-0.5 rounded-md bg-indigo-500/20 text-indigo-300 font-semibold border border-indigo-500/30">${item.quality}</span>
        <span class="text-slate-400 text-[11px]">${item.date}</span>
      </div>
    </div>
  `).join('');
}

function updateSleepStatsSummary() {
  const statsEl = document.getElementById('sleepStatsSummary');
  if (!statsEl) return;

  if (sleepHistory.length === 0) {
    statsEl.textContent = "O'rtacha uyqu: --";
    return;
  }

  const validEntries = sleepHistory.filter(i => typeof i.totalMinutes === 'number' && i.totalMinutes > 0);
  if (validEntries.length === 0) return;

  const avgMins = Math.round(validEntries.reduce((acc, curr) => acc + curr.totalMinutes, 0) / validEntries.length);
  const avgH = Math.floor(avgMins / 60);
  const avgM = avgMins % 60;
  statsEl.textContent = `O'rtacha uyqu: ${avgH}s ${avgM}d • Jami yozuvlar: ${sleepHistory.length} ta`;
}

// Export data to CSV
export function exportSleepHistoryCSV() {
  if (sleepHistory.length === 0) return;
  let csv = 'Sana,Davomiylik,Usul,Sifat\n';
  sleepHistory.forEach(item => {
    csv += `"${item.date}","${item.durationText}","${item.mode}","${item.quality}"\n`;
  });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `uyqu_tarixi_${Date.now()}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}
