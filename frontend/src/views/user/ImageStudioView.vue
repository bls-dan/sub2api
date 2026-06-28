<template>
  <AppLayout>
    <div data-testid="image-studio-shell" class="mx-auto max-w-[1320px] space-y-6">
      <div v-if="keysLoading" class="card flex min-h-[360px] items-center justify-center">
        <div class="flex items-center gap-3 text-sm text-gray-500 dark:text-gray-400">
          <div class="h-5 w-5 animate-spin rounded-full border-2 border-primary-500 border-t-transparent"></div>
          <span>{{ t('imageStudio.loadingKeys') }}</span>
        </div>
      </div>

      <EmptyState
        v-else-if="!hasUsableKeys"
        data-testid="image-studio-empty-state"
        :title="t('imageStudio.empty.noKeysTitle')"
        :description="emptyStateDescription"
        :action-text="t('keys.createApiKey')"
        action-to="/keys"
      >
        <template #icon>
          <div class="flex h-20 w-20 items-center justify-center rounded-2xl bg-primary-50 text-primary-600 dark:bg-primary-500/10 dark:text-primary-200">
            <Icon name="key" size="xl" />
          </div>
        </template>
      </EmptyState>

      <template v-else>
        <section class="relative overflow-hidden rounded-[32px] border border-slate-200 bg-[linear-gradient(180deg,rgba(235,244,255,0.86),rgba(255,255,255,0.98))] shadow-[0_24px_70px_-36px_rgba(15,23,42,0.35)] dark:border-dark-700 dark:bg-[linear-gradient(180deg,rgba(15,23,42,0.97),rgba(17,24,39,0.99))]">
          <div class="absolute inset-0 bg-[radial-gradient(circle_at_top_left,rgba(96,165,250,0.20),transparent_34%),radial-gradient(circle_at_bottom_right,rgba(56,189,248,0.14),transparent_30%)]"></div>

          <div class="relative px-5 py-6 md:px-8 md:py-8">
            <div class="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div class="max-w-3xl">
                <div class="inline-flex items-center gap-2 rounded-full border border-white/80 bg-white/82 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.2em] text-slate-600 shadow-sm backdrop-blur dark:border-white/10 dark:bg-white/5 dark:text-slate-200">
                  <Icon name="sparkles" size="sm" />
                  {{ t('imageStudio.badge') }}
                </div>
                <h1 class="mt-4 text-2xl font-semibold tracking-tight text-slate-900 dark:text-white md:text-[2rem]">
                  {{ t('imageStudio.title') }}
                </h1>
                <p class="mt-2 max-w-2xl text-sm leading-6 text-slate-600 dark:text-slate-300">
                  {{ t('imageStudio.description') }}
                </p>
              </div>

              <div class="flex flex-wrap gap-2">
                <span class="inline-flex items-center rounded-full border border-primary-200 bg-primary-50/90 px-3.5 py-1.5 text-xs font-medium text-primary-700 shadow-sm dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
                  {{ t('imageStudio.summary.modes') }} · {{ modeLabel }}
                </span>
              </div>
            </div>

            <div class="mt-6 rounded-[28px] border border-white/85 bg-white/94 p-3 shadow-[0_16px_50px_-38px_rgba(15,23,42,0.55)] backdrop-blur dark:border-white/10 dark:bg-slate-950/40 md:p-4">
              <div
                class="overflow-hidden rounded-[24px] border border-slate-200 bg-white shadow-[inset_0_1px_0_rgba(255,255,255,0.7)] transition dark:border-white/10 dark:bg-slate-900/72"
                :class="isDraggingImage ? 'border-primary-300 ring-4 ring-primary-100 dark:border-primary-400 dark:ring-primary-500/15' : ''"
                @dragenter.prevent="isDraggingImage = true"
                @dragover.prevent="isDraggingImage = true"
                @dragleave="handleDragLeave"
                @drop.prevent="handleImageDrop"
                @paste="handleImagePaste"
              >
                  <div class="px-5 pt-5">
                    <div v-if="sourcePreviewUrls.length > 0" class="mb-3 flex flex-wrap gap-2">
                      <div
                        v-for="(previewUrl, index) in sourcePreviewUrls"
                        :key="previewUrl"
                        class="group relative inline-flex"
                      >
                        <button
                          type="button"
                          class="block overflow-hidden rounded-2xl border border-slate-200 bg-slate-50 shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-white/10 dark:bg-white/5"
                          @click="previewSourceImage(index)"
                        >
                          <img
                            :src="previewUrl"
                            :alt="`${t('imageStudio.fields.sourceImage')} ${index + 1}`"
                            class="h-20 w-20 object-cover md:h-24 md:w-24"
                          />
                        </button>
                        <button
                          type="button"
                          class="absolute -right-2 -top-2 flex h-6 w-6 items-center justify-center rounded-full border border-slate-200 bg-white text-slate-500 shadow-sm transition hover:text-red-500 dark:border-white/10 dark:bg-slate-800 dark:text-slate-300"
                          :aria-label="t('imageStudio.actions.removeFile')"
                          @click.stop="removeSourceImage(index)"
                        >
                          <Icon name="x" size="sm" />
                          <span class="sr-only">{{ t('imageStudio.actions.removeFile') }}</span>
                        </button>
                      </div>
                    </div>

                    <textarea
                      v-model="form.prompt"
                      rows="7"
                      class="block min-h-[220px] w-full resize-y border-0 bg-transparent pb-5 text-[15px] leading-7 text-slate-900 outline-none placeholder:text-slate-400 dark:text-white dark:placeholder:text-slate-500 md:min-h-[250px]"
                      :placeholder="promptPlaceholder"
                    ></textarea>
                  </div>

                  <div class="border-t border-slate-200/90 bg-slate-50/88 px-4 py-3 dark:border-white/10 dark:bg-white/[0.03]">
                    <div class="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
                      <div class="flex min-w-0 flex-1 flex-wrap items-center gap-2">
                        <label class="inline-flex h-10 cursor-pointer items-center rounded-full border border-slate-200 bg-white px-3.5 text-sm font-medium text-slate-700 transition-colors hover:border-primary-300 hover:text-primary-700 dark:border-white/10 dark:bg-white/5 dark:text-slate-200 dark:hover:border-primary-400 dark:hover:text-primary-200">
                          <input
                            data-testid="source-image-input"
                            type="file"
                            accept="image/*"
                            multiple
                            class="hidden"
                            @change="handleSourceSelection"
                          />
                          <Icon name="upload" size="sm" class="mr-2" />
                          {{ sourceImages.length > 0 ? t('imageStudio.actions.addSource') : t('imageStudio.actions.uploadSource') }}
                        </label>

                        <div class="studio-select studio-select-key">
                          <Select
                            v-model="selectedApiKeyId"
                            :options="apiKeyOptions"
                            :placeholder="t('imageStudio.fields.apiKey')"
                          />
                        </div>
                        <div class="studio-select studio-select-model">
                          <Select
                            v-model="form.model"
                            :options="modelOptions"
                            :placeholder="t('imageStudio.fields.model')"
                          />
                        </div>
                        <div class="studio-select">
                          <Select
                            v-model="form.size"
                            :options="sizeOptions"
                            :placeholder="t('imageStudio.fields.size')"
                          />
                        </div>
                        <div class="studio-select">
                          <Select
                            v-model="form.quality"
                            :options="qualityOptions"
                            :placeholder="t('imageStudio.fields.quality')"
                          />
                        </div>
                        <div class="studio-select">
                          <Select
                            v-model="form.outputFormat"
                            :options="outputFormatOptions"
                            :placeholder="t('imageStudio.fields.outputFormat')"
                          />
                        </div>
                        <div class="studio-select studio-select-count">
                          <Select
                            v-model="form.n"
                            :options="countOptions"
                            :placeholder="t('imageStudio.fields.count')"
                          />
                        </div>
                      </div>

                      <button
                        data-testid="image-studio-submit"
                        type="button"
                        class="inline-flex h-11 shrink-0 items-center justify-center rounded-full bg-slate-900 px-5 text-sm font-semibold text-white shadow-[0_18px_40px_-24px_rgba(15,23,42,0.7)] transition hover:-translate-y-0.5 hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-primary-500 dark:text-primary-950 dark:hover:bg-primary-400"
                        :disabled="!canSubmit"
                        @click="submit"
                      >
                        <Icon
                          v-if="isSubmitting"
                          name="refresh"
                          size="sm"
                          class="mr-2 animate-spin"
                        />
                        <Icon
                          v-else
                          :name="currentMode === 'generate' ? 'sparkles' : 'edit'"
                          size="sm"
                          class="mr-2"
                        />
                        {{ submitButtonText }}
                      </button>
                    </div>
                  </div>
              </div>

              <div
                v-if="inlineError"
                data-testid="image-studio-error"
                class="mt-4 rounded-2xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700 dark:border-red-500/20 dark:bg-red-500/10 dark:text-red-200"
              >
                {{ inlineError }}
              </div>

              <div class="mt-3 flex flex-wrap items-center justify-between gap-2 px-1 text-xs text-slate-500 dark:text-slate-400">
                <span>{{ t('imageStudio.selectedKeyHint', { key: selectedKeyLabel }) }}</span>
                <span>{{ t('imageStudio.browserExecutionHint') }}</span>
              </div>
            </div>
          </div>
        </section>

        <section class="card overflow-hidden">
          <div class="border-b border-gray-100 px-6 py-5 dark:border-dark-700">
            <div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 class="text-lg font-semibold text-gray-900 dark:text-white">
                  {{ t('imageStudio.results.title') }}
                </h2>
                <p class="mt-1 text-sm text-gray-500 dark:text-gray-400">
                  {{ t('imageStudio.results.description') }}
                </p>
              </div>
              <div class="flex flex-wrap items-center gap-2">
                <span class="inline-flex items-center rounded-full bg-gray-100 px-3 py-1 text-xs font-medium text-gray-600 dark:bg-dark-700 dark:text-gray-300">
                  {{ resultStatusLabel }}
                </span>
                <span
                  v-if="results.length > 0"
                  class="inline-flex items-center rounded-full bg-primary-50 px-3 py-1 text-xs font-medium text-primary-700 dark:bg-primary-500/10 dark:text-primary-200"
                >
                  {{ t('imageStudio.results.count', { count: results.length }) }}
                </span>
              </div>
            </div>
          </div>

          <div class="px-6 py-6">
            <div v-if="isSubmitting" class="flex min-h-[320px] flex-col items-center justify-center gap-4 text-center">
              <div class="relative flex h-16 w-16 items-center justify-center rounded-full border border-primary-100 bg-primary-50 text-primary-600 dark:border-primary-500/20 dark:bg-primary-500/10 dark:text-primary-200">
                <div class="absolute inset-0 animate-ping rounded-full border border-primary-200 opacity-30 dark:border-primary-400/30"></div>
                <Icon name="sparkles" size="lg" class="animate-pulse" />
              </div>
              <div>
                <div class="text-base font-semibold text-gray-900 dark:text-white">
                  {{ activeModeLabel }}
                </div>
                <p class="mt-2 max-w-md text-sm text-gray-500 dark:text-gray-400">
                  {{ t('imageStudio.results.pendingHint') }}
                </p>
              </div>
            </div>

            <div
              v-else-if="results.length > 0"
              data-testid="image-studio-results"
              class="space-y-5"
            >
              <div class="grid gap-4 lg:grid-cols-2 xl:grid-cols-3">
                <article
                  v-for="(item, index) in results"
                  :key="item.src + index"
                  class="overflow-hidden rounded-3xl border border-gray-200 bg-white shadow-sm transition hover:-translate-y-0.5 hover:shadow-md dark:border-dark-600 dark:bg-dark-800"
                >
                  <button
                    type="button"
                    class="block w-full bg-gray-100/60 dark:bg-dark-700/40"
                    @click="previewItem = item"
                  >
                    <img
                      :src="item.src"
                      :alt="`generated-image-${index + 1}`"
                      class="h-[320px] w-full object-contain"
                    />
                  </button>

                  <div class="space-y-3 px-5 py-4">
                    <div class="flex items-center justify-between gap-3">
                      <div>
                        <div class="text-sm font-semibold text-gray-900 dark:text-white">
                          {{ t('imageStudio.results.imageLabel', { index: index + 1 }) }}
                        </div>
                        <div class="mt-1 text-xs uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                          {{ item.mimeType }}
                        </div>
                      </div>

                      <button
                        type="button"
                        class="inline-flex items-center rounded-full border border-gray-200 px-3 py-1.5 text-xs font-medium text-gray-700 transition hover:border-primary-300 hover:text-primary-700 dark:border-dark-600 dark:text-gray-200 dark:hover:border-primary-400 dark:hover:text-primary-200"
                        @click="downloadImage(item, index)"
                      >
                        <Icon name="download" size="sm" class="mr-1.5" />
                        {{ t('imageStudio.actions.download') }}
                      </button>
                    </div>

                    <div v-if="item.revised_prompt" class="rounded-2xl bg-gray-50 px-4 py-3 text-sm text-gray-700 dark:bg-dark-700/50 dark:text-gray-200">
                      <div class="mb-1 text-xs font-semibold uppercase tracking-[0.14em] text-gray-500 dark:text-gray-400">
                        {{ t('imageStudio.results.revisedPrompt') }}
                      </div>
                      <p class="leading-6">{{ item.revised_prompt }}</p>
                    </div>
                  </div>
                </article>
              </div>
            </div>

            <div v-else class="flex min-h-[320px] items-center justify-center rounded-3xl border border-dashed border-gray-300 bg-gray-50/60 dark:border-dark-600 dark:bg-dark-700/20">
              <div class="max-w-md px-6 text-center">
                <div class="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-white text-gray-400 shadow-sm dark:bg-dark-800 dark:text-gray-500">
                  <Icon name="sparkles" size="xl" />
                </div>
                <h3 class="mt-5 text-lg font-semibold text-gray-900 dark:text-white">
                  {{ t('imageStudio.empty.resultsTitle') }}
                </h3>
                <p class="mt-2 text-sm leading-6 text-gray-500 dark:text-gray-400">
                  {{ t('imageStudio.empty.resultsDescription') }}
                </p>
              </div>
            </div>
          </div>
        </section>
      </template>
    </div>

    <Teleport to="body">
      <Transition name="fade">
        <div
          v-if="previewItem"
          class="fixed inset-0 z-[100] flex items-center justify-center bg-black/80 p-4"
          @click.self="previewItem = null"
        >
          <button
            type="button"
            class="absolute right-4 top-4 rounded-full bg-black/45 p-2 text-white transition hover:bg-black/70"
            @click="previewItem = null"
          >
            <Icon name="x" size="lg" />
          </button>
          <img
            :src="previewItem.src"
            alt="preview"
            class="max-h-[92vh] max-w-[92vw] rounded-2xl object-contain shadow-2xl"
          />
        </div>
      </Transition>
    </Teleport>
  </AppLayout>
