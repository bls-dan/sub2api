import { readFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { describe, expect, it } from 'vitest'

const routerPath = resolve(dirname(fileURLToPath(import.meta.url)), '../index.ts')
const routerSource = readFileSync(routerPath, 'utf8')

describe('image studio route', () => {
  it('registers the authenticated user route with title metadata', () => {
    expect(routerSource).toContain("path: '/image-studio'")
    expect(routerSource).toContain("name: 'ImageStudio'")
    expect(routerSource).toContain("component: () => import('@/views/user/ImageStudioView.vue')")
    expect(routerSource).toContain("titleKey: 'imageStudio.title'")
    expect(routerSource).toContain("descriptionKey: 'imageStudio.description'")
  })
})
