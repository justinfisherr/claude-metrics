import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const BASE = import.meta.env.BASE_URL;
const K = 15; // Bayesian smoothing constant — matches train.py k=15

// ─── Utilities ────────────────────────────────────────────────────────────────

function parseNames(kp) {
  return (kp || [])
    .map(s => s.split(' - ')[0].trim())
    .filter(n => n && !n.toLowerCase().includes('ensemble') && !n.toLowerCase().includes('big band'));
}

function pairColor(r) {
  if (r >= 7.5) return '#50c878';
  if (r >= 6.0) return '#87a2c3';
  if (r >= 4.5) return '#ffc832';
  return '#ff6b6b';
}

function confLabel(c) {
  if (c >= 0.6) return { text: 'High', color: '#50c878' };
  if (c >= 0.3) return { text: 'Moderate', color: '#ffc832' };
  return { text: 'Sparse', color: '#ff6b6b' };
}

function sentimentText(bayes, global) {
  const d = bayes - global;
  if (d >= 1.0) return { text: 'Strong positive signal', color: '#50c878' };
  if (d >= 0.0) return { text: 'Slightly above average', color: '#87a2c3' };
  if (d >= -0.8) return { text: 'Neutral / mixed', color: '#ffc832' };
  return { text: 'Below-average pairing', color: '#ff6b6b' };
}

// ─── Sub-components ───────────────────────────────────────────────────────────

function StatRow({ label, value, color, sub }) {
  return (
    <div style={{ marginBottom: '0.5rem' }}>
      <span style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>{label} </span>
      <span style={{ fontSize: '0.9rem', fontWeight: 'bold', color: color || 'var(--text)' }}>{value}</span>
      {sub && <span style={{ fontSize: '0.68rem', color: 'var(--muted)', marginLeft: '0.3rem' }}>{sub}</span>}
    </div>
  );
}

function TrackRow({ track, predLookup }) {
  const lookup = predLookup[`${track.title}|||${track.artist}`] || {};
  return (
    <div style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start',
      padding: '0.45rem 0', borderBottom: '1px solid var(--border-faint)',
      fontSize: '0.75rem', gap: '0.5rem',
    }}>
      <div style={{ minWidth: 0 }}>
        <div style={{ fontWeight: 600, color: 'var(--text)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{track.title}</div>
        <div style={{ color: 'var(--muted)', marginTop: '0.1rem' }}>
          {track.artist}{track.album ? ` · ${track.album}` : ''}{track.year ? ` · ${track.year}` : ''}
          {lookup.mood_zone && <span style={{ marginLeft: '0.3rem', color: '#87a2c3' }}>· {lookup.mood_zone}</span>}
          {lookup.cluster != null && <span style={{ marginLeft: '0.3rem', color: 'var(--muted)' }}>· cluster {lookup.cluster}</span>}
        </div>
      </div>
      <div style={{ flexShrink: 0, fontWeight: 'bold', color: pairColor(track.rating) }}>{track.rating}/10</div>
    </div>
  );
}

function CollabRow({ name, data, onClick }) {
  return (
    <button onClick={onClick} style={{
      display: 'flex', justifyContent: 'space-between', alignItems: 'center',
      width: '100%', padding: '0.3rem 0.5rem', marginBottom: '0.2rem',
      background: 'rgba(93,155,224,0.06)', border: '1px solid var(--border-faint)',
      borderRadius: '0.3rem', cursor: 'pointer', fontSize: '0.75rem', color: 'var(--text)',
      textAlign: 'left',
    }}>
      <span style={{ fontWeight: 600 }}>{name}</span>
      <span style={{ color: pairColor(data.avgRating), fontWeight: 'bold', flexShrink: 0, marginLeft: '0.5rem' }}>
        {data.avgRating.toFixed(1)} · {data.count}T
      </span>
    </button>
  );
}

