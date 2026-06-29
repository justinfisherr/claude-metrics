# Jazz Recommender System — Technical Specification

## Overview

This is a personalized jazz track rating prediction system. It ingests human ratings of jazz tracks, engineers features from track metadata and Spotify audio features, trains two competing regression models (Ridge and Random Forest), and generates predictions for candidate tracks. The system includes interactive visualizations of model performance, cluster analysis, and taste profiles.

---

## 1. Dataset

### Structure and Scale
- **162 tracks** (including major releases), **3 albums** (stored separately)
- Training data stored as JSON array in `training-data.json`
- Each track record contains ~25 fields

### Rating Distribution
Current dataset (v5.11):
- Rating range: 1–10 (integer values)
- Distribution: heavy concentration at 8–10 (preferred tracks), sparse 1–3 (dislikes)
- Tracks per artist: mean ~2–3, range 1–20+ (Miles Davis, Bill Evans heavily represented)

### Data Fields (per track)
Required:
- `title`, `artist`, `rating` (1–10), `year`, `era`
- `energy` (1–10), `tempo` ("slow"/"medium"/"medium-fast"/"fast"/"varied"), `harmonic_complexity` ("low"/"medium"/"high")
- `primary_instrument` (one of: tenor saxophone, piano, vocals, bass, trumpet, guitar, other)
- `instrumentation` (array of instrument strings)
- `subgenres` (array of strings, e.g., "cool jazz", "bebop")
- `key_players` (array of "Name — Instrument" strings)
- `label` (record label)

Optional but used:
- `audio_features` (object with Spotify + ReccoBeats features)
  - Spotify: `duration_s`, `popularity`, `tempo_bpm`, `time_signature`, `is_live`, `key`, `mode`
  - ReccoBeats (if `spotify_id` populated): `acousticness`, `danceability`, `spotify_energy`, `instrumentalness`, `liveness`, `loudness`, `speechiness`, `spotify_valence`
- `discovered_from` ("self", "claude-recommendation", "autoplay")
- `replayability`, `playthrough`, `favorite_moments`, `notable_qualities`
- `rating_history` (array of `{rating, date}` for rating changes)
- `liked` (boolean)

### Missing Values Handling
- **Audio features**: If a track lacks `spotify_id` or ReccoBeats fails, audio features default to neutral values:
  - `acousticness`, `danceability`, `spotify_energy`, `instrumentalness`: 0.5
  - `liveness`: 0.15
  - `loudness`: -10.0
  - `speechiness`: 0.05
  - `spotify_valence`: 0.5
  - A flag `has_recco_features` (1/0) indicates whether true values were available; the model uses this to discount synthetic audio for tracks missing data.
- **Metadata**: Missing era defaults to "Unknown"; missing year defaults to 1960; missing complexity/tempo default to "medium"

---

## 2. End-to-End Pipeline

### Execution: `train.py`

#### Stage 1: Load Data
```python
load_data()
```
- Reads `training-data.json`, filters to `entity_type != "album"` (tracks only)
- Auto-populates `date_added` field for legacy entries (sets to today if missing)
- Returns tracks array and albums array

#### Stage 2: Feature Engineering
```python
engineer_features(tracks)
```
Produces feature matrix `X` (n_samples × 109 features), target vector `y` (ratings), and metadata.

#### Stage 3: Model Training
```python
train_models(X, y)
```
- Standardizes features using `StandardScaler`
- Trains Ridge (RidgeCV with 5 alphas, Leave-One-Out CV)
- Trains Random Forest (50 trees, depth 3, LOO cross-validation)
- Computes metrics for both (R², RMSE, MAE)
- Selects best model by R²

#### Stage 4: Analysis
```python
cluster_analysis(X_scaled, tracks, feature_names)
```
- PCA to 95% cumulative variance, then 2D PCA for visualization
- KMeans clustering with k ∈ [2,3,4], silhouette scoring
- Filters k if any cluster has <8 tracks

```python
compute_correlations(X, y, feature_names)
```
- Pearson correlation of each feature with rating

```python
get_feature_importance(model_results, feature_names)
```
- Top 15 features by importance (by model type)

