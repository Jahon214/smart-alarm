// js/alarms.js - Smart Alarms Scheduler, Web Notifications & Ringing Modal

import { playAlarmTone, startContinuousAlarm, stopContinuousAlarm, playFeedbackTone } from './audio.js';
import { pad2 } from './clock.js';
import { handleSleepButton2, updateSleepResultDisplay } from './sleep.js';

let alarms = [];
let alarmVolume = 0.9;
let activeRingingAlarm = null;

const DEFAULT_ALARMS = [
  { id: 'alm-1', time: '06:30', label: 'Bomdod va Tonggi mashq', tone: 'classic_beep', enabled: true, lastTriggeredMinute: '' },
  { id: 'alm-2', time: '07:30', label: "Ishga va o'qishga uyg'onish", tone: 'twin_bell', enabled: true, lastTriggeredMinute: '' },
  { id: 'alm-3', time: '22:45', label: 'Uxlashga tayyorgarlik eslatmasi', tone: 'radar_pro', enabled: false, lastTriggeredMinute: '' }
];

export const TONE_NAMES = {
  classic_beep: '🔔 Klassik Bip-Bip',
  twin_bell: "⏰ Mexanik Qo'ng'iroq",
  rooster_morning: "🐓 Tonggi Xo'roz",
  military_bugle: '🎺 Harbiy Truba',
  siren_horn: '🚨 Kuchli Sirena',
  sub_nuclear: '⚠️ Favqulodda Klakson',
  ship_horn: '🚢 Kema Gudogi',
  radar_pro: '📡 iPhone Radar',
  samsung_morning: '☀️ Samsung Tong',
  nokia_classic: '📱 Nokia Retro',
  casio_retro: '⌚ Casio Pip-Pip',
  marimba_apple: '🪵 Marimba Pro',
  cyber_pulse: '🤖 Kiber Lazer',
  birds_dawn: '🐦 Tonggi Qushlar',
  church_bell: '🛎️ Katta Minorali Bong',
  zen_harp: '🎐 Sharqona Arfa',
  cosmic: '🌌 Kosmik Tong',
  piano: '🎹 Mayin Pianino',
  energetic: '⚡ Energiya Pro',
  chime: '🌿 Tabiat Bongi'
};

export function initAlarms(showToast) {
  loadStoredAlarms();
  renderAlarmsList();
  updateAlarmSleepPrediction();
  requestNotificationPermission();
}

function loadStoredAlarms() {
  try {
    const stored = localStorage.getItem('smart_alarm_alarms');
    if (stored) {
      alarms = JSON.parse(stored);
    } else {
      alarms = [...DEFAULT_ALARMS];
      persistAlarms();
    }
  } catch (e) {
    alarms = [...DEFAULT_ALARMS];
  }

  const storedVol = localStorage.getItem('smart_alarm_volume');
  if (storedVol) {
    alarmVolume = Number(storedVol);
  }
}

function persistAlarms() {
  localStorage.setItem('smart_alarm_alarms', JSON.stringify(alarms));
}

export function setAlarmVolume(val) {
  alarmVolume = Math.max(0.05, Math.min(1.0, val));
  localStorage.setItem('smart_alarm_volume', String(alarmVolume));
}

export function getAlarmVolume() {
  return alarmVolume;
}

export function checkMinuteAlarms(currentHM, showToast) {
  alarms.forEach(alm => {
    if (alm.enabled && alm.time === currentHM && alm.lastTriggeredMinute !== currentHM) {
      alm.lastTriggeredMinute = currentHM;
      persistAlarms();
      triggerRingingModal(alm, showToast);
    }
  });
}

export function addAlarm(timeVal, labelVal, toneVal, showToast) {
  playFeedbackTone('success');
  const newAlm = {
    id: 'alm-' + Date.now(),
    time: timeVal || '06:30',
    label: labelVal.trim() || "Har kungi uyg'otgich",
    tone: toneVal || 'classic_beep',
    enabled: true,
    lastTriggeredMinute: ''
  };

  alarms.unshift(newAlm);
  persistAlarms();
  renderAlarmsList();
  playAlarmTone(newAlm.tone, alarmVolume);
  showToast(`Budilnik ${newAlm.time} ga muvaffaqiyatli o'rnatildi!`);
}

export function toggleAlarm(id) {
  const item = alarms.find(a => a.id === id);
  if (item) {
    item.enabled = !item.enabled;
    persistAlarms();
    renderAlarmsList();
  }
}

export function deleteAlarm(id, showToast) {
  alarms = alarms.filter(a => a.id !== id);
  persistAlarms();
  renderAlarmsList();
  showToast("Budilnik o'chirildi");
}

