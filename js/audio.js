// js/audio.js - High Fidelity Web Audio Synthesizer for 20 Alarm Sounds & Feedback

let audioCtx = null;
let masterGain = null;
let masterCompressor = null;
let activeNodes = [];
let alarmRingingLoop = null;

export function initAudio() {
  if (!audioCtx) {
    const AudioContextClass = window.AudioContext || window.webkitAudioContext;
    if (AudioContextClass) {
      audioCtx = new AudioContextClass();
      
      // Master dynamics compressor to eliminate clipping and distortion
      masterCompressor = audioCtx.createDynamicsCompressor();
      masterCompressor.threshold.setValueAtTime(-18, audioCtx.currentTime);
      masterCompressor.knee.setValueAtTime(12, audioCtx.currentTime);
      masterCompressor.ratio.setValueAtTime(6, audioCtx.currentTime);
      masterCompressor.attack.setValueAtTime(0.003, audioCtx.currentTime);
      masterCompressor.release.setValueAtTime(0.2, audioCtx.currentTime);

      masterGain = audioCtx.createGain();
      masterGain.gain.setValueAtTime(0.9, audioCtx.currentTime);

      masterCompressor.connect(masterGain);
      masterGain.connect(audioCtx.destination);
    }
  }
  if (audioCtx && audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
  return audioCtx;
}

export function stopAllActiveSounds() {
  activeNodes.forEach(node => {
    try { node.stop(); } catch (e) {}
    try { node.disconnect(); } catch (e) {}
  });
  activeNodes = [];
}

function registerActive(node) {
  activeNodes.push(node);
  node.onended = () => {
    activeNodes = activeNodes.filter(n => n !== node);
  };
}

export function setMasterVolume(val) {
  if (masterGain && audioCtx) {
    masterGain.gain.linearRampToValueAtTime(Math.max(0.05, Math.min(1.0, val)), audioCtx.currentTime + 0.05);
  }
}

// 20 High-Quality Synthesized Tones
export function playAlarmTone(toneType, volume = 0.9) {
  try {
    initAudio();
    if (!audioCtx) return;
    stopAllActiveSounds();

    const now = audioCtx.currentTime;
    const vol = Math.max(0.05, Math.min(1.0, volume));
    const targetDest = masterCompressor || audioCtx.destination;

    // 1. CLASSIC DIGITAL QUARTZ: BEEP-BEEP-BEEP-BEEP
    if (toneType === 'classic_beep') {
      const offsets = [0, 0.11, 0.22, 0.33, 0.70, 0.81, 0.92, 1.03];
      offsets.forEach(offset => {
        const osc = audioCtx.createOscillator();
        const sub = audioCtx.createOscillator();
        const gain = audioCtx.createGain();

        osc.type = 'square';
        sub.type = 'sawtooth';
        osc.frequency.setValueAtTime(2480, now + offset);
        sub.frequency.setValueAtTime(1240, now + offset);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.linearRampToValueAtTime(0.30 * vol, now + offset + 0.006);
        gain.gain.setValueAtTime(0.30 * vol, now + offset + 0.065);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.082);

        osc.connect(gain);
        sub.connect(gain);
        gain.connect(targetDest);

        osc.start(now + offset);
        sub.start(now + offset);
        osc.stop(now + offset + 0.085);
        sub.stop(now + offset + 0.085);
        registerActive(osc);
        registerActive(sub);
      });
      return;
    }

    // 2. MECHANICAL TWIN-BELL ALARM CLOCK
    if (toneType === 'twin_bell') {
      const strikes = 20;
      for (let i = 0; i < strikes; i++) {
        const t = now + i * 0.052;
        [1380, 2190, 3120].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = idx === 0 ? 'triangle' : 'sine';
          osc.frequency.setValueAtTime(freq + (i % 2 === 0 ? 0 : 90), t);

          const peak = (0.26 / (idx + 1)) * vol;
          gain.gain.setValueAtTime(0.0001, t);
          gain.gain.linearRampToValueAtTime(peak, t + 0.004);
          gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.075);

          osc.connect(gain);
          gain.connect(targetDest);
          osc.start(t);
          osc.stop(t + 0.08);
          registerActive(osc);
        });
      }
      return;
    }

    // 3. RADAR PRO (iPhone style crystal wake-up)
    if (toneType === 'radar_pro') {
      const pattern = [
        { f: 659.25, t: 0.0, d: 0.14 },
        { f: 783.99, t: 0.15, d: 0.14 },
        { f: 987.77, t: 0.30, d: 0.14 },
        { f: 1318.51, t: 0.45, d: 0.28 },
        { f: 987.77, t: 0.78, d: 0.14 },
        { f: 1318.51, t: 0.94, d: 0.38 }
      ];
      pattern.forEach(n => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'triangle';
        osc2.type = 'sine';
        osc1.frequency.setValueAtTime(n.f, now + n.t);
        osc2.frequency.setValueAtTime(n.f * 2, now + n.t);

        gain.gain.setValueAtTime(0.0001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.32 * vol, now + n.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(targetDest);
        osc1.start(now + n.t);
        osc2.start(now + n.t);
        osc1.stop(now + n.t + n.d + 0.02);
        osc2.stop(now + n.t + n.d + 0.02);
        registerActive(osc1);
        registerActive(osc2);
      });
      return;
    }

    // 4. SIREN HORN (Heavy sleeper alarm)
    if (toneType === 'siren_horn') {
      const osc1 = audioCtx.createOscillator();
      const osc2 = audioCtx.createOscillator();
      const gain = audioCtx.createGain();

      osc1.type = 'sawtooth';
      osc2.type = 'square';
      osc1.frequency.setValueAtTime(680, now);
      osc1.frequency.linearRampToValueAtTime(1320, now + 0.45);
      osc1.frequency.linearRampToValueAtTime(680, now + 0.90);
      osc1.frequency.linearRampToValueAtTime(1380, now + 1.30);

      osc2.frequency.setValueAtTime(340, now);
      osc2.frequency.linearRampToValueAtTime(660, now + 0.45);
      osc2.frequency.linearRampToValueAtTime(340, now + 0.90);
      osc2.frequency.linearRampToValueAtTime(690, now + 1.30);

      gain.gain.setValueAtTime(0.001, now);
      gain.gain.linearRampToValueAtTime(0.28 * vol, now + 0.05);
      gain.gain.setValueAtTime(0.28 * vol, now + 1.15);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.35);

      osc1.connect(gain);
      osc2.connect(gain);
      gain.connect(targetDest);
      osc1.start(now);
      osc2.start(now);
      osc1.stop(now + 1.38);
      osc2.stop(now + 1.38);
      registerActive(osc1);
      registerActive(osc2);
      return;
    }

    // 5. ROOSTER MORNING CROW (🐓 Qu-qu-ri-quuu!)
    if (toneType === 'rooster_morning') {
      const syllables = [
        { t: 0.0, d: 0.14, fStart: 520, fEnd: 680 },
        { t: 0.17, d: 0.14, fStart: 620, fEnd: 790 },
        { t: 0.34, d: 0.16, fStart: 740, fEnd: 980 },
        { t: 0.53, d: 0.68, fStart: 1080, fEnd: 760 }
      ];
      syllables.forEach(syl => {
        const osc = audioCtx.createOscillator();
        const formant = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        formant.type = 'triangle';

        osc.frequency.setValueAtTime(syl.fStart, now + syl.t);
        osc.frequency.exponentialRampToValueAtTime(syl.fEnd, now + syl.t + syl.d);
        formant.frequency.setValueAtTime(syl.fStart * 2.02, now + syl.t);
        formant.frequency.exponentialRampToValueAtTime(syl.fEnd * 1.98, now + syl.t + syl.d);

        gain.gain.setValueAtTime(0.001, now + syl.t);
        gain.gain.linearRampToValueAtTime(0.28 * vol, now + syl.t + 0.025);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + syl.t + syl.d);

        osc.connect(gain);
        formant.connect(gain);
        gain.connect(targetDest);
        osc.start(now + syl.t);
        formant.start(now + syl.t);
        osc.stop(now + syl.t + syl.d + 0.02);
        formant.stop(now + syl.t + syl.d + 0.02);
        registerActive(osc);
        registerActive(formant);
      });
      return;
    }

    // 6. MILITARY BUGLE REVEILLE FANFARE
    if (toneType === 'military_bugle') {
      const bugleNotes = [
        { f: 392.00, t: 0.00, d: 0.13 },
        { f: 523.25, t: 0.14, d: 0.13 },
        { f: 659.25, t: 0.28, d: 0.13 },
        { f: 523.25, t: 0.42, d: 0.13 },
        { f: 659.25, t: 0.56, d: 0.26 },
        { f: 783.99, t: 0.84, d: 0.38 }
      ];
      bugleNotes.forEach(n => {
        const osc1 = audioCtx.createOscillator();
        const osc2 = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc1.type = 'sawtooth';
        osc2.type = 'triangle';
        osc1.frequency.setValueAtTime(n.f, now + n.t);
        osc2.frequency.setValueAtTime(n.f * 2, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.28 * vol, now + n.t + 0.02);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

        osc1.connect(gain);
        osc2.connect(gain);
        gain.connect(targetDest);
        osc1.start(now + n.t);
        osc2.start(now + n.t);
        osc1.stop(now + n.t + n.d + 0.02);
        osc2.stop(now + n.t + n.d + 0.02);
        registerActive(osc1);
        registerActive(osc2);
      });
      return;
    }

    // 7. CASIO RETRO WRISTWATCH (4096Hz double pip)
    if (toneType === 'casio_retro') {
      [0.0, 0.09, 0.55, 0.64, 1.10, 1.19].forEach(offset => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(4096, now + offset);

        gain.gain.setValueAtTime(0.0001, now + offset);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + offset + 0.003);
        gain.gain.setValueAtTime(0.24 * vol, now + offset + 0.045);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.055);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(now + offset);
        osc.stop(now + offset + 0.06);
        registerActive(osc);
      });
      return;
    }

    // 8. SAMSUNG MORNING FLOWER
    if (toneType === 'samsung_morning') {
      const seq = [
        { f: 587.33, t: 0.00, d: 0.18 },
        { f: 659.25, t: 0.19, d: 0.18 },
        { f: 739.99, t: 0.38, d: 0.18 },
        { f: 880.00, t: 0.57, d: 0.30 },
        { f: 1174.66, t: 0.89, d: 0.38 }
      ];
      seq.forEach(n => {
        const osc = audioCtx.createOscillator();
        const over = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        over.type = 'triangle';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        over.frequency.setValueAtTime(n.f * 2, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.30 * vol, now + n.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

        osc.connect(gain);
        over.connect(gain);
        gain.connect(targetDest);
        osc.start(now + n.t);
        over.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
        over.stop(now + n.t + n.d + 0.02);
        registerActive(osc);
        registerActive(over);
      });
      return;
    }

    // 9. NOKIA CLASSIC
    if (toneType === 'nokia_classic') {
      const nokia = [
        { f: 1318.5, t: 0.00, d: 0.13 },
        { f: 1174.7, t: 0.14, d: 0.13 },
        { f: 739.99, t: 0.28, d: 0.25 },
        { f: 830.61, t: 0.54, d: 0.25 },
        { f: 1108.7, t: 0.80, d: 0.13 },
        { f: 987.77, t: 0.94, d: 0.13 },
        { f: 587.33, t: 1.08, d: 0.28 }
      ];
      nokia.forEach(n => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'square';
        osc.frequency.setValueAtTime(n.f, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.24 * vol, now + n.t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + n.d);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(now + n.t);
        osc.stop(now + n.t + n.d + 0.02);
        registerActive(osc);
      });
      return;
    }

    // 10. DAWN BIRDS CHIRPING
    if (toneType === 'birds_dawn') {
      const chirps = [
        { t: 0.00, d: 0.11, f1: 2200, f2: 3100 },
        { t: 0.14, d: 0.12, f1: 2400, f2: 3450 },
        { t: 0.32, d: 0.18, f1: 3200, f2: 2100 },
        { t: 0.56, d: 0.10, f1: 2600, f2: 3600 },
        { t: 0.70, d: 0.10, f1: 2600, f2: 3750 },
        { t: 0.85, d: 0.32, f1: 2900, f2: 2350 }
      ];
      chirps.forEach(c => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        osc.frequency.setValueAtTime(c.f1, now + c.t);
        osc.frequency.exponentialRampToValueAtTime(c.f2, now + c.t + c.d);

        gain.gain.setValueAtTime(0.001, now + c.t);
        gain.gain.linearRampToValueAtTime(0.28 * vol, now + c.t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + c.t + c.d);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(now + c.t);
        osc.stop(now + c.t + c.d + 0.02);
        registerActive(osc);
      });
      return;
    }

    // 11. DEEP SHIP HORN
    if (toneType === 'ship_horn') {
      [110, 165, 220, 275].forEach((freq, idx) => {
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = idx % 2 === 0 ? 'sawtooth' : 'triangle';
        osc.frequency.setValueAtTime(freq, now);
        osc.frequency.linearRampToValueAtTime(freq * 0.97, now + 1.25);

        const peak = (0.28 / (idx + 1)) * vol;
        gain.gain.setValueAtTime(0.001, now);
        gain.gain.linearRampToValueAtTime(peak, now + 0.12);
        gain.gain.setValueAtTime(peak, now + 0.95);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + 1.30);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(now);
        osc.stop(now + 1.32);
        registerActive(osc);
      });
      return;
    }

    // 12. CHURCH BELL
    if (toneType === 'church_bell') {
      [0.0, 0.68].forEach(strike => {
        [261.63, 523.25, 622.25, 783.99, 1046.5].forEach((freq, idx) => {
          const osc = audioCtx.createOscillator();
          const gain = audioCtx.createGain();
          osc.type = 'sine';
          osc.frequency.setValueAtTime(freq, now + strike);

          const peak = (0.30 / (idx + 1)) * vol;
          gain.gain.setValueAtTime(0.001, now + strike);
          gain.gain.linearRampToValueAtTime(peak, now + strike + 0.008);
          gain.gain.exponentialRampToValueAtTime(0.0001, now + strike + 0.64);

          osc.connect(gain);
          gain.connect(targetDest);
          osc.start(now + strike);
          osc.stop(now + strike + 0.66);
          registerActive(osc);
        });
      });
      return;
    }

    // 13. RHYTHMIC WOOD MARIMBA
    if (toneType === 'marimba_apple') {
      const marimba = [
        { f: 523.25, t: 0.00 },
        { f: 659.25, t: 0.13 },
        { f: 783.99, t: 0.26 },
        { f: 1046.5, t: 0.39 },
        { f: 783.99, t: 0.52 },
        { f: 1046.5, t: 0.65 },
        { f: 1318.5, t: 0.78 }
      ];
      marimba.forEach(n => {
        const osc = audioCtx.createOscillator();
        const harm = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sine';
        harm.type = 'sine';
        osc.frequency.setValueAtTime(n.f, now + n.t);
        harm.frequency.setValueAtTime(n.f * 4, now + n.t);

        gain.gain.setValueAtTime(0.001, now + n.t);
        gain.gain.linearRampToValueAtTime(0.32 * vol, now + n.t + 0.006);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + n.t + 0.22);

        osc.connect(gain);
        harm.connect(gain);
        gain.connect(targetDest);
        osc.start(now + n.t);
        harm.start(now + n.t);
        osc.stop(now + n.t + 0.24);
        harm.stop(now + n.t + 0.24);
        registerActive(osc);
        registerActive(harm);
      });
      return;
    }

    // 14. CYBER PULSE
    if (toneType === 'cyber_pulse') {
      for (let i = 0; i < 6; i++) {
        const t = now + i * 0.18;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(1600, t);
        osc.frequency.exponentialRampToValueAtTime(320, t + 0.15);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.28 * vol, t + 0.01);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.16);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(t);
        osc.stop(t + 0.17);
        registerActive(osc);
      }
      return;
    }

    // 15. SUBMARINE KLAXON HORN
    if (toneType === 'sub_nuclear') {
      [0.0, 0.62].forEach(offset => {
        const osc = audioCtx.createOscillator();
        const sub = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'sawtooth';
        sub.type = 'square';

        osc.frequency.setValueAtTime(380, now + offset);
        osc.frequency.exponentialRampToValueAtTime(890, now + offset + 0.22);
        osc.frequency.exponentialRampToValueAtTime(310, now + offset + 0.54);

        sub.frequency.setValueAtTime(190, now + offset);
        sub.frequency.exponentialRampToValueAtTime(445, now + offset + 0.22);
        sub.frequency.exponentialRampToValueAtTime(155, now + offset + 0.54);

        gain.gain.setValueAtTime(0.001, now + offset);
        gain.gain.linearRampToValueAtTime(0.30 * vol, now + offset + 0.03);
        gain.gain.exponentialRampToValueAtTime(0.0001, now + offset + 0.56);

        osc.connect(gain);
        sub.connect(gain);
        gain.connect(targetDest);
        osc.start(now + offset);
        sub.start(now + offset);
        osc.stop(now + offset + 0.58);
        sub.stop(now + offset + 0.58);
        registerActive(osc);
        registerActive(sub);
      });
      return;
    }

    // 16. ZEN HARP GLISSANDO
    if (toneType === 'zen_harp') {
      const pentatonic = [523.25, 587.33, 659.25, 783.99, 880.00, 1046.50, 1174.66, 1318.51];
      pentatonic.forEach((freq, idx) => {
        const t = now + idx * 0.11;
        const osc = audioCtx.createOscillator();
        const gain = audioCtx.createGain();
        osc.type = 'triangle';
        osc.frequency.setValueAtTime(freq, t);

        gain.gain.setValueAtTime(0.001, t);
        gain.gain.linearRampToValueAtTime(0.25 * vol, t + 0.015);
        gain.gain.exponentialRampToValueAtTime(0.0001, t + 0.48);

        osc.connect(gain);
        gain.connect(targetDest);
        osc.start(t);
        osc.stop(t + 0.50);
        registerActive(osc);
      });
      return;
    }

    // 17-20. COSMIC, PIANO, ENERGETIC, CHIME
    const notesMap = {
      cosmic: [523.25, 659.25, 783.99, 1046.5],
      piano: [440, 554.37, 659.25, 880],
      energetic: [587.33, 783.99, 987.77, 1174.66],
      chime: [392.00, 493.88, 587.33, 783.99]
    };
    const notes = notesMap[toneType] || [523.25, 659.25, 783.99];

    notes.forEach((freq, idx) => {
      const osc = audioCtx.createOscillator();
      const gain = audioCtx.createGain();
      osc.type = toneType === 'energetic' ? 'sawtooth' : 'triangle';
      osc.frequency.setValueAtTime(freq, now + idx * 0.14);

      gain.gain.setValueAtTime(0.001, now + idx * 0.14);
      gain.gain.exponentialRampToValueAtTime(0.28 * vol, now + idx * 0.14 + 0.03);
      gain.gain.exponentialRampToValueAtTime(0.0001, now + idx * 0.14 + 0.45);

      osc.connect(gain);
      gain.connect(targetDest);
      osc.start(now + idx * 0.14);
      osc.stop(now + idx * 0.14 + 0.48);
      registerActive(osc);
    });
  } catch (err) {
    console.warn('Audio playback error:', err);
  }
}