```python
get_top_drivers(model_results, feature_names)
```
- If best model is Ridge: return top 15 coefficients as "drivers"
- If best model is RF: return empty list (RF feature importance shown instead)

#### Stage 5: Output Generation
- `build_predictions()` — prediction records with residuals, cluster assignment, PCA coords
- `build_distributions()` — rating histograms overall and per cluster
- `extract_rating_changes()` — tracks where rating was upgraded/downgraded
- `sync_recco_features()` — fetches ReccoBeats audio features for tracks with `spotify_id` but missing audio data

#### Stage 6: Versioning
- Auto-increments minor version (1.00 → 1.01 → 1.02, etc.) on each train
- `--major` flag bumps major version (1.xx → 2.00) and creates `versions/v2.00/` snapshot directory
- `versions.json` stores manifest with all version metadata

#### Stage 7: Dashboard Output
Writes `dashboard-data.json` containing:
```json
{
  "meta": {
    "version": "5.11",
    "total_tracks": 162,
    "best_model": "random_forest",
    "feature_count": 109
  },
  "models": {
    "ridge": { "r_squared": 0.0602, "rmse": 2.204, "mae": 1.8071, "best_alpha": 0.01 },
    "random_forest": { "r_squared": 0.1803, "rmse": 2.0584, "mae": 1.6997, "max_depth": 3, "n_estimators": 50 }
  },
  "predictions": [...],
  "distributions": {...},
  "clusters": {...},
  "feature_importance": [...],
  "top_drivers": [...],
  "correlations": {...},
  "history": [...]
}
```

---

## 3. Feature Engineering — Detailed Breakdown

### Total Features: 154 (v6.00+)

**Note:** Version 6.00 added 45 new musically-informed features, improving Ridge R² from 0.0602 to 0.2478 (+312%).

#### 3.1 Core Numeric (4 features)
- `energy` (1–10, user-entered)
- `year` (integer, user-entered)
- `tempo` (mapped: slow→1, medium→2, medium-fast→3, fast→4, varied→2.5)
- `harmonic_complexity` (mapped: low→1, medium→2, high→3)
- `energy_tempo` (interaction: energy × tempo)

#### 3.2 Era One-Hot (N features)
- One binary feature per era value in dataset (e.g., "Modal", "Free Jazz", "Cool Jazz")
- Example: `era_Modal = 1 if track.era == "Modal" else 0`

#### 3.3 Decade Buckets (4 features)
- `decade_1940s`, `decade_1950s`, `decade_1960s`, `decade_1970s` (one-hot)
- Computed from `year`: `decade = (year // 10) * 10`

#### 3.4 Primary Instrument One-Hot (7 features)
Instrument groups:
- `inst_tenor_sax`, `inst_piano`, `inst_vocals`, `inst_bass`, `inst_trumpet`, `inst_guitar`, `inst_other`
- Mapping handles aliases (e.g., "soprano saxophone" → "tenor_sax", "vocals" → "vocals")

#### 3.5 Mood Zones (4 features)
Computed from Spotify audio features (valence × energy):
- `mood_zone_euphoric` (valence ≥ 0.5, energy ≥ 0.5)
- `mood_zone_tense` (valence < 0.5, energy ≥ 0.5)
- `mood_zone_introspective` (valence < 0.5, energy < 0.5)
- `mood_zone_serene` (valence ≥ 0.5, energy < 0.5)
- If audio features missing: all zones = 0

#### 3.6 Subgenre One-Hot (M features, M = count of subgenres with ≥3 occurrences)
- `subgenre_coolJazz`, `subgenre_bebop`, `subgenre_hardBop`, etc.
- Threshold: only include subgenres appearing in ≥3 tracks (SUBGENRE_THRESHOLD = 3)
- Current dataset has ~19 common subgenres

#### 3.7 Subgenre Count (1 feature)
- `subgenre_count` = number of subgenres tagged on the track

#### 3.8 Ensemble/Instrumentation (7 features)
- `ensemble_size` (count of instruments in instrumentation array)
- `has_guitar` (1 if "guitar" in instrumentation string)
- `has_strings` (1 if "strings" or "orchestra" in instrumentation)
- `has_vocals` (1 if "vocal" in instrumentation)
- `is_pianoless` (1 if "piano" not in instrumentation)
- `has_trombone` (1 if "trombone" in instrumentation)
- `has_horn_section` (1 if ≥3 horn instruments: trumpet, trombone, sax, cornet, flute, clarinet)
- `instrumentation_diversity` (count of distinct instrument groups after mapping)

