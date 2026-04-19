<template>
  <div>
    <!-- Hero search -->
    <div class="hero">
      <h1 class="hero__title">Find Openbridge & Homebridge Plugins</h1>
      <p class="hero__sub">
        {{ stats?.plugin_count?.toLocaleString() ?? '…' }} plugins · ranked by adoption, maintenance, and community
        feedback
      </p>
      <div class="hero__search">
        <NbTextInput v-model="q" placeholder="Search plugins…" size="lg" class="search-input" @input="onSearch" />
      </div>
      <div class="hero__sort">
        <NbButton :variant="sort === 'best' ? 'primary' : 'ghost'" size="sm" @click="sort = 'best'"
          >Best match</NbButton
        >
        <NbButton :variant="sort === 'downloads' ? 'primary' : 'ghost'" size="sm" @click="sort = 'downloads'">
          Most downloaded
        </NbButton>
        <NbButton :variant="sort === 'rating' ? 'primary' : 'ghost'" size="sm" @click="sort = 'rating'"
          >Best reviewed</NbButton
        >
        <NbButton :variant="sort === 'updated' ? 'primary' : 'ghost'" size="sm" @click="sort = 'updated'"
          >Recently updated</NbButton
        >
      </div>
      <p class="hero__hint">
        Search results favor stronger query matches, then blend download volume, review quality, and recent maintenance.
      </p>
      <div class="hero__transparency">
        <span>Ranking is transparent.</span>
        <RouterLink to="/transparency">See how plugins are sorted and which signals matter.</RouterLink>
      </div>
    </div>

    <!-- Plugin grid -->
    <div v-if="loading" class="state-msg">Loading…</div>
    <div v-else-if="!plugins.length" class="state-msg">No plugins found.</div>
    <div v-else class="plugin-grid">
      <RouterLink v-for="p in plugins" :key="p.name" :to="`/plugins/${p.name}`" class="plugin-card">
        <div class="plugin-card__head">
          <span class="plugin-card__name">{{ p.name }}</span>
          <NbBadge v-if="p.name.startsWith('openbridge-')" variant="blue" size="sm">OpenBridge</NbBadge>
        </div>
        <p class="plugin-card__desc">{{ p.description ?? 'No description.' }}</p>
        <div class="plugin-card__meta">
          <span>v{{ p.version }}</span>
          <span class="meta-stat">
            <NbIcon name="cloud-arrow-down" :size="11" />
            {{ p.weekly_downloads.toLocaleString() }}
          </span>
          <span v-if="p.thumb_up + p.thumb_down > 0" class="meta-stat">
            <NbIcon name="thumbs-up" :size="11" class="meta-up" />
            {{ positiveReviewRatio(p) }}
          </span>
          <span v-if="p.last_published_at" class="meta-stat">
            <NbIcon name="clock-counter-clockwise" :size="11" />
            {{ formatRelativeDate(p.last_published_at) }}
          </span>
        </div>
      </RouterLink>
    </div>

    <!-- Pagination -->
    <div v-if="total > limit" class="pagination">
      <NbButton :disabled="page === 1" variant="ghost" size="sm" @click="page--">Previous</NbButton>
      <span>Page {{ page }} of {{ Math.ceil(total / limit) }}</span>
      <NbButton :disabled="page >= Math.ceil(total / limit)" variant="ghost" size="sm" @click="page++">Next</NbButton>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { RouterLink } from 'vue-router'
import type { PluginSummary } from '../../shared/types'

const q = ref('')
const sort = ref<'best' | 'downloads' | 'rating' | 'updated'>('best')
const page = ref(1)
const limit = 24
const plugins = ref<PluginSummary[]>([])
const total = ref(0)
const loading = ref(false)
const stats = ref<{ plugin_count: number; review_count: number } | null>(null)

