import { useCallback, useEffect, useMemo, useRef, useState } from 'react'
import { Link, useLocation } from 'react-router-dom'
import { usePlot } from '../../hooks/usePlot'
import { USE_MOCKS } from '../../services/api'
import { Eyebrow } from '../ui/Eyebrow'
import { labelClass } from '../ui/styles'
import { useGuidePageData } from './data'
import { questionsFor, routeOf, type GuideAnswer, type GuideData, type GuideQuestion } from './questions'

/** La mascota del proyecto (robot agricultor): WebP con transparencia en 1x y 2x, y PNG de respaldo. Alto 96 px. */
function Mascot({ className = '' }: { className?: string }) {
  return (
    <picture>
      <source type="image/webp" srcSet="/guia-robot.webp 1x, /guia-robot@2x.webp 2x" />
      <img src="/guia-robot.png" alt="" width={49} height={96} draggable={false} className={`block w-auto select-none ${className}`} />
    </picture>
  )
}

// El globo «¿Te explico esta pantalla?»: una vez cerrado (o abierta la guía) no vuelve a salir en esa sesión.
const BUBBLE_DISMISSED_KEY = 'agroorbit.guide.bubbleDismissed' // sessionStorage
const VISITED_KEY = 'agroorbit.guide.visited' // localStorage: primera visita
function readStore(kind: 'session' | 'local', key: string): string | null {
  try {
    return (kind === 'session' ? sessionStorage : localStorage).getItem(key)
  } catch {
    return null
  }
}
function writeStore(kind: 'session' | 'local', key: string, value: string) {
  try {
    const store = kind === 'session' ? sessionStorage : localStorage
    store.setItem(key, value)
  } catch {
    /* sin almacenamiento: el globo sigue funcionando en esta pantalla */
  }
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
  const [bubble, setBubble] = useState(false)
  const [messages, setMessages] = useState<Message[]>([])
  const nextId = useRef(1)
  const bubbleDismissed = useRef(readStore('session', BUBBLE_DISMISSED_KEY) === '1')
  // Primera visita: se calcula una sola vez al montar y se recuerda para las siguientes.
  const firstVisit = useRef<boolean | null>(null)
  if (firstVisit.current === null) {
    firstVisit.current = readStore('local', VISITED_KEY) !== '1'
    writeStore('local', VISITED_KEY, '1')
  }
  const hideTimer = useRef<number | undefined>(undefined)
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

  const dismissBubble = useCallback(() => {
    bubbleDismissed.current = true
    writeStore('session', BUBBLE_DISMISSED_KEY, '1')
    window.clearTimeout(hideTimer.current)
    setBubble(false)
  }, [])
  /** Muestra el globo (con el cursor, con el foco o por tiempo) salvo que ya se haya cerrado en esta sesión. */
  const showBubble = useCallback((autoHideMs?: number) => {
    if (bubbleDismissed.current) return
    window.clearTimeout(hideTimer.current)
    setBubble(true)
    if (autoHideMs) hideTimer.current = window.setTimeout(() => setBubble(false), autoHideMs)
  }, [])
  const hideBubbleSoon = useCallback(() => {
    window.clearTimeout(hideTimer.current)
    hideTimer.current = window.setTimeout(() => setBubble(false), 1800)
  }, [])
  const toggle = () => {
    if (open) return close()
    dismissBubble() // ya la abrió: el globo no hace falta más en esta sesión
    setOpen(true)
  }

  // Primera visita: el globo aparece a los 5 s y se repite cada 45 s (9 s visible) hasta que se cierre o se abra la guía.
  useEffect(() => {
    if (!route || open || !firstVisit.current) return
    const first = window.setTimeout(() => showBubble(9000), 5000)
    const every = window.setInterval(() => showBubble(9000), 45000)
    return () => {
      window.clearTimeout(first)
      window.clearInterval(every)
    }
  }, [route, open, showBubble])

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

  return (
    <>
      {/* La mascota: botón fijo abajo a la izquierda (16 px de margen; el padding agranda la zona táctil). */}
      <button
        ref={launcher}
        type="button"
        onClick={toggle}
        onMouseEnter={() => !open && showBubble()}
        onMouseLeave={hideBubbleSoon}
        onFocus={() => !open && showBubble()}
        onBlur={hideBubbleSoon}
        aria-label={open ? 'Cerrar la guía de AgroOrbit' : 'Abrir la guía de AgroOrbit'}
        aria-expanded={open}
        aria-haspopup="dialog"
        className="fixed bottom-2 left-2 z-[1999] bg-transparent p-2"
        style={{ marginBottom: 'env(safe-area-inset-bottom)' }}
      >
        <span className={`block origin-bottom ${!open && !reduced ? 'agro-bot' : ''}`}>
          <Mascot className="h-[72px] md:h-[96px]" />
        </span>
      </button>

      {/* Globo junto a la mascota: se puede cerrar y no vuelve a salir en esta sesión. */}
      {bubble && !open && (
        <div
          className="fixed bottom-[56px] left-[64px] z-[1999] max-w-[220px] border border-lima bg-panel p-3 pr-2 md:bottom-[64px] md:left-[80px]"
          onMouseEnter={() => window.clearTimeout(hideTimer.current)}
          onMouseLeave={hideBubbleSoon}
        >
          <span aria-hidden className="absolute -left-[7px] bottom-4 h-3 w-3 rotate-45 border-b border-l border-lima bg-panel" />
          <div className="flex items-start gap-1">
            <button
              type="button"
              onClick={toggle}
              className="min-h-[44px] flex-1 text-left font-medium text-ink hover:text-lima"
            >
              ¿Te explico esta pantalla?
            </button>
            <button
              type="button"
              onClick={dismissBubble}
              aria-label="Cerrar este aviso"
              className="inline-flex h-11 w-11 flex-none items-center justify-center text-muted hover:text-ink"
            >
              <svg width="14" height="14" viewBox="0 0 16 16" stroke="currentColor" strokeWidth="2" fill="none" aria-hidden>
                <path d="M2 2l12 12M14 2L2 14" />
              </svg>
            </button>
          </div>
        </div>
      )}

      {open && (
    <div
      role="dialog"
      aria-label="Guía de AgroOrbit"
      className={`fixed z-[2000] flex flex-col border border-edge bg-panel shadow-[0_0_0_1px_#0b110e] max-sm:inset-2 sm:bottom-[120px] sm:left-4 sm:max-h-[min(620px,calc(100dvh-136px))] sm:w-[340px] ${
        reduced ? '' : 'agro-slide'
      }`}
    >
      <header className="flex items-start gap-3 border-b border-line p-4">
        <Mascot className="h-10 flex-none" />
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
      )}
    </>
  )
}
