import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function Correlations({ data }) {
  if (!data) return null;

  const heatmap = data?.correlations?.heatmap;
  if (!heatmap?.labels?.length || !heatmap?.matrix?.length) {
    return (
      <Panel id="correlations-panel" span={6}>
        <PanelHeader title="Correlations" note="Scrollable on smaller screens" />
        <div className="empty-state">No correlation data available.</div>
      </Panel>
    );
  }

  const { labels, matrix } = heatmap;

  return (
    <Panel id="correlations-panel" span={6}>
      <PanelHeader title="Correlations" note="Scrollable on smaller screens" />
      {(() => {
        const ratingIdx = labels.indexOf('Rating');
        if (ratingIdx === -1) return null;
        const ratingRow = matrix[ratingIdx];
        if (!ratingRow) return null;
        let bestVal = 0, bestLabel = '';
        ratingRow.forEach((v, i) => {
          if (i === ratingIdx) return;
          const num = Math.abs(Number(v) || 0);
          if (num > bestVal) { bestVal = num; bestLabel = labels[i]; }
        });
        if (!bestLabel) return null;
        const dir = Number(ratingRow[labels.indexOf(bestLabel)]) > 0 ? 'positively' : 'negatively';
        const fmt = bestLabel.replace(/_/g, ' ');
        return (
          <p className="panel-insight">
            The feature most correlated with your ratings is <strong>{fmt}</strong> ({dir}, r = {bestVal.toFixed(2)}). Tracks strong in {fmt.toLowerCase()} tend to score {dir === 'positively' ? 'higher' : 'lower'} in your library.
          </p>
        );
      })()}
      <p className="panel-desc">
        <strong>Pearson correlation coefficients</strong> between the top features and your rating, plus pairwise between features. Values range &ndash;1 to +1. <strong>Blue</strong> = positive correlation (feature tends to appear more on tracks you rate higher). <strong>Red</strong> = negative. The <strong>Rating row/column</strong> is the most actionable: it shows raw data correlations independent of the model — what actually predicts your scores before any ML weighting. High absolute values in that row = strong direct signals. Scroll horizontally on small screens.
      </p>
      <div className="table-scroll" aria-label="Correlation heatmap" tabIndex="0">
        <table className="heatmap-table">
          <thead>
            <tr>
              <th></th>
              {labels.map(label => (
                <th key={label}>{label}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {matrix.map((row, rowIndex) => (
              <tr key={rowIndex}>
                <th>{labels[rowIndex]}</th>
                {row.map((value, colIndex) => {
                  const numeric = Number(value) || 0;
                  const alpha = Math.min(Math.abs(numeric) * 0.56, 0.58);
                  const bg = numeric < 0
                    ? `rgba(255,107,107,${alpha})`
                    : `rgba(74,158,255,${alpha})`;
                  return (
                    <td key={colIndex} style={{ background: bg, color: '#d7e6f7' }}>
                      {value}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Panel>
  );
}
