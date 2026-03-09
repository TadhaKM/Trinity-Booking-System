export const metadata = {
  title: 'Terms of Service — TCD Tickets',
};

export default function TermsPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 py-12 text-gray-800">
      <h1 className="text-3xl font-bold text-[#0A2E6E] mb-2">Terms of Service</h1>
      <p className="text-sm text-gray-500 mb-8">Last updated: March 2026</p>

      <div className="prose prose-slate max-w-none space-y-6 text-sm leading-relaxed">

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">1. Acceptance</h2>
          <p>By creating an account or purchasing a ticket on TCD Tickets you agree to these Terms of Service. If you do not agree, do not use the platform.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">2. Eligibility</h2>
          <p>TCD Tickets is intended for Trinity College Dublin students, staff, and affiliated society members. You must be at least 18 years old, or have parental consent, to make purchases.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">3. Accounts</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>You are responsible for maintaining the security of your account credentials.</li>
            <li>You must not share your account or use another person's account.</li>
            <li>We reserve the right to suspend or terminate accounts that violate these terms.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">4. Ticket purchases</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>All prices are in Euro (€) and include applicable taxes unless stated otherwise.</li>
            <li>Tickets are non-transferable unless the organiser explicitly enables transfer.</li>
            <li>A booking confirmation will be emailed upon successful payment.</li>
            <li>We use Stripe for payment processing. By purchasing you also accept <a href="https://stripe.com/legal" className="text-[#0569b9] underline" target="_blank" rel="noopener noreferrer">Stripe's Terms</a>.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">5. Refunds and cancellations</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Refund eligibility is set by the event organiser and shown on the event page.</li>
            <li>If an event is cancelled by the organiser, all ticket holders will receive a full refund.</li>
            <li>Refunds are processed to the original payment method within 5–10 business days.</li>
            <li>Service fees are non-refundable unless the event is cancelled.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">6. Organiser responsibilities</h2>
          <p>If you create events on TCD Tickets you agree to:</p>
          <ul className="list-disc pl-5 space-y-1">
            <li>Provide accurate event information including date, time, location, and ticket prices.</li>
            <li>Honour all valid tickets sold through the platform.</li>
            <li>Process refunds promptly in the event of cancellation.</li>
            <li>Not use the platform to collect money for events you do not intend to hold.</li>
            <li>Comply with all applicable Irish and EU laws.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">7. Prohibited conduct</h2>
          <ul className="list-disc pl-5 space-y-1">
            <li>Reselling tickets above face value (touting).</li>
            <li>Attempting to bypass security controls or access other users' accounts.</li>
            <li>Posting false, misleading, or harmful event listings.</li>
            <li>Using automated tools to bulk-purchase tickets.</li>
            <li>Harassing other users or posting abusive content.</li>
          </ul>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">8. AI features</h2>
          <p>TCD Tickets includes AI-powered features (chatbot, event description suggestions). These are provided for convenience and may occasionally produce inaccurate results. You are responsible for reviewing AI-generated content before publishing it.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">9. Limitation of liability</h2>
          <p>TCD Tickets acts as a platform connecting ticket buyers and event organisers. We are not the event organiser and are not liable for the quality, safety, or cancellation of events. Our total liability to you shall not exceed the amount you paid for the ticket(s) in question.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">10. Governing law</h2>
          <p>These terms are governed by the laws of Ireland. Any disputes shall be subject to the exclusive jurisdiction of the Irish courts.</p>
        </section>

        <section>
          <h2 className="text-lg font-semibold text-[#0A2E6E] mb-2">11. Contact</h2>
          <p>Questions about these terms: <strong>legal@tcdtickets.ie</strong></p>
        </section>

      </div>
    </div>
  );
}
