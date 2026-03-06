'use strict';
// ============================================================
// audio.js — Web Audio API 合成音效引擎（无需外部文件）
// ============================================================
const Audio = (() => {
  let ctx = null;

  function init() {
    if (!ctx) ctx = new (window.AudioContext || window.webkitAudioContext)();
    if (ctx.state === 'suspended') ctx.resume();
  }

  // 合成音调
  function osc(freq, dur, type = 'sine', vol = 0.25, t = 0) {
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.connect(g); g.connect(ctx.destination);
    o.type = type;
    o.frequency.setValueAtTime(freq, ctx.currentTime + t);
    g.gain.setValueAtTime(vol, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
    o.start(ctx.currentTime + t);
    o.stop(ctx.currentTime + t + dur + 0.05);
  }

  // 合成噪声（用于冲击感）
  function noise(dur, vol = 0.2, freq = 800, t = 0) {
    const buf = ctx.createBuffer(1, Math.ceil(ctx.sampleRate * dur), ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource();
    s.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = 'bandpass'; f.frequency.value = freq;
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, ctx.currentTime + t);
    g.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + t + dur);
    s.connect(f); f.connect(g); g.connect(ctx.destination);
    s.start(ctx.currentTime + t);
    s.stop(ctx.currentTime + t + dur + 0.05);
  }

  return {
    init,
    // 普通攻击：金属划切
    attack()   { init(); noise(0.07, 0.3, 1400); osc(200, 0.1, 'sawtooth', 0.2, 0.04); },
    // 暴击：更强烈
    critical() { init(); noise(0.05, 0.5, 1600); osc(320, 0.12, 'sawtooth', 0.35); osc(580, 0.1, 'sawtooth', 0.25, 0.07); },
    // 受击：低沉冲击
    hit()      { init(); osc(90, 0.25, 'sawtooth', 0.3); noise(0.12, 0.28, 450, 0.02); },
    // 防御：金属格挡
    defend()   { init(); osc(350, 0.1, 'triangle', 0.28); osc(500, 0.08, 'triangle', 0.18, 0.07); },
    // 回血：上升音阶
    heal()     { init(); [523, 659, 784].forEach((f, i) => osc(f, 0.2, 'sine', 0.22, i * 0.1)); },
    // 装备拾取：琶音钟声
    equip()    { init(); [880, 1109, 1319, 1760].forEach((f, i) => osc(f, 0.18, 'sine', 0.22, i * 0.09)); },
    // 升级：胜利号角
    levelUp()  {
      init();
      [523, 659, 784, 1047].forEach((f, i) => osc(f, 0.3, 'sine', 0.3, i * 0.13));
      setTimeout(() => { osc(1047, 0.6, 'sine', 0.38); osc(1319, 0.5, 'sine', 0.28, 0.1); }, 550);
    },
    // 死亡：下行哀鸣
    death()    { init(); [220, 196, 174, 147].forEach((f, i) => osc(f, 0.45, 'sawtooth', 0.22, i * 0.18)); },
    // 宝箱：魔法闪光
    treasure() { init(); [1047, 1175, 1319, 1480, 1568].forEach((f, i) => osc(f, 0.12, 'sine', 0.2, i * 0.07)); },
    // 怪物死亡：低频爆裂
    monDie()   { init(); noise(0.1, 0.38, 600); osc(120, 0.4, 'sawtooth', 0.22, 0.07); },
    // 通关胜利：凯旋曲
    victory()  {
      init();
      [523, 523, 784, 784, 880, 880, 784].forEach((f, i) => osc(f, 0.35, 'sine', 0.3, i * 0.22));
    },
    // 商人：轻快提示
    shop()     { init(); [659, 784, 659].forEach((f, i) => osc(f, 0.1, 'sine', 0.18, i * 0.08)); },
  };
})();
