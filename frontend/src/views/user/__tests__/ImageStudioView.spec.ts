import { flushPromises, mount } from '@vue/test-utils'
import { defineComponent } from 'vue'
import { beforeEach, describe, expect, it, vi } from 'vitest'

import ImageStudioView from '../ImageStudioView.vue'

const { list, generate, edit, fetchPublicSettings, showError } = vi.hoisted(() => ({
  list: vi.fn(),
  generate: vi.fn(),
  edit: vi.fn(),
  fetchPublicSettings: vi.fn(),
  showError: vi.fn(),
}))

vi.mock('@/api/keys', () => ({
  keysAPI: {
    list,
  },
}))

vi.mock('@/api/images', () => ({
  imagesAPI: {
    generate,
    edit,
  },
  resolveImagesGatewayBaseURL: (value?: string) => {
    const trimmed = (value || '').trim()
    if (!trimmed || trimmed === '/api/v1') return 'http://localhost:3000'
    return trimmed.replace(/\/api\/v1$/, '')
  },
}))

vi.mock('@/stores/app', () => ({
  useAppStore: () => ({
    cachedPublicSettings: {
      api_base_url: 'https://relay.example.com/api/v1',
    },
    fetchPublicSettings,
    showError,
  }),
}))

vi.mock('vue-i18n', async () => {
  const actual = await vi.importActual<typeof import('vue-i18n')>('vue-i18n')
  return {
    ...actual,
    useI18n: () => ({
      t: (key: string, params?: Record<string, unknown>) => {
        if (key === 'imageStudio.results.count') return `${params?.count} image(s)`
        if (key === 'imageStudio.selectedKeyHint') return `Current key: ${params?.key}`
        if (key === 'imageStudio.results.imageLabel') return `Image #${params?.index}`
        return key
      },
    }),
  }
})

const AppLayoutStub = defineComponent({
  template: '<div><slot /></div>',
})

const IconStub = defineComponent({
  template: '<span class="icon-stub"><slot /></span>',
})

const SelectStub = defineComponent({
  props: {
    modelValue: {
      type: [String, Number, Boolean],
      default: null,
    },
    options: {
      type: Array,
      default: () => [],
    },
  },
  emits: ['update:modelValue'],
  template: `
    <select
      :value="modelValue == null ? '' : String(modelValue)"
      @change="$emit('update:modelValue', $event.target.value)"
    >
      <option
        v-for="option in options"
        :key="String(option.value)"
        :value="String(option.value)"
      >
        {{ option.label }}
      </option>
    </select>
  `,
})

const TextAreaStub = defineComponent({
  props: {
    modelValue: {
      type: String,
      default: '',
    },
  },
  emits: ['update:modelValue'],
  template: `
    <textarea
      :value="modelValue"
      @input="$emit('update:modelValue', $event.target.value)"
    />
  `,
})

const EmptyStateStub = defineComponent({
  props: ['title', 'description', 'actionText', 'actionTo'],
  template: `
    <div class="empty-state-stub">
      <div class="empty-state-title">{{ title }}</div>
      <div class="empty-state-description">{{ description }}</div>
      <div class="empty-state-action">{{ actionText }}</div>
      <div class="empty-state-link">{{ actionTo }}</div>
    </div>
  `,
})

function mountView() {
  return mount(ImageStudioView, {
    global: {
      stubs: {
        AppLayout: AppLayoutStub,
        Icon: IconStub,
        Select: SelectStub,
        TextArea: TextAreaStub,
        EmptyState: EmptyStateStub,
        Teleport: true,
        Transition: false,
      },
    },
  })
}

async function uploadFile(selector: string, file: File, wrapper: ReturnType<typeof mountView>) {
  const input = wrapper.get(selector)
  Object.defineProperty(input.element, 'files', {
    value: [file],
    configurable: true,
  })
  await input.trigger('change')
}

