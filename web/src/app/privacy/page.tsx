export default function PrivacyPage() {
  const heading = {
    color: 'var(--gold)',
    fontSize: 20,
    fontWeight: 700 as const,
    marginTop: 36,
    marginBottom: 12,
  };

  const paragraph = {
    color: 'var(--text-secondary)',
    fontSize: 15,
    lineHeight: 1.7,
    marginBottom: 16,
  };

  const list = {
    color: 'var(--text-secondary)',
    fontSize: 15,
    lineHeight: 1.7,
    marginBottom: 16,
    paddingLeft: 24,
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ color: 'var(--text-secondary)', fontSize: 13, marginBottom: 8 }}>
          Last updated: April 14, 2026
        </p>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--text)', marginBottom: 8 }}>
          Privacy Policy
        </h1>

        <p style={{ ...paragraph, borderBottom: '1px solid var(--border)', paddingBottom: 24 }}>
          The Rave Technologies (&quot;we,&quot; &quot;us,&quot; or &quot;our&quot;) operates the Unbreakable Vow
          application available at unbreakablevow.app (the &quot;Service&quot;). This Privacy Policy explains
          how we collect, use, and protect your information when you use our Service.
        </p>

        <h2 style={heading}>1. Information We Collect</h2>
        <p style={paragraph}>We collect the following categories of personal information:</p>
        <ul style={list}>
          <li><strong style={{ color: 'var(--text)' }}>Phone numbers</strong> &mdash; used for account authentication and SMS notifications.</li>
          <li><strong style={{ color: 'var(--text)' }}>Display names</strong> &mdash; chosen by you to identify yourself within vows.</li>
          <li><strong style={{ color: 'var(--text)' }}>Vow content</strong> &mdash; the text and details of vows you create or participate in.</li>
          <li><strong style={{ color: 'var(--text)' }}>Payment information</strong> &mdash; processed securely through Stripe. We do not store your credit card details on our servers.</li>
        </ul>

        <h2 style={heading}>2. How We Use Your Information</h2>
        <p style={paragraph}>We use your information to:</p>
        <ul style={list}>
          <li>Authenticate your identity and provide access to the Service.</li>
          <li>Create, manage, and facilitate vows between participants.</li>
          <li>Send transactional SMS messages (see Section 3 below).</li>
          <li>Process payments and stakes related to vows.</li>
          <li>Maintain and improve the Service.</li>
        </ul>

        <h2 style={heading}>3. SMS Communications</h2>
        <p style={paragraph}>
          We send <strong style={{ color: 'var(--text)' }}>transactional SMS messages only</strong>. These include
          one-time passcodes (OTP) for authentication, witness invitations, and verdict reminders. We do not send
          marketing or promotional text messages.
        </p>
        <ul style={list}>
          <li><strong style={{ color: 'var(--text)' }}>Message frequency:</strong> Typically 1&ndash;3 messages per vow.</li>
          <li><strong style={{ color: 'var(--text)' }}>Opt-out:</strong> You may reply STOP to any message to stop receiving SMS from us.</li>
          <li><strong style={{ color: 'var(--text)' }}>Costs:</strong> Message and data rates may apply depending on your carrier and plan.</li>
        </ul>

        <h2 style={heading}>4. Third-Party Service Providers</h2>
        <p style={paragraph}>We use the following third-party services to operate the Service:</p>
        <ul style={list}>
          <li><strong style={{ color: 'var(--text)' }}>Supabase</strong> &mdash; database and authentication infrastructure.</li>
          <li><strong style={{ color: 'var(--text)' }}>Stripe</strong> &mdash; payment processing. Subject to <a href="https://stripe.com/privacy" style={{ color: 'var(--gold)' }}>Stripe&apos;s Privacy Policy</a>.</li>
          <li><strong style={{ color: 'var(--text)' }}>Twilio</strong> &mdash; SMS delivery. Subject to <a href="https://www.twilio.com/legal/privacy" style={{ color: 'var(--gold)' }}>Twilio&apos;s Privacy Policy</a>.</li>
        </ul>

        <h2 style={heading}>5. Data Sharing and Sales</h2>
        <p style={paragraph}>
          We do <strong style={{ color: 'var(--text)' }}>not sell, rent, or trade</strong> your personal information
          to third parties. We share information only with the service providers listed above, solely as needed to
          operate the Service.
        </p>

        <h2 style={heading}>6. Data Security</h2>
        <p style={paragraph}>
          We implement reasonable administrative, technical, and physical safeguards to protect your personal
          information. However, no method of transmission over the Internet or electronic storage is completely
          secure, and we cannot guarantee absolute security.
        </p>

        <h2 style={heading}>7. Data Retention</h2>
        <p style={paragraph}>
          We retain your personal information for as long as your account is active or as needed to provide the
          Service. You may request deletion of your account and associated data by contacting us at the address below.
        </p>

        <h2 style={heading}>8. Your Rights (CCPA and Other Privacy Laws)</h2>
        <p style={paragraph}>Depending on your jurisdiction, you may have the right to:</p>
        <ul style={list}>
          <li>Know what personal information we collect and how it is used.</li>
          <li>Request deletion of your personal information.</li>
          <li>Opt out of the sale of personal information (we do not sell your data).</li>
          <li>Non-discrimination for exercising your privacy rights.</li>
        </ul>
        <p style={paragraph}>
          To exercise any of these rights, please contact us using the information in Section 10.
        </p>

        <h2 style={heading}>9. Changes to This Policy</h2>
        <p style={paragraph}>
          We may update this Privacy Policy from time to time. We will notify you of material changes by posting
          the updated policy on this page with a revised &quot;Last updated&quot; date. Your continued use of the
          Service after changes are posted constitutes acceptance of the updated policy.
        </p>

        <h2 style={heading}>10. Contact Us</h2>
        <p style={{ ...paragraph, borderTop: '1px solid var(--border)', paddingTop: 24 }}>
          If you have questions or concerns about this Privacy Policy or our data practices, contact us at:
        </p>
        <p style={paragraph}>
          <strong style={{ color: 'var(--text)' }}>The Rave Technologies</strong><br />
          Email: <a href="mailto:joe@therave.co" style={{ color: 'var(--gold)' }}>joe@therave.co</a>
        </p>
      </div>
    </div>
  );
}
