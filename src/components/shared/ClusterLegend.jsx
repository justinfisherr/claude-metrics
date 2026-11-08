import { CLUSTER_COLORS } from '../../utils/chartDefaults';

export default function ClusterLegend({ data }) {
  const raw = data?.clusters?.cluster_profiles || [];
  const profiles = Array.isArray(raw) ? raw : Object.values(raw);
  if (!profiles.length) return null;

  return (
    <div className="cluster-legend" aria-label="Cluster colors">
      {profiles.map((profile, index) => (
        <span className="cluster-legend-item" key={index}>
          <i style={{ background: CLUSTER_COLORS[index % CLUSTER_COLORS.length] }} aria-hidden="true" />
          {profile.label || `Cluster ${index + 1}`}
        </span>
      ))}
    </div>
  );
}