</template>

<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useI18n } from 'vue-i18n'
import { imagesAPI } from '@/api/images'
import { keysAPI } from '@/api/keys'
import EmptyState from '@/components/common/EmptyState.vue'
import Select from '@/components/common/Select.vue'
import Icon from '@/components/icons/Icon.vue'
import AppLayout from '@/components/layout/AppLayout.vue'
import { useAppStore } from '@/stores/app'
import type { ApiKey, ImageGeneratePayload, ImageResultItem, ImageStudioMode } from '@/types'
import { extractApiErrorMessage } from '@/utils/apiError'

interface DisplayImageItem extends ImageResultItem {
  src: string
  mimeType: string
}

const { t } = useI18n()
const appStore = useAppStore()

const keysLoading = ref(true)
const usableKeys = ref<ApiKey[]>([])
const selectedApiKeyId = ref<number | string | null>(null)
const inlineError = ref('')
const keyLoadError = ref('')
const isSubmitting = ref(false)
const results = ref<DisplayImageItem[]>([])
const maxSourceImages = 4
const sourceImages = ref<File[]>([])
const sourcePreviewUrls = ref<string[]>([])
const isDraggingImage = ref(false)
const previewItem = ref<DisplayImageItem | null>(null)
const lastRequestMode = ref<ImageStudioMode>('generate')

