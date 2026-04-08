<template>
  <div v-if="loading" class="state-msg">Loading…</div>
  <div v-else-if="!plugin" class="state-msg">Plugin not found.</div>
  <div v-else class="plugin-detail">
    <!-- ── Header ──────────────────────────────────────────────────────────── -->
    <div class="plugin-header">
      <div class="plugin-header__avatar" :class="{ 'plugin-header__avatar--ob': isOpenBridge }">
        <NbIcon :name="isOpenBridge ? 'diamond' : 'puzzle-piece'" :size="28" />
      </div>
      <div class="plugin-header__info">
        <div class="plugin-header__title-row">
          <h1 class="plugin-header__name">{{ plugin.name }}</h1>
          <NbBadge v-if="plugin.verified" variant="green">Verified</NbBadge>
          <NbBadge v-if="isOpenBridge" variant="purple">Native</NbBadge>
        </div>
        <p v-if="plugin.author" class="plugin-header__author">by {{ plugin.author }}</p>
        <div class="plugin-header__stats">
          <span class="hdr-stat">
            <NbIcon name="cloud-arrow-down" :size="13" />
            {{ plugin.weekly_downloads.toLocaleString() }} downloads/week
          </span>
          <template v-if="plugin.rating_count > 0">
            <span class="hdr-sep">|</span>
            <span class="hdr-stat hdr-stat--stars">
              <span class="star-display">{{ starString }}</span>
              ({{ plugin.rating_count }})
            </span>
          </template>
        </div>
        <p class="plugin-header__desc">{{ plugin.description ?? 'No description.' }}</p>
      </div>
    </div>

    <!-- ── Tabs ───────────────────────────────────────────────────────────── -->
    <div class="plugin-tabs">
      <button
        v-for="tab in tabs"
        :key="tab.id"
        class="tab-btn"
        :class="{ active: activeTab === tab.id }"
        @click="activeTab = tab.id"
      >
        {{ tab.label }}
        <span v-if="tab.count !== undefined" class="tab-count">{{ tab.count }}</span>
      </button>
    </div>
    <div class="tab-divider" />

    <!-- ── Overview ───────────────────────────────────────────────────────── -->
    <div v-if="activeTab === 'overview'" class="tab-content tab-content--overview">
      <div class="overview-main">
        <!-- Install snippet -->
        <div class="install-block">
          <code class="install-cmd">npm install {{ plugin.name }}</code>
          <button class="copy-btn" :class="{ copied }" @click="copyInstall">
            <NbIcon :name="copied ? 'check' : 'copy'" :size="13" />
            {{ copied ? 'Copied!' : 'Copy' }}
          </button>
        </div>

        <!-- README — sanitized via DOMPurify before render -->
        <!-- eslint-disable-next-line vue/no-v-html -->
        <div v-if="plugin.readme" class="readme" v-html="renderedReadme" />
        <div v-else class="readme-empty">No README available.</div>
      </div>

      <aside class="overview-sidebar">
        <!-- Actions -->
        <div class="sidebar-section">
          <NbButton
            variant="primary"
            size="sm"
            :href="plugin.npm_url"
            target="_blank"
            rel="noopener"
          >
            <NbIcon name="arrow-square-out" :size="13" />
            View on npm
          </NbButton>
          <NbButton
            v-if="plugin.homepage"
            variant="ghost"
            size="sm"
            :href="plugin.homepage"
            target="_blank"
            rel="noopener"
          >
            Homepage
          </NbButton>
          <NbButton
            v-if="plugin.repository_url"
            variant="ghost"
            size="sm"
            :href="plugin.repository_url"
            target="_blank"
            rel="noopener"
          >
            <NbIcon name="github-logo" :size="13" />
            Repository
          </NbButton>
        </div>

        <!-- Info -->
        <div class="sidebar-section">
          <h3 class="sidebar-heading">More Info</h3>
          <dl class="sidebar-dl">
            <dt>Version</dt>
            <dd>{{ plugin.version }}</dd>
            <dt>Last updated</dt>
            <dd>{{ formatDate(plugin.last_published_at) }}</dd>
            <dt v-if="plugin.author">Author</dt>
            <dd v-if="plugin.author">{{ plugin.author }}</dd>
          </dl>
        </div>

        <!-- Keywords -->
        <div v-if="keywords.length" class="sidebar-section">
          <h3 class="sidebar-heading">Tags</h3>
          <div class="keyword-list">
            <NbBadge v-for="kw in keywords" :key="kw" variant="gray" size="sm">{{ kw }}</NbBadge>
          </div>
        </div>

        <!-- Engines -->
        <div v-if="Object.keys(engines).length" class="sidebar-section">
          <h3 class="sidebar-heading">Works with</h3>
          <dl class="sidebar-dl">
            <template v-for="(v, k) in engines" :key="k">
              <dt>{{ k }}</dt>
              <dd>{{ v }}</dd>
            </template>
          </dl>
        </div>
      </aside>
    </div>

    <!-- ── Version History ────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'versions'" class="tab-content">
      <div v-if="!versions.length" class="state-msg">No version history available.</div>
      <table v-else class="version-table">
        <thead>
          <tr>
            <th>Version</th>
            <th>Released</th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="v in versions" :key="v.version" :class="{ 'version-row--latest': v.version === plugin.version }">
            <td class="version-cell">
              {{ v.version }}
              <NbBadge v-if="v.version === plugin.version" variant="green" size="sm">latest</NbBadge>
            </td>
            <td class="version-date">{{ formatDate(v.date) }}</td>
          </tr>
        </tbody>
      </table>
    </div>

    <!-- ── Q & A ──────────────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'qa'" class="tab-content">
      <div class="qa-header">
        <h2 class="section-title">Q &amp; A</h2>
        <NbButton v-if="!showQuestionForm" variant="primary" size="sm" @click="showQuestionForm = true">
          Ask a question
        </NbButton>
      </div>

      <!-- GitHub redirect hint -->
      <div v-if="plugin.repository_url" class="qa-hint">
        <NbIcon name="info" :size="13" />
        For bug reports and feature requests, visit the
        <a :href="plugin.repository_url" target="_blank" rel="noopener">GitHub repository</a>.
      </div>

      <!-- Ask form -->
      <div v-if="showQuestionForm" class="question-form">
        <NbTextInput v-model="questionDisplay" placeholder="Your name" class="question-input" />
        <NbTextInput v-model="questionBody" placeholder="Your question…" class="question-input" />
        <div class="question-form__actions">
          <NbButton variant="primary" size="sm" :disabled="!questionBody.trim() || !questionDisplay.trim() || submittingQ" @click="submitQuestion">
            Post question
          </NbButton>
          <NbButton variant="ghost" size="sm" @click="showQuestionForm = false">Cancel</NbButton>
        </div>
        <NbMessage v-if="questionError" variant="error">{{ questionError }}</NbMessage>
      </div>

      <!-- Question list -->
      <div v-if="questions.length" class="question-list">
        <div v-for="q in questions" :key="q.id" class="question-card">
          <div class="question-card__head">
            <span class="question-card__author">{{ q.author_display }}</span>
            <span class="question-card__date">{{ formatDate(q.created_at) }}</span>
          </div>
          <p class="question-card__body">{{ q.body }}</p>
        </div>
      </div>
      <div v-else-if="!showQuestionForm" class="state-msg">No questions yet. Be the first to ask!</div>
    </div>

    <!-- ── Rating & Review ────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'reviews'" class="tab-content">
      <div class="reviews-header">
        <h2 class="section-title">User Reviews</h2>
        <div class="reviews-header__actions">
          <NbButton variant="ghost" size="sm" @click="showLogin = true">Report Issue</NbButton>
          <NbButton variant="primary" size="sm" @click="authed ? (showReviewForm = true) : (showLogin = true)">
            Write a review
          </NbButton>
        </div>
      </div>

      <!-- Rating summary -->
      <div v-if="plugin.rating_count > 0" class="rating-summary">
        <span class="rating-summary__avg">{{ plugin.rating_avg }}</span>
        <div class="rating-summary__right">
          <span class="star-display star-display--lg">{{ starString }}</span>
          <span class="rating-summary__count">{{ plugin.rating_count }} {{ plugin.rating_count === 1 ? 'review' : 'reviews' }}</span>
        </div>
      </div>

      <!-- Review form -->
      <div v-if="showReviewForm" class="review-form">
        <h3 class="review-form__heading">Write a review</h3>
        <div class="review-form__stars">
          <button
            v-for="n in 5"
            :key="n"
            class="star-btn"
            :class="{ active: n <= draftRating }"
            @click="draftRating = n"
          >
            ★
          </button>
        </div>
        <NbTextInput v-model="draftBody" placeholder="Share your experience…" class="review-form__input" />
        <NbButton variant="primary" size="sm" :disabled="!draftRating || submitting" @click="submitReview">
          Submit review
        </NbButton>
        <NbMessage v-if="submitError" variant="error" class="review-form__msg">{{ submitError }}</NbMessage>
      </div>
      <div v-else-if="!authed" class="review-login-prompt">
        <NbButton variant="ghost" size="sm" @click="showLogin = true">Sign in to write a review</NbButton>
      </div>

      <!-- OTP modal -->
      <div v-if="showLogin" class="otp-backdrop" @click.self="showLogin = false">
        <div class="otp-modal">
          <h3>Sign in</h3>
          <div v-if="!otpSent">
            <NbLabel>Email address</NbLabel>
            <NbTextInput v-model="email" placeholder="you@example.com" type="email" />
            <NbButton variant="primary" size="sm" :disabled="!email || otpLoading" @click="sendOtp">
              Send code
            </NbButton>
            <NbMessage v-if="otpError" variant="error">{{ otpError }}</NbMessage>
          </div>
          <div v-else>
            <NbLabel>Enter the 6-digit code sent to {{ email }}</NbLabel>
            <NbTextInput v-model="otpCode" placeholder="123456" maxlength="6" />
            <NbButton variant="primary" size="sm" :disabled="!otpCode || otpLoading" @click="verifyOtp">
              Verify
            </NbButton>
            <NbMessage v-if="otpError" variant="error">{{ otpError }}</NbMessage>
          </div>
        </div>
      </div>

      <!-- Review list -->
      <div v-if="reviews.length" class="review-list">
        <div v-for="r in reviews" :key="r.id" class="review-card">
          <div class="review-card__head">
            <div class="review-card__author-block">
              <span class="review-card__author">{{ r.author_display }}</span>
              <span class="review-card__stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
            </div>
            <span class="review-card__date">{{ formatDate(r.created_at) }}</span>
          </div>
          <p v-if="r.title" class="review-card__title">{{ r.title }}</p>
          <p v-if="r.body" class="review-card__body">{{ r.body }}</p>
          <button class="helpful-btn" @click="markHelpful(r.id)">
            <NbIcon name="thumbs-up" :size="11" />
            Helpful ({{ r.helpful_count }})
          </button>
        </div>
      </div>
      <div v-else-if="!showReviewForm" class="state-msg">No reviews yet. Be the first!</div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import { marked } from 'marked'
