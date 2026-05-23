import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Privacy Policy — TickFeed",
  description: "Privacy Policy for the TickFeed app.",
}

const LAST_UPDATED = "23 May 2026"

export default function PrivacyPolicyPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <span className="text-2xl font-bold">
          <span className="text-gray-900">Tick</span>
          <span className="text-green-500">Feed</span>
        </span>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Privacy Policy</h1>
          <p className="mt-1 text-sm text-gray-500">Last updated: {LAST_UPDATED}</p>
          <p className="mt-3 text-gray-600 text-sm leading-relaxed">
            TickFeed ("we", "our", or "us") is an AI-powered Indian stock market news and tracking app. This Privacy Policy explains what data we collect, why we collect it, and how we protect it.
          </p>
        </div>

        {sections.map(({ title, body }) => (
          <section key={title} className="space-y-2">
            <h2 className="text-base font-semibold text-gray-900">{title}</h2>
            <div className="text-sm text-gray-600 leading-relaxed space-y-2">{body}</div>
          </section>
        ))}

        <p className="text-sm text-gray-500 pb-6">
          Questions? Email us at{" "}
          <a href="mailto:tickfeednewz@gmail.com" className="text-green-600 underline underline-offset-2">
            tickfeednewz@gmail.com
          </a>
          .
        </p>
      </div>

      <footer className="border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} TickFeed. All rights reserved.
      </footer>
    </main>
  )
}

const sections = [
  {
    title: "1. Information We Collect",
    body: (
      <>
        <p><strong>Account information:</strong> When you register, we collect your name and email address.</p>
        <p><strong>App activity:</strong> We store your bookmarks, watchlist, community posts, post likes, and AI chat history to power app features and personalise your experience.</p>
        <p><strong>Photos:</strong> If you attach a screenshot when submitting a support request, it is uploaded to secure cloud storage (Microsoft Azure). This is optional.</p>
        <p><strong>Device identifiers:</strong> We store your device's push notification token (FCM token) to send you market alerts and news notifications. You can opt out at any time in your device settings.</p>
        <p><strong>Usage analytics:</strong> We use Firebase Analytics and Vercel Analytics to understand how the app is used (screen views, feature usage). This data does not identify you personally.</p>
      </>
    ),
  },
  {
    title: "2. How We Use Your Information",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>To create and manage your account</li>
        <li>To personalise your news feed and stock recommendations</li>
        <li>To send push notifications for market news (if you opt in)</li>
        <li>To respond to support requests</li>
        <li>To improve app performance and fix issues</li>
        <li>To comply with applicable Indian laws and regulations</li>
      </ul>
    ),
  },
  {
    title: "3. Information We Share",
    body: (
      <>
        <p>We do not sell your personal data. We share data only with the following service providers, solely to operate the app:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li><strong>Google Firebase</strong> — push notification delivery (FCM tokens) and usage analytics</li>
          <li><strong>Microsoft Azure</strong> — cloud storage for support ticket screenshots</li>
          <li><strong>Vercel Analytics</strong> — anonymised page performance metrics</li>
          <li><strong>Google Vertex AI</strong> — AI-generated news summaries and chat (article content only, no personal data)</li>
        </ul>
      </>
    ),
  },
  {
    title: "4. Data Retention",
    body: (
      <ul className="list-disc pl-5 space-y-1">
        <li>Account data is retained until you delete your account</li>
        <li>Anonymised analytics data is retained for up to 90 days</li>
        <li>Legal or abuse-related logs may be retained for up to 3 years as required under applicable Indian law</li>
      </ul>
    ),
  },
  {
    title: "5. Your Rights",
    body: (
      <>
        <p>You can request deletion of your account and all associated data at any time:</p>
        <ul className="list-disc pl-5 space-y-1 mt-2">
          <li>In-app: Profile → Help &amp; Support → Category: Account Issue → Subject: "Delete my account"</li>
          <li>By email: <a href="mailto:tickfeednewz@gmail.com?subject=Account%20Deletion%20Request" className="text-green-600 underline underline-offset-2">tickfeednewz@gmail.com</a></li>
        </ul>
        <p className="mt-2">
          See our full <a href="/delete-account" className="text-green-600 underline underline-offset-2">Account Deletion page</a> for details on what data is removed.
        </p>
      </>
    ),
  },
  {
    title: "6. Children's Privacy",
    body: (
      <p>TickFeed is not directed at children under the age of 13. We do not knowingly collect personal data from children. If you believe a child has provided us with their data, please contact us and we will delete it promptly.</p>
    ),
  },
  {
    title: "7. Security",
    body: (
      <p>All data is transmitted over HTTPS. Passwords are not stored — authentication is handled via one-time codes sent to your email. We follow industry-standard practices to protect your data.</p>
    ),
  },
  {
    title: "8. Changes to This Policy",
    body: (
      <p>We may update this policy from time to time. We will notify you of significant changes via the app or email. Continued use of TickFeed after changes constitutes acceptance of the updated policy.</p>
    ),
  },
]