const form = ref({
  model: '',
  prompt: '',
  size: 'auto',
  quality: 'high',
  background: 'auto',
  outputFormat: 'png',
  n: 1,
})

const modelOptions = [
  { value: 'gpt-image-2', label: 'GPT Image 2' },
  { value: 'gpt-image-1.5', label: 'GPT Image 1.5' },
  { value: 'gpt-image-1', label: 'GPT Image 1' },
]

const sizeOptions = computed(() => [
  { value: 'auto', label: t('imageStudio.options.size.auto') },
  { value: '1K', label: t('imageStudio.options.size.oneK') },
  { value: '2K', label: t('imageStudio.options.size.twoK') },
  { value: '4K', label: t('imageStudio.options.size.fourK') },
])

const qualityOptions = computed(() => [
  { value: 'low', label: t('imageStudio.options.quality.low') },
  { value: 'medium', label: t('imageStudio.options.quality.medium') },
  { value: 'high', label: t('imageStudio.options.quality.high') },
])

const outputFormatOptions = computed(() => [
  { value: 'png', label: t('imageStudio.options.outputFormat.png') },
  { value: 'webp', label: t('imageStudio.options.outputFormat.webp') },
  { value: 'jpeg', label: t('imageStudio.options.outputFormat.jpeg') },
])

