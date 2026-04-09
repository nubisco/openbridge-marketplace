<template>
  <div v-if="loading" class="state-msg">Loading...</div>
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
          <template v-if="plugin.thumb_up + plugin.thumb_down > 0">
            <span class="hdr-sep">|</span>
            <span class="hdr-stat hdr-stat--votes">
              <NbIcon name="thumbs-up" :size="13" class="vote-up" />
              {{ plugin.thumb_up }}
              <NbIcon name="thumbs-down" :size="13" class="vote-down" />
              {{ plugin.thumb_down }}
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
          <NbButton variant="primary" size="sm" :href="plugin.npm_url" target="_blank" rel="noopener">
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
        <NbButton v-if="authed && !showQuestionForm" variant="primary" size="sm" @click="showQuestionForm = true">
          Ask a question
        </NbButton>
        <NbButton v-else-if="!authed" variant="ghost" size="sm" @click="showLogin = true"> Sign in to ask </NbButton>
      </div>

      <!-- GitHub redirect hint -->
      <div v-if="plugin.repository_url" class="qa-hint">
        <NbIcon name="info" :size="13" />
        For bug reports and feature requests, visit the
        <a :href="plugin.repository_url" target="_blank" rel="noopener">GitHub repository</a>.
      </div>

      <!-- Ask form -->
      <div v-if="showQuestionForm" class="question-form">
        <NbTextInput
          v-model="questionBody"
          placeholder="Your question... (max 1000 characters)"
          class="question-input"
        />
        <div class="question-form__meta">
          <span class="char-count" :class="{ warn: questionBody.length > 900 }"> {{ questionBody.length }}/1000 </span>
        </div>
        <div class="question-form__actions">
          <NbButton
            variant="primary"
            size="sm"
            :disabled="!questionBody.trim() || questionBody.length > 1000 || submittingQ"
            @click="submitQuestion"
          >
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

          <!-- Answers -->
          <div v-if="q.answers.length" class="answer-list">
            <div
              v-for="a in q.answers"
              :key="a.id"
              class="answer-card"
              :class="{ 'answer-card--accepted': a.is_accepted }"
            >
              <div class="answer-card__head">
                <span class="answer-card__author">{{ a.author_display }}</span>
                <NbBadge v-if="a.is_accepted" variant="green" size="sm">Accepted</NbBadge>
                <span class="answer-card__date">{{ formatDate(a.created_at) }}</span>
              </div>
              <p class="answer-card__body">{{ a.body }}</p>
            </div>
          </div>

          <!-- Answer form -->
          <div v-if="answerTarget === q.id" class="answer-form">
            <NbTextInput v-model="answerBody" placeholder="Your answer... (max 2000 characters)" class="answer-input" />
            <div class="answer-form__meta">
              <span class="char-count" :class="{ warn: answerBody.length > 1800 }"> {{ answerBody.length }}/2000 </span>
            </div>
            <div class="answer-form__actions">
              <NbButton
                variant="primary"
                size="sm"
                :disabled="!answerBody.trim() || answerBody.length > 2000 || submittingA"
                @click="submitAnswer(q.id)"
              >
                Post answer
              </NbButton>
              <NbButton variant="ghost" size="sm" @click="answerTarget = null">Cancel</NbButton>
            </div>
            <NbMessage v-if="answerError" variant="error">{{ answerError }}</NbMessage>
          </div>
          <button v-else-if="authed" class="answer-btn" @click="openAnswer(q.id)">
            <NbIcon name="chat" :size="12" />
            Answer
          </button>
        </div>
      </div>
      <div v-else-if="!showQuestionForm" class="state-msg">No questions yet. Be the first to ask!</div>
    </div>

    <!-- ── Rating & Review ────────────────────────────────────────────────── -->
    <div v-else-if="activeTab === 'reviews'" class="tab-content">
      <div class="reviews-header">
        <h2 class="section-title">User Reviews</h2>
        <div class="reviews-header__actions">
          <NbButton v-if="authed" variant="primary" size="sm" @click="showReviewForm = !showReviewForm">
            {{ showReviewForm ? 'Cancel' : 'Write a review' }}
          </NbButton>
          <NbButton v-else variant="ghost" size="sm" @click="showLogin = true"> Sign in to review </NbButton>
        </div>
      </div>

      <!-- Vote summary -->
      <div v-if="plugin.thumb_up + plugin.thumb_down > 0" class="vote-summary">
        <div class="vote-summary__item vote-summary__item--up">
          <NbIcon name="thumbs-up" :size="22" />
          <span class="vote-summary__count">{{ plugin.thumb_up }}</span>
          <span class="vote-summary__label">helpful</span>
        </div>
        <div class="vote-summary__divider" />
        <div class="vote-summary__item vote-summary__item--down">
          <NbIcon name="thumbs-down" :size="22" />
          <span class="vote-summary__count">{{ plugin.thumb_down }}</span>
          <span class="vote-summary__label">not helpful</span>
        </div>
      </div>

      <!-- Review form -->
      <div v-if="showReviewForm" class="review-form">
        <h3 class="review-form__heading">Your review</h3>
        <div class="vote-picker">
          <button class="vote-btn vote-btn--up" :class="{ active: draftVote === 1 }" @click="draftVote = 1">
            <NbIcon name="thumbs-up" :size="20" />
            Helpful
          </button>
          <button class="vote-btn vote-btn--down" :class="{ active: draftVote === -1 }" @click="draftVote = -1">
            <NbIcon name="thumbs-down" :size="20" />
            Not helpful
          </button>
        </div>
        <NbTextInput
          v-model="draftBody"
          placeholder="Share your experience... (optional, max 2000 characters)"
          class="review-form__input"
        />
        <div class="review-form__meta">
          <span class="char-count" :class="{ warn: draftBody.length > 1800 }"> {{ draftBody.length }}/2000 </span>
        </div>
        <NbButton
          variant="primary"
          size="sm"
          :disabled="!draftVote || draftBody.length > 2000 || submitting"
          @click="submitReview"
        >
          Submit review
        </NbButton>
        <NbMessage v-if="submitError" variant="error" class="review-form__msg">{{ submitError }}</NbMessage>
      </div>

      <!-- OTP sign-in modal -->
      <div v-if="showLogin" class="otp-backdrop" @click.self="showLogin = false">
        <div class="otp-modal">
          <h3>Sign in</h3>
          <p class="otp-modal__hint">Enter your email to receive a one-time sign-in code.</p>
          <div v-if="!otpSent">
            <NbLabel>Email address</NbLabel>
            <NbTextInput v-model="email" placeholder="you@example.com" type="email" />
            <NbButton variant="primary" size="sm" :disabled="!email.trim() || otpLoading" @click="sendOtp">
              Send code
            </NbButton>
            <NbMessage v-if="otpError" variant="error">{{ otpError }}</NbMessage>
          </div>
          <div v-else>
            <NbLabel>Code sent to {{ email }}</NbLabel>
            <NbTextInput v-model="otpCode" placeholder="123456" maxlength="6" type="tel" autocomplete="one-time-code" />
            <NbLabel>Display name (shown publicly)</NbLabel>
            <NbTextInput v-model="displayName" placeholder="Your name" maxlength="64" />
            <NbButton
              variant="primary"
              size="sm"
              :disabled="!otpCode || !displayName.trim() || otpLoading"
              @click="verifyOtp"
            >
              Verify
            </NbButton>
            <NbButton variant="ghost" size="sm" @click="resetOtp">Back</NbButton>
            <NbMessage v-if="otpError" variant="error">{{ otpError }}</NbMessage>
          </div>
        </div>
      </div>

      <!-- Review list -->
      <div v-if="reviews.length" class="review-list">
        <div v-for="r in reviews" :key="r.id" class="review-card">
          <div class="review-card__head">
            <div class="review-card__author-block">
              <span class="review-card__vote" :class="r.vote === 1 ? 'vote-up' : 'vote-down'">
                <NbIcon :name="r.vote === 1 ? 'thumbs-up' : 'thumbs-down'" :size="14" />
              </span>
              <span class="review-card__author">{{ r.author_display }}</span>
            </div>
            <span class="review-card__date">{{ formatDate(r.created_at) }}</span>
          </div>
          <p v-if="r.body" class="review-card__body">{{ r.body }}</p>
          <div class="review-card__actions">
            <button class="helpful-btn" @click="markHelpful(r.id)">
              <NbIcon name="thumbs-up" :size="11" />
              Helpful ({{ r.helpful_count }})
            </button>
            <button v-if="authed && replyTarget !== r.id" class="answer-btn" @click="openReply(r.id)">
              <NbIcon name="chat" :size="12" />
              Reply
            </button>
          </div>

          <!-- Replies -->
          <div v-if="r.replies.length" class="reply-list">
            <div v-for="rp in r.replies" :key="rp.id" class="reply-card">
              <span class="reply-card__author">{{ rp.author_display }}</span>
              <span class="reply-card__date">{{ formatDate(rp.created_at) }}</span>
              <p class="reply-card__body">{{ rp.body }}</p>
            </div>
          </div>

          <!-- Reply form -->
          <div v-if="replyTarget === r.id" class="answer-form">
            <NbTextInput v-model="replyBody" placeholder="Your reply... (max 1000 characters)" />
            <div class="answer-form__meta">
              <span class="char-count" :class="{ warn: replyBody.length > 900 }"> {{ replyBody.length }}/1000 </span>
            </div>
            <div class="answer-form__actions">
              <NbButton
                variant="primary"
                size="sm"
                :disabled="!replyBody.trim() || replyBody.length > 1000 || submittingReply"
                @click="submitReply(r.id)"
              >
                Post reply
              </NbButton>
              <NbButton variant="ghost" size="sm" @click="replyTarget = null">Cancel</NbButton>
            </div>
            <NbMessage v-if="replyError" variant="error">{{ replyError }}</NbMessage>
          </div>
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
import type { Plugin, Review, ReviewReply, Question, QuestionAnswer } from '../../shared/types'
import { trackEvent } from '@/composables/useAnalytics'

