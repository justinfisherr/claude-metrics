import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

export default function Metrics({ data }) {
  if (!data) return null;

  const models = [
    { key: 'ridge', name: 'Ridge Regression' },
    { key: 'random_forest', name: 'Random Forest' },
  ];

  return (
    <Panel id="metrics-panel" span={12}>
      <PanelHeader title="Model Performance" note="Cross-validation summary and dataset size" />
      <p className="panel-desc">
        Two regression models are trained on your dataset using <strong>Leave-One-Out Cross-Validation (LOOCV)</strong> — each track is held out once and predicted from the remaining tracks, then scores are averaged. <strong>R&sup2;</strong> (0&ndash;1) measures how much variance in your ratings the model explains; 1.0 is perfect, 0 means the model is no better than always guessing the mean. <strong>RMSE</strong> (Root Mean Squared Error) and <strong>MAE</strong> (Mean Absolute Error) express average prediction error in rating points — lower is better. The card highlighted in blue is the winning model used for all downstream scoring and the <code>predict.py</code> script.
      </p>
      <div className="cards">
        {models.map(model => {
          const stats = data?.models?.[model.key];
          if (!stats) return null;
          const isBest = data?.meta?.best_model === model.key;
          return (
            <div key={model.key} className={`card${isBest ? ' best' : ''}`}>
              <h3>
                {model.name}
                {isBest && <span className="badge">Best</span>}
              </h3>
              <div className="metric">R&sup2; = {stats.r_squared}</div>
              <div className="detail">RMSE: {stats.rmse} &middot; MAE: {stats.mae}</div>
            </div>
          );
        })}
        <div className="card">
          <h3>Dataset</h3>
          <div className="metric">{data?.meta?.total_tracks ?? '—'} tracks</div>
          <div className="detail">
            {data?.meta?.feature_count ?? '—'} features &middot; {data?.clusters?.best_k ?? '—'} clusters
          </div>
        </div>
      </div>
      <p className="caveat">
        Trained on {data?.meta?.total_tracks ?? '—'} tracks with Leave-One-Out Cross-Validation. Small dataset — patterns are suggestive, not definitive.
      </p>
    </Panel>
  );
}