const countOptions = [
  { value: 1, label: '1' },
  { value: 2, label: '2' },
  { value: 3, label: '3' },
  { value: 4, label: '4' },
]

const apiKeyOptions = computed(() =>
  usableKeys.value.map((key) => ({
    value: key.id,
    label: `${key.name} · ${compactMaskApiKey(key.key)}`,
  })),
)

const hasUsableKeys = computed(() => usableKeys.value.length > 0)
const apiBaseUrl = computed(() => appStore.cachedPublicSettings?.api_base_url)
const selectedApiKey = computed(() =>
  usableKeys.value.find((item) => String(item.id) === String(selectedApiKeyId.value ?? '')) ?? null,
)
const selectedKeyLabel = computed(() =>
  selectedApiKey.value ? `${selectedApiKey.value.name} · ${maskApiKey(selectedApiKey.value.key)}` : t('imageStudio.empty.noKeySelected'),
)
const emptyStateDescription = computed(() => keyLoadError.value || t('imageStudio.empty.noKeysDescription'))
const currentMode = computed<ImageStudioMode>(() => (sourceImages.value.length > 0 ? 'edit' : 'generate'))
const modeLabel = computed(() => t(`imageStudio.tabs.${currentMode.value}`))
const promptPlaceholder = computed(() =>
  currentMode.value === 'generate'
    ? t('imageStudio.placeholders.generatePrompt')
    : t('imageStudio.placeholders.editPrompt'),
)
const activeModeLabel = computed(() => {
  const mode = isSubmitting.value ? lastRequestMode.value : currentMode.value
  return mode === 'generate' ? t('imageStudio.actions.generating') : t('imageStudio.actions.editing')
})
const canSubmit = computed(() => {
  if (isSubmitting.value || !selectedApiKey.value) return false
  if (!form.value.prompt.trim()) return false
  if (currentMode.value === 'edit' && sourceImages.value.length === 0) return false
  return true
})
const submitButtonText = computed(() => {
  const mode = isSubmitting.value ? lastRequestMode.value : currentMode.value
  if (isSubmitting.value) {
    return mode === 'generate' ? t('imageStudio.actions.generating') : t('imageStudio.actions.editing')
  }
  return mode === 'generate' ? t('imageStudio.actions.generate') : t('imageStudio.actions.edit')
})
const resultStatusLabel = computed(() => {
  if (isSubmitting.value) return t('imageStudio.results.pending')
  if (results.value.length > 0) {
    return lastRequestMode.value === 'generate' ? t('imageStudio.results.generated') : t('imageStudio.results.edited')
  }
  return t('imageStudio.results.idle')
})