const route = useRoute()
const pluginName = route.params.name as string

const plugin = ref<Plugin | null>(null)
const reviews = ref<Review[]>([])
const questions = ref<Question[]>([])
const loading = ref(true)
const activeTab = ref<'overview' | 'versions' | 'qa' | 'reviews'>('overview')

// Auth state — token stored in sessionStorage (cleared on tab close, not persisted)
const token = ref<string | null>(sessionStorage.getItem('marketplace_token'))
const authed = computed(() => !!token.value)
const showLogin = ref(false)
const email = ref('')
const displayName = ref('')
const otpCode = ref('')
const otpSent = ref(false)
const otpLoading = ref(false)
const otpError = ref('')

// Review state
const showReviewForm = ref(false)
const draftVote = ref<1 | -1 | 0>(0)
const draftBody = ref('')
const submitting = ref(false)
const submitError = ref('')

// Q&A state
const showQuestionForm = ref(false)
const questionBody = ref('')
const submittingQ = ref(false)
const questionError = ref('')

// Answer state
const answerTarget = ref<string | null>(null)
const answerBody = ref('')
const submittingA = ref(false)
const answerError = ref('')

// Reply state
const replyTarget = ref<string | null>(null)
const replyBody = ref('')
const submittingReply = ref(false)
const replyError = ref('')

