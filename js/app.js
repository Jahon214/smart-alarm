// js/app.js - Application Orchestrator, Themes, Soundboard & PWA Setup

import { initAudio, playAlarmTone, stopContinuousAlarm, setMasterVolume } from './audio.js';
import { initClock, setClockStyle, toggleTimeFormat, toggleNightstandMode } from './clock.js';
import {
  initSleepTracker,
  handleSleepButton1,
  handleSleepButton2,
  quickAddSeconds,
  setSleepModeTab,
  clearAllSleepHistory,
  exportSleepHistoryCSV,
  updateSleepResultDisplay
} from './sleep.js';
import {
  initAlarms,
  addAlarm,
  toggleAlarm,
  deleteAlarm,
  checkMinuteAlarms,
  updateAlarmSleepPrediction,
  triggerRingingModal,
  closeRingingModal,
  snoozeAlarm,
  setAlarmVolume,
  getAlarmVolume,
  TONE_NAMES
} from './alarms.js';

let toastTimeout = null;

export function showToast(msg) {
  const el = document.getElementById('toastNotice');
  const txt = document.getElementById('toastText');
  if (!el || !txt) return;

  txt.textContent = msg;
  el.classList.remove('hidden');
  if (toastTimeout) clearTimeout(toastTimeout);
  toastTimeout = setTimeout(() => {
    el.classList.add('hidden');
  }, 3200);
}

