'use strict';
// ============================================================
// particles.js — Canvas 粒子特效系统
// ============================================================
const Particles = (() => {
  const canvas = document.getElementById('particle-canvas');
  const ctx = canvas.getContext('2d');
  let ps = [];
  let raf = null;

  function resize() {
    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
  }
  resize();
  window.addEventListener('resize', resize);

  function pick(arr) { return arr[Math.floor(Math.random() * arr.length)]; }

  function addParticle(x, y, opts) {
    const angle = opts.angle ?? Math.random() * Math.PI * 2;
    const spd   = opts.spd   ?? (Math.random() * 3 + 1);
    ps.push({
      x, y,
      vx: Math.cos(angle) * spd,
      vy: Math.sin(angle) * spd - (opts.up ?? 0),
      r:     opts.r     ?? (Math.random() * 3 + 1.5),
      color: opts.color ?? '#ffffff',
      alpha: 1,
      decay: opts.decay ?? (Math.random() * 0.015 + 0.012),
      grav:  opts.grav  ?? 0.1,
    });
  }

  function tick() {
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ps = ps.filter(p => p.alpha > 0.02);
    for (const p of ps) {
      p.x  += p.vx;
      p.y  += p.vy;
      p.vy += p.grav;
      p.alpha -= p.decay;
      ctx.save();
      ctx.globalAlpha = Math.max(0, p.alpha);
      ctx.fillStyle   = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
    raf = ps.length > 0 ? requestAnimationFrame(tick) : null;
  }

  function go() { if (!raf) raf = requestAnimationFrame(tick); }

  function burst(x, y, n, colors, opts = {}) {
    for (let i = 0; i < n; i++) {
      addParticle(x, y, {
        color: pick(colors),
        spd:   Math.random() * (opts.maxSpd ?? 5) + (opts.minSpd ?? 1),
        r:     Math.random() * (opts.maxR   ?? 4) + (opts.minR   ?? 1.5),
        decay: opts.decay ?? (Math.random() * 0.015 + 0.012),
        grav:  opts.grav  ?? 0.1,
        up:    opts.up    ?? 0,
      });
    }
    go();
  }

  function getCenter(id) {
    const el = document.getElementById(id);
    if (!el) return { x: window.innerWidth / 2, y: window.innerHeight / 2 };
    const r = el.getBoundingClientRect();
    return { x: r.left + r.width / 2, y: r.top + r.height / 2 };
  }

  return {
    // 升级：金色爆炸
    levelUp(id) {
      const { x, y } = getCenter(id);
      burst(x, y, 70, ['#ffd700', '#ffec80', '#ffffff', '#c8a000', '#ffe566'], {
        maxSpd: 9, minSpd: 2, maxR: 6, minR: 2, decay: 0.011, grav: 0.15, up: 2.5,
      });
    },
    // 装备拾取：紫色星光
    equipPickup(id) {
      const { x, y } = getCenter(id);
      burst(x, y, 45, ['#c050ff', '#e080ff', '#ffd700', '#ffffff', '#9030cc'], {
        maxSpd: 7, minSpd: 1.5, maxR: 5, minR: 1.5, decay: 0.015, grav: 0.07, up: 1.5,
      });
    },
    // 暴击：橙色爆发
    critHit(id) {
      const { x, y } = getCenter(id);
      burst(x, y, 30, ['#ff9900', '#ff6600', '#ffcc00', '#ff4400'], {
        maxSpd: 6, minSpd: 2, maxR: 4, minR: 1, decay: 0.025, grav: 0.05,
      });
    },
    // 怪物死亡：血色消散
    monsterDie(id) {
      const { x, y } = getCenter(id);
      burst(x, y, 40, ['#ff3333', '#cc0000', '#ff6666', '#880000', '#ff9966'], {
        maxSpd: 7, minSpd: 1, maxR: 5, minR: 2, decay: 0.013, grav: 0.12,
      });
    },
    // 受伤：小红点
    playerHit(id) {
      const { x, y } = getCenter(id);
      burst(x, y, 15, ['#ff4444', '#cc2222', '#ff8888'], {
        maxSpd: 4, minSpd: 1, maxR: 3, minR: 1, decay: 0.03, grav: 0.08,
      });
    },
  };
})();