describe('ImageStudioView', () => {
  beforeEach(() => {
    list.mockReset()
    generate.mockReset()
    edit.mockReset()
    fetchPublicSettings.mockReset()
    showError.mockReset()
    fetchPublicSettings.mockResolvedValue(null)
    vi.stubGlobal('FileReader', class {
      result: string | ArrayBuffer | null = null
      onload: (() => void) | null = null

      readAsDataURL(file: File) {
        this.result = `data:${file.type};base64,preview`
        this.onload?.()
      }
    })
  })

  it('shows a create-key empty state when no active keys are available', async () => {
    list.mockResolvedValue({ items: [] })

    const wrapper = mountView()
    await flushPromises()

    expect(wrapper.text()).toContain('imageStudio.empty.noKeysTitle')
    expect(wrapper.text()).toContain('/keys')
  })

  it('renders generation results after a successful image request', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    generate.mockResolvedValue({
      data: [{ b64_json: 'aGVsbG8=', revised_prompt: 'draw a cat', output_format: 'png' }],
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('textarea').setValue('draw a cat')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(generate).toHaveBeenCalledWith(expect.objectContaining({
      prompt: 'draw a cat',
      model: '',
      size: 'auto',
    }), expect.objectContaining({
      apiKey: 'sk-primary-1234',
      apiBaseUrl: 'https://relay.example.com/api/v1',
    }))
    expect(wrapper.get('[data-testid="image-studio-results"]').text()).toContain('draw a cat')
    expect(wrapper.find('img[alt="generated-image-1"]').exists()).toBe(true)
  })

  it('renders edited image results when a source file is uploaded', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    edit.mockResolvedValue({
      data: [{ b64_json: 'ZWRpdA==', revised_prompt: 'replace background', output_format: 'webp' }],
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('textarea').setValue('replace background')

    const file = new File(['image'], 'source.png', { type: 'image/png' })
    await uploadFile('[data-testid="source-image-input"]', file, wrapper)
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(edit).toHaveBeenCalledTimes(1)
    expect(wrapper.get('[data-testid="image-studio-results"]').text()).toContain('replace background')
  })

  it('uses generation mode when no source image is uploaded', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    generate.mockResolvedValue({
      data: [{ b64_json: 'Z2VuZXJhdGU=', revised_prompt: 'generate only', output_format: 'png' }],
    })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('textarea').setValue('generate only')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(generate).toHaveBeenCalledTimes(1)
    expect(edit).not.toHaveBeenCalled()
  })

  it('uses pasted image files as the edit source', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    edit.mockResolvedValue({
      data: [{ b64_json: 'cGFzdGU=', revised_prompt: 'paste edit', output_format: 'png' }],
    })

    const wrapper = mountView()
    await flushPromises()

    const file = new File(['image'], 'clipboard.png', { type: 'image/png' })
    await wrapper.get('textarea').trigger('paste', {
      clipboardData: {
        files: [file],
      },
    })
    await wrapper.get('textarea').setValue('paste edit')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(edit).toHaveBeenCalledWith(expect.objectContaining({
      image: [file],
      background: 'auto',
    }), expect.objectContaining({
      apiKey: 'sk-primary-1234',
    }))
  })

  it('limits reference images to four files', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    edit.mockResolvedValue({
      data: [{ b64_json: 'bXVsdGk=', revised_prompt: 'multi refs', output_format: 'png' }],
    })

    const wrapper = mountView()
    await flushPromises()

    const files = Array.from({ length: 5 }, (_, index) =>
      new File([`image-${index}`], `source-${index}.png`, { type: 'image/png' }),
    )
    await wrapper.get('textarea').trigger('paste', {
      clipboardData: {
        files,
      },
    })
    await wrapper.get('textarea').setValue('multi refs')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(edit).toHaveBeenCalledWith(expect.objectContaining({
      image: files.slice(0, 4),
    }), expect.anything())
  })

  it('shows readable request errors from the gateway', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    generate.mockRejectedValue({ message: 'Image generation is disabled for your group' })

    const wrapper = mountView()
    await flushPromises()

    await wrapper.get('textarea').setValue('draw a cat')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="image-studio-error"]').text()).toContain('Image generation is disabled for your group')
  })

  it('switches back to generate mode after clearing the uploaded source image', async () => {
    list.mockResolvedValue({
      items: [{ id: 1, name: 'Primary', key: 'sk-primary-1234', status: 'active' }],
    })
    edit.mockResolvedValue({
      data: [{ b64_json: 'ZWRpdA==', revised_prompt: 'edit mode', output_format: 'png' }],
    })
    generate.mockResolvedValue({
      data: [{ b64_json: 'Z2Vu', revised_prompt: 'back to generate', output_format: 'png' }],
    })

    const wrapper = mountView()
    await flushPromises()

    const sourceFile = new File(['image'], 'source.png', { type: 'image/png' })
    await uploadFile('[data-testid="source-image-input"]', sourceFile, wrapper)
    await wrapper.get('textarea').setValue('first edit')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    const removeButtons = wrapper.findAll('button').filter((item) => item.text() === 'imageStudio.actions.removeFile')
    await removeButtons[0].trigger('click')
    await wrapper.get('textarea').setValue('back to generate')
    await wrapper.get('[data-testid="image-studio-submit"]').trigger('click')
    await flushPromises()

    expect(edit).toHaveBeenCalledTimes(1)
    expect(generate).toHaveBeenCalledTimes(1)
  })
})