import DOMPurify from 'dompurify'
import type { Plugin, Review, Question } from '../../shared/types'
import { trackEvent } from '@/composables/useAnalytics'

const route = useRoute()
const pluginName = route.params.name as string

const plugin = ref<Plugin | null>(null)
const reviews = ref<Review[]>([])
const questions = ref<Question[]>([])
const loading = ref(true)
const activeTab = ref<'overview' | 'versions' | 'qa' | 'reviews'>('overview')

const authed = ref(false)
const showLogin = ref(false)
const showReviewForm = ref(false)
const email = ref('')
const otpCode = ref('')
const otpSent = ref(false)
const otpLoading = ref(false)
const otpError = ref('')

const draftRating = ref(0)
const draftBody = ref('')
const submitting = ref(false)
const submitError = ref('')

const showQuestionForm = ref(false)
const questionDisplay = ref('')
const questionBody = ref('')
const submittingQ = ref(false)
const questionError = ref('')

const copied = ref(false)

const isOpenBridge = computed(() => plugin.value?.name.startsWith('openbridge-') ?? false)

// keywords — safely parse JSONB that may come back as a string
const keywords = computed<string[]>(() => {
  const kw = plugin.value?.keywords
  if (!kw) return []
  if (typeof kw === 'string') {
    try {
      return JSON.parse(kw) as string[]
    } catch {
      return []
    }
  }
  return kw
})

