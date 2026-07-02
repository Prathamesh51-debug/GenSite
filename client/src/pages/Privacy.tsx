import LegalLayout, { LegalSection } from '@/shared/components/LegalLayout'
import Seo from '@/shared/components/Seo'

const Privacy = () => (
  <>
    <Seo title="Privacy Policy" path="/privacy" />
    <LegalLayout title="Privacy Policy" lastUpdated="June 30, 2026">
    <LegalSection title="1. Information we collect">
      <p>We collect the information needed to run the Service:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>Account data</strong> — your name, email address, and authentication credentials.</li>
        <li><strong>Content</strong> — the prompts you enter and the websites (projects, versions) you generate.</li>
        <li><strong>Transactions</strong> — records of credit purchases (handled by Stripe; we do not store card numbers).</li>
        <li><strong>Technical data</strong> — basic session information such as IP address and user agent, used for authentication and security.</li>
      </ul>
    </LegalSection>

    <LegalSection title="2. How we use your information">
      <p>To provide and maintain the Service, process payments and credits, authenticate you, send transactional
        emails (such as verification and password resets), and protect against abuse.</p>
    </LegalSection>

    <LegalSection title="3. Third-party services">
      <p>We share data with service providers only as needed to operate the Service:</p>
      <ul className="list-disc pl-5 space-y-1">
        <li><strong>AI generation</strong> — your prompts are sent to our AI provider (OpenRouter and the underlying model) to generate websites.</li>
        <li><strong>Payments</strong> — Stripe processes purchases.</li>
        <li><strong>Infrastructure</strong> — database hosting (Supabase), application hosting (Vercel/Render), and email delivery (Resend).</li>
      </ul>
      <p>These providers process data under their own privacy policies. We do not sell your personal data.</p>
    </LegalSection>

    <LegalSection title="4. Cookies and sessions">
      <p>We use a secure, httpOnly session cookie to keep you signed in. We do not use third-party advertising or
        tracking cookies.</p>
    </LegalSection>

    <LegalSection title="5. Data retention and deletion">
      <p>
        We retain your data while your account is active. You can delete your account at any time from your
        account settings; this removes your account and associated projects, versions, and conversations.
        Some transaction records may be retained where required for legal or accounting purposes.
      </p>
    </LegalSection>

    <LegalSection title="6. Security">
      <p>We use industry-standard measures (encrypted connections, hashed credentials, scoped access) to protect
        your data. No method of transmission or storage is completely secure, and we cannot guarantee absolute
        security.</p>
    </LegalSection>

    <LegalSection title="7. Your rights">
      <p>Depending on your jurisdiction, you may have rights to access, correct, export, or delete your personal
        data. To exercise these, use your account settings or contact us.</p>
    </LegalSection>

    <LegalSection title="8. Changes to this policy">
      <p>We may update this policy from time to time. Material changes will be reflected by the "last updated"
        date above.</p>
    </LegalSection>

    <LegalSection title="9. Contact">
      <p>
        Questions about your data? Contact{' '}
        <a className="text-indigo-400 hover:underline" href="mailto:prathameshprasad510@gmail.com">
          prathameshprasad510@gmail.com
        </a>.
      </p>
    </LegalSection>
    </LegalLayout>
  </>
)

export default Privacy
