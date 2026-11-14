import { Eyebrow } from '../ui/Eyebrow'

/** Recuadro con retícula y una mira lima en el punto de la parcela (referencia, sin mapa real). */
export function MapFrame({ lat, lng }: { lat: string | number | null; lng: string | number | null }) {
  const has = lat !== null && lat !== '' && lng !== null && lng !== ''
  return (
    <figure className="m-0">
      <div
        role="img"
        aria-label={has ? `Punto de la parcela en ${lat}°, ${lng}°` : 'Sin ubicación todavía'}
        className="relative h-52 w-full overflow-hidden border border-edge bg-bg"
        style={{
          backgroundImage:
            'linear-gradient(#25332b 1px, transparent 1px), linear-gradient(90deg, #25332b 1px, transparent 1px)',
          backgroundSize: '32px 32px',
        }}
      >
        {has && (
          <>
            <span className="absolute left-0 top-1/2 h-px w-full bg-lima/60" />
            <span className="absolute left-1/2 top-0 h-full w-px bg-lima/60" />
            <span className="absolute left-1/2 top-1/2 h-8 w-8 -translate-x-1/2 -translate-y-1/2 border-2 border-lima" />
            <span className="absolute left-1/2 top-1/2 h-1.5 w-1.5 -translate-x-1/2 -translate-y-1/2 bg-lima" />
          </>
        )}
        <span className="absolute bottom-2 left-2 bg-bg px-1 font-mono text-[13px] text-muted">
          {has ? `${lat}°, ${lng}°` : '—'}
        </span>
      </div>
      <figcaption className="mt-1">
        <Eyebrow>Referencia de ubicación</Eyebrow>
      </figcaption>
    </figure>
  )
}