// engines — safely parse JSONB
const engines = computed<Record<string, string>>(() => {
  const e = plugin.value?.engines
  if (!e) return {}
  if (typeof e === 'string') {
    try {
      return JSON.parse(e) as Record<string, string>
    } catch {
      return {}
    }
  }
  return e
})

// versions — safely parse JSONB
const versions = computed<{ version: string; date: string }[]>(() => {
  const v = plugin.value?.versions
  if (!v) return []
  if (typeof v === 'string') {
    try {
      return JSON.parse(v) as { version: string; date: string }[]
    } catch {
      return []
    }
  }
  return v
})

const starString = computed(() => {
  const avg = plugin.value?.rating_avg ?? 0
  const full = Math.floor(avg)
  const half = avg - full >= 0.5 ? 1 : 0
  return '★'.repeat(full) + (half ? '½' : '') + '☆'.repeat(5 - full - half)
})

const renderedReadme = computed(() => {
  const md = plugin.value?.readme
  if (!md) return ''
  return DOMPurify.sanitize(marked.parse(md) as string)
})

const tabs = computed(() => [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'versions' as const, label: 'Version History', count: versions.value.length || undefined },
  { id: 'qa' as const, label: 'Q & A', count: questions.value.length || undefined },
  { id: 'reviews' as const, label: 'Rating & Review', count: reviews.value.length || undefined },
])

