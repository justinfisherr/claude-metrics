import { useId } from 'react';

function formatRating(value) {
  const v = Math.round(value * 10) / 10;
  return v % 1 === 0 ? String(v) : v.toFixed(1);
}

export default function RatingSlider({ value, onChange, min = 1, max = 10, step = 0.5, label = 'Rate' }) {
  const id = useId();
  const pct = ((value - min) / (max - min)) * 100;
  return (
    <div className="rating-control" style={{ '--pct': `${pct}%` }}>
      <label className="rating-label" htmlFor={id}>{label}</label>
      <div className="rating-track-wrap">
        <input
          id={id}
          type="range"
          className="rating-slider"
          min={min}
          max={max}
          step={step}
          value={value}
          onChange={(e) => onChange(parseFloat(e.target.value))}
          aria-valuetext={`${formatRating(value)} out of ${max}`}
        />
        <div className="rating-ticks" aria-hidden="true">
          {Array.from({ length: max - min + 1 }, (_, i) => <i key={i} />)}
        </div>
      </div>
      <output className="rating-value" htmlFor={id}>
        {formatRating(value)}<span>/{max}</span>
      </output>
    </div>
  );
}
