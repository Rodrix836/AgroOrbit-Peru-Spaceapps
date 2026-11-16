import { usePublishGuide } from '../components/guide/data'
import { ClimateRisk } from '../components/nasa/ClimateRisk'
import { NasaCards } from '../components/nasa/NasaCards'
import { NasaChart } from '../components/nasa/NasaChart'
import { NasaPeriodSelector } from '../components/nasa/NasaPeriodSelector'
import { NasaSoilMoisture } from '../components/nasa/NasaSoilMoisture'
import { PlotSummary } from '../components/plot/PlotSummary'
import { ReadingsChart } from '../components/sensors/ReadingsChart'
import { SensorCards } from '../components/sensors/SensorCards'
import { Alert } from '../components/ui/Alert'
import { Button, ButtonLink } from '../components/ui/Button'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorBox } from '../components/ui/ErrorBox'
import { Loading } from '../components/ui/Loading'
import { PageHeader } from '../components/ui/PageHeader'
import { PanelGrid } from '../components/ui/PanelGrid'
import { SectionCard } from '../components/ui/SectionCard'
import { useMemo } from 'react'
import { useClimateHistory } from '../hooks/useClimateHistory'
import { useNasa } from '../hooks/useNasa'
import { useLanguage } from '../i18n/LanguageContext'
import { usePlot } from '../hooks/usePlot'
import { USE_MOCKS } from '../services/api'
import { SENSOR_REFRESH_MS, useReadings } from '../hooks/useReadings'

/** 02 / Diagnóstico: sensor ESP32 (ámbar) y contexto NASA POWER (azul), siempre separados. */
export function DashboardPage() {
  const { plot, loading: plotLoading, error: plotError, reload } = usePlot()
  const { t } = useLanguage()
  const readings = useReadings(plot?.id ?? null)
  const nasa = useNasa(plot?.id ?? null)
  // Histórico de 10 años (T2M y PRECTOTCORR) para el bloque de riesgo e incertidumbre; aparte del período elegido.
  const history = useClimateHistory(plot?.id ?? null)
  // Lo que ya está cargado, para la Guía (no hace peticiones propias).
  usePublishGuide(
    'readings',
    useMemo(
      () => ({ data: readings.data, loading: readings.loading, error: readings.error }),
      [readings.data, readings.loading, readings.error],
    ),
  )
  usePublishGuide(
    'nasa',
    useMemo(
      () => ({ data: nasa.data, view: nasa.view, loading: nasa.loading, error: nasa.error, problem: nasa.problem }),
      [nasa.data, nasa.view, nasa.loading, nasa.error, nasa.problem],
    ),
  )
  usePublishGuide(
    'history',
    useMemo(
      () => ({ data: history.data, loading: history.loading, error: history.error }),
      [history.data, history.loading, history.error],
    ),
  )
  // La última lectura de humedad del sensor, para avisar si es de un kit de prueba.
  const lastMoisture = [...(readings.data ?? [])].reverse().find((r) => r.sensor_type === 'soil_moisture')
  const sensorIsTest = lastMoisture?.quality_flag === 'test'

  if (plotLoading) return <Loading label={t('rot.loadingPlot')} />
  if (plotError) return <ErrorBox message={plotError} onRetry={reload} />
  if (!plot) {
    return (
      <>
        <PageHeader index="02" label={t('nav.diagnostics')} title={t('dash.title')} />
        <EmptyState
          title={t('dash.registerFirst')}
          action={<ButtonLink to="/parcela">{t('dash.goPlot')}</ButtonLink>}
        />
      </>
    )
  }

  return (
    <div>
      <PageHeader index="02" label={t('nav.diagnostics')} title={t('dash.title')} aside={<PlotSummary />} />

      <PanelGrid>
        {/* MEDICIÓN PUNTUAL: sensor ESP32. Nunca se mezcla con el contexto NASA. */}
        <SectionCard
          title={t('dash.soilCardTitle')}
          description={t('dash.soilCardDesc')}
          tone="sensor"
        >
          {readings.loading && <Loading label={t('dash.readingSensor')} />}
          {readings.error && <ErrorBox message={readings.error} onRetry={readings.reload} />}
          {readings.data && (
            <>
              <SensorCards readings={readings.data} />
              <ReadingsChart readings={readings.data} />
              <p className="text-muted">{t('dash.autoRefresh', { s: SENSOR_REFRESH_MS / 1000 })}</p>
            </>
          )}
        </SectionCard>

        {/* CONTEXTO REGIONAL: NASA POWER. No es una medición sobre la parcela. */}
        <SectionCard
          title={t('dash.nasaTitle')}
          description={t('dash.nasaDesc')}
          tone="nasa"
          actions={
            <Button variant="cielo" onClick={() => void nasa.refresh()} disabled={nasa.refreshing || nasa.loading}>
              {nasa.refreshing ? t('dash.querying') : t('dash.updateWeather')}
            </Button>
          }
        >
          {nasa.problem && (
            <Alert
              tone="warn"
              title={nasa.problem.nasaDown ? t('dash.nasaDown') : t('dash.updateFailed')}
              role="alert"
            >
              {nasa.problem.message}{' '}
              {nasa.data && nasa.data.length > 0
                ? t('dash.showingSaved')
                : t('dash.noSaved')}
            </Alert>
          )}
          {nasa.loading && <Loading label={t('dash.queryingPower')} />}
          {!nasa.loading && (
            <NasaPeriodSelector
              value={nasa.period}
              onChange={(p) => void nasa.setPeriod(p)}
              disabled={nasa.refreshing}
            />
          )}
          {!nasa.loading && nasa.refreshing && <Loading label={t('dash.loadingPeriod')} />}
          {nasa.error && <ErrorBox message={nasa.error} onRetry={nasa.reload} />}
          {nasa.failed.length > 0 && (
            <p className="text-muted">{t('dash.failedVars', { vars: nasa.failed.join(', ') })}</p>
          )}
          {nasa.data && nasa.view && (
            <>
              <NasaCards observations={nasa.data} view={nasa.view} />
              <NasaChart observations={nasa.data} view={nasa.view} />
              {/* Solo si la API trae GWETTOP o GWETROOT. Aparte del sensor: su propia escala, unidad y fuente. */}
              <NasaSoilMoisture
                observations={nasa.data}
                view={nasa.view}
                sensorIsTest={sensorIsTest}
                example={USE_MOCKS}
              />
            </>
          )}
        </SectionCard>
      </PanelGrid>

      {/* Histórico de NASA POWER a todo el ancho: cuánto varía el clima de un año a otro (cálculo del frontend). */}
      <div className="mt-px">
        <SectionCard title={t('dash.riskTitle')} tone="nasa">
          {history.loading && <Loading label={t('dash.loadingHistory')} />}
          {history.error && <ErrorBox message={history.error} onRetry={history.reload} />}
          {history.data && <ClimateRisk history={history.data} example={USE_MOCKS} />}
        </SectionCard>
      </div>

      {/* Franja final a todo el ancho */}
      <section className="mt-px flex flex-wrap items-center justify-between gap-6 bg-lima p-6 text-bg md:p-8">
        <h2 className="max-w-xl font-display text-[clamp(26px,4vw,40px)] font-extrabold leading-none tracking-[-0.03em]">
          {t('dash.cta')}
        </h2>
        <ButtonLink to="/rotaciones" variant="dark" size="lg">
          {t('dash.compare')}
        </ButtonLink>
      </section>
    </div>
  )
}
