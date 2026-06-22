import { useRef, useEffect, useCallback } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const KEYS = ['C', 'G', 'D', 'A', 'E', 'B', 'Gb', 'Db', 'Ab', 'Eb', 'Bb', 'F'];
const SHARP_MAP = { 'C#': 'Db', 'D#': 'Eb', 'F#': 'Gb', 'G#': 'Ab', 'A#': 'Bb' };
const MODE_COLORS = {
  dorian: [255, 200, 60],
  blues: [180, 100, 255],
  minor: [255, 120, 120],
  major: [80, 200, 160],
  pentatonic: [255, 160, 60],
};

export default function CircleOfFifths({ data }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const positionsRef = useRef([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap || !data) return;

    const predictions = data?.predictions || [];

    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;
    const cx = w / 2;
    const cy = h / 2;
    const maxR = Math.min(cx, cy) - 36;

    // Background
    ctx.fillStyle = '#040b14';
    ctx.fillRect(0, 0, w, h);

    // Concentric guide circles
    [2, 4, 6, 8, 10].forEach(rat => {
      const r = maxR * (1 - (rat - 1) / 10);
      ctx.beginPath();
      ctx.arc(cx, cy, r, 0, Math.PI * 2);
      ctx.strokeStyle = 'rgba(74,158,255,0.08)';
      ctx.lineWidth = 1;
      ctx.stroke();
      if (rat === 10) {
        ctx.fillStyle = 'rgba(74,158,255,0.2)';
        ctx.font = '9px Inter,sans-serif';
        ctx.textAlign = 'right';
        ctx.fillText('10', cx - r - 5, cy + 3);
      }
    });

    // Key labels and spoke lines
    ctx.font = 'bold 12px Inter,sans-serif';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    KEYS.forEach((k, i) => {
      const a = (i / 12) * Math.PI * 2 - Math.PI / 2;
      ctx.fillStyle = 'rgba(180,210,255,0.55)';
      ctx.fillText(k, cx + (maxR + 20) * Math.cos(a), cy + (maxR + 20) * Math.sin(a));
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.lineTo(cx + maxR * Math.cos(a), cy + maxR * Math.sin(a));
      ctx.strokeStyle = 'rgba(74,158,255,0.05)';
      ctx.stroke();
    });

    // Plot tracks
    const jitter = {};
    const positions = [];

    predictions.forEach(p => {
      if (!p.key) return;
      const root = p.key.replace(/m$/, '');
      const norm = SHARP_MAP[root] || root;
      const ki = KEYS.indexOf(norm);
      if (ki < 0) return;

      jitter[ki] = (jitter[ki] || 0) + 1;
      const ang = (ki / 12) * Math.PI * 2 - Math.PI / 2 + (jitter[ki] - 1) * 0.09 - 0.15;
      const rat = p.actual || 5;
      const r = maxR * (1 - (rat - 1) / 10);
      const px = cx + r * Math.cos(ang);
      const py = cy + r * Math.sin(ang);
      const dr = 3 + (rat / 10) * 5;
      const [cr, cg, cb] = MODE_COLORS[p.mode] || MODE_COLORS.major;
      const br = 0.4 + (rat / 10) * 0.6;

      // Glow
      const grad = ctx.createRadialGradient(px, py, 0, px, py, dr * 2.5);
      grad.addColorStop(0, `rgba(${cr},${cg},${cb},${br * 0.35})`);
      grad.addColorStop(1, `rgba(${cr},${cg},${cb},0)`);
      ctx.beginPath();
      ctx.arc(px, py, dr * 2.5, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core dot
      ctx.beginPath();
      ctx.arc(px, py, dr, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${cr},${cg},${cb},${br})`;
      ctx.fill();

      positions.push({ x: px, y: py, r: dr, title: p.title, artist: p.artist, rating: rat, key: p.key, mode: p.mode });
    });
    positionsRef.current = positions;

    // Legend
    ctx.font = '9px Inter,sans-serif';
    ctx.textAlign = 'left';
    let ly = 14;
    Object.entries(MODE_COLORS).forEach(([m, [r, g, b]]) => {
      ctx.beginPath();
      ctx.arc(12, ly, 4, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},0.8)`;
      ctx.fill();
      ctx.fillStyle = 'rgba(180,210,255,0.5)';
      ctx.fillText(m, 22, ly + 3);
      ly += 15;
    });
  }, [data]);

  useEffect(() => {
    draw();
    window.addEventListener('resize', draw);
    return () => window.removeEventListener('resize', draw);
  }, [draw]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const tip = tipRef.current;
    if (!canvas || !tip) return;

    const wrap = canvas.parentElement;

    const handleMove = (e) => {
      const rect = canvas.getBoundingClientRect();
      const mx = e.clientX - rect.left;
      const my = e.clientY - rect.top;
      const positions = positionsRef.current;
      const found = positions.find(p => (mx - p.x) ** 2 + (my - p.y) ** 2 < (p.r + 7) ** 2);

      if (found) {
        const w = wrap.clientWidth;
        tip.style.display = 'block';
        tip.style.left = Math.min(found.x + 14, w - 200) + 'px';
        tip.style.top = (found.y - 10) + 'px';
        tip.innerHTML = `<strong>${found.title}</strong><br>${found.artist} — ${found.rating}/10<br>${found.key} ${found.mode}`;
      } else {
        tip.style.display = 'none';
      }
    };

    const handleLeave = () => {
      tip.style.display = 'none';
    };

    canvas.addEventListener('mousemove', handleMove);
    canvas.addEventListener('mouseleave', handleLeave);
    return () => {
      canvas.removeEventListener('mousemove', handleMove);
      canvas.removeEventListener('mouseleave', handleLeave);
    };
  }, []);

  if (!data) return null;

  return (
    <Panel id="cof-panel" span={6}>
      <PanelHeader title="Circle of Fifths" note="Track keys mapped to the circle — closer to center = higher rating" />
      <p className="panel-desc">
        Each track is plotted on the <strong>circle of fifths</strong> by its <code>key</code> field. <strong>Angular position</strong> = root key (C, G, D, A, E, B, Gb, Db, Ab, Eb, Bb, F going clockwise). <strong>Distance from center</strong> = your rating, inverted: tracks closer to the center scored higher. <strong>Color</strong> = musical mode: yellow = Dorian, purple = blues, red = minor, green = major, orange = pentatonic.
      </p>
      <div className="constellation-wrap" style={{ position: 'relative', height: 380 }}>
        <canvas ref={canvasRef} style={{ cursor: 'crosshair' }} />
        <div ref={tipRef} className="constellation-tip" style={{ display: 'none' }} />
      </div>
    </Panel>
  );
}