async function copyInstall() {
  if (!plugin.value) return
  await navigator.clipboard.writeText(`npm install ${plugin.value.name}`)
  copied.value = true
  setTimeout(() => (copied.value = false), 2000)
}

async function load() {
  loading.value = true
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginName)}`)
    if (!res.ok) {
      plugin.value = null
      return
    }
    const data = await res.json()
    plugin.value = data.plugin
    reviews.value = data.reviews
    questions.value = data.questions ?? []
    trackEvent('plugin_view', { plugin: pluginName })
  } finally {
    loading.value = false
  }
}

async function sendOtp() {
  otpLoading.value = true
  otpError.value = ''
  try {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send code')
    otpSent.value = true
  } catch (e: unknown) {
    otpError.value = e instanceof Error ? e.message : String(e)
  } finally {
    otpLoading.value = false
  }
}

async function verifyOtp() {
  otpLoading.value = true
  otpError.value = ''
  try {
    const res = await fetch('/api/auth/otp/verify', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value, code: otpCode.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Invalid code')
    authed.value = true
    showLogin.value = false
  } catch (e: unknown) {
    otpError.value = e instanceof Error ? e.message : String(e)
  } finally {
    otpLoading.value = false
  }
}

async function submitReview() {
  submitting.value = true
  submitError.value = ''
  trackEvent('review_submit', { plugin: pluginName, rating: String(draftRating.value) })
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginName)}/reviews`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ rating: draftRating.value, body: draftBody.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to submit review')
    draftRating.value = 0
    draftBody.value = ''
    showReviewForm.value = false
    await load()
  } catch (e: unknown) {
    submitError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

async function submitQuestion() {
  submittingQ.value = true
  questionError.value = ''
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginName)}/questions`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ body: questionBody.value, display: questionDisplay.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to post question')
    const q: Question = await res.json()
    questions.value.unshift(q)
    questionBody.value = ''
    showQuestionForm.value = false
  } catch (e: unknown) {
    questionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submittingQ.value = false
  }
}

async function markHelpful(id: string) {
  await fetch(`/api/reviews/${id}/helpful`, { method: 'POST' })
  const r = reviews.value.find((rv) => rv.id === id)
  if (r) r.helpful_count++
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' })
}

onMounted(load)
</script>

<style lang="scss" scoped>
.plugin-detail {
  display: flex;
  flex-direction: column;
}

// ── Header ────────────────────────────────────────────────────────────────────

.plugin-header {
  display: flex;
  gap: 1.25rem;
  align-items: flex-start;
  padding-bottom: 1.5rem;
  border-bottom: 1px solid var(--nb-c-component-plain-border);
  margin-bottom: 0;
}

.plugin-header__avatar {
  width: 64px;
  height: 64px;
  flex-shrink: 0;
  border-radius: 14px;
  background: #f0f0f8;
  color: #9ca3af;
  display: flex;
  align-items: center;
  justify-content: center;

  &--ob {
    background: linear-gradient(135deg, #7c3aed, #4f46e5);
    color: #fff;
  }
}

.plugin-header__info {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.plugin-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  flex-wrap: wrap;
}

.plugin-header__name {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: monospace;
  margin: 0;
}

.plugin-header__author {
  font-size: 0.82rem;
  color: #7c3aed;
  margin: 0;
  font-weight: 500;
}

.plugin-header__stats {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  font-size: 0.8rem;
  color: var(--nb-c-text-subtle);
}

.hdr-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
}

.hdr-stat--stars {
  color: #f59e0b;
}

.hdr-sep {
  color: var(--nb-c-component-plain-border);
}

.plugin-header__desc {
  font-size: 0.9rem;
  color: var(--nb-c-text-subtle);
  margin: 0;
  line-height: 1.5;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

.plugin-tabs {
  display: flex;
  gap: 0;
  margin-top: 0;
}

.tab-btn {
  background: none;
  border: none;
  padding: 0.85rem 1.1rem;
  font-size: 0.875rem;
  color: var(--nb-c-text-subtle);
  cursor: pointer;
  border-bottom: 2px solid transparent;
  transition:
    color 0.15s,
    border-color 0.15s;
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;

  &:hover {
    color: var(--nb-c-text);
  }

  &.active {
    color: #7c3aed;
    border-bottom-color: #7c3aed;
    font-weight: 600;
  }
}

.tab-count {
  font-size: 0.7rem;
  background: #f3f4f6;
  color: #6b7280;
  padding: 0.1rem 0.45rem;
  border-radius: 20px;
  font-weight: 600;
  line-height: 1.4;
}

.tab-divider {
  border-bottom: 1px solid var(--nb-c-component-plain-border);
  margin-bottom: 1.5rem;
}

// ── Tab content ───────────────────────────────────────────────────────────────

.tab-content {
  min-height: 200px;
}

.tab-content--overview {
  display: grid;
  grid-template-columns: 1fr 240px;
  gap: 2rem;
  align-items: start;

  @media (max-width: 720px) {
    grid-template-columns: 1fr;
  }
}

// ── Overview — install ────────────────────────────────────────────────────────

.install-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 0.7rem 1rem;
  margin-bottom: 1.5rem;
}

.install-cmd {
  flex: 1;
  font-family: monospace;
  font-size: 0.875rem;
  color: var(--nb-c-text);
  user-select: all;
}

.copy-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  font-weight: 600;
  padding: 0.3rem 0.6rem;
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 6px;
  background: none;
  cursor: pointer;
  color: var(--nb-c-text-subtle);
  transition: all 0.15s;
  white-space: nowrap;

  &.copied {
    border-color: #10b981;
    color: #10b981;
  }

  &:hover:not(.copied) {
    border-color: #7c3aed;
    color: #7c3aed;
  }
}

// ── Overview — README ─────────────────────────────────────────────────────────

.readme {
  font-size: 0.875rem;
  line-height: 1.7;
  color: var(--nb-c-text);

  :deep(h1),
  :deep(h2),
  :deep(h3),
  :deep(h4) {
    margin-top: 1.5em;
    margin-bottom: 0.5em;
    line-height: 1.25;
  }

  :deep(h1) {
    font-size: 1.5em;
  }
  :deep(h2) {
    font-size: 1.25em;
    padding-bottom: 0.25em;
    border-bottom: 1px solid var(--nb-c-component-plain-border);
  }
  :deep(h3) {
    font-size: 1.05em;
  }

  :deep(p) {
    margin: 0 0 1em;
  }

  :deep(code) {
    font-family: monospace;
    font-size: 0.85em;
    background: #f3f4f6;
    padding: 0.1em 0.35em;
    border-radius: 3px;
  }

  :deep(pre) {
    background: #f8f9fa;
    border: 1px solid var(--nb-c-component-plain-border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin: 0 0 1em;

    code {
      background: none;
      padding: 0;
      font-size: 0.82em;
    }
  }

  :deep(ul),
  :deep(ol) {
    margin: 0 0 1em;
    padding-left: 1.5em;
  }

  :deep(li) {
    margin-bottom: 0.25em;
  }

  :deep(a) {
    color: #7c3aed;
  }

  :deep(img) {
    max-width: 100%;
    border-radius: 6px;
  }

  :deep(blockquote) {
    border-left: 3px solid #7c3aed;
    margin: 0 0 1em;
    padding: 0.5em 1em;
    color: var(--nb-c-text-subtle);
    background: rgba(124, 58, 237, 0.04);
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    margin: 0 0 1em;
    font-size: 0.85em;

    th,
    td {
      border: 1px solid var(--nb-c-component-plain-border);
      padding: 0.4em 0.75em;
      text-align: left;
    }

    th {
      background: #f3f4f6;
      font-weight: 600;
    }
  }
}

.readme-empty {
  color: var(--nb-c-text-subtle);
  font-size: 0.875rem;
  padding: 2rem 0;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

.overview-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.sidebar-heading {
  font-size: 0.78rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.06em;
  color: var(--nb-c-text-subtle);
  margin: 0 0 0.25rem;
}

.sidebar-dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.75rem;
  font-size: 0.8rem;
  margin: 0;

  dt {
    color: var(--nb-c-text-subtle);
    font-weight: 500;
  }

  dd {
    margin: 0;
    color: var(--nb-c-text);
    word-break: break-word;
  }
}

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

// ── Version History ───────────────────────────────────────────────────────────

.version-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th {
    text-align: left;
    font-size: 0.78rem;
    font-weight: 600;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    color: var(--nb-c-text-subtle);
    padding: 0.5rem 0.75rem;
    border-bottom: 1px solid var(--nb-c-component-plain-border);
  }

  td {
    padding: 0.65rem 0.75rem;
    border-bottom: 1px solid var(--nb-c-component-plain-border);
  }
}

.version-row--latest td {
  background: rgba(124, 58, 237, 0.04);
}

.version-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  font-family: monospace;
  font-weight: 600;
}

.version-date {
  color: var(--nb-c-text-subtle);
}

// ── Q&A ───────────────────────────────────────────────────────────────────────

.qa-header,
.reviews-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.reviews-header__actions {
  display: flex;
  gap: 0.5rem;
}

.qa-hint {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  background: #f0f9ff;
  border: 1px solid #bae6fd;
  border-radius: 8px;
  padding: 0.6rem 0.9rem;
  font-size: 0.82rem;
  color: #0369a1;
  margin-bottom: 1rem;

  a {
    color: #0369a1;
    font-weight: 600;
  }
}

.question-form {
  display: flex;
  flex-direction: column;
  gap: 0.6rem;
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1.1rem;
  margin-bottom: 1.25rem;
}

.question-input {
  width: 100%;
}

.question-form__actions {
  display: flex;
  gap: 0.5rem;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-card {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1rem 1.1rem;
}

.question-card__head {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}

.question-card__author {
  font-size: 0.82rem;
  font-weight: 600;
}

.question-card__date {
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
  margin-left: auto;
}

.question-card__body {
  font-size: 0.875rem;
  margin: 0;
  line-height: 1.5;
}

// ── Reviews ───────────────────────────────────────────────────────────────────

.rating-summary {
  display: flex;
  align-items: center;
  gap: 1rem;
  padding: 1rem 1.25rem;
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  margin-bottom: 1.25rem;
}

.rating-summary__avg {
  font-size: 2.5rem;
  font-weight: 800;
  color: var(--nb-c-text);
  line-height: 1;
}

.rating-summary__right {
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
}

.star-display {
  color: #f59e0b;
  font-size: 1rem;
  letter-spacing: 0.05em;

  &--lg {
    font-size: 1.2rem;
  }
}

.rating-summary__count {
  font-size: 0.78rem;
  color: var(--nb-c-text-subtle);
}

.review-form {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1.25rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  margin-bottom: 1.5rem;
}

.review-form__heading {
  font-size: 0.9rem;
  font-weight: 600;
  margin: 0;
}

.review-form__stars {
  display: flex;
  gap: 0.25rem;
}

.star-btn {
  background: none;
  border: none;
  cursor: pointer;
  font-size: 1.5rem;
  color: var(--nb-c-component-plain-border);
  padding: 0;
  line-height: 1;
  transition: color 0.1s;

  &.active,
  &:hover {
    color: #f59e0b;
  }
}

.review-form__input {
  width: 100%;
}

.review-form__msg {
  margin-top: 0.25rem;
}

.review-login-prompt {
  margin-bottom: 1.5rem;
}

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-card {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.review-card__head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.review-card__author-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.review-card__author {
  font-size: 0.82rem;
  font-weight: 600;
}

.review-card__stars {
  color: #f59e0b;
  font-size: 0.88rem;
}

.review-card__date {
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
}

.review-card__title {
  font-size: 0.875rem;
  font-weight: 600;
  margin: 0;
}

.review-card__body {
  font-size: 0.85rem;
  margin: 0;
  line-height: 1.5;
}

.helpful-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: none;
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--nb-c-text-subtle);
  align-self: flex-start;
  transition: all 0.1s;

  &:hover {
    border-color: #7c3aed;
    color: #7c3aed;
  }
}

// ── OTP modal ─────────────────────────────────────────────────────────────────

.otp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 200;
}

.otp-modal {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 12px;
  padding: 1.5rem;
  width: min(400px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  h3 {
    margin: 0;
    font-size: 1rem;
    font-weight: 700;
  }
}

.state-msg {
  text-align: center;
  padding: 3rem;
  color: var(--nb-c-text-subtle);
  font-size: 0.875rem;
}
</style>
