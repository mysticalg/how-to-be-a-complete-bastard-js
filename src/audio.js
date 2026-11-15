// Native Web Audio arrangement of recovered menu pitch/volume events.
// AY driver is used only by the private extractor. This module schedules musical events.
export class RecoveredAudio {
  constructor(song) {
    this.song = song;
    this.enabled = false;
    this.playingMenu = false;
    this.nodes = [];
    this.timer = null;
  }
  async enable(value) {
    this.enabled = value;
    if (value) {
      this.context ??= new AudioContext();
      await this.context.resume();
      if (this.playingMenu) this.startMenu();
    } else this.stopNodes();
  }
  stopNodes() {
    clearTimeout(this.timer);
    this.timer = null;
    for (const node of this.nodes) {
      try {
        node.stop();
      } catch {}
    }
    this.nodes = [];
  }
  menu(value) {
    this.playingMenu = value;
    if (value && this.enabled) this.startMenu();
    else this.stopNodes();
  }
  startMenu() {
    this.stopNodes();
    const audio = this.context,
      origin = audio.currentTime + 0.03;
    for (let channel = 0; channel < 3; channel++) {
      const osc = audio.createOscillator(),
        gain = audio.createGain();
      osc.type = "square";
      gain.gain.value = 0;
      osc.connect(gain);
      gain.connect(audio.destination);
      osc.start(origin);
      this.nodes.push(osc);
      for (const note of this.song.tracks[channel]) {
        const t = origin + note.start / 50;
        osc.frequency.setValueAtTime(
          Math.min(18000, 1773400 / (16 * Math.max(1, note.period))),
          t,
        );
        gain.gain.setValueAtTime(
          note.toneDisabled
            ? 0
            : Math.pow(10, (((note.volume & 15) - 15) * 1.5) / 20) * 0.025,
          t,
        );
      }
      const loop = this.song.provenance.loop;
      if (loop) {
        const repeat = () => {
          const start = audio.currentTime + 0.02;
          for (const note of this.song.tracks[channel])
            if (note.start >= loop.startFrame) {
              let t = start + (note.start - loop.startFrame) / 50;
              osc.frequency.setValueAtTime(
                Math.min(18000, 1773400 / (16 * Math.max(1, note.period))),
                t,
              );
              gain.gain.setValueAtTime(
                note.toneDisabled
                  ? 0
                  : Math.pow(10, (((note.volume & 15) - 15) * 1.5) / 20) *
                      0.025,
                t,
              );
            }
        };
        this[`repeat${channel}`] = repeat;
      }
    }
    const loop = this.song.provenance.loop;
    if (loop) {
      const next = () => {
        if (!this.enabled || !this.playingMenu) return;
        for (let i = 0; i < 3; i++) this[`repeat${i}`]();
        this.timer = setTimeout(next, loop.lengthFrames * 20);
      };
      this.timer = setTimeout(
        next,
        this.song.provenance.capturedFrames * 20 - 20,
      );
    }
  }
  beep(fart = false) {
    if (!this.enabled) return;
    const audio = this.context,
      delays = Array.from({ length: fart ? 10 : 3 }, (_, i) =>
        Math.max(1, (fart ? 700 : 500) - i * 9),
      );
    const spans = delays.map((n) =>
      Math.round(((26 * n + 80) / 3500000) * audio.sampleRate),
    );
    const buffer = audio.createBuffer(
        1,
        spans.reduce((a, b) => a + b, 0),
        audio.sampleRate,
      ),
      samples = buffer.getChannelData(0);
    let offset = 0;
    for (let i = 0; i < spans.length; i++) {
      samples.fill(i & 1 ? -0.12 : 0.12, offset, offset + spans[i]);
      offset += spans[i];
    }
    const node = audio.createBufferSource();
    node.buffer = buffer;
    node.connect(audio.destination);
    node.start();
  }
}
