<template>
  <div class="auth-callback">
    <div class="auth-card">
      <h1 class="auth-title">Signing you in</h1>
      <p v-if="loading" class="auth-copy">Finalizing your marketplace session through Nubisco Platform.</p>
      <p v-else class="auth-copy">{{ message }}</p>
      <div class="auth-actions">
        <NbButton v-if="showRetry" variant="primary" @click="retryLogin">Try again</NbButton>
        <NbButton v-if="!loading" variant="ghost" @click="goHome">Back to marketplace</NbButton>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

const route = useRoute()
const router = useRouter()

const loading = ref(true)
const showRetry = ref(false)
const message = ref('')

function readStoredState() {
  const raw = sessionStorage.getItem('marketplace_platform_state')
  if (!raw) return null

  try {
    return JSON.parse(raw) as { nonce: string; returnTo: string }
  } catch {
    return null
  }
}

function clearStoredState() {
  sessionStorage.removeItem('marketplace_platform_state')
}

async function retryLogin() {
  const stored = readStoredState()
  if (!stored) {
    goHome()
    return
  }

  const res = await fetch('/api/auth/platform/config')
  const config = (await res.json()) as { enabled: boolean; issuer: string | null; appId: string }
  if (!config.enabled || !config.issuer) {
    message.value = 'Marketplace SSO is not configured.'
    showRetry.value = false
    return
  }

  const callbackUrl = new URL('/auth/callback', window.location.origin)
  const ssoUrl = new URL('/api/auth/sso', config.issuer)
  ssoUrl.searchParams.set('app_id', config.appId)
  ssoUrl.searchParams.set('redirect_uri', callbackUrl.toString())
  ssoUrl.searchParams.set('state', stored.nonce)
  // Force the platform to prompt for credentials so we never inherit
  // a stale platform session belonging to a different identity.
  ssoUrl.searchParams.set('prompt', 'login')
  window.location.assign(ssoUrl.toString())
}

function goHome() {
  router.replace('/')
}

onMounted(async () => {
  const stored = readStoredState()
  const token = typeof route.query.token === 'string' ? route.query.token : ''
  const state = typeof route.query.state === 'string' ? route.query.state : ''
  const error = typeof route.query.error === 'string' ? route.query.error : ''

  if (!stored || !state || stored.nonce !== state) {
    loading.value = false
    message.value = 'The marketplace sign-in request is no longer valid. Start again from the plugin page.'
    clearStoredState()
    return
  }

  if (error) {
    loading.value = false
    showRetry.value = true
    message.value =
      error === 'domain_not_allowed'
        ? 'Your account is not eligible for automatic marketplace access.'
        : 'Your account does not currently have access to this marketplace app.'
    return
  }

  if (!token) {
    loading.value = false
    message.value = 'Platform did not return a marketplace access token.'
    clearStoredState()
    return
  }

  sessionStorage.setItem('marketplace_token', token)
  const destination = stored.returnTo || '/'
  clearStoredState()
  await router.replace(destination)
})
</script>

<style lang="scss" scoped>
.auth-callback {
  min-height: 60vh;
  display: grid;
  place-items: center;
}

.auth-card {
  width: min(480px, 100%);
  padding: 2rem;
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 16px;
  background: var(--nb-c-surface, #fff);
  box-shadow: 0 20px 50px rgba(15, 23, 42, 0.08);
}

.auth-title {
  margin: 0 0 0.75rem;
  font-size: 1.5rem;
}

.auth-copy {
  margin: 0;
  color: var(--nb-c-text-subtle);
  line-height: 1.6;
}

.auth-actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}
</style>
