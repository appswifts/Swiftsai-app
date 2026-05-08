import { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'SwiftsAI Privacy Policy',
  description:
    'This Privacy Policy explains how SwiftsAI collects, uses, shares and protects personal data in connection with the SwiftsAI social-media scheduling platform.',
};

export default function PrivacyPolicyPage() {
  return (
    <div className="max-w-4xl mx-auto px-6 py-20">
      <h1 className="text-4xl md:text-5xl font-extrabold tracking-tight mb-4">
        SwiftsAI Privacy Policy
      </h1>
      <p className="text-white/40 text-sm mb-12">Last updated: May 8, 2026</p>

      <div className="prose prose-invert prose-lg max-w-none [&_h2]:text-2xl [&_h2]:font-bold [&_h2]:mt-12 [&_h2]:mb-4 [&_h3]:text-xl [&_h3]:font-semibold [&_h3]:mt-8 [&_h3]:mb-3 [&_p]:text-white/60 [&_p]:leading-relaxed [&_p]:mb-4 [&_li]:text-white/60 [&_ul]:space-y-2 [&_a]:text-[#a855f7] [&_a]:underline hover:[&_a]:text-white">

        <p>
          This Privacy Policy explains how SwiftsAI (&quot;SwiftsAI&quot;, &quot;we&quot;, &quot;us&quot; or &quot;our&quot;) collects, uses, shares and protects personal data in connection with the SwiftsAI social-media scheduling, publishing, analytics and team-collaboration platform (the &quot;Service&quot;), the websites at ai.appswifts.com and related sub-domains (the &quot;Site&quot;). It applies to visitors to the Site, account holders, members of customer workspaces, prospects, and anyone else who interacts with us. By using the Site or the Service you acknowledge this Policy. For our contractual terms, see our <a href="/terms-of-service">Terms of Service</a>.
        </p>

        <h2>1. Who We Are (Data Controller)</h2>
        <p>
          SwiftsAI is operated by AppSwifts, the entity responsible for data collection and processing. For all privacy questions, requests and complaints you can reach us at <a href="mailto:support@appswifts.com">support@appswifts.com</a>.
        </p>

        <h2>2. The Service in Brief</h2>
        <p>
          SwiftsAI lets you connect 30+ social-media and chat channels and centrally schedule, publish, analyse and collaborate on content. The platform includes a calendar and scheduling engine, a media library, a publishing queue, analytics, AI-assisted content generation, team and workspace management, and integrations with third-party platforms. Some features depend on your plan and on the platforms you choose to connect.
        </p>

        <h2>3. Data We Collect</h2>

        <h3>3.1 Account &amp; Identity Data</h3>
        <ul>
          <li>Name, email address, password (stored as a salted hash), profile picture, organisation name, role, language and timezone preferences.</li>
          <li>If you sign in via a social-login provider (e.g. Google), the basic profile fields and email returned by that provider.</li>
          <li>Workspace and team membership, invitations sent and accepted, and the permissions granted within a workspace.</li>
        </ul>

        <h3>3.2 Connected Platform Data</h3>
        <p>
          When you connect a third-party social or messaging account to SwiftsAI we receive and store, via that platform&apos;s API:
        </p>
        <ul>
          <li>OAuth access &amp; refresh tokens (encrypted at rest), the scopes you granted, the platform username and identifier, and account-level metadata (e.g. profile picture, follower counts, page IDs, channel IDs).</li>
          <li>Content and engagement data needed to provide the Service: posts you create or schedule, posts already published, comments, replies, post-level analytics (impressions, clicks, reach, video retention, etc.), and audience-level aggregates the platform exposes.</li>
          <li>For YouTube specifically, the Service uses YouTube API Services. Your use of those features is also subject to the <a href="https://www.youtube.com/t/terms" target="_blank" rel="noopener noreferrer">YouTube Terms of Service</a> and the <a href="https://policies.google.com/privacy" target="_blank" rel="noopener noreferrer">Google Privacy Policy</a>. You can revoke SwiftsAI&apos;s access to your Google data at any time at <a href="https://security.google.com/settings/security/permissions" target="_blank" rel="noopener noreferrer">Google Security Settings</a>.</li>
        </ul>

        <h3>3.3 Content You Upload</h3>
        <p>
          Text, images, video, audio, captions, links, hashtags, schedules, prompts, comments, approval notes, calendar metadata and any other content you upload to or generate within the Service.
        </p>

        <h3>3.4 Billing Data</h3>
        <p>
          Plan, subscription status, invoice history, billing email, billing address and tax identifiers. Card details and bank-account details are collected and stored directly by our payment processors (e.g. Stripe); SwiftsAI only receives a tokenised reference, the last four digits, the brand, and the expiry month/year.
        </p>

        <h3>3.5 Logs, Usage &amp; Device Data</h3>
        <ul>
          <li>IP address, user-agent, browser type and version, operating system, device identifiers, referrer URL, language preference, approximate location derived from IP (country/region).</li>
          <li>Application telemetry: pages visited, features used, posts created/published/failed, API calls made, error reports, performance metrics, and crash data.</li>
          <li>Session and authentication data, including login timestamps, session tokens and security events (e.g. password changes).</li>
        </ul>

        <h3>3.6 Communications &amp; Support Data</h3>
        <p>
          Messages you send to us by email, in-app chat, via support tickets or via our community channels; surveys, feedback and feature requests.
        </p>

        <h3>3.7 Cookies &amp; Similar Technologies</h3>
        <p>
          We use cookies, local storage, pixels and SDKs for authentication, security, preferences, analytics and (on the Site) marketing attribution. You can manage non-essential cookies through your browser settings; disabling strictly-necessary cookies will break parts of the Service.
        </p>

        <h2>4. How We Use the Data &amp; Legal Bases</h2>
        <ul>
          <li><strong>Provide the Service</strong> — authenticate users, create and manage your account and workspaces, store and publish your content to connected platforms, return analytics, and provide customer support. (Performance of contract.)</li>
          <li><strong>Bill and collect payment</strong> — issue invoices, manage subscriptions, prevent payment fraud, comply with tax law. (Performance of contract; legal obligation.)</li>
          <li><strong>Secure the Service</strong> — detect and prevent abuse, fraud, account takeover, brute-force attacks, spam and infrastructure attacks. (Legitimate interests.)</li>
          <li><strong>Operate, maintain and improve the Service</strong> — debug, monitor uptime, measure performance, A/B-test features, build aggregated usage analytics. (Legitimate interests.)</li>
          <li><strong>Communicate with you</strong> — send service-related messages (receipts, security alerts, post-failure notices) and, where you have opted in, marketing communications. (Performance of contract; consent.)</li>
          <li><strong>Comply with law</strong> — respond to lawful requests, enforce our rights, defend claims. (Legal obligation.)</li>
        </ul>
        <p>
          We do not use the content of your scheduled posts, your connected-platform content, or your private messages to send you advertising, and we do not sell that data.
        </p>

        <h2>5. AI-Assisted Features</h2>
        <p>
          SwiftsAI offers optional AI features that generate or rewrite captions, hashtags, image prompts, video scripts and analytics summaries. To provide them we transmit your prompts and the inputs you choose to include to third-party model providers (for example OpenAI and similar) acting as our sub-processors. We instruct those providers not to use your inputs or outputs to train their models. AI outputs are generated probabilistically and may be inaccurate; you remain responsible for reviewing them before publishing.
        </p>

        <h2>6. Who We Share Data With</h2>
        <p>
          We do not sell personal data and we do not rent it to third parties. We share data only with:
        </p>
        <ul>
          <li><strong>Sub-processors and infrastructure providers</strong> — including cloud hosting, CDN, database providers, error-monitoring, customer-support platforms, email providers, payment processors and AI-model providers.</li>
          <li><strong>Connected third-party platforms</strong> — when you schedule or publish content, we transmit it to the platform you selected.</li>
          <li><strong>Other members of your workspace</strong> — content, schedules, comments and approval activity are visible to the other people in your workspaces.</li>
          <li><strong>Professional advisors</strong> — accountants, auditors, lawyers, under confidentiality.</li>
          <li><strong>Authorities</strong> — when legally required to disclose data.</li>
          <li><strong>Successor entities</strong> — in the event of a merger, acquisition, or sale of assets.</li>
        </ul>

        <h2>7. International Data Transfers</h2>
        <p>
          SwiftsAI uses sub-processors in various jurisdictions. Where personal data subject to the GDPR or UK GDPR is transferred to a country without an adequacy decision, we rely on the European Commission Standard Contractual Clauses, supplemented by encryption in transit and at rest and access controls.
        </p>

        <h2>8. Data Retention</h2>
        <ul>
          <li><strong>Account data</strong> — kept while your account is active. After closure, retained for up to 90 days, then deleted or anonymised.</li>
          <li><strong>OAuth tokens</strong> — kept while the connection is active; revoked tokens are deleted promptly.</li>
          <li><strong>Billing records</strong> — retained for the period required by tax law (typically 7 years).</li>
          <li><strong>Logs</strong> — operational and security logs are typically retained for up to 12 months.</li>
          <li><strong>Backups</strong> — encrypted backups roll off within 30–90 days after deletion from the live system.</li>
        </ul>

        <h2>9. Security</h2>
        <p>
          We maintain administrative, technical and physical safeguards designed to protect personal data. These include: encryption of data in transit (TLS) and of sensitive data at rest; encryption of OAuth tokens; password hashing with a modern algorithm; role-based access controls; audit logging; and incident-response procedures. No system is fully secure, and we cannot guarantee absolute security.
        </p>

        <h2>10. Your Rights</h2>
        <p>Depending on where you live, you may have the right to:</p>
        <ul>
          <li>Access the personal data we hold about you and receive a copy in a portable format;</li>
          <li>Request correction of inaccurate or incomplete data;</li>
          <li>Request deletion of your data, subject to retention obligations;</li>
          <li>Object to or restrict certain processing, including direct marketing;</li>
          <li>Withdraw consent where processing is based on consent;</li>
          <li>Lodge a complaint with your supervisory authority.</li>
        </ul>
        <p>
          To exercise your rights, email <a href="mailto:support@appswifts.com">support@appswifts.com</a>. We will respond within the timeframe required by applicable law (typically 30 days).
        </p>

        <h2>11. Children</h2>
        <p>
          The Service and the Site are intended for business use and are not directed to children. We do not knowingly collect personal data from children under the age of 18.
        </p>

        <h2>12. Marketing &amp; Cookie Choices</h2>
        <p>
          You can unsubscribe from marketing emails at any time using the unsubscribe link in any such email. You can manage cookie preferences via your browser settings.
        </p>

        <h2>13. Third-Party Sites and Services</h2>
        <p>
          The Site and the Service link to and integrate with third-party services. Their handling of your data is governed by their own privacy policies, not this one.
        </p>

        <h2>14. Changes to this Policy</h2>
        <p>
          We may update this Privacy Policy from time to time. If a change is material we will provide reasonable notice (for example by email or in-product notice) before it takes effect.
        </p>

        <h2>15. Contact Us</h2>
        <p>
          For privacy questions, requests, or complaints, email <a href="mailto:support@appswifts.com">support@appswifts.com</a>.
        </p>
      </div>
    </div>
  );
}
