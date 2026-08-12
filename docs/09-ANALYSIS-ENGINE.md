# Analysis Engine

## Philosophy
Analysis must be actionable and honest about uncertainty.

## Core metrics
- total duration
- total distance
- elevation gain
- controls found
- per-leg duration
- per-leg distance
- average/max speed where data quality supports it
- route efficiency when a reference is valid

## Potential navigation errors
A flag can be triggered by combinations of:
- sustained deviation from a planned/reference corridor,
- unexpected distance increase,
- direction inconsistency,
- stopping/slowdown in a context that suggests searching.

Every flag must have:
- timestamp,
- leg,
- confidence,
- reason,
- estimated impact.

Use wording like:
"Potensi keluar jalur — kepercayaan sedang"
not:
"Kesalahan navigasi terdeteksi" unless the evidence is strong.

## Time loss
Time loss is an estimate. Document the baseline used. Never present an estimate as a measured fact.

## Leg analysis
For every leg show:
- start/end CP
- time
- distance
- elevation
- major events
- potential issue
- concise coaching note

## Long-term analysis
Aggregate sessions only when comparable:
- same/similar course,
- same map,
- comparable difficulty,
- enough GPS quality.

Avoid misleading comparisons across fundamentally different courses.
