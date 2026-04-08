<template>
  <div class="site">
    <header class="site-header">
      <div class="site-header__inner">
        <RouterLink to="/" class="site-header__brand">
          <span class="site-header__logo">OB</span>
          <span class="site-header__name">Marketplace</span>
        </RouterLink>

        <nav class="site-header__nav">
          <RouterLink to="/">Browse</RouterLink>
        </nav>
      </div>
    </header>

    <main class="site-main">
      <RouterView />
    </main>

    <footer class="site-footer">
      <p>Openbridge Marketplace &mdash; community plugin directory</p>
    </footer>
  </div>
</template>

<style lang="scss" scoped>
.site {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
  background: var(--nb-c-bg);
}

.site-header {
  border-bottom: 1px solid var(--nb-c-component-plain-border);
  background: var(--nb-c-surface);
  position: sticky;
  top: 0;
  z-index: 100;
}

.site-header__inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 1.5rem;
  height: 56px;
  display: flex;
  align-items: center;
  gap: 2rem;
}

.site-header__brand {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  text-decoration: none;
}

.site-header__logo {
  width: 32px;
  height: 32px;
  background: #7c3aed;
  color: #fff;
  border-radius: 8px;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 0.7rem;
  font-weight: 800;
  letter-spacing: -0.02em;
}

.site-header__name {
  font-weight: 700;
  font-size: 1rem;
  color: var(--nb-c-text);
}

.site-header__nav {
  display: flex;
  gap: 1.5rem;

  a {
    color: var(--nb-c-text-subtle);
    text-decoration: none;
    font-size: 0.875rem;

    &.router-link-active {
      color: var(--nb-c-text);
      font-weight: 600;
    }
  }
}

.site-main {
  flex: 1;
  max-width: 1200px;
  width: 100%;
  margin: 0 auto;
  padding: 2rem 1.5rem;
}

.site-footer {
  border-top: 1px solid var(--nb-c-component-plain-border);
  padding: 1.5rem;
  text-align: center;
  font-size: 0.8rem;
  color: var(--nb-c-text-subtle);
}
</style>
