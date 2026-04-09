<template>
  <div class="legal-page">
    <h1>Terms of Service</h1>
    <p class="legal-page__date">Last updated: April 2026</p>

    <section>
      <h2>Acceptance</h2>
      <p>
        By using the Openbridge Marketplace ("the Service"), operated by Nubisco, you agree to these terms. If you do
        not agree, please do not use the Service.
      </p>
    </section>

    <section>
      <h2>Description of Service</h2>
      <p>
        The Openbridge Marketplace is a community plugin directory for Openbridge and Homebridge. It indexes publicly
        available npm packages and provides a searchable interface, community reviews, and Q&amp;A. Plugin installation
        is performed directly from the npm registry. Nubisco does not distribute or host plugin code.
      </p>
    </section>

    <section>
      <h2>User contributions</h2>
      <p>
        Reviews and questions you submit must be accurate, respectful, and not infringe any third-party rights. We
        reserve the right to remove content that violates these requirements.
      </p>
    </section>

    <section>
      <h2>Disclaimer</h2>
      <p>
        Plugins listed in the marketplace are third-party software. Nubisco does not review, endorse, or guarantee the
        quality or safety of any listed plugin. Use plugins at your own risk.
      </p>
    </section>

    <section>
      <h2>Changes</h2>
      <p>
        We may update these terms at any time. Continued use of the Service after changes constitutes acceptance of the
        updated terms.
      </p>
    </section>

    <section>
      <h2>Contact</h2>
      <p>
        Questions?
        <a href="https://nubisco.com/contact" target="_blank" rel="noopener">nubisco.com/contact</a>
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
