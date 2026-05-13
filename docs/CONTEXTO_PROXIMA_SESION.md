# Contexto para la próxima sesión

> Sesión cerrada: 2026-05-13
> Esta sesión implementó la sección "Elementos Viales" en el sidebar (carriles bus + aparcamiento SER).
> La sección está integrada pero hay **deuda técnica pendiente** antes de que sea usable.

---

## Lo que hizo esta sesión

### 1. Nueva sección "Elementos Viales" en el sidebar

Añade entre las secciones "Paradas" y "Otros" un nuevo acordeón con dos capas:

- **Carriles bus**: linestrings de los carriles reservados al autobús en Madrid. Color naranja.
- **Aparcamiento en bandas SER**: tramos de aparcamiento regulado filtrados por las líneas seleccionadas. En calles de un carril (campo `Bateria_Linea` empieza por "L") se muestran ambos lados; en calles de varios carriles se calcula el lado derecho mediante producto vectorial y se descartan los del lado izquierdo.

**Archivos nuevos:**
- `scripts/descargar_carriles_bus_madrid.py` — descarga red OSM con `osmnx`
- `scripts/descargar_aparcamiento_ser_madrid.py` — descarga bandas SER de SIGMA
- `scripts/compute_elementos_viales.py` — post-proceso: genera `public/data/bus_lanes.geojson` y `public/data/parking_bands.geojson`
- `src/layers/createBusLanesLayer.js`
- `src/layers/createParkingBandsLayer.js`
- `src/components/map/ElementosVialesPanel.jsx`

**Archivos modificados:**
- `src/store/useMapStore.js` — `showBusLanes`, `showParkingBands` + selectores
- `src/utils/useGTFSData.js` — fetches de los dos GeoJSON opcionales
- `src/App.jsx` — imports, hooks, layers, props sidebar
- `src/components/map/Sidebar.jsx` — nueva `AccordionSection` + import

---

## ⚠️ Deuda técnica pendiente — RESOLVER EN LA PRÓXIMA SESIÓN

### DT-1 · Error en `descargar_carriles_bus_madrid.py` (BLOQUEANTE)

**Síntoma:** el script falla con `400 Bad Request` de Overpass al usar `osmnx.graph_from_place` con `custom_filter` que contiene `|`.

```
osmnx._errors.ResponseStatusCodeError: 'overpass-api.de' responded: 400 Bad Request
Error: line 1: parse error: ';' expected - '|' found.
```

**Causa:** `osmnx` construye la query Overpass concatenando los filtros con `|`, pero la sintaxis válida de Overpass QL para varios tags es hacer varias sentencias `way[tag1]; way[tag2];` dentro de un `union` — no con `|`. El `custom_filter` de `osmnx` acepta **un solo selector**, no varios OR separados por `|`.

**Solución propuesta:** hacer N llamadas separadas a `osmnx.graph_from_place`, una por cada tag (`busway`, `bus:lanes`, `bus:lanes:forward`, `bus:lanes:backward`), y luego combinar los GeoDataFrames con `pd.concat` + `drop_duplicates`. Ejemplo:

```python
import osmnx as ox
import geopandas as gpd

tags_to_try = [
    '["busway"]',
    '["bus:lanes"]',
    '["bus:lanes:forward"]',
    '["bus:lanes:backward"]',
]
gdfs = []
for tag_filter in tags_to_try:
    try:
        G = ox.graph_from_place("Madrid, Spain", custom_filter=f'["highway"]{tag_filter}', retain_all=True)
        _, edges = ox.graph_to_gdfs(G)
        gdfs.append(edges)
    except Exception as e:
        print(f"  Sin resultados para {tag_filter}: {e}")
if gdfs:
    combined = gpd.pd.concat(gdfs).drop_duplicates(subset=['osmid'] if 'osmid' in gdfs[0].columns else None)
```

Alternativamente, usar directamente la API Overpass con `requests` (como hacía el script original de SIGMA) y un mirror que funcione (`overpass.kumi.systems` fue el único que respondió sin timeout en esta sesión).

### DT-2 · El aparcamiento SER no se visualiza en el mapa (pendiente de verificar)

El GeoJSON `parking_bands.geojson` **sí tiene geometrías válidas** (verificado: 28.211 features, tipo `LineString`, coordenadas en EPSG:4326). El filtro por `visibleRouteIds` funciona correctamente en Node.

Se añadió `stroked: true`, `filled: false`, `lineWidthMinPixels: 1` al `GeoJsonLayer` en `createParkingBandsLayer.js`. **Esto no se ha podido verificar en el navegador** porque la sesión terminó antes.

**Acción en la próxima sesión:** arrancar `npm run dev`, activar el checkbox "Aparcamiento SER" con líneas seleccionadas y verificar si aparecen los tramos de colores. Si no aparece, abrir DevTools → consola → buscar errores del layer de Deck.gl.

### DT-3 · Los carriles bus tienen geometría nula en el GeoPackage de SIGMA

**Contexto:** la fuente original (`RED_ESTRUCTURANTE/MapServer/2`, layer "Calzadas") devuelve geometría `null` en todas las peticiones (incluyendo GeoJSON y esriJSON). Esto se descubrió en esta sesión y por eso se cambió a osmnx/OSM.

Una vez resuelto DT-1, hay que regenerar:
```bash
python scripts/descargar_carriles_bus_madrid.py     # re-descarga con OSM
python scripts/compute_elementos_viales.py           # regenera los dos GeoJSON
```

---

## Estado git al cerrar

Rama activa: `feature/coverage-poblacional`. Hay un commit de cierre de esta sesión con todo el código implementado.

Archivos modificados respecto a `main`:
```
src/store/useMapStore.js
src/utils/useGTFSData.js
src/App.jsx
src/components/map/Sidebar.jsx
src/layers/createBusLanesLayer.js       (nuevo)
src/layers/createParkingBandsLayer.js   (nuevo)
src/components/map/ElementosVialesPanel.jsx (nuevo)
scripts/descargar_carriles_bus_madrid.py    (reescrito para OSM)
scripts/descargar_aparcamiento_ser_madrid.py (nuevo)
scripts/compute_elementos_viales.py         (nuevo)
```

---

## Cosas a verificar en la próxima sesión

1. Resolver DT-1: arreglar `descargar_carriles_bus_madrid.py` con llamadas separadas por tag
2. Ejecutar: `python scripts/descargar_carriles_bus_madrid.py` → `python scripts/compute_elementos_viales.py`
3. `npm run dev` → abrir la sección "Elementos Viales" → activar "Carriles bus" → deben aparecer líneas naranjas
4. Activar "Aparcamiento SER" con líneas seleccionadas → deben aparecer tramos de colores (DT-2)
5. Verificar que al deseleccionar todas las líneas la capa de aparcamiento desaparece

---

## Roadmap a partir de aquí

Una vez resueltos los bugs de Elementos Viales:

Del [docs/IDEACION.md](IDEACION.md), por prioridad:

- **2.1 Animación temporal** — slider/play sobre el rango horario que anima el coloreado de frecuencia
- **1.2 Métricas agregadas por barrio** — al pinchar un barrio: líneas, paradas, frecuencia media, cobertura
- **6.5 Pulir sidebar móvil** — drag-handle, snap a alturas, cierre por swipe-down
- **5.1 Code-splitting** — bundle grande: `manualChunks` + `lazy import` en componentes pesados
