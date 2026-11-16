import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePlot } from '../../hooks/usePlot'
import { USE_MOCKS } from '../../services/api'
import { Eyebrow } from '../ui/Eyebrow'
import { labelClass } from '../ui/styles'
import { useGuidePageData } from './data'
import { questionsFor, routeOf, type GuideAnswer, type GuideData, type GuideQuestion } from './questions'

/** Icono propio: un pequeño satélite en trazos rectos (cuerpo, dos paneles solares y una antena). */
function SatelliteIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinejoin="miter" strokeLinecap="butt" aria-hidden>
      <rect x="9" y="9" width="6" height="6" />
      <rect x="1.5" y="10" width="5.5" height="4" />
      <rect x="17" y="10" width="5.5" height="4" />
      <path d="M7 12h2M15 12h2M12 9V5M10 5h4M12 15v3" />
    </svg>
  )
}

/** true si la persona pidió menos movimiento: sin balanceo, sin deslizamiento y sin efecto de escritura. */
function usePrefersReducedMotion(): boolean {
  const q = '(prefers-reduced-motion: reduce)'
  const [reduced, setReduced] = useState(() => typeof window !== 'undefined' && window.matchMedia(q).matches)
  useEffect(() => {
    const mq = window.matchMedia(q)
    const on = () => setReduced(mq.matches)
    mq.addEventListener('change', on)
    return () => mq.removeEventListener('change', on)
  }, [])
  return reduced
}

interface Message {
  id: number
  question: string
  answer: GuideAnswer
}

/** Respuesta con efecto de escritura breve. Para lectores de pantalla, el texto completo está desde el inicio. */
function AnswerBubble({ answer, instant, onProgress }: { answer: GuideAnswer; instant: boolean; onProgress: () => void }) {
  const total = useMemo(
    () => answer.blocks.reduce((n, b) => n + (b.kind === 'p' ? b.text.length : b.items.reduce((m, i) => m + i.length, 0)), 0),
    [answer],
  )
  const [shown, setShown] = useState(instant ? total : 0)
  const done = shown >= total

  useEffect(() => {
    if (instant || done) return
    // Unos 0,9 s en total sin importar el largo.
    const step = Math.max(2, Math.ceil(total / 55))
    const t = window.setInterval(() => setShown((s) => Math.min(total, s + step)), 16)
    return () => window.clearInterval(t)
  }, [instant, done, total])
  useEffect(() => {
    onProgress()
  }, [shown, onProgress])

  let left = shown
  const take = (text: string) => {
    const part = text.slice(0, Math.max(0, left))
    left -= text.length
    return part
  }

  return (
    <div className="border border-line bg-bg p-3">
      {/* Texto completo para lectores de pantalla */}
      <div className="sr-only">
        {answer.blocks.map((b, i) =>
          b.kind === 'p' ? (
            <p key={i}>{b.text}</p>
          ) : (
            <ul key={i}>
              {b.items.map((it, j) => (
                <li key={j}>{it}</li>
              ))}
            </ul>
          ),
        )}
        <p>Fuente: {answer.source}</p>
      </div>
      <div aria-hidden className="space-y-2 text-ink">
        {answer.blocks.map((b, i) => {
          if (b.kind === 'p') {
            const t = take(b.text)
            return t ? <p key={i}>{t}</p> : null
          }
          const items = b.items.map((it) => take(it))
          if (items.every((t) => !t)) return null
          return (
            <ul key={i} className="space-y-1">
              {items.map((t, j) =>
                t ? (
                  <li key={j} className="flex gap-2">
                    <span className="font-mono text-lima">–</span>
                    <span>{t}</span>
                  </li>
                ) : null,
              )}
            </ul>
          )
        })}
        {!done && <span className="inline-block h-4 w-2 animate-pulse bg-lima align-middle" />}
      </div>
      {done && (
        <div className="mt-3 space-y-2 border-t border-line pt-2">
          <p className="font-mono text-[13px] text-muted">Fuente: {answer.source}</p>
          {answer.link && (
            <Link
              to={answer.link.to}
              className="inline-flex min-h-[44px] items-center border border-lima px-3 font-medium text-lima no-underline hover:bg-panel"
            >
              {answer.link.label} →
            </Link>
          )}
        </div>
      )}
    </div>
  )
}

/**
 * Guía flotante de AgroOrbit. No usa ningún modelo de IA ni llama a servicios externos: responde con reglas y con los
 * datos que la app ya tiene cargados (ver `questions.ts`). Sin campo de texto: solo preguntas predefinidas.
 */
