<template>
  <div class="legal-page">
    <h1>Privacy Policy</h1>
    <p class="legal-page__date">Last updated: April 2026</p>

    <section>
      <h2>Overview</h2>
      <p>
        The Openbridge Marketplace ("we", "us") is operated by Nubisco. This policy explains what data we collect, why
        we collect it, and how it is used.
      </p>
    </section>

    <section>
      <h2>Data we collect</h2>
      <ul>
        <li>
          <strong>Plugin metadata:</strong> publicly available information fetched from the npm registry and GitHub
          (package names, descriptions, download counts, star counts). No personal data is collected from these sources.
        </li>
        <li>
          <strong>Anonymous analytics:</strong> if analytics is enabled, we collect page views and interaction events.
          No personal identifiers (IP addresses, cookies, fingerprints) are stored.
        </li>
        <li>
          <strong>Reviews and Q&amp;A:</strong> when you submit a review or question, your email address is hashed
          before storage and is never stored in plain text. Only the display name you provide is shown publicly.
        </li>
      </ul>
    </section>

    <section>
      <h2>Third-party services</h2>
      <p>
        Plugin data is sourced from the
        <a href="https://www.npmjs.com" target="_blank" rel="noopener">npm registry</a> and
        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>. Their own privacy policies apply when
        you visit those services.
      </p>
    </section>

    <section>
      <h2>Contact</h2>
      <p>
        Questions about this policy? Reach us at
        <a href="https://nubisco.com/contact" target="_blank" rel="noopener">nubisco.com/contact</a>.
      </p>
    </section>
  </div>
</template>

<style lang="scss" scoped>
.legal-page {
  max-width: 680px;
  margin: 0 auto;
  padding: 3rem 0 5rem;

  h1 {
    font-size: 2rem;
    font-weight: 800;
    margin: 0 0 0.4rem;
  }

  h2 {
    font-size: 1.1rem;
    font-weight: 700;
    margin: 2rem 0 0.6rem;
  }

  p,
  li {
    font-size: 0.9375rem;
    line-height: 1.7;
    color: var(--nb-c-text-subtle);
  }

  ul {
    padding-left: 1.4rem;
    display: flex;
    flex-direction: column;
    gap: 0.5rem;
  }

  strong {
    color: var(--nb-c-text);
  }

  a {
    color: #7c3aed;
  }
}

.legal-page__date {
  font-size: 0.82rem;
  color: var(--nb-c-text-subtle);
  margin: 0 0 2.5rem;
}
</style>
