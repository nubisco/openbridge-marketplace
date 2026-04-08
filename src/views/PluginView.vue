<template>
  <div v-if="loading" class="state-msg">Loading…</div>
  <div v-else-if="!plugin" class="state-msg">Plugin not found.</div>
  <div v-else class="plugin-detail">
    <!-- Header -->
    <div class="plugin-detail__header">
      <div class="plugin-detail__title-row">
        <h1 class="plugin-detail__name">{{ plugin.name }}</h1>
        <NbBadge v-if="plugin.verified" variant="green">Verified</NbBadge>
      </div>
      <p class="plugin-detail__desc">{{ plugin.description ?? 'No description.' }}</p>
      <div class="plugin-detail__meta">
        <span class="meta-item">v{{ plugin.version }}</span>
        <span class="meta-item">{{ plugin.weekly_downloads.toLocaleString() }} downloads/week</span>
        <span v-if="plugin.rating_avg" class="meta-item"
          >⭐ {{ plugin.rating_avg }} ({{ plugin.rating_count }} reviews)</span
        >
        <span v-if="plugin.author" class="meta-item">by {{ plugin.author }}</span>
      </div>
      <div class="plugin-detail__actions">
        <NbButton
          variant="primary"
          size="sm"
          :href="`https://www.npmjs.com/package/${plugin.name}`"
          target="_blank"
          rel="noopener"
        >
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
          GitHub
        </NbButton>
      </div>
    </div>

    <!-- Install snippet -->
    <div class="plugin-detail__install">
      <code class="install-cmd">npm install {{ plugin.name }}</code>
    </div>

    <!-- Keywords -->
    <div v-if="plugin.keywords?.length" class="plugin-detail__keywords">
      <NbBadge v-for="kw in plugin.keywords" :key="kw" variant="gray" size="sm">{{ kw }}</NbBadge>
    </div>

    <!-- Reviews -->
    <section class="reviews">
      <h2 class="reviews__title">Reviews</h2>

      <!-- Submit review (shown when authenticated) -->
      <div v-if="authed" class="review-form">
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
        <NbTextInput
          v-model="draftBody"
          placeholder="Share your experience with this plugin…"
          class="review-form__input"
        />
        <NbButton variant="primary" size="sm" :disabled="!draftRating || submitting" @click="submitReview">
          Submit review
        </NbButton>
        <NbMessage v-if="submitError" variant="error" class="review-form__msg">{{ submitError }}</NbMessage>
      </div>
      <div v-else class="review-login-prompt">
        <NbButton variant="ghost" size="sm" @click="showLogin = true">Sign in to write a review</NbButton>
      </div>

      <!-- OTP login modal -->
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
            <span class="review-card__author">{{ r.author_email }}</span>
            <span class="review-card__stars">{{ '★'.repeat(r.rating) }}{{ '☆'.repeat(5 - r.rating) }}</span>
            <span class="review-card__date">{{ formatDate(r.created_at) }}</span>
          </div>
          <p v-if="r.body" class="review-card__body">{{ r.body }}</p>
          <button class="helpful-btn" @click="markHelpful(r.id)">👍 Helpful ({{ r.helpful_count }})</button>
        </div>
      </div>
      <div v-else class="state-msg">No reviews yet. Be the first!</div>
    </section>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { useRoute } from 'vue-router'
import type { Plugin, Review } from '../../shared/types'
import { trackEvent } from '@/composables/useAnalytics'

const route = useRoute()
const pluginName = route.params.name as string

const plugin = ref<Plugin | null>(null)
const reviews = ref<Review[]>([])
const loading = ref(true)

const authed = ref(false)
const showLogin = ref(false)
const email = ref('')
const otpCode = ref('')
const otpSent = ref(false)
const otpLoading = ref(false)
const otpError = ref('')

const draftRating = ref(0)
const draftBody = ref('')
const submitting = ref(false)
const submitError = ref('')

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
    trackEvent('plugin_view', { plugin: pluginName })
  } finally {
    loading.value = false
  }
}

async function sendOtp() {
  otpLoading.value = true
  otpError.value = ''
  try {
    const res = await fetch('/api/auth/otp/send', {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify({ email: email.value }),
    })
    if (!res.ok) throw new Error((await res.json()).error ?? 'Failed to send code')
    otpSent.value = true
  } catch (e: any) {
    otpError.value = e.message
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
  } catch (e: any) {
    otpError.value = e.message
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
    await load()
  } catch (e: any) {
    submitError.value = e.message
  } finally {
    submitting.value = false
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
  gap: 2rem;
}

.plugin-detail__header {
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}

.plugin-detail__title-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.plugin-detail__name {
  font-size: 1.5rem;
  font-weight: 800;
  font-family: monospace;
  margin: 0;
}

.plugin-detail__desc {
  font-size: 0.95rem;
  color: var(--nb-c-text-subtle);
  margin: 0;
}

.plugin-detail__meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  font-size: 0.8rem;
  color: var(--nb-c-text-subtle);
}

.plugin-detail__actions {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.plugin-detail__install {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 8px;
  padding: 0.75rem 1rem;
}

.install-cmd {
  font-family: monospace;
  font-size: 0.9rem;
  color: var(--nb-c-text);
  user-select: all;
}

.plugin-detail__keywords {
  display: flex;
  flex-wrap: wrap;
  gap: 0.4rem;
}

.reviews__title {
  font-size: 1.1rem;
  font-weight: 700;
  margin: 0 0 1rem;
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

  &.active {
    color: #f59e0b;
  }

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
  align-items: center;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.review-card__author {
  font-size: 0.82rem;
  font-weight: 600;
  color: var(--nb-c-text);
}

.review-card__stars {
  color: #f59e0b;
  font-size: 0.9rem;
  letter-spacing: 0.02em;
}

.review-card__date {
  font-size: 0.78rem;
  color: var(--nb-c-text-subtle);
  margin-left: auto;
}

.review-card__body {
  font-size: 0.85rem;
  color: var(--nb-c-text);
  margin: 0;
  line-height: 1.5;
}

.helpful-btn {
  background: none;
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 6px;
  padding: 0.25rem 0.6rem;
  font-size: 0.75rem;
  cursor: pointer;
  color: var(--nb-c-text-subtle);
  align-self: flex-start;
  transition:
    border-color 0.1s,
    color 0.1s;

  &:hover {
    border-color: #7c3aed;
    color: #7c3aed;
  }
}

.state-msg {
  text-align: center;
  padding: 3rem;
  color: var(--nb-c-text-subtle);
}
</style>