#### 3.9 Label One-Hot (K features, K = count of labels with ≥3 occurrences)
- `label_AtlanticRecords`, `label_BluteNote`, etc.
- Threshold: only include labels appearing in ≥3 tracks (LABEL_THRESHOLD = 3)
- Current dataset has ~13 common labels

#### 3.10 Key Players (3 features)
- `key_player_count` (number of "Name — Instrument" entries)
- `artist_is_leader` (1 if track artist name appears in any key_player entry)
- `collaborator_quality` (mean rating of all tracks featuring each key player, LOO-encoded)
  - LOO encoding: excludes current track's rating from collaborator average
  - If no other collaborators exist: defaults to global mean rating

#### 3.11 Discovery Source One-Hot (3 features)
- `source_self`, `source_claude-recommendation`, `source_autoplay` (one-hot)
- Default: "self" if not specified

#### 3.12 Artist Statistics (3 features, Bayesian smoothed)
- `artist_track_count` (n = number of tracks by this artist)
- `artist_consistency` (standard deviation of other ratings by this artist, LOO-encoded)
- `artist_mean_rating` (LOO Bayesian smoothed):
  - Formula: `(n / (n + k)) * artist_mean + (k / (n + k)) * global_mean`
  - Parameters: n = track count, k = 15 (confidence constant)
  - Effect: artists with few tracks (n < k) are pulled toward global mean; artists with many tracks (n >> k) keep their own mean

#### 3.13 Duration Buckets (3 features)
- `duration_short` (1 if duration_s < 240)
- `duration_long` (1 if duration_s > 420)
- `duration_extra_long` (1 if duration_s > 600)

#### 3.14 Format Detection (3 features)
- `is_electric` (1 if instrumentation contains: electric, synth, clavinet, organ, fender, rhodes)
- `is_solo_piano` (1 if primary_instrument == "piano" and ≤2 instruments total)
- `is_collaboration` (1 if "&" or "," in artist name)

#### 3.15 Other Metadata (3 features)
- `artist_is_new` (1 if artist_track_count == 1, i.e., first track by this artist)
- `energy_x_complexity` (interaction: energy × harmonic_complexity)
- Two additional binary features computed from notes/favorites:
  - `intro_grabbed` (1 if "intro" or "right away" in favorite_moments, notes, or notable_qualities)
  - `early_bail` (1 if playthrough < 0.3)

#### 3.16 Key/Mode Features (2 features)
- `is_minor_key` (1 if mode in ["minor", "dorian", "blues", "phrygian"])
- `is_dorian` (1 if mode == "dorian")

#### 3.17 ReccoBeats Audio Features (12 features)
Fetched from Spotify if `spotify_id` available; otherwise use defaults (see Section 1).
- `has_recco_features` (flag: 1 if true ReccoBeats data available, 0 if synthetic defaults)
- `acousticness`, `danceability`, `spotify_energy`, `instrumentalness`, `liveness`, `loudness`, `speechiness`, `spotify_valence`
- `spotify_valence_x_energy` (interaction: valence × energy)

#### 3.18 User-Entered Audio (5 features)
Always included if dataset has ≥3 tracks with audio data:
- `duration_s`, `popularity`, `tempo_bpm`, `time_signature`, `is_live`

---

## 4. Models

### 4.1 Ridge Regression

**When used**: Trained on every run; selected if R² ≥ Random Forest R²

**Inputs**: Standardized feature matrix `X_scaled` (n_samples × 109), target vector `y` (ratings 1–10)

**Hyperparameters**:
- `alphas = [0.01, 0.1, 1.0, 10.0, 100.0]` (L2 regularization strength)
- `cv = LeaveOneOut()` (cross-validation strategy)

**Cross-Validation**: Leave-One-Out (LOO)
- For each sample i:
  - Train on all samples except i
  - Predict on sample i
  - Record prediction
- Uses best-fit alpha from LOO CV to make final predictions for all samples

