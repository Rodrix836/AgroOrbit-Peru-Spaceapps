import L from 'leaflet'
import 'leaflet/dist/leaflet.css'
import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { MapContainer, Marker, Rectangle, TileLayer, useMap, useMapEvents } from 'react-leaflet'
import { useLanguage } from '../../i18n/LanguageContext'
import { formatDay } from '../../utils/format'
import { formatDegrees, parseCoord, powerCell, utcDaysAgo } from '../../utils/powerGrid'
import { Button } from '../ui/Button'
import { Eyebrow } from '../ui/Eyebrow'
import './plotMap.css'

const OSM_URL = 'https://tile.openstreetmap.org/{z}/{x}/{y}.png'
const OSM_ATTRIBUTION = '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'

// NASA GIBS (WMTS, EPSG:3857, sin clave). Capa y juego de teselas confirmados en el GetCapabilities de GIBS:
// MODIS_Terra_CorrectedReflectance_TrueColor, imagen JPEG, GoogleMapsCompatible_Level9 (zoom nativo hasta 9),
// dimensión Time diaria (AAAA-MM-DD, UTC).
const GIBS_LAYER = 'MODIS_Terra_CorrectedReflectance_TrueColor'
const GIBS_ATTRIBUTION = '<a href="https://earthdata.nasa.gov/gibs">NASA GIBS / EOSDIS</a>'
/** El día de hoy puede no estar publicado todavía: se pide el de hace 3 días. */
const GIBS_DAYS_AGO = 3
const GIBS_TIMEOUT_MS = 15000

const PERU_CENTER: [number, number] = [-9.2, -75.0]
const PERU_ZOOM = 5

const PIN = L.divIcon({ className: '', html: '<span class="agro-pin"></span>', iconSize: [22, 22], iconAnchor: [11, 11] })

type Sat = 'off' | 'loading' | 'on' | 'error'

/** Celular o pantalla angosta: un dedo desplaza la página; el mapa se mueve solo si se pulsa «Activar mapa». */
function useGestureLock(): boolean {
  const query = '(pointer: coarse), (max-width: 767px)'
  const [lock, setLock] = useState(() => (typeof window !== 'undefined' ? window.matchMedia(query).matches : false))
  useEffect(() => {
    const mq = window.matchMedia(query)
    const on = () => setLock(mq.matches)
    mq.addEventListener('change', on)
    on()
    return () => mq.removeEventListener('change', on)
  }, [])
  return lock
}

/** Activa o bloquea el arrastre y el zoom táctil del mapa. */
function Interaction({ active }: { active: boolean }) {
  const map = useMap()
  useEffect(() => {
    const handlers = [map.dragging, map.touchZoom, map.doubleClickZoom, map.scrollWheelZoom, map.boxZoom]
    for (const h of handlers) {
      if (active) h.enable()
      else h.disable()
    }
  }, [map, active])
  return null
}

