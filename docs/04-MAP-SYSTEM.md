# Map System

## Map layers
### Base geographic data
Potential sources:
- OpenStreetMap for roads, paths, buildings, water, and other mapped features.
- DEM/elevation provider for terrain and contour generation.
- Imagery may be used as a reference where licensing/provider terms permit.

### Training map
Processed and styled geographic information intended for training.

### Course overlay
Start, controls, finish, course line, and optional route/reference overlays.

## Important distinction
A generated training map is not automatically an official IOF competition map. If an official or professionally prepared map is imported, preserve it as an imported source and do not silently alter its semantics.

## Spatial data
Use PostGIS geometry with a documented SRID strategy. Prefer WGS84 (EPSG:4326) for stored GPS coordinates unless a specific projected CRS is needed for calculations; use appropriate projected transformations for distance/area calculations where necessary.

## Map provider abstraction
Implement provider interfaces so OSM/elevation/imagery sources can be changed without rewriting the application.

## Map features
Support points, lines, and polygons. Feature types should be explicit and extensible:
- trail
- road
- building
- water
- vegetation
- fence
- ditch
- boulder
- tree
- open_area
- contour
- other

## Rendering
Use MapLibre GL JS. Keep map styling separate from business logic. The map must remain responsive on mobile.