**Output**:
- Ridge coefficients (one per feature)
- LOO predictions (1D array matching y)
- Best alpha (selected via CV)

**Metrics**:
- R²: coefficient of determination (explained variance / total variance)
- RMSE: √(mean squared error)
- MAE: mean absolute error

**Current v5.11 Performance**:
- R²: 0.0602
- RMSE: 2.204
- MAE: 1.8071
- Best alpha: 0.01

### 4.2 Random Forest Regression

**When used**: Trained on every run; selected if R² > Ridge R²

**Inputs**: Standardized feature matrix `X_scaled`, target vector `y`

**Hyperparameters**:
- `n_estimators = 50` (number of trees)
- `max_depth = 3` (maximum tree depth)
- `min_samples_leaf = 5` (minimum samples per leaf)
- `random_state = 42` (for reproducibility)

**Cross-Validation**: Leave-One-Out (LOO)
- Uses `sklearn.model_selection.cross_val_predict(rf, X_scaled, y, cv=LeaveOneOut())`
- Generates LOO predictions

**Post-CV Training**: After LOO evaluation, fit final model on all samples using same hyperparameters (for feature importance extraction)

**Output**:
- Feature importances (Gini-based, one per feature)
- LOO predictions
- Fitted tree ensemble (stored in model.joblib)

**Metrics**:
- R²: 0.1803 (v5.11)
- RMSE: 2.0584
- MAE: 1.6997

**Current best model**: Random Forest (higher R² than Ridge in v5.11)

### 4.3 Model Selection

Both models trained every run; best model selected by:
```python
best = "ridge" if ridge_r2 >= rf_r2 else "random_forest"
```

All downstream outputs (feature importance, top drivers, predictions) use best model's predictions and coefficients.

---

## 5. Feature Importance and Explainability

### 5.1 Feature Importance (Top 15)
Extracted via `get_feature_importance()`:
- **If best model is Ridge**: absolute value of normalized coefficients
  - Normalization: divide by max coefficient to scale to [0, 1]
  - Direction: sign of coefficient (positive/negative)
- **If best model is Random Forest**: Gini-based feature importances from fitted forest
  - Direction: all zeros (RF importances are magnitudes only)

Output: JSON array with fields:
- `feature`: readable feature name (e.g., "Artist Avg Rating")
- `importance`: normalized score (0–1)
- `direction`: "positive" or "negative" (Ridge only; "positive" for RF)

### 5.2 Top Drivers (Ridge Coefficients)
Extracted via `get_top_drivers()` only when Ridge is best model:
- Computes: `coef = directions × importance` (signed magnitude)
- Sorts by absolute value descending
- Returns top 15 as "drivers" of rating prediction

Format:
- `feature`: readable name
- `coefficient`: signed value (positive = increases rating, negative = decreases)
- `direction`: "positive" or "negative"

### 5.3 Mood Zone Computation

Deterministic 2D classification based on Spotify audio features:
```python
def compute_mood_zone(track):
    valence = track.get("audio_features", {}).get("spotify_valence")
    energy = track.get("audio_features", {}).get("spotify_energy")
    if valence is None or energy is None:
        return None
    if valence >= 0.5 and energy >= 0.5:
        return "euphoric"
    elif valence < 0.5 and energy >= 0.5:
        return "tense"
    elif valence < 0.5 and energy < 0.5:
        return "introspective"
    else:  # valence >= 0.5 and energy < 0.5
        return "serene"
```

Boundaries are hard at 0.5 for both axes.

### 5.4 Cluster Assignment

Each track assigned to a cluster (0, 1, 2, ..., k-1) via KMeans on PCA-reduced features:
- Fit PCA to 95% cumulative variance, then run KMeans on PCA space
- Final assignment stored in `predictions[i]["cluster"]`
- Cluster profiles (size, mean rating, mood zone distribution, representative tracks) available in `clusters[c]`

### 5.5 PCA Coordinates

2D projection of all tracks for visualization:
- `predictions[i]["pca_x"]`, `predictions[i]["pca_y"]`
- Computed via PCA with n_components=2 on original `X_scaled`
- Used for scatterplot in ClusterScatter panel

---

## 6. Candidate Generation and Prediction (predict.py)

### Workflow: `predict.py`