export function Guide() {
  const { pathname } = useLocation()
  const route = routeOf(pathname)
  const questions = questionsFor(route)
  const { plot, crops, cycles } = usePlot()
  const page = useGuidePageData()
  const reduced = usePrefersReducedMotion()

  const [open, setOpen] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const nextId = useRef(1)
  const launcher = useRef<HTMLButtonElement>(null)
  const closeBtn = useRef<HTMLButtonElement>(null)
  const bodyRef = useRef<HTMLDivElement>(null)
  const endRef = useRef<HTMLDivElement>(null)

  // Al cambiar de pantalla la conversación empieza de nuevo (las preguntas son otras).
  useEffect(() => setMessages([]), [route])

  const close = useCallback(() => {
    setOpen(false)
    window.setTimeout(() => launcher.current?.focus(), 0)
  }, [])

  // Escape cierra; al abrir, el foco pasa al botón de cerrar.
  useEffect(() => {
    if (!open) return
    closeBtn.current?.focus()
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') close()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [open, close])

  const scrollDown = useCallback(() => endRef.current?.scrollIntoView({ block: 'nearest' }), [])

  const ask = (q: GuideQuestion) => {
    const data: GuideData = { ...page, plot, crops, cycles, now: Date.now() }
    const base = q.answer(data)
    // Modo ejemplo: los datos de toda la app son de muestra, y la guía lo dice.
    const answer: GuideAnswer = USE_MOCKS
      ? {
          ...base,
          blocks: [{ kind: 'p', text: 'Modo ejemplo: los datos de la app son de muestra, no son de tu parcela.' }, ...base.blocks],
          source: `${base.source} (modo ejemplo)`,
        }
      : base
    setMessages((m) => [...m, { id: nextId.current++, question: q.text, answer }])
  }

  if (!route) return null

  if (!open) {
    return (
      <button
        ref={launcher}
        type="button"
        onClick={() => setOpen(true)}
        aria-label="Abrir la Guía de AgroOrbit"
        className={`fixed bottom-4 right-4 z-[2000] inline-flex min-h-[52px] items-center gap-2 border-2 border-lima bg-panel px-4 font-mono text-[13px] font-medium uppercase tracking-[0.12em] text-lima hover:bg-bg ${
          reduced ? '' : 'agro-sway'
        }`}
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <SatelliteIcon />
        Guía
      </button>
    )
  }

  return (
    <div
      role="dialog"
      aria-label="Guía de AgroOrbit"
      className={`fixed z-[2000] flex flex-col border border-edge bg-panel shadow-[0_0_0_1px_#0b110e] max-sm:inset-2 sm:bottom-4 sm:right-4 sm:max-h-[min(620px,calc(100dvh-6rem))] sm:w-[340px] ${
        reduced ? '' : 'agro-slide'
      }`}
    >
      <header className="flex items-start gap-3 border-b border-line p-4">
        <span className="mt-0.5 text-lima">
          <SatelliteIcon />
        </span>
        <div className="min-w-0 flex-1">
          <h2 className="font-display text-xl font-extrabold leading-tight tracking-[-0.02em] text-ink">Guía de AgroOrbit</h2>
          <p className="mt-1 text-muted">Respuestas automáticas con los datos de tu parcela. No es un asesor agronómico.</p>
        </div>
        <button
          ref={closeBtn}
          type="button"
          onClick={close}
          aria-label="Cerrar la guía"
          className="inline-flex h-11 w-11 flex-none items-center justify-center border border-edge text-ink hover:border-lima"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden>
            <path d="M2 2l12 12M14 2L2 14" />
          </svg>
        </button>
      </header>

      <div ref={bodyRef} className="min-h-0 flex-1 overflow-y-auto p-4">
        <Eyebrow tone="lima" className="mb-2">
          Elige una pregunta
        </Eyebrow>
        <ul className="space-y-2">
          {questions.map((q) => (
            <li key={q.id}>
              <button
                type="button"
                onClick={() => ask(q)}
                className="min-h-[44px] w-full border border-edge bg-bg px-3 py-2 text-left font-medium text-ink hover:border-lima"
              >
                {q.text}
              </button>
            </li>
          ))}
        </ul>

        {messages.length > 0 && (
          <div role="log" aria-live="polite" className="mt-5 space-y-4 border-t border-line pt-4">
            {messages.map((m) => (
              <div key={m.id} className="space-y-2">
                <p className={`text-lima ${labelClass}`}>Tú preguntaste</p>
                <p className="font-medium text-ink">{m.question}</p>
                <AnswerBubble answer={m.answer} instant={reduced} onProgress={scrollDown} />
              </div>
            ))}
            <div ref={endRef} />
          </div>
        )}
      </div>
    </div>
  )
}
