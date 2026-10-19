# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users
Justin, inspecting his own jazz taste model: ratings, clusters, feature importance, and recommendations. Desktop first, with occasional phone checks.

## Product Purpose
A read-only analysis surface for the jazz recommendation pipeline. It explains what the model learned, where it is uncertain, and what to listen to next. It also hosts the review/listen flows that feed ratings back to Postgres.

## Positioning
A model-inspection dashboard, not a music player: every panel is a diagnostic view of feature importance, taste clusters, prediction misses, and listener behavior.

## Operating Context
Used after retraining or while deciding what to listen to next. Numbers come from the training pipeline and the tracks database; freshness matters more than decoration.

## Capabilities and Constraints
React + Vite dashboard reading Postgres-backed JSON via Vercel. Panels cover taste summary, metrics, clusters, feature importance, correlations, misses, year/duration effects, sound DNA, artists, labels, discovery, albums, and changelog. Scoring API is separate.

## Brand Commitments
Midnight navy with amber and blue data accents. Analytical, dense, and honest about uncertainty. No emojis.

## Evidence on Hand
Real model metrics, ratings, and track data from the pipeline. No invented benchmarks or claims.

## Product Principles
1. Show the model's reasoning, including what it gets wrong.
2. Dense information is fine; unreadable information is not.
3. Panels are for scanning, not decoration.
4. Fresh numbers beat pretty numbers.
5. Every chart has a plain-language takeaway.

## Accessibility & Inclusion
Body, label, and placeholder text at 4.5:1 or better; functional text at 11px or larger; visible focus; reduced motion respected.