Input: candidate track (JSON object with metadata fields)

Output: predicted rating (1–10 scale)

### Feature Extraction for Candidate

The `track_to_features()` function in predict.py mirrors train.py's engineering logic:
1. Maps user metadata (energy, tempo, etc.) through same maps (TEMPO_MAP, COMPLEXITY_MAP)
2. Constructs same one-hot encodings (era, instrument, subgenres, mood zones, labels, source)
3. Computes collaborator quality from model's stored player ratings
4. Includes audio features (with same defaults as training if missing)
5. Computes all interactions and derived features identically

Constraint: all features must exist in model's `feature_names` list (loaded from model.joblib). Missing features are padded with 0.

### Prediction

1. Load trained model from `model.joblib` (includes `feature_names`, scaler, ridge/RF model)
2. Extract features for candidate
3. Standardize using fitted scaler
4. Predict using best model (Ridge or RF)
5. Output: scalar prediction (rounded to 2 decimals)

### Current Usage
```bash
python3 predict.py --json '{"title":"Track","artist":"Artist","energy":5,...}'
python3 predict.py --file candidates.json
python3 predict.py  # interactive mode
```

---

## 7. Evaluation

### 7.1 Cross-Validation Strategy

**Leave-One-Out (LOO)** used for both models:
- Mimics real-world usage: predict one unseen track at a time
- Unbiased: training never includes the test sample
- Computationally expensive: n model fits for n samples (feasible for n=162)

### 7.2 Metrics Computed (all on LOO predictions)

**R² (coefficient of determination)**:
```
R² = 1 - (SS_res / SS_tot)
   = 1 - (Σ(y_i - ŷ_i)² / Σ(y_i - ȳ)²)
```
- Range: -∞ to 1
- Interpretation: proportion of variance explained; >0 is better than mean baseline
- Current: Ridge 0.0602, RF 0.1803

**RMSE (root mean squared error)**:
```
RMSE = √(Σ(y_i - ŷ_i)² / n)
```
- Same units as target (rating points)
- Current: Ridge 2.204, RF 2.0584

**MAE (mean absolute error)**:
```
MAE = Σ|y_i - ŷ_i| / n
```
- Same units as target
- Less sensitive to outliers than RMSE
- Current: Ridge 1.8071, RF 1.6997

### 7.3 Rating Change Tracking

`extract_rating_changes()` analyzes `rating_history` field:
- Identifies tracks where rating was changed (history has >1 entry)
- Computes change direction (improved/downgraded) and magnitude
- Sorts by date descending
- Exported to `dashboard-data.json["history"]`

### 7.4 Per-Cluster Evaluation

Distributions computed per cluster:
- Rating histogram for each cluster
- Cluster-wide mean rating
- Cluster-wide silhouette score (cohesion metric from KMeans)

### 7.5 Prediction Residuals

For every prediction:
- `residual = actual - predicted`
- Positive residual: model underestimated (predicted too low)
- Negative residual: model overestimated (predicted too high)
- Sorted by absolute residual descending to find biggest misses

---

## 8. Current Metrics (v6.00)

### 8.1 Dataset
- Total tracks: 162
- Total albums: 3
- Total rated items: 165

### 8.2 Model Performance (v6.00)

| Metric | Ridge | Random Forest | Change |
|--------|-------|---------------|--------|
| R² | **0.2478** | 0.2374 | Ridge +312% ↑ (from v5.11: 0.0602) |
| RMSE | **1.9717** | 1.9854 | Ridge -10.5% ↓ |
| MAE | **1.605** | 1.6048 | Ridge -11.2% ↓ |
| Best Alpha / Depth | 0.01 / — | — / 3 | — |

Best model: **Ridge** (now outperforms Random Forest for first time)

### 8.3 Features
- Total features engineered: 154 (v6.00+)
  - Base features: 109
  - v6.00 additions: 45 new musically-informed features
- Common subgenres: 19 (threshold ≥3)
- Common labels: 13 (threshold ≥3)
- Eras in dataset: 6–8 (varies)

