import { useState } from 'react'
import { api } from '../services/api'
import type { RecommendationRequest, RecommendationResponse } from '../types/api'
import { errorMessage } from './useAsync'

export function useRecommendation() {
  const [data, setData] = useState<RecommendationResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const run = async (req: RecommendationRequest) => {
    setLoading(true)
    setError(null)
    try {
      setData(await api.createRecommendation(req))
    } catch (e) {
      setData(null)
      setError(errorMessage(e))
    } finally {
      setLoading(false)
    }
  }

  return { data, loading, error, run }
}
