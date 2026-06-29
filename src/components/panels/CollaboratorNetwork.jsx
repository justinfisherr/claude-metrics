import { useEffect, useRef, useState, useMemo } from 'react';
import * as d3 from 'd3';
import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const BASE = import.meta.env.BASE_URL;

function parseNames(keyPlayers) {
  return (keyPlayers || [])
    .map(kp => kp.split(' - ')[0].trim())
    .filter(n => n && !n.toLowerCase().includes('ensemble') && !n.toLowerCase().includes('big band'));
}

function ratingColor(r) {
  return r >= 7.5 ? '#50c878' : r >= 6 ? '#87a2c3' : r >= 4.5 ? '#ffc832' : '#ff6b6b';
}

export default function CollaboratorNetwork() {
  const svgRef = useRef(null);
  const [rawData, setRawData] = useState(null);
  const [tooltip, setTooltip] = useState(null);
  const [selected, setSelected] = useState(null);

  useEffect(() => {
    fetch(`${BASE}training-data.json`)
      .then(r => r.json())
      .then(setRawData)
      .catch(() => {});
  }, []);

  const { nodes, links } = useMemo(() => {
    if (!rawData) return { nodes: [], links: [] };

    const musicianMap = {};
    const edgeMap = {};

    rawData.forEach(track => {
      const rating = track.rating;
      if (rating == null) return;
      const names = parseNames(track.key_players);

      names.forEach(name => {
        if (!musicianMap[name]) musicianMap[name] = [];
        musicianMap[name].push({ title: track.title, artist: track.artist, rating });
      });

      for (let i = 0; i < names.length; i++) {
        for (let j = i + 1; j < names.length; j++) {
          const [a, b] = [names[i], names[j]].sort();
          const key = `${a}|||${b}`;
          if (!edgeMap[key]) edgeMap[key] = { source: a, target: b, count: 0, ratingSum: 0 };
          edgeMap[key].count++;
          edgeMap[key].ratingSum += rating;
        }
      }
    });

    const qualified = new Set(
      Object.entries(musicianMap)
        .filter(([, tracks]) => tracks.length >= 2)
        .map(([name]) => name)
    );

    const nodes = Array.from(qualified).map(name => {
      const tracks = musicianMap[name];
      return {
        id: name,
        count: tracks.length,
        avgRating: tracks.reduce((s, t) => s + t.rating, 0) / tracks.length,
        tracks,
      };
    });

    const links = Object.values(edgeMap)
      .filter(e => qualified.has(e.source) && qualified.has(e.target))
      .map(e => ({
        source: e.source,
        target: e.target,
        count: e.count,
        avgRating: e.ratingSum / e.count,
      }));

    return { nodes, links };
  }, [rawData]);

  useEffect(() => {
    if (!nodes.length || !svgRef.current) return;

    const svg = d3.select(svgRef.current);
    svg.selectAll('*').remove();

    const width = svgRef.current.clientWidth || 900;
    const height = 520;

    const rScale = d3.scaleSqrt()
      .domain([2, d3.max(nodes, d => d.count)])
      .range([5, 20]);

    const lwScale = d3.scaleLinear()
      .domain([1, d3.max(links, d => d.count) || 1])
      .range([0.8, 3.5]);

    const g = svg.append('g');

    svg.call(
      d3.zoom().scaleExtent([0.25, 4])
        .on('zoom', e => g.attr('transform', e.transform))
    );

    const sim = d3.forceSimulation(nodes)
      .force('link', d3.forceLink(links).id(d => d.id).distance(d => 55 + (8 - Math.min(d.avgRating, 8)) * 6))
      .force('charge', d3.forceManyBody().strength(-180))
      .force('center', d3.forceCenter(width / 2, height / 2))
      .force('collide', d3.forceCollide().radius(d => rScale(d.count) + 5));

    const link = g.append('g').selectAll('line')
      .data(links).join('line')
      .attr('stroke', d => ratingColor(d.avgRating))
      .attr('stroke-opacity', 0.25)
      .attr('stroke-width', d => lwScale(d.count));

    const node = g.append('g').selectAll('circle')
      .data(nodes).join('circle')
      .attr('r', d => rScale(d.count))
      .attr('fill', d => ratingColor(d.avgRating))
      .attr('fill-opacity', 0.82)
      .attr('stroke', d => ratingColor(d.avgRating))
      .attr('stroke-width', 1.5)
      .attr('stroke-opacity', 0.5)
      .style('cursor', 'pointer')
      .call(d3.drag()
        .on('start', (event, d) => { if (!event.active) sim.alphaTarget(0.3).restart(); d.fx = d.x; d.fy = d.y; })
        .on('drag', (event, d) => { d.fx = event.x; d.fy = event.y; })
        .on('end', (event, d) => { if (!event.active) sim.alphaTarget(0); d.fx = null; d.fy = null; })
      )
      .on('mouseover', (event, d) => setTooltip({ x: event.offsetX, y: event.offsetY, node: d }))
      .on('mousemove', event => setTooltip(p => p ? { ...p, x: event.offsetX, y: event.offsetY } : null))
      .on('mouseout', () => setTooltip(null))
      .on('click', (event, d) => { event.stopPropagation(); setSelected(p => p?.id === d.id ? null : d); });

    // Labels only for musicians with 5+ tracks
    const label = g.append('g').selectAll('text')
      .data(nodes.filter(d => d.count >= 5)).join('text')
      .text(d => d.id.split(' ').slice(-1)[0]) // last name
      .attr('font-size', d => Math.min(11, Math.max(8, rScale(d.count) * 0.75)))
      .attr('fill', '#d7e6f7')
      .attr('fill-opacity', 0.85)
      .attr('text-anchor', 'middle')
      .attr('dy', d => rScale(d.count) + 10)
      .style('pointer-events', 'none')
      .style('font-family', 'monospace');

    svg.on('click', () => setSelected(null));

    sim.on('tick', () => {
      link.attr('x1', d => d.source.x).attr('y1', d => d.source.y)
          .attr('x2', d => d.target.x).attr('y2', d => d.target.y);
      node.attr('cx', d => d.x).attr('cy', d => d.y);
      label.attr('x', d => d.x).attr('y', d => d.y);
    });

    return () => sim.stop();
  }, [nodes, links]);

  return (
    <Panel id="collaborator-network-panel" span={12}>
      <PanelHeader
        title="Collaborator Network"
        note="Musicians connected by co-appearances · size = track count · color = avg rating · drag nodes · scroll to zoom"
      />
      <div style={{ display: 'flex', gap: '1rem', marginBottom: '0.6rem', fontSize: '0.7rem', color: 'var(--muted)' }}>
        {[['≥7.5', '#50c878'], ['6–7.5', '#87a2c3'], ['4.5–6', '#ffc832'], ['<4.5', '#ff6b6b']].map(([label, color]) => (
          <span key={label} style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            <span style={{ width: 8, height: 8, borderRadius: '50%', background: color, display: 'inline-block' }} />
            {label}
          </span>
        ))}
      </div>
      <div style={{ position: 'relative' }}>
        <svg ref={svgRef} style={{ width: '100%', height: '520px', display: 'block' }} />
        {tooltip && (
          <div style={{
            position: 'absolute', left: tooltip.x + 14, top: tooltip.y - 12,
            background: '#0f1f38', border: '1px solid rgba(93,155,224,0.3)',
            borderRadius: '6px', padding: '8px 12px', fontSize: '0.78rem',
            pointerEvents: 'none', zIndex: 10, color: '#d7e6f7',
            boxShadow: '0 2px 8px rgba(0,0,0,0.4)',
          }}>
            <strong style={{ color: ratingColor(tooltip.node.avgRating) }}>{tooltip.node.id}</strong>
            <br />
            {tooltip.node.count} tracks · avg {tooltip.node.avgRating.toFixed(1)}/10
          </div>
        )}
      </div>
      {selected && (
        <div style={{ marginTop: '1rem', borderTop: '1px solid var(--border-faint)', paddingTop: '1rem' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
            <strong style={{ color: ratingColor(selected.avgRating), fontSize: '0.85rem' }}>
              {selected.id} — {selected.count} tracks · avg {selected.avgRating.toFixed(1)}/10
            </strong>
            <button onClick={() => setSelected(null)} style={{ background: 'none', border: 'none', color: 'var(--muted)', cursor: 'pointer', fontSize: '0.8rem' }}>
              ✕ Close
            </button>
          </div>
          <div className="breakdown-tracks">
            {[...selected.tracks].sort((a, b) => b.rating - a.rating).map((t, i) => (
              <div key={i} className="breakdown-track">
                <div>
                  <span className="breakdown-track-title">{t.title}</span>
                  <span className="breakdown-track-artist"> — {t.artist}</span>
                </div>
                <span className="breakdown-track-rating" style={{ color: ratingColor(t.rating) }}>
                  {t.rating}/10
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </Panel>
  );
}