**v6.00 Feature Categories:**
1. Artist × Era/Decade (3): artist_era_bayes_rating, artist_decade_bayes_rating, artist_recent_period_delta
2. Ballad Splits (6): instrumental_ballad, vocal_ballad_penalty, ballad_acousticness, ballad_low_energy, ballad_high_instrumentalness, is_ballad
3. Enhanced Collaborators (5): best_collaborator_rating, top2_collaborator_mean, favorite_collaborator_count, collaborator_rating_variance, has_elite_collaborator
4. Label × Decade (4): label_decade_bayes_rating, prestige_1950s_1960s, blue_note_1950s_1960s, impulse_1960s
5. Confidence Metrics (5): artist_rating_count_log, artist_rating_variance, artist_bayes_confidence, collaborator_count_log, collaborator_bayes_confidence
6. Recency (2): rating_order_percentile, is_recent
7. Musical Interactions (11): hard_bop_medium_energy, hard_bop_instrumental, modal_low_energy, free_jazz_high_complexity_penalty, swing_big_band_penalty, energy_x_instrumentalness, complexity_x_instrumentalness, valence_x_instrumentalness, energy_x_ballad, complexity_x_ballad, era_x_energy (4 variants)
8. Missingness Indicators (6): missing_energy, missing_valence, missing_acousticness, missing_instrumentalness, missing_audio_any, missing_audio_count

### 8.4 Clustering
- Best k (via silhouette score): 2 or 3 (typically 3 in recent versions)
- Silhouette score: ~0.3–0.5 (moderate cluster separation)
- Cluster size range: 37–80 tracks per cluster

### 8.5 Rating Distribution
- Bin range: 1–10
- Mode: 8–10 (high ratings preferred)
- Mean: ~6.5–7.0
- Std dev: ~2.0–2.5

### 8.6 Artist Statistics
- Artists in dataset: ~50–80
- Top artist (Miles Davis): 10+ tracks
- Median artist tracks: 2
- Bayesian smoothing constant (k): 15

### 8.7 Audio Features Coverage
- Tracks with ReccoBeats features: ~150 (92%)
- Tracks with synthetic audio defaults: ~12 (8%)
- Mood zone coverage: ~160 (can compute for ~99%)

### 8.8 Correlation Analysis
Top 10 features by Pearson correlation with rating (computed annually or per major version):
- Example top correlators (not definitive, varies by version):
  - Artist Avg Rating (expected high positive)
  - Collaborator Quality
  - Spotify Popularity
  - Liveness Score
  - Acousticness

---

## 9. System Architecture

### 9.1 Data Flow

```
training-data.json
    ↓
train.py ──┬──→ dashboard-data.json (React dashboard input)
           ├──→ model.joblib (predict.py loads this)
           └──→ versions.json (versioning metadata)

predict.py (uses model.joblib + feature logic)
    ↓
score candidate track → prediction (1–10)

Dashboard (React + Vite)
    ↓
Visualizations (33 panels consuming dashboard-data.json)
```

### 9.2 Key Files and Purposes

| File | Purpose | Updated By |
|------|---------|-----------|
| `training-data.json` | Source of truth; all ratings and metadata | User (logging) |
| `train.py` | Pipeline orchestration | train.py script |
| `predict.py` | Candidate scoring | User or automated flow |
| `model.joblib` | Serialized trained model (Ridge or RF + scaler) | train.py |
| `dashboard-data.json` | Pre-computed outputs for React dashboard | train.py |
| `versions.json` | Version manifest with metrics history | train.py |
| `versions/v{X.YY}/` | Snapshots for major versions (if --major flag used) | train.py --major |
| `src/components/panels/` | 33 React panel components | Frontend edits |
| `docs/` | GitHub Pages build output | npm run build |

### 9.3 Dependencies

Python:
- numpy, pandas, scikit-learn (core ML)
- joblib (model serialization)
- scipy (statistical functions)

Frontend:
- React, Vite
- Chart.js (charting library)

### 9.4 Versioning Scheme

Semantic-like versioning: `MAJOR.MINOR` (e.g., 5.11)

- **Minor bump** (5.10 → 5.11): automatic on each `train.py` run, no snapshot
- **Major bump** (5.xx → 6.00): `train.py --major`, creates `versions/v6.00/` snapshot

Snapshot contents: frozen `dashboard-data.json`, `model.joblib`, `training-data.json` (immutable record)

