/** Error de la API. `code` es el código estable (`error.code`); `details` viene tal cual de la API. */
export class ApiError extends Error {
  status: number
  /** Código estable de la API, o `network_error` si no hubo respuesta. */
  code: string
  /** 422: lista de { field, message, type }. 409 de ciclos: { cycle_id }. */
  details: unknown
  constructor(status: number, message: string, code = 'unknown', details: unknown = null) {
    super(message)
    this.status = status
    this.code = code
    this.details = details
  }
}