function maskApiKey(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 12) return trimmed
  return `${trimmed.slice(0, 8)}...${trimmed.slice(-4)}`
}

function compactMaskApiKey(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length <= 8) return trimmed
  return `...${trimmed.slice(-4)}`
}

function normalizeMimeType(format: string | undefined): string {
  switch ((format || '').toLowerCase()) {
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'webp':
      return 'image/webp'
    default:
      return 'image/png'
  }
}

function normalizeResults(items: ImageResultItem[], fallbackFormat: string): DisplayImageItem[] {
  return items
    .map((item) => {
      const resolvedFormat = item.output_format || item.mime_type?.split('/')[1] || fallbackFormat
      const mimeType = item.mime_type || normalizeMimeType(resolvedFormat)
      const src = item.url || (item.b64_json ? `data:${mimeType};base64,${item.b64_json}` : '')
      if (!src) return null
      return {
        ...item,
        src,
        mimeType,
      }
    })
    .filter((item): item is DisplayImageItem => item !== null)
}

function clearSourceImages() {
  sourceImages.value = []
  sourcePreviewUrls.value = []
}

function removeSourceImage(index: number) {
  const nextImages = [...sourceImages.value]
  const nextUrls = [...sourcePreviewUrls.value]
  nextUrls.splice(index, 1)
  nextImages.splice(index, 1)
  sourceImages.value = nextImages
  sourcePreviewUrls.value = nextUrls
}

