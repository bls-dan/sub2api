import { beforeEach, describe, expect, it, vi } from 'vitest'

import { buildImagesGatewayURL, editImage, generateImage, resolveImagesGatewayBaseURL } from '@/api/images'

describe('images api', () => {
  const fetchMock = vi.fn()

  beforeEach(() => {
    fetchMock.mockReset()
    vi.stubGlobal('fetch', fetchMock)
  })

  it('normalizes api_base_url to gateway root', () => {
    expect(resolveImagesGatewayBaseURL('https://relay.example.com/api/v1')).toBe('https://relay.example.com')
    expect(resolveImagesGatewayBaseURL('/api/v1')).toBe(window.location.origin)
    expect(buildImagesGatewayURL('https://relay.example.com/api/v1', '/v1/images/generations')).toBe(
      'https://relay.example.com/v1/images/generations',
    )
  })

  it('sends generate requests as json to the images generations endpoint', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({
        created: 1710000000,
        data: [{ b64_json: 'aGVsbG8=', revised_prompt: 'draw a cat' }],
      }),
    })

    await generateImage({
      model: 'gpt-image-2',
      prompt: 'draw a cat',
      size: '1024x1024',
      quality: 'high',
      background: 'auto',
      output_format: 'png',
      n: 1,
    }, {
      apiKey: 'sk-test',
      apiBaseUrl: 'https://relay.example.com/api/v1',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe('https://relay.example.com/v1/images/generations')
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
    expect(init.headers['Content-Type']).toBe('application/json')
    expect(JSON.parse(init.body)).toMatchObject({
      model: 'gpt-image-2',
      prompt: 'draw a cat',
      size: '1024x1024',
      quality: 'high',
      background: 'auto',
      output_format: 'png',
      n: 1,
      response_format: 'b64_json',
    })
  })

  it('omits optional model and background fields when they are left blank', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })

    await generateImage({
      model: '',
      prompt: 'draw a cat',
      size: 'auto',
      quality: 'high',
      background: '',
      output_format: 'png',
      n: 1,
    }, {
      apiKey: 'sk-test',
      apiBaseUrl: 'https://relay.example.com/api/v1',
    })

    const [, init] = fetchMock.mock.calls[0]
    expect(JSON.parse(init.body)).toMatchObject({
      prompt: 'draw a cat',
      size: 'auto',
      quality: 'high',
      output_format: 'png',
      n: 1,
      response_format: 'b64_json',
    })
    expect(JSON.parse(init.body).model).toBeUndefined()
    expect(JSON.parse(init.body).background).toBeUndefined()
  })

  it('sends edit requests as multipart form data with image and mask files', async () => {
    fetchMock.mockResolvedValue({
      ok: true,
      json: vi.fn().mockResolvedValue({ data: [] }),
    })

    const image = new File(['image'], 'source.png', { type: 'image/png' })
    const mask = new File(['mask'], 'mask.png', { type: 'image/png' })

    await editImage({
      model: 'gpt-image-2',
      prompt: 'replace background',
      size: '1024x1024',
      quality: 'high',
      background: 'transparent',
      output_format: 'webp',
      n: 2,
      image,
      mask,
    }, {
      apiKey: 'sk-test',
      apiBaseUrl: '/api/v1',
    })

    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [url, init] = fetchMock.mock.calls[0]
    expect(url).toBe(`${window.location.origin}/v1/images/edits`)
    expect(init.method).toBe('POST')
    expect(init.headers.Authorization).toBe('Bearer sk-test')
    expect(init.headers['Content-Type']).toBeUndefined()

    const formData = init.body as FormData
    expect(formData.get('model')).toBe('gpt-image-2')
    expect(formData.get('prompt')).toBe('replace background')
    expect(formData.get('background')).toBe('transparent')
    expect(formData.get('output_format')).toBe('webp')
    expect(formData.get('n')).toBe('2')
    expect(formData.get('response_format')).toBe('b64_json')
    expect(formData.get('image')).toBe(image)
    expect(formData.get('mask')).toBe(mask)
  })

  it('surfaces standard upstream error payloads', async () => {
    fetchMock.mockResolvedValue({
      ok: false,
      status: 403,
      statusText: 'Forbidden',
      json: vi.fn().mockResolvedValue({
        error: {
          message: 'Image generation is disabled for your group',
          type: 'permission_error',
          code: 'group_forbidden',
        },
      }),
    })

    await expect(generateImage({
      model: 'gpt-image-2',
      prompt: 'draw a cat',
      size: '1024x1024',
      quality: 'high',
      background: 'auto',
      output_format: 'png',
      n: 1,
    }, {
      apiKey: 'sk-test',
    })).rejects.toMatchObject({
      status: 403,
      message: 'Image generation is disabled for your group',
      type: 'permission_error',
      code: 'group_forbidden',
    })
  })
})
