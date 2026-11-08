import Panel from '../shared/Panel';
import PanelHeader from '../shared/PanelHeader';

const MODEL_NAMES = {
  ridge: 'Ridge Regression',
  gradient_boosting: 'Gradient Boosting',
  random_forest: 'Gradient Boosting',
  knn: 'Nearest Neighbours',
};

export default function Metrics({ data }) {
  if (!data) return null;

  const deployed = data?.meta?.deployed_model;
  const evaluation = data?.meta?.evaluation;
  const unseen = evaluation?.unseen_album;
  const challengers = evaluation?.challengers || {};
  const loo = evaluation?.in_sample_loo;
  const rank = Number(unseen?.spearman ?? 0);
  const lift = Number(unseen?.top_decile_lift ?? 0);
  const unseenR2 = Number(unseen?.r_squared ?? 0);
  const selfFound = evaluation?.by_source?.self;
  const models = [
    { key: 'ridge', name: 'Ridge Regression' },
    { key: 'random_forest', name: 'Gradient Boosting' },
  ];

  return (
    <Panel id="metrics-panel" span={12}>
      <PanelHeader
        title="Model Performance"
        note="How it does on records it has never seen"
      />
      {unseen ? (
        <p className="panel-insight">
          Deployed: <strong>{MODEL_NAMES[deployed] || deployed}</strong>. On albums held out of
          training entirely, it ranks tracks at <strong>Spearman {rank.toFixed(2)}</strong>{' '}
          and its top decile rates <strong>{lift.toFixed(1)} points</strong> above
          the rest. That is a rough sort, not a verdict.
        </p>
      ) : (
        <p className="panel-insight">
          No honest evaluation in this dataset yet — retrain to measure performance on unseen
          albums.
        </p>
      )}
      {selfFound ? (
        <p className="panel-note">
          On the {selfFound.n} tracks you found yourself it ranks at Spearman{' '}
          {Number(selfFound.spearman).toFixed(2)} — weaker than the overall number, which is
          lifted by tracks the recommender picked. Discovery is still a weak sort.
        </p>
      ) : null}
      <p className="panel-desc">
        Whole albums are hidden, every rating-derived average is rebuilt without them, and the
        model is scored on the records it lost. This replaced the old headline number: leave-one-out
        R&sup2; looked strong because each track&rsquo;s album siblings were still in the training
        set, so it measured album recall rather than taste. <strong>Spearman</strong> is the rank
        correlation between predicted and actual ratings; <strong>top-decile lift</strong> is how
        much better the model&rsquo;s ten best picks are than everything else. In-sample numbers are
        kept for comparison only.
      </p>
      <div className="cards">
        {unseen ? (
          <div className="card best">
            <h3>
              {MODEL_NAMES[deployed] || deployed}
              <span className="badge">Deployed</span>
            </h3>
            <div className="metric">Spearman {rank.toFixed(2)}</div>
            <div className="detail">
              Top-decile lift: {lift.toFixed(1)} pts &middot; R&sup2; {unseenR2.toFixed(2)}
            </div>
          </div>
        ) : null}
        {models.map(model => {
          const stats = data?.models?.[model.key];
          if (!stats) return null;
          const honest = challengers[model.key === 'random_forest' ? 'gradient_boosting' : model.key];
          return (
            <div key={model.key} className="card">
              <h3>{model.name}</h3>
              <div className="metric">
                {honest ? `Spearman ${honest.spearman.toFixed(2)}` : `R\u00b2 = ${stats.r_squared}`}
              </div>
              <div className="detail">
                Unseen albums{honest ? ` \u00b7 R\u00b2 ${honest.r_squared.toFixed(2)}` : ''} &middot;
                in-sample R&sup2; {stats.r_squared.toFixed(2)}
              </div>
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
      {loo ? (
        <p className="panel-note">
          In-sample LOO R&sup2; {loo.r_squared.toFixed(2)} &middot; Spearman{' '}
          {loo.spearman.toFixed(2)}. Same-album siblings were in the fit, so this runs high and is
          not the number to quote.
        </p>
      ) : null}
      {data?.meta?.data_quality?.excluded_for_metadata ? (
        <p className="panel-note">
          {data.meta.data_quality.excluded_for_metadata} track(s) were excluded from this model
          because they are missing era or primary instrument.
        </p>
      ) : null}
      <p className="caveat">
        Trained on {data?.meta?.total_tracks ?? '—'} tracks. The deployed scorer is the model that
        won the unseen-album holdout, not the one with the best in-sample R&sup2;.
      </p>
    </Panel>
  );
}
