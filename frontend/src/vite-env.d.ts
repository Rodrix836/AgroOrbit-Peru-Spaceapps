/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL: string
  readonly VITE_SUPABASE_URL: string
  readonly VITE_SUPABASE_ANON_KEY: string
  readonly VITE_USE_MOCKS: string
  /** normal | sensor_stale | sensor_empty | nasa_down | insufficient_data | demo_mode | sensor_test | sensor_suspect | sensor_dry */
  readonly VITE_MOCK_SCENARIO?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
