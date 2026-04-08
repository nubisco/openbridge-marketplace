<template>
  <div class="site">
    <!-- ── Header ─────────────────────────────────────────────────────────── -->
    <header class="site-header" :class="{ 'site-header--scrolled': isScrolled }">
      <div class="site-header__inner">
        <RouterLink to="/" class="site-header__brand">
          <img src="/logo.svg" alt="Openbridge" class="site-header__logo" />
          <span class="site-header__name">Marketplace</span>
        </RouterLink>

        <nav class="site-header__nav" aria-label="Main navigation">
          <RouterLink to="/">Browse</RouterLink>
        </nav>

        <div class="site-header__actions">
          <NbButton
            variant="ghost"
            size="sm"
            href="https://github.com/nubisco/openbridge"
            target="_blank"
            rel="noopener"
            icon="github-logo"
          >
            GitHub
          </NbButton>
        </div>

        <!-- Mobile hamburger -->
        <button
          class="site-header__hamburger"
          :aria-expanded="mobileOpen"
          :aria-label="mobileOpen ? 'Close menu' : 'Open menu'"
          @click="mobileOpen = !mobileOpen"
        >
          <span class="bar" />
          <span class="bar" />
          <span class="bar" />
        </button>
      </div>

      <!-- Mobile menu -->
      <Transition name="mobile-nav">
        <div v-show="mobileOpen" class="site-header__mobile">
          <RouterLink to="/" @click="mobileOpen = false">Browse</RouterLink>
          <a href="https://github.com/nubisco/openbridge" target="_blank" rel="noopener" @click="mobileOpen = false">
            GitHub
          </a>
        </div>
      </Transition>
    </header>

    <!-- ── Main ───────────────────────────────────────────────────────────── -->
    <main class="site-main">
      <RouterView />
    </main>

    <!-- ── Footer ─────────────────────────────────────────────────────────── -->
    <footer class="site-footer">
      <div class="site-footer__inner">
        <div class="site-footer__grid">
          <!-- Brand -->
          <div class="site-footer__brand">
            <div class="footer-logo">
              <img src="/logo.svg" alt="Openbridge" class="footer-logo__img" />
              <span class="footer-logo__name">Marketplace</span>
            </div>
            <p class="site-footer__tagline">
              Community plugin directory for Openbridge &amp; Homebridge. Find, review, and discover the best smart home
              plugins.
            </p>
          </div>

          <!-- Resources -->
          <div class="site-footer__col">
            <h3 class="site-footer__heading">Resources</h3>
            <ul role="list">
              <li><RouterLink to="/">Browse Plugins</RouterLink></li>
              <li>
                <a href="https://github.com/nubisco/openbridge" target="_blank" rel="noopener">Openbridge on GitHub</a>
              </li>
              <li>
                <a href="https://openbridge.nubisco.io" target="_blank" rel="noopener">Openbridge App</a>
              </li>
              <li>
                <a href="https://www.npmjs.com/search?q=homebridge-plugin" target="_blank" rel="noopener">
                  Browse on npm
                </a>
              </li>
            </ul>
          </div>

          <!-- Company -->
          <div class="site-footer__col">
            <h3 class="site-footer__heading">Nubisco</h3>
            <ul role="list">
              <li><a href="https://nubisco.com" target="_blank" rel="noopener">nubisco.com</a></li>
              <li><a href="https://nubisco.com/about" target="_blank" rel="noopener">About</a></li>
              <li><a href="https://nubisco.com/contact" target="_blank" rel="noopener">Contact</a></li>
              <li>
                <a href="https://github.com/nubisco" target="_blank" rel="noopener">GitHub</a>
              </li>
            </ul>
          </div>

          <!-- Legal -->
          <div class="site-footer__col">
            <h3 class="site-footer__heading">Legal</h3>
            <ul role="list">
              <li><RouterLink to="/privacy">Privacy Policy</RouterLink></li>
              <li><RouterLink to="/terms">Terms of Service</RouterLink></li>
            </ul>
          </div>
        </div>

        <div class="site-footer__bottom">
          <p>&copy; {{ year }} Nubisco. All rights reserved.</p>
          <div class="site-footer__bottom-links">
            <NbIcon name="github-logo" :size="14" />
            <a href="https://github.com/nubisco" target="_blank" rel="noopener">github.com/nubisco</a>
          </div>
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted } from 'vue'

const mobileOpen = ref(false)
const isScrolled = ref(false)
const year = new Date().getFullYear()

function onScroll() {
  isScrolled.value = window.scrollY > 8
}

onMounted(() => window.addEventListener('scroll', onScroll, { passive: true }))
onUnmounted(() => window.removeEventListener('scroll', onScroll))
</script>

<style lang="scss" scoped>
// ── Site shell ────────────────────────────────────────────────────────────────

.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--nb-c-bg);
}

.site-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

// ── Header ────────────────────────────────────────────────────────────────────