---

## 10. Dashboard Visualization (Frontend)

### 10.1 Pages

1. **Dashboard** (`/`) — Main page; 33 panel components
2. **Compare** (`/compare`) — Side-by-side version comparison
3. **Review** (`/review`) — Manual track rating interface
4. **Dictionary** (`/dictionary`) — Feature definitions
5. **Playlists** (`/playlists`) — Spotify playlist matching

### 10.2 Panel Categories

- **Model Performance**: Predicted vs Actual, Rating Distribution, Biggest Misses, Residuals
- **Features**: Top Features, Correlations, Feature Heatmap, Top Drivers (Ridge only)
- **Clusters**: Cluster Scatter, Cluster Profiles, Cluster Insights
- **Taste**: Artist Journeys, Mood Zone Breakdowns, Instrument/Label Breakdown
- **Metadata**: Era Distribution, Harmonic Complexity, Discovery Source, Year/Duration trends

### 10.3 Data Source

All panels read from `dashboard-data.json` fetched at page load; version selectable via dropdown.

---

## 11. Candidate Scoring Workflow (End-to-End Example)

1. **User finds a jazz track** (e.g., Ornette Coleman's "Lonely Woman")
2. **Collects metadata**: title, artist, energy, tempo, instrumentation, subgenres, audio features, etc.
3. **Calls predict.py** with JSON or interactive input
4. **predict.py executes**:
   - Load `model.joblib` (contains feature_names, best_model, scaler, fitted model)
   - Extract features for candidate (using same `engineer_features` logic)
   - Standardize features
   - Predict using best model (Ridge or RF)
   - Return score (e.g., 7.34 out of 10)
5. **User reviews prediction** alongside model explainability (feature importance, top drivers)
6. **User listens to track** and logs actual rating to `training-data.json`
7. **Next `train.py` run** retrains model with new data, updates dashboard, versioning

---

## 12. Constraints and Assumptions

- **Dataset size**: Designed for ~100–500 rated tracks; extreme scale (>10k) untested
- **Feature relationships**: Model assumes additive feature contributions (Ridge) or tree-based interactions (RF); nonlinear manifold relationships may not be captured
- **Missing data**: Audio features default to neutral values; may introduce bias for unscraped tracks
- **Temporal stability**: Model doesn't account for taste drift over time (no time-decay weighting)
- **Cold start**: New artists with <k=15 tracks heavily smoothed toward global mean; may take 15+ tracks to establish strong personal signal
- **Ordinal target**: Target is 1–10 rating, treated as continuous; no explicit ordinal loss function
- **Clustering stability**: KMeans is sensitive to initialization; `random_state=42` makes deterministic but not globally optimal
- **Cross-validation cost**: LOO CV is slow (n model refits); not feasible at extreme scale

---

## 13. Deployment and Maintenance

### Retraining
```bash
python3 train.py        # minor version bump, no snapshot
python3 train.py --major --notes "Description"  # major version, creates snapshot
```

### Building Dashboard
```bash
npm run build           # transpiles frontend, copies data files to docs/
git add docs/ && git commit && git push  # pushes to GitHub Pages
```

### Candidate Scoring
```bash
python3 predict.py --json '{"title":"...","artist":"...","energy":5,...}'
```

### Monitoring
- Compare R² and RMSE across versions via Compare page (v5.10 vs v5.11, etc.)
- Review biggest misses to identify model blindspots
- Check cluster coherence via silhouette scores in cluster panel

---

## 14. Open Questions and Limitations

- **Low R² (0.18)**: Indicates rating prediction is hard; dataset may be too small, taste too idiosyncratic, or features insufficient
- **Imbalanced classes**: Most ratings 8–10; few 1–5 (model may underpredict low ratings)
- **Audio feature lag**: 12 tracks lack ReccoBeats; model uses synthetic defaults (may hurt predictions for those tracks)
- **Artist cold start**: Artists with 1–2 tracks pulled toward global mean; does not reflect true taste for rare artists

---

**End of Technical Specification**

This document describes the system as it currently exists: input data structures, feature engineering, model training pipeline, cross-validation strategy, metrics computation, candidate prediction, visualization infrastructure, and deployment workflow.
