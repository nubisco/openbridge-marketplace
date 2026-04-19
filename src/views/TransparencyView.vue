<template>
  <div class="transparency-page">
    <header class="transparency-hero">
      <p class="transparency-hero__eyebrow">Marketplace transparency</p>
      <h1>How ranking, reviews, and visibility work</h1>
      <p class="transparency-hero__lede">
        The Openbridge Marketplace currently ranks plugins using package metadata, aggregated review votes, maintenance
        recency, and search relevance. This page describes the current mechanics implemented in the marketplace.
      </p>
    </header>

    <section class="transparency-section">
      <h2>Default ranking</h2>
      <p>
        By default, search and browse use the marketplace ranking model exposed by
        <code>GET /api/meta/ranking</code>.
      </p>
      <div v-if="loading" class="state-msg">Loading ranking metadata…</div>
      <div v-else-if="ranking" class="signal-grid">
        <article class="signal-card">
          <h3>Downloads</h3>
          <p>{{ ranking.signals.download_score }}</p>
          <strong>{{ Math.round(ranking.weights.downloads * 100) }}%</strong>
        </article>
        <article class="signal-card">
          <h3>Reviews</h3>
          <p>{{ ranking.signals.review_score }}</p>
          <strong>{{ Math.round(ranking.weights.reviews * 100) }}%</strong>
        </article>
        <article class="signal-card">
          <h3>Freshness</h3>
          <p>{{ ranking.signals.freshness_score }}</p>
          <strong>{{ Math.round(ranking.weights.freshness * 100) }}%</strong>
        </article>
      </div>
      <p class="note">
        Search text matching is applied as an additional boost. If you search for <code>tuya</code>, closer name matches
        receive a stronger text score, then the ranking model orders the relevant plugins.
      </p>
    </section>

    <section class="transparency-section">
      <h2>Current ranking inputs</h2>
      <ul>
        <li>Weekly download volume.</li>
        <li>Aggregated review votes, converted into a computed review score.</li>
        <li>Latest published date.</li>
        <li>Search-text relevance when a query is present.</li>
      </ul>
    </section>

    <section class="transparency-section">
      <h2>Current limits</h2>
      <ul>
        <li>The primary ranking model does not currently use the <code>verified</code> field.</li>
        <li>The marketplace does not currently personalize ranking per signed-in user.</li>
        <li>The marketplace does not host plugin code itself. Installation and package delivery come from npm.</li>
        <li>A highly ranked plugin is not guaranteed to be safe, correct, or suitable for a specific environment.</li>
      </ul>
    </section>

    <section class="transparency-section">
      <h2>Reviews and community input</h2>
      <p>
        Reviews are public contributions from users. A review can include a positive or negative vote and an optional
        written explanation. Helpful votes affect how reviews are ordered on a plugin page. Aggregated review votes feed
        the marketplace ranking model through the computed review score.
      </p>
      <p>
        Reviews and Q&amp;A are signals, not guarantees. Users should still inspect plugin repositories, release
        history, documentation, and code quality before installation.
      </p>
    </section>

    <section class="transparency-section">
      <h2>Legal and policy documents</h2>
      <ul>
        <li><RouterLink to="/privacy">Marketplace Privacy Policy</RouterLink></li>
        <li><RouterLink to="/terms">Marketplace Terms of Service</RouterLink></li>
      </ul>
    </section>
  </div>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { RouterLink } from 'vue-router'
import type { RankingMetaResponse } from '../../shared/types'

const ranking = ref<RankingMetaResponse | null>(null)
const loading = ref(true)

onMounted(async () => {
  try {
    const res = await fetch('/api/meta/ranking')
    if (res.ok) ranking.value = await res.json()
  } finally {
    loading.value = false
  }
})
</script>

<style scoped lang="scss">
.transparency-page {
  max-width: 840px;
  margin: 0 auto;
  padding: 3rem 0 5rem;
}

.transparency-hero {
  margin-bottom: 2.5rem;

  h1 {
    margin: 0 0 0.85rem;
    font-size: clamp(2rem, 4vw, 3.2rem);
    line-height: 1.05;
    letter-spacing: -0.04em;
  }
}

.transparency-hero__eyebrow {
  margin: 0 0 0.65rem;
  font-size: 0.78rem;
  font-weight: 800;
  letter-spacing: 0.12em;
  text-transform: uppercase;
  color: #7c3aed;
}

.transparency-hero__lede {
  margin: 0;
  font-size: 1.02rem;
  line-height: 1.8;
  color: var(--nb-c-text-subtle);
}

.transparency-section {
  margin-top: 2rem;

  h2 {
    margin: 0 0 0.7rem;
    font-size: 1.18rem;
    font-weight: 800;
  }

  p,
  li {
    font-size: 0.96rem;
    line-height: 1.75;
    color: var(--nb-c-text-subtle);
  }

  ul {
    padding-left: 1.2rem;
    display: grid;
    gap: 0.5rem;
  }

  code {
    font-family: 'SFMono-Regular', Consolas, monospace;
    font-size: 0.92em;
    background: rgba(124, 58, 237, 0.08);
    padding: 0.15rem 0.35rem;
    border-radius: 6px;
  }

  a {
    color: #7c3aed;
  }
}

.signal-grid {
  display: grid;
  gap: 1rem;
  margin: 1rem 0 0.8rem;

  @media (min-width: 760px) {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

.signal-card {
  border: 1px solid rgba(0, 0, 0, 0.08);
  border-radius: 16px;
  padding: 1rem;
  background: #fff;

  h3 {
    margin: 0 0 0.5rem;
    font-size: 0.95rem;
    font-weight: 700;
  }

  p {
    margin: 0 0 0.8rem;
    font-size: 0.9rem;
  }

  strong {
    font-size: 0.85rem;
    color: var(--nb-c-text);
  }
}

.note,
.state-msg {
  color: var(--nb-c-text-subtle);
}
</style>
