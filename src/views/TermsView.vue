<template>
  <div class="legal-page">
    <h1>Terms of Service</h1>
    <p class="legal-page__date">Last updated: April 2026</p>

    <section>
      <h2>1. Who we are</h2>
      <p>
        The Openbridge Marketplace is operated by <strong>Nubisco Lda</strong>, a company incorporated in Portugal. In
        these terms, "Nubisco", "we", "us", and "our" refer to Nubisco Lda. You can contact us at
        <a href="mailto:support@nubisco.io">support@nubisco.io</a>.
      </p>
    </section>

    <section>
      <h2>2. Acceptance of terms</h2>
      <p>
        By using the Openbridge Marketplace ("the Service"), you agree to these terms. If you do not agree, please do
        not use the Service.
      </p>
    </section>

    <section>
      <h2>3. Description of service</h2>
      <p>
        The Openbridge Marketplace is a community plugin directory for Openbridge and Homebridge. It indexes publicly
        available npm packages and provides a searchable interface, community reviews, ranking signals, and Q&amp;A.
        Plugin installation is performed directly from the npm registry. Nubisco does not distribute or host plugin
        code.
      </p>
    </section>

    <section>
      <h2>4. Ranking and visibility</h2>
      <p>
        The marketplace may order plugins using public package metadata and aggregated community signals, including
        download volume, aggregated review votes, recency of maintenance, and search relevance. Rankings are provided to
        help users discover plugins, but they are not guarantees of quality, security, compatibility, or fitness for any
        specific purpose.
      </p>
      <p>
        We may evolve ranking formulas, anti-abuse logic, moderation rules, and presentation without prior notice. For
        an explanation of the current ranking model, see <RouterLink to="/transparency">How ranking works</RouterLink>.
      </p>
    </section>

    <section>
      <h2>5. User contributions</h2>
      <p>
        Reviews and questions you submit must be accurate, respectful, and not infringe any third-party rights. We
        reserve the right to remove, hide, lock, or moderate content that violates these requirements or that we
        reasonably believe is abusive, deceptive, manipulative, unlawful, or harmful to the marketplace.
      </p>
      <p>
        You must not attempt to manipulate ranking, reviews, helpfulness votes, or discussion through automation, fake
        accounts, brigading, spam, or coordinated abuse.
      </p>
    </section>

    <section>
      <h2>6. Intellectual property and third-party plugins</h2>
      <p>
        The marketplace service, its design, and its content are owned by or licensed to Nubisco Lda except where
        third-party rights apply. Public source availability of marketplace code does not alter the applicable license
        or trademark terms published for this project.
      </p>
      <p>
        Plugins listed in the marketplace are third-party software. Nubisco does not review, endorse, or guarantee the
        quality or safety of any listed plugin. Use plugins at your own risk.
      </p>
    </section>

    <section>
      <h2>7. Third-party links and services</h2>
      <p>
        The marketplace links to third-party services such as npm, GitHub, project homepages, and external
        documentation. These links are provided for convenience only. Nubisco does not control those services and is not
        responsible for their content, availability, or policies.
      </p>
    </section>

    <section>
      <h2>8. Availability and changes</h2>
      <p>
        We may update, suspend, or discontinue any part of the marketplace, including APIs, ranking mechanics,
        contribution features, and policies, at any time. We may also update these terms from time to time. Continued
        use of the Service after changes constitutes acceptance of the updated terms.
      </p>
    </section>

    <section>
      <h2>9. Official service and branding</h2>
      <p>
        The Nubisco-operated marketplace is the official hosted marketplace service for Openbridge unless stated
        otherwise by Nubisco. Public source availability of marketplace code does not grant rights to Nubisco or
        Openbridge trademarks, official branding, or official-service designation.
      </p>
    </section>

    <section>
      <h2>10. Disclaimer and limitation of liability</h2>
      <p>
        The Service is provided on an "as is" and "as available" basis. To the maximum extent permitted by law, Nubisco
        disclaims warranties of merchantability, fitness for a particular purpose, non-infringement, and uninterrupted
        availability. You are responsible for evaluating plugins before installation and use.
      </p>
      <p>
        To the fullest extent permitted by applicable law, Nubisco Lda shall not be liable for direct, indirect,
        incidental, consequential, special, or punitive damages arising from your use of, or inability to use, the
        marketplace or any third-party plugin discovered through it.
      </p>
    </section>

    <section>
      <h2>11. Governing law</h2>
      <p>
        These terms are governed by and construed in accordance with the laws of Portugal. Any disputes arising from
        these terms or your use of the marketplace shall be subject to the exclusive jurisdiction of the courts of
        Portugal, without prejudice to any mandatory consumer protection provisions that may apply in your country of
        residence.
      </p>
    </section>

    <section>
      <h2>12. Contact</h2>
      <p>
        Questions about these terms?
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