function previewSourceImage(index: number) {
  const previewUrl = sourcePreviewUrls.value[index]
  const image = sourceImages.value[index]
  if (!previewUrl || !image) return
  previewItem.value = {
    src: previewUrl,
    mimeType: image.type || 'image/png',
  }
}

function addSourceImages(files: File[]) {
  const imageFiles = files.filter((file) => file.type.startsWith('image/'))
  if (imageFiles.length === 0) return

  const availableSlots = maxSourceImages - sourceImages.value.length
  if (availableSlots <= 0) return

  const acceptedFiles = imageFiles.slice(0, availableSlots)
  sourceImages.value = [...sourceImages.value, ...acceptedFiles]
  acceptedFiles.forEach((file) => {
    const reader = new FileReader()
    reader.onload = () => {
      if (sourceImages.value.includes(file) && typeof reader.result === 'string') {
        sourcePreviewUrls.value = [...sourcePreviewUrls.value, reader.result]
      }
    }
    reader.readAsDataURL(file)
  })
}

function handleSourceSelection(event: Event) {
  const input = event.target as HTMLInputElement
  addSourceImages(Array.from(input.files ?? []))
  input.value = ''
}

function getImageFiles(files: FileList | File[] | null | undefined): File[] {
  if (!files) return []
  return Array.from(files).filter((file) => file.type.startsWith('image/'))
}

function handleDragLeave(event: DragEvent) {
  const currentTarget = event.currentTarget as HTMLElement | null
  if (currentTarget && event.relatedTarget instanceof Node && currentTarget.contains(event.relatedTarget)) {
    return
  }
  isDraggingImage.value = false
}