// Initial DOM Load
window.addEventListener('DOMContentLoaded', () => {
  // 1. Audio Auto-Unlock on first user interaction
  const unlockAudioOnGesture = () => {
    initAudio();
    document.removeEventListener('click', unlockAudioOnGesture);
    document.removeEventListener('touchstart', unlockAudioOnGesture);
    document.removeEventListener('keydown', unlockAudioOnGesture);
  };
  document.addEventListener('click', unlockAudioOnGesture, { passive: true });
  document.addEventListener('touchstart', unlockAudioOnGesture, { passive: true });
  document.addEventListener('keydown', unlockAudioOnGesture, { passive: true });

  // 2. Restore Theme Preferences
  const savedBg = localStorage.getItem('smart_alarm_bg') || 'aurora';
  document.body.setAttribute('data-bg', savedBg);
  document.querySelectorAll('.bg-mode-btn').forEach(btn => {
    if (btn.dataset.bgmode === savedBg) {
      btn.className = 'bg-mode-btn px-2 py-1 rounded-lg text-[11px] font-bold accent-bg text-white shadow transition';
    } else {
      btn.className = 'bg-mode-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white transition';
    }
  });

  const savedColor = localStorage.getItem('smart_alarm_accent_color') || '#6366f1';
  const savedGlow = localStorage.getItem('smart_alarm_accent_glow') || 'rgba(99, 102, 241, 0.45)';
  document.documentElement.style.setProperty('--accent', savedColor);
  document.documentElement.style.setProperty('--accent-glow', savedGlow);
  document.querySelectorAll('.theme-btn').forEach(btn => {
    if (btn.dataset.color === savedColor) {
      btn.classList.add('ring-2', 'ring-white', 'scale-110');
    } else {
      btn.classList.remove('ring-2', 'ring-white', 'scale-110');
    }
  });

  // 3. Initialize Modules
  const savedStyle = localStorage.getItem('smart_alarm_clock_style') || 'neon';
  const saved24h = localStorage.getItem('smart_alarm_is24h') !== null
    ? JSON.parse(localStorage.getItem('smart_alarm_is24h'))
    : true;

  initClock(savedStyle, saved24h, (currentHM) => {
    checkMinuteAlarms(currentHM, showToast);
  });

  const fmtBtn = document.getElementById('btnToggleFormat');
  if (fmtBtn) {
    fmtBtn.textContent = saved24h ? '24-SOAT' : '12-SOAT (AM/PM)';
    fmtBtn.addEventListener('click', () => {
      const is24 = toggleTimeFormat();
      fmtBtn.textContent = is24 ? '24-SOAT' : '12-SOAT (AM/PM)';
    });
  }

  initSleepTracker(showToast);
  initAlarms(showToast);

  // 4. Clock Style Switchers
  document.querySelectorAll('.clock-style-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      setClockStyle(btn.dataset.style);
    });
  });

  // 5. Fullscreen Bedside Toggle
  const btnNightstand = document.getElementById('btnNightstand');
  if (btnNightstand) {
    btnNightstand.addEventListener('click', () => {
      const isNight = toggleNightstandMode();
      btnNightstand.textContent = isNight ? "Tungi rejimdan chiqish (ESC)" : "🌙 Tungi Stol Rejimi";
      showToast(isNight ? "Tungi stol rejimi yoqildi" : "Oddiy rejimga qaytildi");
    });
  }

  // 6. Background Atmosphere Selectors
  document.querySelectorAll('.bg-mode-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mode = btn.dataset.bgmode;
      document.body.setAttribute('data-bg', mode);
      localStorage.setItem('smart_alarm_bg', mode);

      document.querySelectorAll('.bg-mode-btn').forEach(b => {
        b.className = 'bg-mode-btn px-2 py-1 rounded-lg text-[11px] font-medium text-slate-300 hover:text-white transition';
      });
      btn.className = 'bg-mode-btn px-2 py-1 rounded-lg text-[11px] font-bold accent-bg text-white shadow transition';
    });
  });

  // 7. Accent Color Pickers
  document.querySelectorAll('.theme-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const color = btn.dataset.color;
      const glow = btn.dataset.glow;
      document.documentElement.style.setProperty('--accent', color);
      document.documentElement.style.setProperty('--accent-glow', glow);
      localStorage.setItem('smart_alarm_accent_color', color);
      localStorage.setItem('smart_alarm_accent_glow', glow);

      document.querySelectorAll('.theme-btn').forEach(b => b.classList.remove('ring-2', 'ring-white', 'scale-110'));
      btn.classList.add('ring-2', 'ring-white', 'scale-110');
    });
  });

  // 8. Sleep Mode Tabs
  const tabLive = document.getElementById('tabModeLive');
  const tabManual = document.getElementById('tabModeManual');
  if (tabLive) tabLive.addEventListener('click', () => setSleepModeTab('live'));
  if (tabManual) tabManual.addEventListener('click', () => setSleepModeTab('manual'));

  // 9. The 2 Main Sleep Buttons
  const btnSleep1 = document.getElementById('btnSleepAction1');
  const btnSleep2 = document.getElementById('btnSleepAction2');
  if (btnSleep1) btnSleep1.addEventListener('click', () => handleSleepButton1(showToast));
  if (btnSleep2) btnSleep2.addEventListener('click', () => handleSleepButton2(showToast));

  // Quick simulation / add time buttons
  const btnAdd1H = document.getElementById('btnAdd1Hour');
  const btnAdd30M = document.getElementById('btnAdd30Min');
  if (btnAdd1H) btnAdd1H.addEventListener('click', () => quickAddSeconds(3600, showToast));
  if (btnAdd30M) btnAdd30M.addEventListener('click', () => quickAddSeconds(1800, showToast));

  // Sleep history clear & export
  const btnClearHist = document.getElementById('btnClearHistory');
  const btnExportCsv = document.getElementById('btnExportCsv');
  if (btnClearHist) btnClearHist.addEventListener('click', () => clearAllSleepHistory(showToast));
  if (btnExportCsv) btnExportCsv.addEventListener('click', () => exportSleepHistoryCSV());

  // 10. Alarm Controls
  const alarmTimeInput = document.getElementById('newAlarmTime');
  if (alarmTimeInput) alarmTimeInput.addEventListener('input', updateAlarmSleepPrediction);

  const btnAddAlm = document.getElementById('btnAddAlarm');
  if (btnAddAlm) {
    btnAddAlm.addEventListener('click', () => {
      const timeVal = document.getElementById('newAlarmTime').value;
      const labelInput = document.getElementById('newAlarmLabel');
      const toneVal = document.getElementById('newAlarmTone').value;
      addAlarm(timeVal, labelInput.value, toneVal, showToast);
      labelInput.value = '';
    });
  }

  // Volume slider
  const volSlider = document.getElementById('alarmVolumeSlider');
  const volLabel = document.getElementById('alarmVolLabel');
  if (volSlider) {
    const curVol = getAlarmVolume();
    volSlider.value = String(Math.round(curVol * 100));
    if (volLabel) volLabel.textContent = `${Math.round(curVol * 100)}%`;

    volSlider.addEventListener('input', (e) => {
      const val = Number(e.target.value);
      setAlarmVolume(val / 100);
      setMasterVolume(val / 100);
      if (volLabel) volLabel.textContent = `${val}%`;
    });
  }

  // Tone preview & soundboard
  const btnPreview = document.getElementById('btnPreviewTone');
  if (btnPreview) {
    btnPreview.addEventListener('click', () => {
      const tone = document.getElementById('newAlarmTone').value;
      playAlarmTone(tone, getAlarmVolume());
      showToast('🔊 Budilnik signali chalindi!');
    });
  }

  const toneSelect = document.getElementById('newAlarmTone');
  if (toneSelect) {
    toneSelect.addEventListener('change', (e) => {
      playAlarmTone(e.target.value, getAlarmVolume());
      const badge = document.getElementById('currentSoundBadge');
      if (badge) badge.textContent = TONE_NAMES[e.target.value] || e.target.value;
    });
  }

  const btnStop = document.getElementById('btnStopPreview');
  if (btnStop) {
    btnStop.addEventListener('click', () => {
      stopContinuousAlarm();
      showToast("Ovoz to'xtatildi");
    });
  }

  // Quick 1-click soundboard
  document.querySelectorAll('.quick-tone-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const toneKey = btn.dataset.quicktone;
      if (toneSelect) toneSelect.value = toneKey;
      playAlarmTone(toneKey, getAlarmVolume());

      const badge = document.getElementById('currentSoundBadge');
      if (badge) badge.textContent = btn.textContent;

      document.querySelectorAll('.quick-tone-btn').forEach(b => {
        b.className = 'quick-tone-btn text-[11px] px-2 py-1 rounded-lg bg-slate-800 text-slate-300 hover:text-white border border-slate-700 transition';
      });
      btn.className = 'quick-tone-btn text-[11px] px-2 py-1 rounded-lg bg-indigo-500/25 text-indigo-200 border border-indigo-500/50 font-bold transition';
      showToast('🔊 Ovoz: ' + btn.textContent);
    });
  });

  // Delegate Alarm List Click
  const alarmsContainer = document.getElementById('alarmsListContainer');
  if (alarmsContainer) {
    alarmsContainer.addEventListener('click', (e) => {
      const btn = e.target.closest('button[data-action]');
      if (!btn) return;
      const id = btn.dataset.id;
      const action = btn.dataset.action;

      if (action === 'toggle-alarm') {
        toggleAlarm(id);
      } else if (action === 'delete-alarm') {
        deleteAlarm(id, showToast);
      }
    });
  }

  // Quick Nap Preset Buttons
  document.querySelectorAll('.quick-nap-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const mins = Number(btn.dataset.napmins);
      const now = new Date();
      now.setMinutes(now.getMinutes() + mins);
      const targetTime = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;
      addAlarm(targetTime, `😴 ${mins} daqiqalik oromgoh (Nap)`, 'zen_harp', showToast);
    });
  });

  // Test Alarm Modal Trigger
  const btnTestModal = document.getElementById('btnTestAlarmModal');
  if (btnTestModal) {
    btnTestModal.addEventListener('click', () => {
      const toneVal = document.getElementById('newAlarmTone').value || 'classic_beep';
      const timeVal = document.getElementById('newAlarmTime').value || '06:30';
      triggerRingingModal({
        time: timeVal,
        label: "Haqiqiy Budilnik Signali Sinovi",
        tone: toneVal
      }, showToast);
    });
  }

  // Ringing Modal Actions
  const btnStopRing = document.getElementById('btnStopRingingAndCalc');
  if (btnStopRing) {
    btnStopRing.addEventListener('click', () => {
      closeRingingModal();
      handleSleepButton2(showToast);
      showToast("Budilnik o'chirildi va uyqu hisoblandi!");
    });
  }

  const btnSnooze = document.getElementById('btnSnoozeRinging');
  if (btnSnooze) {
    btnSnooze.addEventListener('click', () => {
      snoozeAlarm(5, showToast);
    });
  }

  // 11. Register PWA Service Worker for offline capability
  if ('serviceWorker' in navigator) {
    navigator.serviceWorker.register('./sw.js').then(reg => {
      console.log('Service Worker registered with scope:', reg.scope);
    }).catch(err => {
      console.log('Service Worker registration skipped:', err);
    });
  }
});