.site-header {
  position: sticky;
  top: 0;
  z-index: 100;
  background: rgba(255, 255, 255, 0.85);
  backdrop-filter: blur(12px);
  -webkit-backdrop-filter: blur(12px);
  border-bottom: 1px solid transparent;
  transition:
    border-color 0.15s ease,
    background 0.15s ease;

  &--scrolled {
    background: rgba(255, 255, 255, 0.97);
    border-bottom-color: rgba(0, 0, 0, 0.07);
  }
}

.site-header__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 60px;
  display: flex;
  align-items: center;
  gap: 1.5rem;
}

.site-header__brand {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  text-decoration: none;
  flex-shrink: 0;
}

.site-header__logo {
  width: 30px;
  height: 30px;
}

.site-header__name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--nb-c-text);
  letter-spacing: -0.01em;
}

.site-header__nav {
  display: flex;
  gap: 0.25rem;
  flex: 1;

  a {
    padding: 0.35rem 0.75rem;
    color: var(--nb-c-text-subtle);
    text-decoration: none;
    font-size: 0.875rem;
    border-radius: 6px;
    transition: all 0.12s;

    &:hover {
      color: var(--nb-c-text);
      background: rgba(0, 0, 0, 0.04);
    }

    &.router-link-active {
      color: var(--nb-c-text);
      font-weight: 600;
    }
  }

  @media (max-width: 767px) {
    display: none;
  }
}

.site-header__actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  margin-left: auto;

  @media (max-width: 767px) {
    display: none;
  }
}

.site-header__hamburger {
  display: none;
  flex-direction: column;
  justify-content: center;
  gap: 5px;
  width: 36px;
  height: 36px;
  padding: 6px;
  background: none;
  border: none;
  cursor: pointer;
  margin-left: auto;

  .bar {
    display: block;
    height: 2px;
    width: 100%;
    background: var(--nb-c-text);
    border-radius: 2px;
  }

  @media (max-width: 767px) {
    display: flex;
  }
}

.site-header__mobile {
  display: flex;
  flex-direction: column;
  padding: 0.75rem 1.5rem 1rem;
  gap: 0.25rem;
  border-top: 1px solid rgba(0, 0, 0, 0.06);

  a {
    padding: 0.5rem 0.75rem;
    color: var(--nb-c-text-subtle);
    text-decoration: none;
    font-size: 0.9rem;
    border-radius: 6px;

    &:hover,
    &.router-link-active {
      color: var(--nb-c-text);
      background: rgba(0, 0, 0, 0.04);
    }
  }

  @media (min-width: 768px) {
    display: none;
  }
}

.mobile-nav-enter-active,
.mobile-nav-leave-active {
  transition:
    opacity 0.15s ease,
    transform 0.15s ease;
}

.mobile-nav-enter-from,
.mobile-nav-leave-to {
  opacity: 0;
  transform: translateY(-6px);
}

// ── Footer ────────────────────────────────────────────────────────────────────

.site-footer {
  background: #0d0d0f;
  color: rgba(255, 255, 255, 0.65);
  margin-top: auto;
}

.site-footer__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 4rem 1.5rem 2.5rem;
}

.site-footer__grid {
  display: grid;
  grid-template-columns: 2fr 1fr 1fr 1fr;
  gap: 3rem;
  padding-bottom: 3rem;
  border-bottom: 1px solid rgba(255, 255, 255, 0.08);

  @media (max-width: 1023px) {
    grid-template-columns: 1fr 1fr;
  }

  @media (max-width: 599px) {
    grid-template-columns: 1fr;
    gap: 2.5rem;
  }
}

.site-footer__brand {
  display: flex;
  flex-direction: column;
  gap: 0.85rem;
}

.footer-logo {
  display: flex;
  align-items: center;
  gap: 0.6rem;

  &__img {
    width: 28px;
    height: 28px;
  }

  &__name {
    font-size: 1rem;
    font-weight: 700;
    color: #fff;
    letter-spacing: -0.01em;
  }
}

.site-footer__tagline {
  font-size: 0.82rem;
  color: rgba(255, 255, 255, 0.45);
  line-height: 1.6;
  max-width: 240px;
  margin: 0;
}

.site-footer__heading {
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
  color: rgba(255, 255, 255, 0.5);
  margin: 0 0 1rem;
}

.site-footer__col {
  ul {
    display: flex;
    flex-direction: column;
    gap: 0.6rem;
    list-style: none;
    padding: 0;
    margin: 0;
  }

  a {
    font-size: 0.875rem;
    color: rgba(255, 255, 255, 0.6);
    text-decoration: none;
    transition: color 0.12s;

    &:hover {
      color: #fff;
    }
  }
}

.site-footer__bottom {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 1.75rem;
  font-size: 0.78rem;
  color: rgba(255, 255, 255, 0.4);

  @media (max-width: 599px) {
    flex-direction: column;
    gap: 0.5rem;
    align-items: flex-start;
  }
}

.site-footer__bottom-links {
  display: flex;
  align-items: center;
  gap: 0.4rem;

  a {
    color: rgba(255, 255, 255, 0.4);
    text-decoration: none;
    transition: color 0.12s;

    &:hover {
      color: rgba(255, 255, 255, 0.65);
    }
  }
}
</style>