function HelpPanel({ onClose }) {
  return (
    <div style={{
      position: 'absolute', top: '40px', right: 0, zIndex: 20,
      background: '#0d1c30', border: '1px solid rgba(93,155,224,0.3)',
      borderRadius: '0.5rem', padding: '1rem', width: '260px',
      boxShadow: '0 4px 16px rgba(0,0,0,0.5)', fontSize: '0.75rem', color: '#d7e6f7',
    }}>
      <div style={{ fontWeight: 800, fontSize: '0.7rem', textTransform: 'uppercase', letterSpacing: '0.08em', marginBottom: '0.8rem', color: 'var(--muted)' }}>
        How to read this
      </div>
      {[
        ['○', 'Circle = musician'],
        ['○ size', 'Number of rated tracks you have'],
        ['○ color', 'Bayesian average rating (green = high)'],
        ['─', 'Line = musicians played together on a rated track'],
        ['─ thickness', 'How often they appear together'],
        ['─ color', "How much you like that pairing"],
        ['─ opacity', 'Confidence based on sample size'],
        ['Click once', 'Inspect a musician'],
        ['Click twice', 'Compare two musicians (pair mode)'],
        ['Drag', 'Reposition nodes'],
        ['Scroll', 'Zoom in / out'],
      ].map(([k, v]) => (
        <div key={k} style={{ display: 'flex', gap: '0.6rem', marginBottom: '0.4rem' }}>
          <span style={{ color: '#87a2c3', fontWeight: 700, minWidth: '72px', flexShrink: 0 }}>{k}</span>
          <span style={{ color: 'var(--muted)' }}>{v}</span>
        </div>
      ))}
      <div style={{ borderTop: '1px solid var(--border-faint)', paddingTop: '0.6rem', marginTop: '0.4rem', color: 'var(--muted)', fontStyle: 'italic' }}>
        Stats shown here are dashboard summaries (full sample), not LOO-encoded training values.
      </div>
      <button onClick={onClose} style={{ marginTop: '0.8rem', background: 'none', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.7rem', width: '100%' }}>
        Close
      </button>
    </div>
  );
}

// ─── Main Component ───────────────────────────────────────────────────────────

export default function CollaboratorNetwork({ data }) {
  const svgRef = useRef(null);
  const nodeSelRef = useRef(null);
  const linkSelRef = useRef(null);
  const labelSelRef = useRef(null);
  const simLinksRef = useRef([]);

  const [rawData, setRawData] = useState(null);
  const [selectedIds, setSelectedIds] = useState([]);
  const [tooltip, setTooltip] = useState(null);
  const [search, setSearch] = useState('');
  const [minTracks, setMinTracks] = useState(2);
  const [minPairRating, setMinPairRating] = useState(0);
  const [highConfOnly, setHighConfOnly] = useState(false);
  const [labelMode, setLabelMode] = useState('auto');
  const [vizMode, setVizMode] = useState('taste');
  const [showHelp, setShowHelp] = useState(false);
  const [showExploration, setShowExploration] = useState(false);

  useEffect(() => {
    fetch(`${BASE}training-data.json`).then(r => r.json()).then(setRawData).catch(() => {});
  }, []);

  const predLookup = useMemo(() => {
    const out = {};
    (data?.predictions || []).forEach(p => { out[`${p.title}|||${p.artist}`] = { mood_zone: p.mood_zone, cluster: p.cluster }; });
    return out;
  }, [data]);

  // ── Build full graph data ──────────────────────────────────────────────────
  const { allNodes, allLinks, globalMean } = useMemo(() => {
    if (!rawData) return { allNodes: [], allLinks: [], globalMean: 6 };

    const musicianMap = {};
    const edgeMap = {};
    const allRatings = [];
    const instrumentMap = {};

    rawData.forEach(track => {
      (track.key_players || []).forEach(kp => {
        const parts = kp.split(' - ');
        if (parts.length >= 2) {
          const name = parts[0].trim();
          if (!instrumentMap[name]) instrumentMap[name] = parts.slice(1).join(' - ').trim();
        }
      });

      const rating = track.rating;
      if (rating == null) return;
      allRatings.push(rating);
      const names = parseNames(track.key_players);

      names.forEach(name => {
        if (!musicianMap[name]) musicianMap[name] = [];
        musicianMap[name].push(track);
      });

      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const [a, b] = [names[i], names[j]].sort();
          const key = `${a}|||${b}`;
          if (!edgeMap[key]) edgeMap[key] = { source: a, target: b, tracks: [] };
          edgeMap[key].tracks.push(track);
        }
      }
    });

    const gMean = allRatings.reduce((s, r) => s + r, 0) / allRatings.length;

    const qualified = new Set(
      Object.entries(musicianMap)
        .filter(([, tracks]) => tracks.length >= 2)
        .map(([name]) => name)
    );

    const allNodes = Array.from(qualified).map(name => {
      const tracks = musicianMap[name];
      const n = tracks.length;
      const avg = tracks.reduce((s, t) => s + t.rating, 0) / n;
      const bayes = (n / (n + K)) * avg + (K / (n + K)) * gMean;
      return {
        id: name,
        instrument: instrumentMap[name] || null,
        count: n,
        avgRating: avg,
        bayesRating: bayes,
        confidence: n / (n + K),
        tracks: [...tracks].sort((a, b) => b.rating - a.rating),
      };
    });

    const nodeSet = new Set(allNodes.map(n => n.id));
    const nodeMap = Object.fromEntries(allNodes.map(n => [n.id, n]));

    const allLinks = Object.values(edgeMap)
      .filter(e => nodeSet.has(e.source) && nodeSet.has(e.target))
      .map(e => {
        const tracks = e.tracks;
        const n = tracks.length;
        const avg = tracks.reduce((s, t) => s + t.rating, 0) / n;
        const bayes = (n / (n + K)) * avg + (K / (n + K)) * gMean;
        const conf = n / (n + K);
        const sorted = [...tracks].sort((a, b) => b.rating - a.rating);
        const variance = tracks.reduce((s, t) => s + (t.rating - avg) ** 2, 0) / n;
        const srcNode = nodeMap[e.source];
        const tgtNode = nodeMap[e.target];
        const explorationScore = Math.min(srcNode?.confidence ?? 0, tgtNode?.confidence ?? 0) * (1 - conf) * Math.max(0, bayes - gMean + 2) / 3;
        return {
          source: e.source, target: e.target,
          count: n,
          pairAvgRating: avg,
          pairBayesRating: bayes,
          pairConfidence: conf,
          pairBestTrack: sorted[0],
          pairWorstTrack: sorted[sorted.length - 1],
          pairVariance: variance,
          sharedTracks: sorted,
          explorationScore,
        };
      });

    return { allNodes, allLinks, globalMean: gMean };
  }, [rawData]);

  // ── Apply filters ──────────────────────────────────────────────────────────
  const { filteredNodes, filteredLinks } = useMemo(() => {
    const lc = search.toLowerCase();
    const nodeIds = new Set(
      allNodes
        .filter(n => n.count >= minTracks && (!search || n.id.toLowerCase().includes(lc)))
        .map(n => n.id)
    );

    const filteredLinks = allLinks.filter(l =>
      nodeIds.has(l.source) && nodeIds.has(l.target) &&
      (!highConfOnly || l.pairConfidence >= 0.3) &&
      (minPairRating === 0 || l.pairBayesRating >= minPairRating)
    );

    const connectedIds = new Set(filteredLinks.flatMap(l => [l.source, l.target]));
    const filteredNodes = allNodes.filter(n => nodeIds.has(n.id) && connectedIds.has(n.id));

    return { filteredNodes, filteredLinks };
  }, [allNodes, allLinks, search, minTracks, minPairRating, highConfOnly]);

  // ── Derived selection ──────────────────────────────────────────────────────
  const selectedNodes = useMemo(
    () => selectedIds.map(id => allNodes.find(n => n.id === id)).filter(Boolean),
    [selectedIds, allNodes]
  );

  const pairEdge = useMemo(() => {
    if (selectedIds.length !== 2) return null;
    const [a, b] = selectedIds;
    return allLinks.find(l =>
      (l.source === a && l.target === b) || (l.source === b && l.target === a)
    ) ?? null;
  }, [selectedIds, allLinks]);

  // ── D3 Simulation ──────────────────────────────────────────────────────────
  useEffect(() => {
    if (!filteredNodes.length || !svgRef.current) return;

    const el = svgRef.current;
    const svg = d3.select(el);
    svg.selectAll('*').remove();

    const W = el.clientWidth || 900;
    const H = 520;

    const rScale = d3.scaleSqrt().domain([2, d3.max(filteredNodes, d => d.count) || 2]).range([5, 20]);
    const lwScale = d3.scaleLinear().domain([1, d3.max(filteredLinks, d => d.count) || 1]).range([0.8, 4]);

    const g = svg.append('g');
    svg.call(d3.zoom().scaleExtent([0.2, 4]).on('zoom', e => g.attr('transform', e.transform)));

    const linkData = filteredLinks.map(l => ({ ...l }));
    const nodeData = filteredNodes.map(n => ({ ...n }));
    simLinksRef.current = linkData;

    function edgeColor(l) {
      if (vizMode === 'historical') return '#87a2c3';
      if (vizMode === 'gaps') {
        return l.explorationScore > 0.15 ? '#a78bfa' : 'rgba(93,155,224,0.2)';
      }
      return pairColor(l.pairBayesRating);
    }

    function edgeOpacity(l) {
      if (vizMode === 'gaps') return l.explorationScore > 0.15 ? 0.7 : 0.1;
      return Math.max(0.12, l.pairConfidence * 0.7);
    }

    const sim = d3.forceSimulation(nodeData)
      .force('link', d3.forceLink(linkData).id(d => d.id)
        .distance(l => vizMode === 'historical' ? 50 + l.count * 2 : 60 + (8 - Math.min(l.pairBayesRating, 8)) * 5))
      .force('charge', d3.forceManyBody().strength(-160))
      .force('center', d3.forceCenter(W / 2, H / 2))
      .force('collide', d3.forceCollide().radius(d => rScale(d.count) + 5));

    const link = g.append('g').selectAll('line')
      .data(linkData).join('line')
      .attr('stroke', edgeColor)
      .attr('stroke-opacity', edgeOpacity)
      .attr('stroke-width', l => vizMode === 'historical' ? lwScale(l.count) : Math.max(0.8, l.pairConfidence * 3));

    const node = g.append('g').selectAll('circle')
      .data(nodeData).join('circle')
      .attr('r', d => rScale(d.count))
      .attr('fill', d => pairColor(d.bayesRating))
      .attr('fill-opacity', 0.82)
      .attr('stroke', d => pairColor(d.bayesRating))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (e, d) => { if (!e.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (e, d) => { d.fx = e.x; d.fy = e.y; })
        .on('end', (e, d) => { if (!e.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('mouseover', (e, d) => setTooltip({ x: e.offsetX, y: e.offsetY, node: d }))
      .on('mousemove', e => setTooltip(p => p ? { ...p, x: e.offsetX, y: e.offsetY } : null))
      .on('mouseout', () => setTooltip(null))
      .on('click', (e, d) => {
        e.stopPropagation();
        setSelectedIds(prev => {
          if (prev.length === 0) return [d.id];
          if (prev.length === 1) return prev[0] === d.id ? [] : [prev[0], d.id];
          return [d.id];
        });
      });

    const showLabel = d => labelMode === 'always' || (labelMode === 'auto' && d.count >= 5);
    const label = g.append('g').selectAll('text')
      .data(nodeData).join('text')
      .text(d => d.id.split(' ').slice(-1)[0])
      .attr('font-size', d => Math.min(11, Math.max(7, rScale(d.count) * 0.7)))
      .attr('fill', '#d7e6f7')
      .attr('fill-opacity', d => showLabel(d) ? 0.85 : 0)
      .attr('text-anchor', 'middle')
      .attr('dy', d => rScale(d.count) + 10)
      .style('pointer-events', 'none')
      .style('font-family', 'monospace');

    svg.on('click', () => setSelectedIds([]));

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
      label.attr('x', d => d.x).attr('y', d => d.y);
    });

    nodeSelRef.current = node;
    linkSelRef.current = link;
    labelSelRef.current = label;

    return () => sim.stop();
  }, [filteredNodes, filteredLinks, vizMode, labelMode]);

  // ── Highlight Effect ───────────────────────────────────────────────────────
  useEffect(() => {
    const nodeSel = nodeSelRef.current;
    const linkSel = linkSelRef.current;
    const labelSel = labelSelRef.current;
    if (!nodeSel || !linkSel) return;

    const sl = simLinksRef.current;

    if (selectedIds.length === 0) {
      nodeSel.attr('fill-opacity', 0.82).attr('stroke-opacity', 0.5).attr('r', d => {
        const rScale = d3.scaleSqrt().domain([2, 20]).range([5, 20]);
        return rScale(d.count);
      });
      linkSel.attr('stroke-opacity', l => Math.max(0.12, l.pairConfidence * 0.7));
      if (labelSel) labelSel.attr('fill-opacity', d => (labelMode === 'always' || (labelMode === 'auto' && d.count >= 5)) ? 0.85 : 0);
      return;
    }

    if (selectedIds.length === 1) {
      const sid = selectedIds[0];
      const connectedIds = new Set(
        sl.filter(l => l.source.id === sid || l.target.id === sid)
          .flatMap(l => [l.source.id, l.target.id])
      );
      nodeSel
        .attr('fill-opacity', d => d.id === sid ? 1 : connectedIds.has(d.id) ? 0.75 : 0.15)
        .attr('stroke-opacity', d => d.id === sid ? 1 : connectedIds.has(d.id) ? 0.6 : 0.1)
        .attr('stroke-width', d => d.id === sid ? 3 : 1.5);
      linkSel.attr('stroke-opacity', l => (l.source.id === sid || l.target.id === sid) ? Math.max(0.3, l.pairConfidence * 0.85) : 0.04);
      if (labelSel) labelSel.attr('fill-opacity', d => {
        if (labelMode === 'hide') return 0;
        if (labelMode === 'always') return 0.85;
        return d.id === sid || connectedIds.has(d.id) ? 0.9 : 0;
      });
      return;
    }

    if (selectedIds.length === 2) {
      const [a, b] = selectedIds;
      nodeSel
        .attr('fill-opacity', d => (d.id === a || d.id === b) ? 1 : 0.12)
        .attr('stroke-opacity', d => (d.id === a || d.id === b) ? 1 : 0.06)
        .attr('stroke-width', d => (d.id === a || d.id === b) ? 3 : 1.5);
      linkSel.attr('stroke-opacity', l => {
        const isEdge = (l.source.id === a && l.target.id === b) || (l.source.id === b && l.target.id === a);
        return isEdge ? 0.9 : 0.04;
      });
      if (labelSel) labelSel.attr('fill-opacity', d => (d.id === a || d.id === b) ? 0.95 : 0);
    }
  }, [selectedIds, labelMode]);

  // ── Exploration candidates ─────────────────────────────────────────────────
  const explorationCandidates = useMemo(() => {
    if (selectedNodes.length !== 1) return null;
    const node = selectedNodes[0];
    const connectedIds = new Set(
      allLinks
        .filter(l => l.source === node.id || l.target === node.id)
        .flatMap(l => [l.source, l.target])
    );
    connectedIds.delete(node.id);

    // Second-degree nodes (connected to connections, not yet connected to selected)
    const secondDegree = allNodes.filter(n => {
      if (n.id === node.id || connectedIds.has(n.id)) return false;
      return allLinks.some(l =>
        (l.source === n.id && connectedIds.has(l.target)) ||
        (l.target === n.id && connectedIds.has(l.source))
      );
    }).sort((a, b) => b.bayesRating - a.bayesRating).slice(0, 5);

    // Underconfident direct pairings (heard together but need more data)
    const weakPairs = allLinks
      .filter(l => (l.source === node.id || l.target === node.id) && l.pairConfidence < 0.3)
      .sort((a, b) => b.pairBayesRating - a.pairBayesRating)
      .slice(0, 3);

    // Eras this musician hasn't been heard in
    const heardEras = new Set(node.tracks.map(t => t.era).filter(Boolean));
    const allEras = new Set(rawData?.map(t => t.era).filter(Boolean) || []);
    const missingEras = [...allEras].filter(e => !heardEras.has(e));

    return { secondDegree, weakPairs, missingEras, connectedIds };
  }, [selectedNodes, allNodes, allLinks, rawData]);

  // ── Render ─────────────────────────────────────────────────────────────────
  return (
    <Panel id="collaborator-network-panel" span={12}>
      <PanelHeader title="Collaborator Network" note="Your personal taste map of musician relationships" />

      {/* Filter Bar */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '0.8rem', alignItems: 'center' }}>
        <input
          value={search} onChange={e => setSearch(e.target.value)}
          placeholder="Search musician…"
          style={{
            background: 'rgba(93,155,224,0.06)', border: '1px solid var(--border-faint)',
            borderRadius: '0.3rem', color: 'var(--text)', padding: '0.3rem 0.6rem',
            fontSize: '0.75rem', width: '160px',
          }}
        />
        <select value={minTracks} onChange={e => setMinTracks(+e.target.value)}
          style={{ background: '#0d1c30', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}>
          {[2, 3, 5, 8].map(v => <option key={v} value={v}>≥{v} tracks</option>)}
        </select>
        <select value={minPairRating} onChange={e => setMinPairRating(+e.target.value)}
          style={{ background: '#0d1c30', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}>
          <option value={0}>Any pair rating</option>
          <option value={5}>Pair ≥5.0</option>
          <option value={6}>Pair ≥6.0</option>
          <option value={7}>Pair ≥7.0</option>
        </select>
        <label style={{ display: 'flex', alignItems: 'center', gap: '0.3rem', fontSize: '0.72rem', color: 'var(--muted)', cursor: 'pointer' }}>
          <input type="checkbox" checked={highConfOnly} onChange={e => setHighConfOnly(e.target.checked)} />
          High-conf only
        </label>
        <select value={labelMode} onChange={e => setLabelMode(e.target.value)}
          style={{ background: '#0d1c30', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}>
          <option value="auto">Labels: auto</option>
          <option value="always">Labels: always</option>
          <option value="hide">Labels: hide</option>
        </select>
        <select value={vizMode} onChange={e => setVizMode(e.target.value)}
          style={{ background: '#0d1c30', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', padding: '0.3rem 0.5rem', fontSize: '0.72rem' }}>
          <option value="taste">Personal taste</option>
          <option value="historical">Historical (co-appearances)</option>
          <option value="gaps">Exploration gaps</option>
        </select>
        <div style={{ marginLeft: 'auto', position: 'relative' }}>
          <button onClick={() => setShowHelp(v => !v)}
            style={{ background: 'rgba(93,155,224,0.1)', border: '1px solid var(--border-faint)', borderRadius: '50%', width: '24px', height: '24px', color: '#87a2c3', cursor: 'pointer', fontSize: '0.8rem', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            ?
          </button>
          {showHelp && <HelpPanel onClose={() => setShowHelp(false)} />}
        </div>
      </div>

      {/* Color legend */}
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '1rem', marginBottom: '0.6rem', fontSize: '0.68rem', color: 'var(--muted)' }}>
        {vizMode === 'gaps' ? (
          <>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 3, background: '#a78bfa', display: 'inline-block', borderRadius: 2 }} /> High exploration value
            </span>
            <span style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 10, height: 3, background: 'rgba(93,155,224,0.3)', display: 'inline-block', borderRadius: 2 }} /> Low exploration value
            </span>
          </>
        ) : (
          [['≥7.5', '#50c878'], ['6–7.5', '#87a2c3'], ['4.5–6', '#ffc832'], ['<4.5', '#ff6b6b']].map(([label, color]) => (
            <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
              <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} /> {label}
            </span>
          ))
        )}
        <span style={{ color: 'rgba(93,155,224,0.5)' }}>
          {filteredNodes.length} musicians · {filteredLinks.length} edges
          {selectedIds.length === 1 && ' · click another to compare'}
          {selectedIds.length === 2 && ' · click background to clear'}
        </span>
      </div>

      {/* Graph */}
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '520px', display: 'block' }} />
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 12,
            background: '#0d1c30', border: '1px solid rgba(93,155,224,0.3)',
            borderRadius: '6px', padding: '8px 12px', fontSize: '0.78rem',
            pointerEvents: 'none', zIndex: 10, color: '#d7e6f7',
            boxShadow: '0 2px 10px rgba(0,0,0,0.5)',
          }}>
            <strong style={{ color: pairColor(tooltip.node.bayesRating) }}>{tooltip.node.id}</strong>
            {tooltip.node.instrument && <span style={{ color: 'var(--muted)', fontWeight: 400, marginLeft: '0.4rem', fontSize: '0.72rem' }}>{tooltip.node.instrument}</span>}
            <br />
            {tooltip.node.count} tracks · avg {tooltip.node.avgRating.toFixed(1)} · Bayes {tooltip.node.bayesRating.toFixed(2)}<br />
            <span style={{ color: confLabel(tooltip.node.confidence).color, fontSize: '0.7rem' }}>
              {confLabel(tooltip.node.confidence).text} confidence ({(tooltip.node.confidence * 100).toFixed(0)}%)
            </span>
          </div>
        )}
      </div>

      {/* ── Single musician panel ─────────────────────────────────────────── */}
      {selectedNodes.length === 1 && (() => {
        const m = selectedNodes[0];
        const conf = confLabel(m.confidence);
        const connLinks = allLinks.filter(l => l.source === m.id || l.target === m.id);
        const collabMap = {};
        connLinks.forEach(l => {
          const other = l.source === m.id ? l.target : l.source;
          collabMap[other] = { avgRating: l.pairBayesRating, count: l.count };
        });
        const collabList = Object.entries(collabMap).sort((a, b) => b[1].count - a[1].count);
        const topByRating = [...collabList].sort((a, b) => b[1].avgRating - a[1].avgRating);
        const lowByRating = [...collabList].sort((a, b) => a[1].avgRating - b[1].avgRating);

        return (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-faint)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1rem', flexWrap: 'wrap', gap: '0.5rem' }}>
              <div>
                <div style={{ display: 'flex', alignItems: 'baseline', gap: '0.6rem', flexWrap: 'wrap' }}>
                  <span style={{ fontSize: '1.1rem', fontWeight: 'bold', color: pairColor(m.bayesRating) }}>{m.id}</span>
                  {m.instrument && <span style={{ fontSize: '0.78rem', color: 'var(--muted)', textTransform: 'capitalize' }}>{m.instrument}</span>}
                  <a
                    href={`https://www.google.com/search?q=${encodeURIComponent(m.id + ' jazz ' + (m.instrument || ''))}`}
                    target="_blank"
                    rel="noreferrer"
                    style={{ fontSize: '0.68rem', color: '#87a2c3', textDecoration: 'none', opacity: 0.7 }}
                    onMouseEnter={e => e.target.style.opacity = 1}
                    onMouseLeave={e => e.target.style.opacity = 0.7}
                  >
                    search ↗
                  </a>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Click another musician to compare them as a pair</div>
              </div>
              <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                ✕ Clear
              </button>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
              {/* Stats */}
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.6rem' }}>Stats</div>
                <StatRow label="Tracks" value={m.count} />
                <StatRow label="Avg rating" value={m.avgRating.toFixed(2)} color={pairColor(m.avgRating)} />
                <StatRow label="Bayesian rating" value={m.bayesRating.toFixed(2)} color={pairColor(m.bayesRating)} sub="(k=15)" />
                <StatRow label="Confidence" value={`${(m.confidence * 100).toFixed(0)}%`} color={conf.color} sub={conf.text} />
              </div>

              {/* Top tracks */}
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.6rem' }}>Top Tracks</div>
                {m.tracks.slice(0, 5).map((t, i) => <TrackRow key={i} track={t} predLookup={predLookup} />)}
              </div>

              {/* Collaborator rankings */}
              <div>
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.4rem' }}>Most Common Collaborators</div>
                {collabList.slice(0, 4).map(([name, d]) => (
                  <CollabRow key={name} name={name} data={d} onClick={() => setSelectedIds([m.id, name])} />
                ))}
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.4rem', marginTop: '0.8rem' }}>Highest-Rated Pairings</div>
                {topByRating.slice(0, 3).map(([name, d]) => (
                  <CollabRow key={name} name={name} data={d} onClick={() => setSelectedIds([m.id, name])} />
                ))}
                <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.4rem', marginTop: '0.8rem' }}>Lowest-Rated Pairings</div>
                {lowByRating.slice(0, 3).map(([name, d]) => (
                  <CollabRow key={name} name={name} data={d} onClick={() => setSelectedIds([m.id, name])} />
                ))}
              </div>
            </div>

            {/* Exploration candidates */}
            {explorationCandidates && (
              <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-faint)', paddingTop: '0.8rem' }}>
                <button onClick={() => setShowExploration(v => !v)}
                  style={{ background: 'rgba(167,139,250,0.1)', border: '1px solid rgba(167,139,250,0.3)', borderRadius: '0.3rem', color: '#a78bfa', cursor: 'pointer', padding: '0.35rem 0.8rem', fontSize: '0.75rem' }}>
                  {showExploration ? '▲' : '▼'} Generate exploration candidates
                </button>
                {showExploration && (
                  <div style={{ marginTop: '0.8rem', display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.4rem' }}>
                        Unexplored 2nd-degree connections
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                        Known musicians not yet heard with {m.id.split(' ').slice(-1)[0]}
                      </div>
                      {explorationCandidates.secondDegree.length ? explorationCandidates.secondDegree.map(n => (
                        <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{n.id}</span>
                          <span style={{ color: pairColor(n.bayesRating) }}>{n.bayesRating.toFixed(1)}</span>
                        </div>
                      )) : <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>None found</div>}
                    </div>
                    <div>
                      <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.4rem' }}>
                        Underconfident pairings
                      </div>
                      <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                        Co-appeared but need more data
                      </div>
                      {explorationCandidates.weakPairs.length ? explorationCandidates.weakPairs.map((l, i) => {
                        const other = l.source === m.id ? l.target : l.source;
                        return (
                          <div key={i} style={{ fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'space-between' }}>
                            <span>{other}</span>
                            <span style={{ color: 'var(--muted)' }}>{l.count}T · {(l.pairConfidence * 100).toFixed(0)}% conf</span>
                          </div>
                        );
                      }) : <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>None found</div>}
                    </div>
                    {explorationCandidates.missingEras.length > 0 && (
                      <div>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: '#a78bfa', marginBottom: '0.4rem' }}>
                          Missing eras
                        </div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>
                          Eras you haven't heard {m.id.split(' ').slice(-1)[0]} in
                        </div>
                        {explorationCandidates.missingEras.map(era => (
                          <div key={era} style={{ fontSize: '0.75rem', padding: '0.25rem 0', borderBottom: '1px solid var(--border-faint)', color: 'var(--muted)' }}>{era}</div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}

      {/* ── Pair panel ────────────────────────────────────────────────────── */}
      {selectedNodes.length === 2 && (() => {
        const [a, b] = selectedNodes;
        const sharedConnections = allNodes.filter(n =>
          n.id !== a.id && n.id !== b.id &&
          allLinks.some(l => (l.source === a.id || l.target === a.id) && (l.source === n.id || l.target === n.id)) &&
          allLinks.some(l => (l.source === b.id || l.target === b.id) && (l.source === n.id || l.target === n.id))
        ).sort((x, y) => y.bayesRating - x.bayesRating);

        return (
          <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-faint)', paddingTop: '1rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '0.5rem', marginBottom: '1rem' }}>
              <div>
                <div style={{ fontSize: '1rem', fontWeight: 'bold' }}>
                  <span style={{ color: pairColor(a.bayesRating) }}>{a.id}</span>
                  <span style={{ color: 'var(--muted)', margin: '0 0.5rem' }}>×</span>
                  <span style={{ color: pairColor(b.bayesRating) }}>{b.id}</span>
                </div>
                <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.2rem' }}>Pair mode — click background to clear</div>
              </div>
              <button onClick={() => setSelectedIds([])} style={{ background: 'none', border: '1px solid var(--border-faint)', borderRadius: '0.3rem', color: 'var(--muted)', cursor: 'pointer', padding: '0.3rem 0.6rem', fontSize: '0.72rem' }}>
                ✕ Clear
              </button>
            </div>

            {pairEdge ? (() => {
              const pe = pairEdge;
              const sentiment = sentimentText(pe.pairBayesRating, globalMean);
              const conf = confLabel(pe.pairConfidence);
              return (
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '1rem' }}>
                  {/* Pair stats */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.6rem' }}>Pair Statistics</div>
                    <StatRow label="Shared tracks" value={pe.count} />
                    <StatRow label="Avg rating" value={pe.pairAvgRating.toFixed(2)} color={pairColor(pe.pairAvgRating)} />
                    <StatRow label="Bayesian rating" value={pe.pairBayesRating.toFixed(2)} color={pairColor(pe.pairBayesRating)} sub="(k=15)" />
                    <StatRow label="Confidence" value={`${(pe.pairConfidence * 100).toFixed(0)}%`} color={conf.color} sub={conf.text} />
                    <StatRow label="Rating spread" value={`±${Math.sqrt(pe.pairVariance).toFixed(2)}`} />
                    <div style={{ marginTop: '0.8rem', padding: '0.5rem 0.7rem', background: 'rgba(93,155,224,0.06)', borderRadius: '0.3rem', borderLeft: `3px solid ${sentiment.color}` }}>
                      <div style={{ fontSize: '0.68rem', color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '0.05em', fontWeight: 700 }}>Verdict</div>
                      <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: sentiment.color, marginTop: '0.2rem' }}>{sentiment.text}</div>
                    </div>
                  </div>

                  {/* Best / worst */}
                  <div>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.6rem' }}>Best / Worst</div>
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginBottom: '0.3rem' }}>BEST</div>
                    <TrackRow track={pe.pairBestTrack} predLookup={predLookup} />
                    <div style={{ fontSize: '0.72rem', color: 'var(--muted)', marginTop: '0.8rem', marginBottom: '0.3rem' }}>WORST</div>
                    <TrackRow track={pe.pairWorstTrack} predLookup={predLookup} />
                    {sharedConnections.length > 0 && (
                      <>
                        <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.4rem', marginTop: '1rem' }}>Shared Connections</div>
                        <div style={{ fontSize: '0.7rem', color: 'var(--muted)', marginBottom: '0.4rem' }}>Musicians they've both appeared with</div>
                        {sharedConnections.slice(0, 4).map(n => (
                          <div key={n.id} style={{ fontSize: '0.75rem', padding: '0.2rem 0', borderBottom: '1px solid var(--border-faint)', display: 'flex', justifyContent: 'space-between' }}>
                            <button onClick={() => setSelectedIds([a.id, n.id])} style={{ background: 'none', border: 'none', color: 'var(--text)', cursor: 'pointer', fontSize: '0.75rem', padding: 0, textAlign: 'left' }}>{n.id}</button>
                            <span style={{ color: pairColor(n.bayesRating), flexShrink: 0 }}>{n.bayesRating.toFixed(1)}</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>

                  {/* All shared tracks */}
                  <div style={{ gridColumn: 'span 1' }}>
                    <div style={{ fontSize: '0.68rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--muted-2)', marginBottom: '0.6rem' }}>
                      All Shared Tracks ({pe.sharedTracks.length})
                    </div>
                    {pe.sharedTracks.map((t, i) => <TrackRow key={i} track={t} predLookup={predLookup} />)}
                  </div>
                </div>
              );
            })() : (
              <div style={{ padding: '1rem', background: 'rgba(167,139,250,0.06)', borderRadius: '0.4rem', border: '1px solid rgba(167,139,250,0.2)' }}>
                <div style={{ fontSize: '0.85rem', fontWeight: 'bold', color: '#a78bfa', marginBottom: '0.4rem' }}>
                  No rated co-appearances yet
                </div>
                <div style={{ fontSize: '0.75rem', color: 'var(--muted)', marginBottom: '0.6rem' }}>
                  {a.id} and {b.id} haven't appeared on any of your rated tracks together. This is an exploration gap — finding a recording where they play together would add a new edge to the model.
                </div>
                {sharedConnections.length > 0 && (
                  <div style={{ fontSize: '0.72rem', color: 'var(--muted)' }}>
                    <strong style={{ color: '#a78bfa' }}>Bridge musicians:</strong>{' '}
                    {sharedConnections.slice(0, 3).map(n => n.id).join(', ')} have appeared with both — exploring those pairings may produce a path between them.
                  </div>
                )}
              </div>
            )}
          </div>
        );
      })()}
    </Panel>
  );
}