const copied = ref(false)

const isOpenBridge = computed(() => plugin.value?.name.startsWith('openbridge-') ?? false)

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

function resolveReadmeImages(html: string, repositoryUrl: string | null | undefined): string {
  if (!repositoryUrl) return html
  const m = repositoryUrl.match(/github\.com\/([^/]+\/[^/#?]+?)(?:\.git)?(?:[/?#].*)?$/)
  if (!m) return html
  const rawBase = `https://raw.githubusercontent.com/${m[1]}/HEAD/`
  return html.replace(
    /(<img\s[^>]*src=")(?!https?:\/\/|\/\/|data:)([^"]+)(")/gi,
    (_, pre, path, post) => `${pre}${rawBase}${path}${post}`,
  )
}

const renderedReadme = computed(() => {
  const md = plugin.value?.readme
  if (!md) return ''
  const html = marked.parse(md) as string
  const resolved = resolveReadmeImages(html, plugin.value?.repository_url)
  return DOMPurify.sanitize(resolved)
})

const tabs = computed(() => [
  { id: 'overview' as const, label: 'Overview' },
  { id: 'versions' as const, label: 'Version History', count: versions.value.length || undefined },
  { id: 'qa' as const, label: 'Q & A', count: questions.value.length || undefined },
  { id: 'reviews' as const, label: 'Reviews', count: reviews.value.length || undefined },
])

// ── Actions ───────────────────────────────────────────────────────────────────

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

// ── OTP auth ──────────────────────────────────────────────────────────────────

function resetOtp() {
  otpSent.value = false
  otpError.value = ''
}

async function sendOtp() {
  otpLoading.value = true
  otpError.value = ''
  try {
    const res = await fetch('/api/auth/otp/request', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value.trim() }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message ?? data.error ?? 'Failed to send code')
    }
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
      body: JSON.stringify({
        email: email.value.trim(),
        code: otpCode.value.trim(),
        display: displayName.value.trim(),
      }),
    })
    if (!res.ok) {
      const data = await res.json()
      throw new Error(data.message ?? data.error ?? 'Invalid code')
    }
    const data = await res.json()
    token.value = data.token as string
    sessionStorage.setItem('marketplace_token', data.token as string)
    showLogin.value = false
    otpSent.value = false
    otpCode.value = ''
  } catch (e: unknown) {
    otpError.value = e instanceof Error ? e.message : String(e)
  } finally {
    otpLoading.value = false
  }
}