let searchTimeout: ReturnType<typeof setTimeout>
function onSearch() {
  clearTimeout(searchTimeout)
  searchTimeout = setTimeout(() => {
    if (page.value !== 1) {
      page.value = 1 // watcher will trigger fetchPlugins
    } else {
      fetchPlugins() // page didn't change, trigger manually
    }
  }, 300)
}

async function fetchPlugins() {
  loading.value = true
  plugins.value = []
  try {
    const params = new URLSearchParams({ q: q.value, sort: sort.value, page: String(page.value), limit: String(limit) })
    const res = await fetch(`/api/plugins?${params}`)
    const data = await res.json()
    plugins.value = data.plugins
    total.value = data.total
  } finally {
    loading.value = false
  }
}

async function fetchStats() {
  const res = await fetch('/api/stats')
  stats.value = await res.json()
}

function positiveReviewRatio(plugin: PluginSummary): string {
  const totalVotes = plugin.thumb_up + plugin.thumb_down
  if (totalVotes === 0) return 'No reviews'
  return `${Math.round((plugin.thumb_up / totalVotes) * 100)}% positive`
}

function formatRelativeDate(value: string): string {
  const then = new Date(value).getTime()
  const now = Date.now()
  const days = Math.max(0, Math.round((now - then) / 86_400_000))

  if (days <= 1) return 'updated today'
  if (days < 30) return `${days}d ago`

  const months = Math.round(days / 30)
  if (months < 12) return `${months}mo ago`

  const years = Math.round(days / 365)
  return `${years}y ago`
}

watch([sort, page], fetchPlugins, { immediate: true })
fetchStats()
</script>

<style lang="scss" scoped>
.hero {
  text-align: center;
  padding: 3rem 0 2rem;
}

.hero__title {
  font-size: 2rem;
  font-weight: 800;
  margin: 0 0 0.5rem;
}

.hero__sub {
  color: var(--nb-c-text-subtle);
  margin: 0 0 1.5rem;
}

.hero__search {
  max-width: 560px;
  margin: 0 auto 1rem;
}

.search-input {
  width: 100%;
}

.hero__sort {
  display: flex;
  justify-content: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.hero__hint {
  margin: 0.85rem auto 0;
  max-width: 760px;
  font-size: 0.84rem;
  color: var(--nb-c-text-subtle);
  line-height: 1.6;
}

.hero__transparency {
  margin: 0.9rem auto 0;
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  flex-wrap: wrap;
  justify-content: center;
  font-size: 0.84rem;
  color: var(--nb-c-text-subtle);

  a {
    color: #7c3aed;
    text-decoration: none;
    font-weight: 600;
  }
}

.plugin-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 1rem;
  margin-top: 2rem;
}

.plugin-card {
  background: var(--nb-c-surface);
  border: 1px solid var(--nb-c-component-plain-border);
  border-radius: 10px;
  padding: 1rem 1.1rem;
  text-decoration: none;
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  transition:
    border-color 0.15s,
    box-shadow 0.15s;

  &:hover {
    border-color: #7c3aed;
    box-shadow: 0 0 0 3px rgba(124, 58, 237, 0.08);
  }
}

.plugin-card__head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.5rem;
}

.plugin-card__name {
  font-size: 0.85rem;
  font-weight: 700;
  color: var(--nb-c-text);
  font-family: monospace;
}

.plugin-card__desc {
  font-size: 0.82rem;
  color: var(--nb-c-text-subtle);
  margin: 0;
  flex: 1;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

.plugin-card__meta {
  display: flex;
  gap: 0.75rem;
  font-size: 0.75rem;
  color: var(--nb-c-text-subtle);
  margin-top: 0.25rem;
  flex-wrap: wrap;
}

.meta-stat {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
}

.meta-star {
  color: #f59e0b;
}

.state-msg {
  text-align: center;
  padding: 4rem;
  color: var(--nb-c-text-subtle);
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 1rem;
  margin-top: 2rem;
  font-size: 0.875rem;
  color: var(--nb-c-text-subtle);
}
</style>