/** Mantiene a la vista el punto: la primera posición ajusta el mapa a su celda; después solo se mueve si queda fuera. */
function FollowPoint({ pos, bounds }: { pos: [number, number] | null; bounds: L.LatLngBoundsExpression | null }) {
  const map = useMap()
  const had = useRef(false)
  const lat = pos?.[0]
  const lng = pos?.[1]
  useEffect(() => {
    if (lat === undefined || lng === undefined || !bounds) {
      had.current = false
      return
    }
    if (!had.current) {
      had.current = true
      map.fitBounds(bounds, { padding: [24, 24], animate: false })
    } else if (!map.getBounds().contains([lat, lng])) {
      map.setView([lat, lng], Math.max(map.getZoom(), 8), { animate: false })
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [map, lat, lng])
  return null
}

function ClickToPlace({ onPick }: { onPick: (lat: number, lng: number) => void }) {
  useMapEvents({
    click(e) {
      onPick(e.latlng.lat, e.latlng.lng)
    },
  })
  return null
}

/**
 * Mapa de la parcela (Leaflet + OpenStreetMap). Con `lat`/`lng` válidos muestra el marcador y, en azul, la celda de la
 * rejilla meteorológica de NASA POWER (½° × ⅝°) cuyo centro está más cerca. Con `onPick`, un clic en el mapa coloca el
 * punto. Capa satelital opcional de NASA GIBS (MODIS, color real); si no carga, el mapa base sigue funcionando.
 */
export default function PlotMap({
  lat,
  lng,
  onPick,
}: {
  lat: string | number | null
  lng: string | number | null
  /** Con esta función, un clic en el mapa coloca el punto (se usa al registrar una parcela). */
  onPick?: (lat: number, lng: number) => void
}) {
  const la = parseCoord(lat, -90, 90)
  const lo = parseCoord(lng, -180, 180)
  const pos: [number, number] | null = la !== null && lo !== null ? [la, lo] : null
  const cell = useMemo(() => (la !== null && lo !== null ? powerCell(la, lo) : null), [la, lo])

  // Imagen satelital de NASA GIBS (apagada por defecto).
  const gibsDate = useMemo(() => utcDaysAgo(GIBS_DAYS_AGO), [])
  const [sat, setSat] = useState<Sat>('off')
  const tiles = useRef({ ok: 0, err: 0 })
  const toggleSat = () => {
    tiles.current = { ok: 0, err: 0 }
    setSat((s) => (s === 'off' || s === 'error' ? 'loading' : 'off'))
  }
  // Si pasado un rato no llegó ninguna tesela, se avisa.
  useEffect(() => {
    if (sat !== 'loading') return
    const t = window.setTimeout(() => {
      if (tiles.current.ok === 0) setSat('error')
    }, GIBS_TIMEOUT_MS)
    return () => window.clearTimeout(t)
  }, [sat])
  const satHandlers = useMemo(
    () => ({
      tileload: () => {
        tiles.current.ok += 1
        setSat((s) => (s === 'loading' ? 'on' : s))
      },
      tileerror: () => {
        tiles.current.err += 1
      },
      load: () => {
        if (tiles.current.ok === 0 && tiles.current.err > 0) setSat('error')
      },
    }),
    [],
  )

  // Celular: el mapa empieza bloqueado para no atrapar el scroll de la página.
  const lock = useGestureLock()
  const [unlocked, setUnlocked] = useState(false)
  const active = !lock || unlocked
  const onPickRef = useCallback((a: number, b: number) => onPick?.(a, b), [onPick])

  const { t } = useLanguage()
  const label = pos ? t('map.ariaWith', { lat: pos[0], lng: pos[1] }) : t('map.ariaWithout')

  return (
    <figure className="m-0 min-w-0">
      {/* Barra de controles: imagen satelital y, en celular, activar el mapa */}
      <div className="mb-2 flex flex-wrap items-center gap-x-4 gap-y-2">
        <button
          type="button"
          role="switch"
          aria-checked={sat !== 'off' && sat !== 'error'}
          onClick={toggleSat}
          className="inline-flex min-h-[44px] w-full items-center justify-start gap-3 border border-edge bg-panel px-3 py-1 text-left text-ink hover:border-cielo sm:w-auto"
        >
          <span
            aria-hidden
            className={`inline-flex h-5 w-9 items-center border ${
              sat === 'on' || sat === 'loading' ? 'justify-end border-cielo bg-cielo/20' : 'justify-start border-edge'
            }`}
          >
            <span className={`h-3.5 w-3.5 ${sat === 'on' || sat === 'loading' ? 'bg-cielo' : 'bg-muted'}`} />
          </span>
          <span className="font-medium">{t('map.satellite')}</span>
          <span className="font-mono text-[13px] uppercase tracking-[0.12em] text-muted">
            {sat === 'on' || sat === 'loading' ? t('map.on') : t('map.off')}
          </span>
        </button>
        {lock && (
          <Button
            type="button"
            variant={unlocked ? 'primary' : 'outline'}
            aria-pressed={unlocked}
            onClick={() => setUnlocked((u) => !u)}
          >
            {unlocked ? t('map.release') : t('map.activate')}
          </Button>
        )}
      </div>

      {sat === 'error' && (
        <p role="status" className="mb-2 font-medium text-ambar">
          {t('map.satUnavailable')}
          <span className="font-normal text-muted"> {t('map.baseStillWorks')}</span>
        </p>
      )}
      {sat === 'loading' && (
        <p role="status" className="mb-2 text-muted">
          {t('map.satLoading')}
        </p>
      )}

      <div
        role="group"
        aria-label={label}
        className="relative h-[280px] w-full overflow-hidden border border-edge bg-bg md:h-[360px]"
      >
        <MapContainer
          center={cell ? cell.center : PERU_CENTER}
          zoom={PERU_ZOOM}
          bounds={cell ? cell.bounds : undefined}
          boundsOptions={{ padding: [24, 24] }}
          minZoom={3}
          maxZoom={18}
          className={`agro-map h-full w-full ${onPick ? 'agro-pick' : ''}`}
          scrollWheelZoom
        >
          <TileLayer url={OSM_URL} attribution={OSM_ATTRIBUTION} maxZoom={19} className="agro-osm-dark" />
          {(sat === 'loading' || sat === 'on') && (
            <TileLayer
              key={gibsDate}
              url={`https://gibs.earthdata.nasa.gov/wmts/epsg3857/best/${GIBS_LAYER}/default/${gibsDate}/GoogleMapsCompatible_Level9/{z}/{y}/{x}.jpeg`}
              attribution={GIBS_ATTRIBUTION}
              maxNativeZoom={9}
              maxZoom={19}
              eventHandlers={satHandlers}
            />
          )}
          {cell && (
            <Rectangle
              bounds={cell.bounds}
              interactive={false}
              pathOptions={{ color: '#7fbbff', weight: 2, fillColor: '#7fbbff', fillOpacity: 0.12, lineJoin: 'miter' }}
            />
          )}
          {pos && <Marker position={pos} icon={PIN} alt={t('map.markerAlt')} keyboard={false} interactive={false} />}
          <FollowPoint pos={pos} bounds={cell ? cell.bounds : null} />
          <Interaction active={active} />
          {onPick && <ClickToPlace onPick={onPickRef} />}
        </MapContainer>
      </div>

      {lock && !unlocked && (
        <p className="mt-2 text-muted">{t('map.lockedHint')}</p>
      )}
      {onPick && <p className="mt-2 text-ink">{pos ? t('map.pickChange') : t('map.pickFirst')}</p>}

      {/* Satélite: fecha de la imagen y fuente (siempre visibles) */}
      <p className="mt-2 font-mono text-base text-muted">
        {t('map.satLine', { date: formatDay(gibsDate) })}
      </p>

      {/* Leyenda */}
      <figcaption className="mt-4 border-t border-line pt-3">
        <Eyebrow className="mb-2">{t('map.legendTitle')}</Eyebrow>
        <ul className="space-y-2">
          <li className="flex items-center gap-3 text-ink">
            <span aria-hidden className="agro-swatch-pin" />
            <span>
              {t('map.legendPoint')}
              {pos ? (
                <span className="font-mono text-base text-muted">
                  {' '}
                  · {pos[0].toFixed(4)}°, {pos[1].toFixed(4)}°
                </span>
              ) : (
                <span className="text-muted"> {t('map.legendNoLocation')}</span>
              )}
            </span>
          </li>
          <li className="flex items-start gap-3 text-ink">
            <span aria-hidden className="agro-swatch-cell mt-1.5" />
            <span>
              {t('map.legendCell')}
            </span>
          </li>
        </ul>
        {cell && (
          <p className="mt-2 font-mono text-base text-muted">
            {t('map.cellDetail', {
              south: formatDegrees(cell.bounds[0][0], 'lat'),
              north: formatDegrees(cell.bounds[1][0], 'lat'),
              west: formatDegrees(cell.bounds[0][1], 'lng'),
              east: formatDegrees(cell.bounds[1][1], 'lng'),
            })}
          </p>
        )}
      </figcaption>
    </figure>
  )
}
