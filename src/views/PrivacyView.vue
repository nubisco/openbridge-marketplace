<template>
  <div class="legal-page">
    <h1>Privacy Policy</h1>
    <p class="legal-page__date">Last updated: April 2026</p>

    <section>
      <h2>1. Who we are</h2>
      <p>
        The Openbridge Marketplace is operated by <strong>Nubisco Lda</strong>, a company incorporated in Portugal. In
        this policy, "Nubisco", "we", "us", and "our" refer to Nubisco Lda as the data controller for the marketplace
        service. You can contact us at <a href="mailto:support@nubisco.io">support@nubisco.io</a>.
      </p>
    </section>

    <section>
      <h2>2. What data we collect</h2>
      <ul>
        <li>
          <strong>Plugin metadata:</strong> publicly available information fetched from the npm registry and GitHub
          (package names, descriptions, download counts, release dates, repository links, star counts, and related
          package metadata). We treat this as public package data rather than personal user data.
        </li>
        <li>
          <strong>Service logs and rate limiting:</strong> we may temporarily process network and request metadata,
          including IP-related request information, to protect the marketplace against abuse, enforce rate limits, and
          maintain service stability.
        </li>
        <li>
          <strong>Analytics:</strong> the marketplace sends page views and selected interaction events to the Nubisco
          Analytics endpoint configured for this project. The client payload includes the current URL, referrer, screen
          width, event name, optional event properties, and a session identifier stored in <code>sessionStorage</code>.
          Analytics requests are not sent when the browser exposes a Do Not Track value of <code>1</code>.
        </li>
        <li>
          <strong>Reviews and Q&amp;A:</strong> when you submit a review, question, answer, or reply through Nubisco
          Platform sign-in, your account subject identifier or email-derived identifier is stored in hashed or opaque
          form. Only the display name associated with your contribution is shown publicly.
        </li>
      </ul>
    </section>

    <section>
      <h2>3. Legal basis for processing (GDPR)</h2>
      <p>
        Nubisco Lda is subject to the EU General Data Protection Regulation (GDPR). Our legal bases for processing
        marketplace data include:
      </p>
      <ul>
        <li>
          <strong>Marketplace operation and abuse prevention:</strong> legitimate interest in operating, securing, and
          improving the service.
        </li>
        <li>
          <strong>Reviews, Q&amp;A, and authenticated participation:</strong> legitimate interest in operating public
          community features requested by signed-in users.
        </li>
        <li>
          <strong>Analytics:</strong> legitimate interest in understanding service usage and improving the product.
        </li>
      </ul>
    </section>

    <section>
      <h2>4. How contribution data is used</h2>
      <p>Reviews and marketplace contributions are used for two purposes:</p>
      <ul>
        <li>to render public plugin pages, discussion threads, and community feedback;</li>
        <li>to derive aggregate ranking signals such as review quality and helpfulness ordering.</li>
      </ul>
      <p>
        We do not sell contribution data. We may moderate, remove, or retain contributions as required for safety, abuse
        prevention, legal compliance, or operation of the marketplace.
      </p>
    </section>

    <section>
      <h2>5. How ranking uses data</h2>
      <p>
        Marketplace ranking uses public plugin metrics and aggregated community signals. This currently includes package
        download volume, aggregated review votes, release recency, and query relevance. For more detail, see
        <RouterLink to="/transparency">How ranking works</RouterLink>.
      </p>
      <p>
        Ranking is not personalized per user account. The marketplace currently does not build a behavioral profile of
        individual users in order to tailor plugin ordering.
      </p>
    </section>

    <section>
      <h2>6. Third-party services</h2>
      <p>
        Plugin data is sourced from the
        <a href="https://www.npmjs.com" target="_blank" rel="noopener">npm registry</a>,
        <a href="https://github.com" target="_blank" rel="noopener">GitHub</a>, and Nubisco Platform for authenticated
        participation. Their own privacy policies apply when you visit or authenticate with those services.
      </p>
    </section>

    <section>
      <h2>7. Cookies and analytics</h2>
      <p>
        The marketplace uses Nubisco Analytics for page-view and event tracking. The current client implementation uses
        <code>sessionStorage</code> to persist a session identifier for the duration of the browser tab and respects the
        browser's Do Not Track signal. This page does not currently make a broader promise about all possible future
        client-side storage mechanisms beyond the implementation described here.
      </p>
    </section>

    <section>
      <h2>8. Data retention</h2>
      <p>
        Public plugin metadata is retained as long as it is relevant to the marketplace index. Reviews, questions,
        answers, and moderation-related records may be retained to preserve discussion integrity, ranking consistency,
        fraud prevention, and legal compliance.
      </p>
    </section>

    <section>
      <h2>9. Your rights</h2>
      <p>
        Under the GDPR, you may have the right to access, correct, or delete your personal data; to restrict or object
        to its processing; and to data portability, subject to applicable law and operational constraints.
      </p>
      <p>
        You may also choose not to sign in or contribute reviews and Q&amp;A. Browsing the marketplace does not require
        an account.
      </p>
    </section>

    <section>
      <h2>10. Contact</h2>
      <p>
        Questions about this policy or your data?
        <a href="mailto:support@nubisco.io">support@nubisco.io</a>
      </p>
    </section>
  </div>
</template>

<script setup lang="ts">
import { RouterLink } from 'vue-router'
</script>

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
