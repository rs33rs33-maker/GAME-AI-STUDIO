
// Simple procedural audio synthesizer using Web Audio API
// No external assets required

let audioCtx: AudioContext | null = null;
let musicNodes: AudioScheduledSourceNode[] = [];
let isMuted = false;

const initAudio = () => {
  if (!audioCtx) {
    audioCtx = new (window.AudioContext || (window as any).webkitAudioContext)();
  }
  if (audioCtx.state === 'suspended') {
    audioCtx.resume();
  }
};

// --- Sound Effects ---

export const playShootSfx = () => {
  if (!audioCtx || isMuted) return;
  
  const osc = audioCtx.createOscillator();
  const gain = audioCtx.createGain();

  osc.connect(gain);
  gain.connect(audioCtx.destination);

  osc.type = 'square';
  osc.frequency.setValueAtTime(880, audioCtx.currentTime);
  osc.frequency.exponentialRampToValueAtTime(110, audioCtx.currentTime + 0.1);

  gain.gain.setValueAtTime(0.1, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.1);

  osc.start();
  osc.stop(audioCtx.currentTime + 0.1);
};

export const playExplosionSfx = () => {
  if (!audioCtx || isMuted) return;

  const bufferSize = audioCtx.sampleRate * 0.5; // 0.5 seconds
  const buffer = audioCtx.createBuffer(1, bufferSize, audioCtx.sampleRate);
  const data = buffer.getChannelData(0);

  for (let i = 0; i < bufferSize; i++) {
    data[i] = Math.random() * 2 - 1;
  }

  const noise = audioCtx.createBufferSource();
  noise.buffer = buffer;

  const gain = audioCtx.createGain();
  gain.connect(audioCtx.destination);

  gain.gain.setValueAtTime(0.2, audioCtx.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.01, audioCtx.currentTime + 0.5);

  noise.start();
};

// --- Music ---

const playNote = (freq: number, time: number, duration: number) => {
    if (!audioCtx) return;
    const osc = audioCtx.createOscillator();
    const gain = audioCtx.createGain();
    
    osc.type = 'sawtooth';
    osc.frequency.value = freq;
    
    // Lowpass filter for "retro" sound
    const filter = audioCtx.createBiquadFilter();
    filter.type = 'lowpass';
    filter.frequency.value = 1000;

    osc.connect(filter);
    filter.connect(gain);
    gain.connect(audioCtx.destination);

    gain.gain.setValueAtTime(0.05, time);
    gain.gain.exponentialRampToValueAtTime(0.001, time + duration - 0.05);

    osc.start(time);
    osc.stop(time + duration);
    musicNodes.push(osc);
};

let isPlayingMusic = false;
let nextNoteTime = 0;
let noteIndex = 0;
let musicTimer: number | null = null;

// Simple Arpeggio Sequence
const scale = [110, 130.81, 146.83, 164.81, 196, 164.81, 146.83, 130.81]; // Am7ish

const scheduler = () => {
    if (!audioCtx) return;
    const tempo = 120;
    const secondsPerBeat = 60.0 / tempo;
    const lookahead = 25.0; // ms

    while (nextNoteTime < audioCtx.currentTime + 0.1) {
        // Bass note
        playNote(scale[noteIndex % scale.length] / 2, nextNoteTime, secondsPerBeat);
        
        // Lead note (every other beat)
        if (noteIndex % 2 === 0) {
             playNote(scale[(noteIndex + 2) % scale.length] * 2, nextNoteTime, secondsPerBeat / 2);
        }

        nextNoteTime += secondsPerBeat / 2; // Eighth notes
        noteIndex++;
    }
    musicTimer = window.setTimeout(scheduler, lookahead);
};

export const startMusic = () => {
    initAudio();
    if (isPlayingMusic || isMuted) return;
    if (!audioCtx) return;
    
    isPlayingMusic = true;
    nextNoteTime = audioCtx.currentTime + 0.1;
    noteIndex = 0;
    scheduler();
};

export const stopMusic = () => {
    isPlayingMusic = false;
    if (musicTimer) clearTimeout(musicTimer);
    musicNodes.forEach(n => {
        try { n.stop(); } catch(e) {}
    });
    musicNodes = [];
};

export const toggleMute = () => {
    isMuted = !isMuted;
    if (isMuted) stopMusic();
    else startMusic();
    return isMuted;
};