function authHeaders(): HeadersInit {
  return { 'content-type': 'application/json', Authorization: `Bearer ${token.value ?? ''}` }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

async function submitReview() {
  submitting.value = true
  submitError.value = ''
  trackEvent('review_submit', { plugin: pluginName, vote: String(draftVote.value) })
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginName)}/reviews`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ vote: draftVote.value, body: draftBody.value || undefined }),
    })
    if (res.status === 401) {
      token.value = null
      sessionStorage.removeItem('marketplace_token')
      showLogin.value = true
      throw new Error('Session expired. Please sign in again.')
    }
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to submit review')
    draftVote.value = 0
    draftBody.value = ''
    showReviewForm.value = false
    await load()
  } catch (e: unknown) {
    submitError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submitting.value = false
  }
}

async function markHelpful(id: string) {
  await fetch(`/api/reviews/${id}/helpful`, { method: 'POST' })
  const r = reviews.value.find((rv) => rv.id === id)
  if (r) r.helpful_count++
}

function openReply(reviewId: string) {
  replyTarget.value = reviewId
  replyBody.value = ''
  replyError.value = ''
}

async function submitReply(reviewId: string) {
  submittingReply.value = true
  replyError.value = ''
  try {
    const res = await fetch(`/api/reviews/${reviewId}/replies`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body: replyBody.value }),
    })
    if (res.status === 401) {
      token.value = null
      sessionStorage.removeItem('marketplace_token')
      showLogin.value = true
      throw new Error('Session expired. Please sign in again.')
    }
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to post reply')
    const reply = (await res.json()) as ReviewReply
    const review = reviews.value.find((r) => r.id === reviewId)
    if (review) review.replies.push(reply)
    replyTarget.value = null
    replyBody.value = ''
  } catch (e: unknown) {
    replyError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submittingReply.value = false
  }
}

// ── Q & A ─────────────────────────────────────────────────────────────────────

async function submitQuestion() {
  submittingQ.value = true
  questionError.value = ''
  try {
    const res = await fetch(`/api/plugins/${encodeURIComponent(pluginName)}/questions`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body: questionBody.value }),
    })
    if (res.status === 401) {
      token.value = null
      sessionStorage.removeItem('marketplace_token')
      showLogin.value = true
      throw new Error('Session expired. Please sign in again.')
    }
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to post question')
    const q = (await res.json()) as Question
    questions.value.unshift(q)
    questionBody.value = ''
    showQuestionForm.value = false
  } catch (e: unknown) {
    questionError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submittingQ.value = false
  }
}

function openAnswer(questionId: string) {
  answerTarget.value = questionId
  answerBody.value = ''
  answerError.value = ''
}

async function submitAnswer(questionId: string) {
  submittingA.value = true
  answerError.value = ''
  try {
    const res = await fetch(`/api/questions/${questionId}/answers`, {
      method: 'POST',
      headers: authHeaders(),
      body: JSON.stringify({ body: answerBody.value }),
    })
    if (res.status === 401) {
      token.value = null
      sessionStorage.removeItem('marketplace_token')
      showLogin.value = true
      throw new Error('Session expired. Please sign in again.')
    }
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to post answer')
    const answer = (await res.json()) as QuestionAnswer
    const question = questions.value.find((q) => q.id === questionId)
    if (question) question.answers.push(answer)
    answerTarget.value = null
    answerBody.value = ''
  } catch (e: unknown) {
    answerError.value = e instanceof Error ? e.message : String(e)
  } finally {
    submittingA.value = false
  }
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
}

.plugin-header__title-row {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.15rem;
}

.plugin-header__name {
  font-size: 1.5rem;
  font-weight: 800;
  margin: 0;
  letter-spacing: -0.02em;
}

.plugin-header__author {
  font-size: 0.85rem;
  color: var(--nb-c-text-subtle);
  margin: 0 0 0.5rem;
}

.plugin-header__stats {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
  margin-bottom: 0.5rem;
}

.plugin-header__desc {
  font-size: 0.9375rem;
  color: var(--nb-c-text-subtle);
  margin: 0;
  line-height: 1.5;
}

.hdr-stat {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.8125rem;
  color: var(--nb-c-text-subtle);
}

.hdr-stat--votes {
  gap: 0.4rem;
}

.hdr-sep {
  color: var(--nb-c-component-plain-border);
  font-size: 0.75rem;
}

.vote-up {
  color: #16a34a;
}

.vote-down {
  color: #dc2626;
}

// ── Tabs ──────────────────────────────────────────────────────────────────────

.plugin-tabs {
  display: flex;
  gap: 0;
  margin-top: 1.25rem;
  overflow-x: auto;
}

.tab-btn {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 1rem;
  font-size: 0.875rem;
  font-weight: 500;
  color: var(--nb-c-text-subtle);
  background: none;
  border: none;
  border-bottom: 2px solid transparent;
  cursor: pointer;
  white-space: nowrap;
  transition: all 0.12s;

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
  background: var(--nb-c-component-plain-bg);
  color: var(--nb-c-text-subtle);
  border-radius: 10px;
  padding: 0.1rem 0.45rem;
}

.tab-divider {
  border-bottom: 1px solid var(--nb-c-component-plain-border);
  margin-bottom: 1.5rem;
}

// ── Tab content ───────────────────────────────────────────────────────────────

.tab-content {
  &--overview {
    display: grid;
    grid-template-columns: 1fr 240px;
    gap: 2.5rem;
    align-items: start;

    @media (max-width: 767px) {
      grid-template-columns: 1fr;
    }
  }
}

.state-msg {
  color: var(--nb-c-text-subtle);
  font-size: 0.9rem;
  padding: 2rem 0;
}

// ── Install block ─────────────────────────────────────────────────────────────

.install-block {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  background: var(--nb-c-component-plain-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
  margin-bottom: 1.5rem;
}

.install-cmd {
  flex: 1;
  font-size: 0.875rem;
  font-family: monospace;
  color: var(--nb-c-text);
  background: none;
  border: none;
  outline: none;
  user-select: all;
}

.copy-btn {
  display: flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.25rem 0.5rem;
  border-radius: 4px;
  transition: all 0.12s;
  white-space: nowrap;

  &:hover {
    color: var(--nb-c-text);
    background: rgba(0, 0, 0, 0.04);
  }

  &.copied {
    color: #16a34a;
  }
}

// ── README ────────────────────────────────────────────────────────────────────

.readme {
  font-size: 0.9rem;
  line-height: 1.7;
  color: var(--nb-c-text);

  :deep(h1),
  :deep(h2),
  :deep(h3) {
    font-weight: 700;
    margin: 1.5rem 0 0.5rem;
  }

  :deep(h1) {
    font-size: 1.4rem;
  }
  :deep(h2) {
    font-size: 1.15rem;
  }
  :deep(h3) {
    font-size: 1rem;
  }

  :deep(p) {
    margin: 0.6rem 0;
  }

  :deep(code) {
    font-family: monospace;
    font-size: 0.85em;
    background: var(--nb-c-component-plain-bg);
    border: 1px solid var(--nb-c-component-plain-border);
    border-radius: 4px;
    padding: 0.1em 0.35em;
  }

  :deep(pre) {
    background: var(--nb-c-component-plain-bg);
    border: 1px solid var(--nb-c-component-plain-border);
    border-radius: 8px;
    padding: 1rem;
    overflow-x: auto;
    margin: 1rem 0;

    code {
      background: none;
      border: none;
      padding: 0;
    }
  }

  :deep(a) {
    color: #7c3aed;
  }

  :deep(ul),
  :deep(ol) {
    padding-left: 1.4rem;
    margin: 0.6rem 0;
  }

  :deep(table) {
    border-collapse: collapse;
    width: 100%;
    font-size: 0.875rem;
    margin: 1rem 0;
  }

  :deep(th),
  :deep(td) {
    border: 1px solid var(--nb-c-component-plain-border);
    padding: 0.4rem 0.75rem;
    text-align: left;
  }

  :deep(th) {
    background: var(--nb-c-component-plain-bg);
    font-weight: 600;
  }
}

.readme-empty {
  color: var(--nb-c-text-subtle);
  font-size: 0.9rem;
  font-style: italic;
}

// ── Sidebar ───────────────────────────────────────────────────────────────────

.overview-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.5rem;
  position: sticky;
  top: 80px;
}

.sidebar-section {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.sidebar-heading {
  font-size: 0.72rem;
  font-weight: 700;
  text-transform: uppercase;
  letter-spacing: 0.07em;
  color: var(--nb-c-text-subtle);
  margin: 0;
}

.sidebar-dl {
  display: grid;
  grid-template-columns: auto 1fr;
  gap: 0.2rem 0.75rem;
  font-size: 0.8125rem;

  dt {
    color: var(--nb-c-text-subtle);
    font-weight: 500;
  }

  dd {
    color: var(--nb-c-text);
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
}

.keyword-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

// ── Version table ─────────────────────────────────────────────────────────────

.version-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 0.875rem;

  th {
    text-align: left;
    font-size: 0.72rem;
    font-weight: 700;
    text-transform: uppercase;
    letter-spacing: 0.06em;
    color: var(--nb-c-text-subtle);
    padding: 0 0.75rem 0.5rem;
    border-bottom: 1px solid var(--nb-c-component-plain-border);
  }

  td {
    padding: 0.55rem 0.75rem;
    border-bottom: 1px solid var(--nb-c-component-plain-border);
    color: var(--nb-c-text);
  }

  tr:last-child td {
    border-bottom: none;
  }
}

.version-row--latest td {
  background: rgba(124, 58, 237, 0.04);
}

.version-cell {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.version-date {
  color: var(--nb-c-text-subtle);
}

// ── Q & A ─────────────────────────────────────────────────────────────────────

.qa-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.section-title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0;
}

.qa-hint {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  font-size: 0.8125rem;
  color: var(--nb-c-text-subtle);
  background: var(--nb-c-component-plain-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 6px;
  padding: 0.5rem 0.75rem;
  margin-bottom: 1rem;

  a {
    color: #7c3aed;
  }
}

.question-form,
.answer-form {
  background: var(--nb-c-component-plain-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 1rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.question-form__meta,
.answer-form__meta {
  display: flex;
  justify-content: flex-end;
}

.question-form__actions,
.answer-form__actions {
  display: flex;
  gap: 0.5rem;
}

.char-count {
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);

  &.warn {
    color: #dc2626;
  }
}

.question-input,
.answer-input {
  width: 100%;
}

.question-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.question-card {
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 1rem;
}

.question-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.question-card__author {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--nb-c-text);
}

.question-card__date {
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
}

.question-card__body {
  font-size: 0.9rem;
  color: var(--nb-c-text);
  margin: 0 0 0.75rem;
}

.answer-list {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  margin-bottom: 0.75rem;
  padding-left: 1rem;
  border-left: 2px solid var(--nb-c-component-plain-border);
}

.answer-card {
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  background: var(--nb-c-component-plain-bg);

  &--accepted {
    background: rgba(22, 163, 74, 0.06);
    border: 1px solid rgba(22, 163, 74, 0.2);
  }
}

.answer-card__head {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-bottom: 0.25rem;
}

.answer-card__author {
  font-size: 0.8rem;
  font-weight: 600;
  color: var(--nb-c-text);
}

.answer-card__date {
  font-size: 0.72rem;
  color: var(--nb-c-text-subtle);
  margin-left: auto;
}

.answer-card__body {
  font-size: 0.875rem;
  color: var(--nb-c-text);
  margin: 0;
}

.answer-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0;
  transition: color 0.12s;

  &:hover {
    color: var(--nb-c-text);
  }
}

// ── Reviews ───────────────────────────────────────────────────────────────────

.reviews-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 1rem;
}

.reviews-header__actions {
  display: flex;
  gap: 0.5rem;
}

.vote-summary {
  display: flex;
  align-items: center;
  gap: 2rem;
  padding: 1.25rem 1.5rem;
  background: var(--nb-c-component-plain-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  margin-bottom: 1.5rem;
}

.vote-summary__item {
  display: flex;
  align-items: center;
  gap: 0.5rem;

  &--up {
    color: #16a34a;
  }
  &--down {
    color: #dc2626;
  }
}

.vote-summary__count {
  font-size: 1.4rem;
  font-weight: 800;
}

.vote-summary__label {
  font-size: 0.8125rem;
  color: var(--nb-c-text-subtle);
}

.vote-summary__divider {
  width: 1px;
  height: 2rem;
  background: var(--nb-c-component-plain-border);
}

.vote-picker {
  display: flex;
  gap: 0.75rem;
}

.vote-btn {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  padding: 0.6rem 1.25rem;
  font-size: 0.875rem;
  font-weight: 500;
  border-radius: 8px;
  border: 2px solid var(--nb-c-component-plain-border);
  background: var(--nb-c-bg);
  cursor: pointer;
  transition: all 0.12s;
  color: var(--nb-c-text-subtle);

  &:hover {
    border-color: var(--nb-c-text-subtle);
    color: var(--nb-c-text);
  }

  &--up.active {
    border-color: #16a34a;
    background: rgba(22, 163, 74, 0.08);
    color: #16a34a;
  }

  &--down.active {
    border-color: #dc2626;
    background: rgba(220, 38, 38, 0.08);
    color: #dc2626;
  }
}

.review-form {
  background: var(--nb-c-component-plain-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1.25rem;
  margin-bottom: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.review-form__heading {
  font-size: 0.9375rem;
  font-weight: 700;
  margin: 0;
}

.review-form__input {
  width: 100%;
}

.review-form__meta {
  display: flex;
  justify-content: flex-end;
}

.review-form__msg {
  margin-top: 0.25rem;
}

// ── OTP modal ─────────────────────────────────────────────────────────────────

.otp-backdrop {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 200;
  display: flex;
  align-items: center;
  justify-content: center;
}

.otp-modal {
  background: var(--nb-c-bg);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 12px;
  padding: 1.75rem;
  width: min(380px, 90vw);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;

  h3 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 0;
  }
}

.otp-modal__hint {
  font-size: 0.8375rem;
  color: var(--nb-c-text-subtle);
  margin: 0;
}

// ── Review list ───────────────────────────────────────────────────────────────

.review-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.review-card {
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 1rem;
}

.review-card__head {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 0.5rem;
}

.review-card__author-block {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

.review-card__vote {
  display: flex;
  align-items: center;
}

.review-card__author {
  font-size: 0.8125rem;
  font-weight: 600;
  color: var(--nb-c-text);
}

.review-card__date {
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
}

.review-card__body {
  font-size: 0.9rem;
  color: var(--nb-c-text);
  margin: 0 0 0.75rem;
}

.review-card__actions {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}

.helpful-btn {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
  background: none;
  border: none;
  cursor: pointer;
  padding: 0.2rem 0;
  transition: color 0.12s;

  &:hover {
    color: var(--nb-c-text);
  }
}

.reply-list {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  margin: 0.75rem 0;
  padding-left: 1rem;
  border-left: 2px solid var(--nb-c-component-plain-border);
}

.reply-card {
  font-size: 0.875rem;
}

.reply-card__author {
  font-weight: 600;
  color: var(--nb-c-text);
  margin-right: 0.4rem;
}

.reply-card__date {
  font-size: 0.72rem;
  color: var(--nb-c-text-subtle);
  margin-right: 0.4rem;
}

.reply-card__body {
  color: var(--nb-c-text);
  margin: 0.2rem 0 0;
}
</style>
