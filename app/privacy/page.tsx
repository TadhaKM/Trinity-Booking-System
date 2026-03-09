export const metadata = {
  title: 'Privacy Policy — TCD Tickets',
};

export default function PrivacyPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
      <h1 className="text-3xl font-bold text-[#0A2E6E] mb-2">Privacy Policy</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2026</p>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">1. Who we are</h2>
          <p>TCD Tickets is an event ticketing platform for Trinity College Dublin societies and student organisations. References to "we", "us", or "our" mean the TCD Tickets platform team.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">2. What data we collect</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Account data:</strong> name, email address, and hashed password when you register.</li>
            <li><strong>Profile data:</strong> profile picture (optional), society memberships.</li>
            <li><strong>Booking data:</strong> tickets purchased, order history, QR codes.</li>
            <li><strong>Payment data:</strong> Stripe processes card details directly — we never store raw card numbers.</li>
            <li><strong>Usage data:</strong> pages visited, events saved, waitlist entries, AI chat history (session only, not stored permanently).</li>
            <li><strong>Device data:</strong> browser type, IP address, approximate location (for security and rate-limiting).</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">3. How we use your data</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>To provide and operate the booking service.</li>
            <li>To send booking confirmations and event reminders.</li>
            <li>To detect and prevent fraud or abuse.</li>
            <li>To improve the platform through aggregated analytics.</li>
            <li>To power AI-assisted features (event descriptions, chatbot) — your inputs are sent to Anthropic's API under their <a href="https://www.anthropic.com/privacy" className="text-[#0569b9] underline" target="_blank" rel="noopener noreferrer">Privacy Policy</a>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">4. Legal basis (GDPR)</h2>
          <p>We process your data under the following bases:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Contract:</strong> to fulfil ticket bookings you make.</li>
            <li><strong>Legitimate interests:</strong> fraud prevention, platform security.</li>
            <li><strong>Consent:</strong> optional cookies, push notifications, and marketing communications.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">5. Data sharing</h2>
          <p>We do not sell your personal data. We share data only with:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li><strong>Stripe</strong> — payment processing.</li>
            <li><strong>Anthropic</strong> — AI assistant features.</li>
            <li><strong>Vercel</strong> — hosting and serverless infrastructure.</li>
            <li><strong>Turso / Supabase</strong> — database hosting.</li>
            <li><strong>Event organisers</strong> — your name and booking details for check-in purposes.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">6. Cookies</h2>
          <p>We use essential cookies to keep you signed in. If you accept optional cookies we also use analytics cookies to understand how the platform is used. You can withdraw consent at any time by clearing your browser cookies.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">7. Your rights</h2>
          <p>Under GDPR you have the right to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Access the personal data we hold about you.</li>
            <li>Correct inaccurate data.</li>
            <li>Delete your account and associated data.</li>
            <li>Restrict or object to processing.</li>
            <li>Data portability.</li>
          </ul>
          <p className="mt-2">To exercise any right, contact us at <strong>privacy@tcdtickets.ie</strong>. We will respond within 30 days.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">8. Data retention</h2>
          <p>Account data is kept for as long as your account is active. Booking records are retained for 7 years for financial and legal compliance. You may request deletion of non-transactional data at any time.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">9. Security</h2>
          <p>Passwords are stored as bcrypt hashes. All data is transmitted over HTTPS. We apply rate limiting and account lockout protections against unauthorised access.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">10. Changes to this policy</h2>
          <p>We may update this policy from time to time. Significant changes will be notified by email or in-app notification.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">11. Contact</h2>
          <p>Questions about this policy: <strong>privacy@tcdtickets.ie</strong></p>
          <p className="mt-1">You may also lodge a complaint with the Data Protection Commission (Ireland): <a href="https://www.dataprotection.ie" className="text-[#0569b9] underline" target="_blank" rel="noopener noreferrer">dataprotection.ie</a></p>
        </section>

      </div>
    </div>
  );
}
