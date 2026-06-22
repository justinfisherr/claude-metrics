import { useRef, useEffect, useCallback } from 'react';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const STAR_COLORS = [
  [74, 158, 255],
  [255, 130, 110],
  [100, 220, 150],
  [255, 200, 70],
];

export default function Constellation({ data }) {
  const canvasRef = useRef(null);
  const tipRef = useRef(null);
  const positionsRef = useRef([]);

  const draw = useCallback(() => {
    const canvas = canvasRef.current;
    const wrap = canvas?.parentElement;
    if (!canvas || !wrap || !data) return;

    const predictions = data?.predictions || [];
    if (!predictions.length) return;

    const dpr = window.devicePixelRatio || 1;
    canvas.width = wrap.clientWidth * dpr;
    canvas.height = wrap.clientHeight * dpr;
    canvas.style.width = wrap.clientWidth + 'px';
    canvas.style.height = wrap.clientHeight + 'px';
    const ctx = canvas.getContext('2d');
    ctx.scale(dpr, dpr);
    const w = wrap.clientWidth;
    const h = wrap.clientHeight;

    // Background
    ctx.fillStyle = '#040b14';
    ctx.fillRect(0, 0, w, h);

    // Background stars
    for (let i = 0; i < 150; i++) {
      ctx.beginPath();
      ctx.arc(Math.random() * w, Math.random() * h, Math.random() * 1.1, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(180,210,255,${Math.random() * 0.25 + 0.05})`;
      ctx.fill();
    }

    // PCA mapping
    const xs = predictions.map(p => p.pca_x);
    const ys = predictions.map(p => p.pca_y);
    const xMin = Math.min(...xs), xMax = Math.max(...xs);
    const yMin = Math.min(...ys), yMax = Math.max(...ys);
    const pad = 55;

    const positions = predictions.map(p => ({
      x: pad + ((p.pca_x - xMin) / (xMax - xMin || 1)) * (w - 2 * pad),
      y: pad + ((p.pca_y - yMin) / (yMax - yMin || 1)) * (h - 2 * pad),
      r: 2 + (p.actual / 10) * 7,
      rating: p.actual,
      title: p.title,
      artist: p.artist,
      cluster: p.cluster,
    }));
    positionsRef.current = positions;

    // Group by artist and draw connecting lines
    const groups = {};
    positions.forEach(p => {
      groups[p.artist] = groups[p.artist] || [];
      groups[p.artist].push(p);
    });

    Object.values(groups).forEach(g => {
      if (g.length < 2) return;
      ctx.strokeStyle = 'rgba(74,158,255,0.1)';
      ctx.lineWidth = 0.8;
      ctx.beginPath();
      g.forEach((p, i) => (i === 0 ? ctx.moveTo(p.x, p.y) : ctx.lineTo(p.x, p.y)));
      ctx.stroke();
    });

    // Draw stars
    positions.forEach(p => {
      const [r, g, b] = STAR_COLORS[p.cluster % STAR_COLORS.length];
      const br = 0.3 + (p.rating / 10) * 0.7;

      // Glow
      const grad = ctx.createRadialGradient(p.x, p.y, 0, p.x, p.y, p.r * 3);
      grad.addColorStop(0, `rgba(${r},${g},${b},${br * 0.45})`);
      grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 3, 0, Math.PI * 2);
      ctx.fillStyle = grad;
      ctx.fill();

      // Core
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(${r},${g},${b},${br})`;
      ctx.fill();

      // Highlight
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.r * 0.35, 0, Math.PI * 2);
      ctx.fillStyle = `rgba(255,255,255,${br * 0.7})`;
      ctx.fill();
    });

    // Artist labels for groups with 3+ tracks
    ctx.font = '10px Inter,sans-serif';
    ctx.textAlign = 'center';
    Object.entries(groups).forEach(([name, g]) => {
      if (g.length < 3) return;
      const avgX = g.reduce((s, p) => s + p.x, 0) / g.length;
      const topY = Math.min(...g.map(p => p.y));
      ctx.fillStyle = 'rgba(180,210,255,0.45)';
      ctx.fillText(name, avgX, topY - 16);
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
      const found = positions.find(p => (mx - p.x) ** 2 + (my - p.y) ** 2 < (p.r + 8) ** 2);

      if (found) {
        const w = wrap.clientWidth;
        tip.style.display = 'block';
        tip.style.left = Math.min(found.x + 16, w - 180) + 'px';
        tip.style.top = (found.y - 10) + 'px';
        tip.innerHTML = `<strong>${found.title}</strong><br>${found.artist} — ${found.rating}/10`;
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
    <Panel id="constellation-panel" span={12}>
      <PanelHeader title="Taste Constellation" note="Your jazz universe — brighter stars = higher ratings, lines connect same artist" />
      <p className="panel-desc">
        A PCA scatter rendered as a starfield. <strong>Position</strong> = the same PCA X/Y coordinates used in Taste Clusters — tracks close together sound alike to the model. <strong>Star size and brightness</strong> scale with your rating: your 10/10s are the biggest, brightest stars. <strong>Color</strong> = cluster membership. <strong>Lines</strong> connect tracks by the same artist, so you can see where an artist's catalog scatters across sonic space. Artist name labels appear for artists with 3+ tracks. <strong>Hover</strong> any star to see the track title, artist, and rating.
      </p>
      <div className="constellation-wrap" style={{ position: 'relative' }}>
        <canvas ref={canvasRef} style={{ cursor: 'crosshair' }} />
        <div ref={tipRef} className="constellation-tip" style={{ display: 'none' }} />
      </div>
    </Panel>
  );
}
