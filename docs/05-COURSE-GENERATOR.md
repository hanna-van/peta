# Course Generator

## Goal
Generate realistic training courses, not arbitrary random points.

## Default
- 10 controls
- difficulty selectable
- reproducible seed
- configurable minimum/maximum leg distance
- optional elevation target
- start and finish
- course validation

## Candidate scoring
A candidate control/leg can consider:
- distance
- elevation change
- direction change
- terrain complexity
- number of plausible route choices
- attack-point quality
- visibility/feature availability where data supports it
- proximity to other controls
- boundary safety

Do not pretend that unavailable terrain semantics exist. Missing data lowers confidence.

## Difficulty
Difficulty should be derived from measurable factors and documented. Avoid a black-box score with no explanation.

## Validation
Reject or regenerate courses that:
- place controls outside the training area,
- overlap excessively,
- produce impossible/unsafe geometry,
- have insufficient spacing,
- violate configured constraints,
- depend on missing data without a clear fallback.

## Reproducibility
Store:
- seed
- generator version
- parameters
- map version
- generated_at

Changing the algorithm version must not silently mutate old courses.
