import Navigation from '../components/shared/Navigation';
import { useDashboardData } from '../hooks/useDashboardData';

import TasteSummary from '../components/panels/TasteSummary';
import Changelog from '../components/panels/Changelog';
import Metrics from '../components/panels/Metrics';
import ClusterScatter from '../components/panels/ClusterScatter';
import FeatureImportance from '../components/panels/FeatureImportance';
import PredVsActual from '../components/panels/PredVsActual';
import RatingDistribution from '../components/panels/RatingDistribution';
import ClusterProfiles from '../components/panels/ClusterProfiles';
import Correlations from '../components/panels/Correlations';
import Constellation from '../components/panels/Constellation';
import CircleOfFifths from '../components/panels/CircleOfFifths';
import TasteVsWorld from '../components/panels/TasteVsWorld';
import ArtistJourneys from '../components/panels/ArtistJourneys';
import MoodRating from '../components/panels/MoodRating';
import Replayability from '../components/panels/Replayability';
import Playthrough from '../components/panels/Playthrough';
import PlaythroughByEra from '../components/panels/PlaythroughByEra';
import Albums from '../components/panels/Albums';
import YearRating from '../components/panels/YearRating';
import DurationRating from '../components/panels/DurationRating';
import InstrumentRatings from '../components/panels/InstrumentRatings';
import InstrumentCombos from '../components/panels/InstrumentCombos';
import LabelBreakdown from '../components/panels/LabelBreakdown';
import BiggestMisses from '../components/panels/BiggestMisses';
import MindChanges from '../components/panels/MindChanges';
import TopArtists from '../components/panels/TopArtists';
import EraBreakdown from '../components/panels/EraBreakdown';
import HarmonicComplexity from '../components/panels/HarmonicComplexity';
import DiscoverySource from '../components/panels/DiscoverySource';
import SoundProfile from '../components/panels/SoundProfile';
import EnsembleSize from '../components/panels/EnsembleSize';
import MoodAxes from '../components/panels/MoodAxes';
import V2Features from '../components/panels/V2Features';
import ModelHistory from '../components/panels/ModelHistory';
import AudioScatter from '../components/panels/AudioScatter';
import SoundDNA from '../components/panels/SoundDNA';
import AudioFeatureRatings from '../components/panels/AudioFeatureRatings';
import TasteMap from '../components/panels/TasteMap';
import MoodBubbles from '../components/panels/MoodBubbles';
import AudioByEra from '../components/panels/AudioByEra';

export default function Dashboard() {
  const { data, manifest, loading, error, currentVersion, switchVersion } = useDashboardData();

  const loadableVersions = manifest
    ? manifest.versions.filter(v => v.is_major || v.version === manifest.current_version)
    : [];

  return (
    <>
      <Navigation showSections={true} />
      <main className="wrapper">
        <header className="page-header">
          <p className="eyebrow">Taste model dashboard</p>
          <h1>Jazz Taste Analysis</h1>
          <p className="subtitle">
            Model trained on <strong>{data?.meta?.total_tracks ?? '—'}</strong> rated tracks.
          </p>
          <div className={`status${error ? ' error' : ''}`}>
            <span className="status-dot" />
            <span>{loading ? 'Loading...' : error ? error : 'Dashboard loaded'}</span>
          </div>
          <div className="training-metadata">
            <div className="meta-item">
              <span className="label">Model Version</span>
              {loadableVersions.length > 0 ? (
                <select
                  className="version-select"
                  value={currentVersion || ''}
                  onChange={e => switchVersion(e.target.value)}
                >
                  {[...loadableVersions].reverse().map(v => (
                    <option key={v.version} value={v.version}>
                      v{v.version}{v.name ? ` "${v.name}"` : ''}{v.is_major ? ' ★' : ''} — {v.dataset_size} tracks
                    </option>
                  ))}
                </select>
              ) : (
                <span className="value">—</span>
              )}
            </div>
            <div className="meta-item">
              <span className="label">Training Date</span>
              <span className="value">
                {data?.meta?.generated_at ? new Date(data.meta.generated_at).toLocaleDateString() : '—'}
              </span>
            </div>
            <div className="meta-item">
              <span className="label">Features</span>
              <span className="value">{data?.meta?.feature_count ?? '—'}</span>
            </div>
          </div>
        </header>

        {loading && (
          <p style={{textAlign:'center',color:'var(--muted)',padding:'2rem'}}>Loading...</p>
        )}

        {data && (
          <section className="grid">
            {/* Overview */}
            <TasteSummary data={data} />
            <Changelog />
            <Metrics data={data} />
            {/* Patterns */}
            <ClusterScatter data={data} />
            <ClusterProfiles data={data} />
            <Constellation data={data} />
            <FeatureImportance data={data} />
            <Correlations data={data} />

            {/* Ratings */}
            <PredVsActual data={data} />
            <RatingDistribution data={data} />
            <BiggestMisses data={data} />
            <MindChanges data={data} />
            <YearRating data={data} />
            <DurationRating data={data} />

            {/* Audio Features */}
            <AudioScatter data={data} />
            <AudioByEra data={data} />
            <SoundDNA data={data} />
            <AudioFeatureRatings data={data} />

            {/* Music */}
            <EraBreakdown data={data} />
            <InstrumentRatings data={data} />
            <InstrumentCombos data={data} />
            <HarmonicComplexity data={data} />
            <CircleOfFifths data={data} />
            <SoundProfile data={data} />
            <EnsembleSize data={data} />

            {/* Artists */}
            <TopArtists data={data} />
            <ArtistJourneys data={data} />
            <LabelBreakdown data={data} />
            <DiscoverySource data={data} />

            {/* Mood & VAD */}
            <TasteMap data={data} />
            <MoodBubbles data={data} />
            <MoodRating data={data} />
            <MoodAxes data={data} />

            {/* Engagement */}
            <Replayability data={data} />
            <Playthrough data={data} />
            <PlaythroughByEra data={data} />
            <V2Features data={data} />

            {/* Meta */}
            <TasteVsWorld data={data} />
            <Albums data={data} />
            <ModelHistory data={data} />
          </section>
        )}
      </main>
    </>
  );
}