function handleImageDrop(event: DragEvent) {
  isDraggingImage.value = false
  addSourceImages(getImageFiles(event.dataTransfer?.files))
}

function handleImagePaste(event: ClipboardEvent) {
  const files = getImageFiles(event.clipboardData?.files)
  if (files.length === 0) return
  event.preventDefault()
  addSourceImages(files)
}

async function loadKeys() {
  keysLoading.value = true
  keyLoadError.value = ''
  try {
    if (!appStore.cachedPublicSettings) {
      await appStore.fetchPublicSettings()
    }

    const response = await keysAPI.list(1, 100, { status: 'active' })
    usableKeys.value = response.items.filter((key) => key.status === 'active' && key.key.trim())
    if (!selectedApiKey.value && usableKeys.value.length > 0) {
      selectedApiKeyId.value = usableKeys.value[0].id
    }
  } catch (error) {
    usableKeys.value = []
    keyLoadError.value = extractApiErrorMessage(error, t('imageStudio.errors.loadKeysFailed'))
    appStore.showError(keyLoadError.value)
  } finally {
    keysLoading.value = false
  }
}

async function submit() {
  inlineError.value = ''

  if (!selectedApiKey.value) {
    inlineError.value = t('imageStudio.errors.apiKeyRequired')
    return
  }
  if (!form.value.prompt.trim()) {
    inlineError.value = t('imageStudio.errors.promptRequired')
    return
  }
  if (currentMode.value === 'edit' && sourceImages.value.length === 0) {
    inlineError.value = t('imageStudio.errors.sourceImageRequired')
    return
  }

  const requestMode = currentMode.value
  lastRequestMode.value = requestMode
  isSubmitting.value = true
  results.value = []

  const basePayload: ImageGeneratePayload = {
    model: form.value.model.trim(),
    prompt: form.value.prompt.trim(),
    size: form.value.size,
    quality: form.value.quality,
    background: form.value.background.trim(),
    output_format: form.value.outputFormat,
    n: Number(form.value.n),
  }

  try {
    const response = requestMode === 'generate'
      ? await imagesAPI.generate(basePayload, {
        apiKey: selectedApiKey.value.key,
        apiBaseUrl: apiBaseUrl.value,
      })
      : await imagesAPI.edit({
        ...basePayload,
        image: sourceImages.value,
      }, {
        apiKey: selectedApiKey.value.key,
        apiBaseUrl: apiBaseUrl.value,
      })

    results.value = normalizeResults(response.data, form.value.outputFormat)
    if (results.value.length === 0) {
      inlineError.value = t('imageStudio.errors.emptyResults')
    }
  } catch (error) {
    inlineError.value = extractApiErrorMessage(error, t('imageStudio.errors.requestFailed'))
  } finally {
    isSubmitting.value = false
  }
}

function downloadImage(item: DisplayImageItem, index: number) {
  const extension = item.mimeType.split('/')[1] || 'png'
  const link = document.createElement('a')
  link.href = item.src
  link.download = `image-studio-${index + 1}.${extension}`
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
}

onMounted(loadKeys)

onBeforeUnmount(() => {
  clearSourceImages()
})
</script>

<style scoped>
.studio-select {
  width: 104px;
}

.studio-select-key {
  width: min(188px, 100%);
}

.studio-select-model {
  width: 118px;
}

.studio-select-count {
  width: 78px;
}

.studio-select :deep(.select-trigger) {
  min-height: 2.5rem;
  border-radius: 9999px;
  border-color: rgb(226 232 240);
  background: rgb(255 255 255);
  padding-left: 0.75rem;
  padding-right: 0.55rem;
  box-shadow: none;
}

.studio-select :deep(.select-value) {
  font-size: 0.875rem;
  min-width: 0;
}

.dark .studio-select :deep(.select-trigger) {
  border-color: rgb(255 255 255 / 0.1);
  background: rgb(255 255 255 / 0.05);
}

.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.2s ease;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>