export function renderAlarmsList() {
  const container = document.getElementById('alarmsListContainer');
  const countBadge = document.getElementById('activeAlarmsCount');
  const nextBanner = document.getElementById('nextAlarmBanner');

  const activeList = alarms.filter(a => a.enabled);
  if (countBadge) countBadge.textContent = `${activeList.length} ta faol`;

  if (nextBanner) {
    if (activeList.length > 0) {
      const nextAlm = activeList[0];
      nextBanner.innerHTML = `Keyingi budilnik: <strong>${nextAlm.time} (${nextAlm.label})</strong>`;
    } else {
      nextBanner.innerHTML = `Faol budilnik yo'q`;
    }
  }

  if (!container) return;
  if (alarms.length === 0) {
    container.innerHTML = `<div class="text-xs text-slate-500 py-6 text-center">Budilniklar ro'yxati bo'sh. Yuqoridan yangi qo'shing!</div>`;
    return;
  }

  container.innerHTML = alarms.map(alm => `
    <div class="bg-slate-900/85 hover:bg-slate-800/85 px-4 py-3 rounded-2xl border ${alm.enabled ? 'border-indigo-500/40 shadow-sm' : 'border-slate-800/70 opacity-60'} flex items-center justify-between gap-3 transition">
      <div>
        <div class="flex items-baseline gap-2">
          <span class="font-mono text-2xl font-extrabold text-white">${alm.time}</span>
          <span class="text-[11px] text-indigo-300 font-medium">${TONE_NAMES[alm.tone] || 'Standart'}</span>
        </div>
        <div class="text-xs text-slate-300 font-medium">${alm.label}</div>
      </div>
      <div class="flex items-center gap-2">
        <button data-action="toggle-alarm" data-id="${alm.id}" class="px-3 py-1.5 rounded-xl text-xs font-bold transition ${alm.enabled ? 'accent-bg text-white shadow' : 'bg-slate-800 text-slate-400'}">
          ${alm.enabled ? 'Yoqilgan' : "O'chiq"}
        </button>
        <button data-action="delete-alarm" data-id="${alm.id}" title="O'chirish" class="p-1.5 rounded-xl bg-slate-800 hover:bg-rose-600/30 text-slate-400 hover:text-rose-300 transition">
          ✕
        </button>
      </div>
    </div>
  `).join('');
}

export function updateAlarmSleepPrediction() {
  const inputEl = document.getElementById('newAlarmTime');
  if (!inputEl) return;
  const val = inputEl.value || '06:30';
  const [ah, am] = val.split(':').map(Number);
  const now = new Date();
  const nowMins = now.getHours() * 60 + now.getMinutes();
  let targetMins = ah * 60 + am;
  if (targetMins <= nowMins) targetMins += 24 * 60;
  const diff = targetMins - nowMins;
  const h = Math.floor(diff / 60);
  const m = diff % 60;

  const predEl = document.getElementById('alarmSleepPrediction');
  if (predEl) {
    predEl.innerHTML = `💡 Hozir uxlasangiz, ushbu budilnikgacha <strong>${h} soat ${m} daqiqa</strong> uxlaysiz.`;
  }

  // Optimal 8h bedtime calculation
  let bedMins = (ah * 60 + am) - 8 * 60;
  if (bedMins < 0) bedMins += 24 * 60;
  const bh = pad2(Math.floor(bedMins / 60));
  const bm = pad2(bedMins % 60);
  const optEl = document.getElementById('optimalSleepTimeText');
  if (optEl) {
    optEl.textContent = `${val} da tetik turish uchun soat ${bh}:${bm} da uxlash tavsiya etiladi`;
  }
}

export function triggerRingingModal(alarmObj, showToast) {
  activeRingingAlarm = alarmObj;
  const modal = document.getElementById('alarmRingingModal');
  const timeEl = document.getElementById('ringingAlarmTime');
  const labelEl = document.getElementById('ringingAlarmLabel');

  if (timeEl) timeEl.textContent = alarmObj.time;
  if (labelEl) labelEl.textContent = alarmObj.label;

  modal.classList.remove('hidden');
  modal.classList.add('flex');

  // Trigger continuous audio playback
  startContinuousAlarm(alarmObj.tone || 'classic_beep', alarmVolume);

  // Trigger browser push notification if permitted
  if ('Notification' in window && Notification.permission === 'granted') {
    try {
      new Notification(`⏰ Budilnik: ${alarmObj.time}`, {
        body: alarmObj.label,
        icon: 'icons/icon-192.png',
        tag: 'smart-alarm-ring'
      });
    } catch (e) {}
  }

  // Trigger device vibration
  if ('vibrate' in navigator) {
    navigator.vibrate([400, 200, 400, 200, 400, 300, 600]);
  }
}

export function closeRingingModal() {
  const modal = document.getElementById('alarmRingingModal');
  modal.classList.add('hidden');
  modal.classList.remove('flex');
  stopContinuousAlarm();
  activeRingingAlarm = null;
}

export function snoozeAlarm(minutes = 5, showToast) {
  closeRingingModal();
  const now = new Date();
  now.setMinutes(now.getMinutes() + minutes);
  const snoozedHM = `${pad2(now.getHours())}:${pad2(now.getMinutes())}`;

  alarms.unshift({
    id: 'snooze-' + Date.now(),
    time: snoozedHM,
    label: `⏰ Kechiktirilgan (+${minutes} daqiqa)`,
    tone: activeRingingAlarm ? activeRingingAlarm.tone : 'classic_beep',
    enabled: true,
    lastTriggeredMinute: ''
  });
  persistAlarms();
  renderAlarmsList();
  showToast(`Budilnik ${minutes} daqiqaga kechiktirildi (${snoozedHM})`);
}

function requestNotificationPermission() {
  if ('Notification' in window && Notification.permission === 'default') {
    Notification.requestPermission();
  }
}
