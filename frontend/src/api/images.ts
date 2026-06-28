import type {
  ImageAPIError,
  ImageEditPayload,
  ImageGeneratePayload,
  ImageResultItem,
} from '@/types'

interface ImageAPIResponse {
  created?: number
  data: ImageResultItem[]
}

interface ImageRequestOptions {
  apiKey: string
  apiBaseUrl?: string
  signal?: AbortSignal
}

function trimTrailingSlash(value: string): string {
  return value.replace(/\/+$/, '')
}

export function resolveImagesGatewayBaseURL(apiBaseUrl?: string): string {
  const raw = (apiBaseUrl || '').trim()
  if (!raw) return window.location.origin

  const normalized = trimTrailingSlash(raw)
    .replace(/\/api\/v1$/i, '')
    .replace(/\/v1$/i, '')

  if (!normalized) return window.location.origin

  return trimTrailingSlash(new URL(normalized, window.location.origin).toString())
}

export function buildImagesGatewayURL(apiBaseUrl: string | undefined, endpoint: '/v1/images/generations' | '/v1/images/edits'): string {
  return `${resolveImagesGatewayBaseURL(apiBaseUrl)}${endpoint}`
}

async function parseImageAPIError(response: Response): Promise<ImageAPIError> {
  let payload: any = null

  try {
    payload = await response.json()
  } catch {
    payload = null
  }

  const error = payload?.error ?? payload ?? {}
  return {
    status: response.status,
    message: String(error.message || response.statusText || 'Image request failed'),
    type: typeof error.type === 'string' ? error.type : undefined,
    code: typeof error.code === 'string' ? error.code : undefined,
    param: typeof error.param === 'string' ? error.param : undefined,
  }
}

async function parseImageAPIResponse(response: Response): Promise<ImageAPIResponse> {
  if (!response.ok) {
    throw await parseImageAPIError(response)
  }

  const payload = await response.json() as ImageAPIResponse
  return {
    created: payload.created,
    data: Array.isArray(payload.data) ? payload.data : [],
  }
}

export async function generateImage(
  payload: ImageGeneratePayload,
  options: ImageRequestOptions,
): Promise<ImageAPIResponse> {
  const requestBody: Record<string, unknown> = {
    prompt: payload.prompt,
    size: payload.size,
    quality: payload.quality,
    output_format: payload.output_format,
    n: payload.n,
    response_format: 'b64_json',
  }

  if (payload.model.trim()) {
    requestBody.model = payload.model.trim()
  }
  if (payload.background.trim()) {
    requestBody.background = payload.background.trim()
  }

  const response = await fetch(buildImagesGatewayURL(options.apiBaseUrl, '/v1/images/generations'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      'Content-Type': 'application/json',
      Accept: 'application/json',
    },
    body: JSON.stringify(requestBody),
    signal: options.signal,
  })

  return parseImageAPIResponse(response)
}

export async function editImage(
  payload: ImageEditPayload,
  options: ImageRequestOptions,
): Promise<ImageAPIResponse> {
  const formData = new FormData()
  formData.append('prompt', payload.prompt)
  formData.append('size', payload.size)
  formData.append('quality', payload.quality)
  formData.append('output_format', payload.output_format)
  formData.append('n', String(payload.n))
  formData.append('response_format', 'b64_json')
  if (payload.model.trim()) {
    formData.append('model', payload.model.trim())
  }
  if (payload.background.trim()) {
    formData.append('background', payload.background.trim())
  }
  const images = Array.isArray(payload.image) ? payload.image : [payload.image]
  images.forEach((image) => {
    formData.append('image', image)
  })
  if (payload.mask) {
    formData.append('mask', payload.mask)
  }

  const response = await fetch(buildImagesGatewayURL(options.apiBaseUrl, '/v1/images/edits'), {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${options.apiKey}`,
      Accept: 'application/json',
    },
    body: formData,
    signal: options.signal,
  })

  return parseImageAPIResponse(response)
}

export const imagesAPI = {
  generate: generateImage,
  edit: editImage,
}

export default imagesAPI
