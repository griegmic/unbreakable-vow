export default function TermsPage() {
  const heading = {
    fontSize: 22,
    fontWeight: 700 as const,
    color: 'var(--text)',
    marginTop: 32,
    marginBottom: 12,
  };

  const paragraph = {
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginBottom: 16,
  };

  const list = {
    fontSize: 15,
    lineHeight: 1.7,
    color: 'var(--text-secondary)',
    marginBottom: 16,
    paddingLeft: 24,
  };

  return (
    <div style={{ background: 'var(--bg)', color: 'var(--text)', minHeight: '100dvh', padding: '40px 20px' }}>
      <div style={{ maxWidth: 680, margin: '0 auto' }}>
        <p style={{ fontSize: 13, color: 'var(--text-secondary)', marginBottom: 8 }}>
          Last updated: April 14, 2026
        </p>

        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--gold)', marginBottom: 8 }}>
          Terms &amp; Conditions
        </h1>

        <p style={{ fontSize: 15, color: 'var(--text-secondary)', marginBottom: 32, paddingBottom: 24, borderBottom: '1px solid var(--border)' }}>
          Unbreakable Vow &mdash; operated by The Rave Technologies
        </p>

        <h2 style={heading}>1. Acceptance of Terms</h2>
        <p style={paragraph}>
          By accessing or using the Unbreakable Vow application (&quot;App&quot;) available at unbreakablevow.app,
          you agree to be bound by these Terms &amp; Conditions (&quot;Terms&quot;). If you do not agree to these
          Terms, do not use the App. Your continued use of the App constitutes acceptance of any updates
          or modifications to these Terms.
        </p>

        <h2 style={heading}>2. Description of Service</h2>
        <p style={paragraph}>
          Unbreakable Vow is an accountability application that allows users to create personal commitments
          (&quot;vows&quot;), assign trusted contacts as witnesses, and optionally stake money as an additional
          layer of accountability. Witnesses verify whether vows have been kept or broken. The App is designed
          to help users follow through on their intentions.
        </p>

        <h2 style={heading}>3. User Accounts</h2>
        <p style={paragraph}>
          You are responsible for maintaining the confidentiality of your account credentials and for all
          activity that occurs under your account. You agree to provide accurate and complete information
          when creating your account and to keep that information up to date. You must be at least 18 years
          of age to use the App.
        </p>

        <h2 style={heading}>4. Payments &amp; Stakes</h2>
        <p style={paragraph}>
          The App allows users to optionally stake money on their vows. All payment processing is handled
          by Stripe. By placing a stake, you expressly authorize the following:
        </p>
        <ul style={list}>
          <li style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Vow kept:</strong> If your witness confirms the vow was fulfilled, your stake is refunded in full.
          </li>
          <li style={{ marginBottom: 8 }}>
            <strong style={{ color: 'var(--text)' }}>Vow broken:</strong> If your witness confirms the vow was broken, your stake is captured and will not be returned.
          </li>
          <li style={{ marginBottom: 8 }}>
            You authorize The Rave Technologies and Stripe to process the charge at the time of staking
            and to capture or refund the payment based on the outcome of the vow.
          </li>
        </ul>
        <p style={paragraph}>
          All stakes are final once a verdict is rendered. Disputes regarding payment should be directed
          to joe@therave.co.
        </p>

        <h2 style={heading}>5. SMS Communications</h2>
        <p style={paragraph}>
          By using the App and providing your phone number, you consent to receive transactional SMS messages
          related to your vows, witness requests, and account activity. These messages are strictly
          transactional and are not marketing communications.
        </p>
        <ul style={list}>
          <li style={{ marginBottom: 8 }}>Reply <strong style={{ color: 'var(--text)' }}>STOP</strong> at any time to opt out of SMS messages.</li>
          <li style={{ marginBottom: 8 }}>Message and data rates may apply depending on your carrier and plan.</li>
          <li style={{ marginBottom: 8 }}>Message frequency varies based on your vow activity.</li>
        </ul>

        <h2 style={heading}>6. Witnesses</h2>
        <p style={paragraph}>
          By accepting the role of witness for another user&apos;s vow, you agree to provide an honest
          and good-faith verdict on whether the vow was kept or broken. Witnesses should only accept
          vows they are in a reasonable position to verify. The Rave Technologies is not responsible for
          inaccurate or dishonest witness verdicts.
        </p>

        <h2 style={heading}>7. User Content</h2>
        <p style={paragraph}>
          Vow text and related content are user-generated. You are solely responsible for the content
          of your vows. You agree not to create vows that contain illegal, harmful, threatening, abusive,
          defamatory, or otherwise objectionable content. The Rave Technologies reserves the right to
          remove content that violates these Terms.
        </p>

        <h2 style={heading}>8. Disclaimer of Warranties</h2>
        <p style={paragraph}>
          The App is provided &quot;as is&quot; and &quot;as available&quot; without warranties of any kind,
          whether express or implied, including but not limited to implied warranties of merchantability,
          fitness for a particular purpose, and non-infringement. The Rave Technologies does not warrant
          that the App will be uninterrupted, error-free, or secure.
        </p>

        <h2 style={heading}>9. Limitation of Liability</h2>
        <p style={paragraph}>
          To the maximum extent permitted by applicable law, The Rave Technologies and its officers,
          employees, and affiliates shall not be liable for any indirect, incidental, special,
          consequential, or punitive damages, including but not limited to loss of profits, data, or
          goodwill, arising out of or in connection with your use of the App, regardless of the theory
          of liability.
        </p>

        <h2 style={heading}>10. Modifications to Terms</h2>
        <p style={paragraph}>
          We reserve the right to modify these Terms at any time. When we make changes, we will update
          the &quot;Last updated&quot; date at the top of this page and notify users through the App or
          via email. Your continued use of the App after changes are posted constitutes acceptance of
          the revised Terms.
        </p>

        <h2 style={heading}>11. Governing Law</h2>
        <p style={paragraph}>
          These Terms shall be governed by and construed in accordance with the laws of the United States.
          Any disputes arising from these Terms or your use of the App shall be resolved in accordance
          with applicable federal and state law.
        </p>

        <h2 style={heading}>12. Contact</h2>
        <p style={paragraph}>
          If you have any questions about these Terms, please contact us at{' '}
          <a href="mailto:joe@therave.co" style={{ color: 'var(--gold)', textDecoration: 'underline' }}>
            joe@therave.co
          </a>.
        </p>

        <div style={{ borderTop: '1px solid var(--border)', marginTop: 40, paddingTop: 20, paddingBottom: 40 }}>
          <p style={{ fontSize: 13, color: 'var(--text-secondary)' }}>
            &copy; 2026 The Rave Technologies. All rights reserved.
          </p>
        </div>
      </div>
    </div>
  );
}