export function startContinuousAlarm(toneKey, volume = 0.9) {
  stopContinuousAlarm();
  playAlarmTone(toneKey, volume);
  alarmRingingLoop = setInterval(() => {
    playAlarmTone(toneKey, volume);
  }, 1450);
}

export function stopContinuousAlarm() {
  if (alarmRingingLoop) {
    clearInterval(alarmRingingLoop);
    alarmRingingLoop = null;
  }
  stopAllActiveSounds();
}

// UI Feedback sound
export function playFeedbackTone(type = 'click') {
  try {
    initAudio();
    if (!audioCtx) return;
    const now = audioCtx.currentTime;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();

    if (type === 'click') {
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, now);
      osc.frequency.exponentialRampToValueAtTime(400, now + 0.04);
      gain.gain.setValueAtTime(0.08, now);
      gain.gain.exponentialRampToValueAtTime(0.001, now + 0.04);
      osc.connect(gain);
      gain.connect(audioCtx.destination);
      osc.start(now);
      osc.stop(now + 0.045);
    } else if (type === 'success') {
      [523.25, 659.25, 783.99].forEach((f, i) => {
        const o = audioCtx.createOscillator();
        const g = audioCtx.createGain();
        o.type = 'triangle';
        o.frequency.setValueAtTime(f, now + i * 0.07);
        g.gain.setValueAtTime(0.12, now + i * 0.07);
        g.gain.exponentialRampToValueAtTime(0.001, now + i * 0.07 + 0.15);
        o.connect(g);
        g.connect(audioCtx.destination);
        o.start(now + i * 0.07);
        o.stop(now + i * 0.07 + 0.16);
      });
    }
  } catch (e) {}
}
