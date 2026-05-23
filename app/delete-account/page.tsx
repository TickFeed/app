import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Delete Account — TickFeed",
  description: "Request deletion of your TickFeed account and associated data.",
}

export default function DeleteAccountPage() {
  return (
    <main className="bg-[#f9fafb] flex flex-col">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3">
        <svg width="28" height="28" viewBox="0 0 32 32" fill="none" aria-hidden="true">
          <rect width="32" height="32" rx="8" fill="#22c55e" />
          <path d="M8 20 L14 14 L19 19 L24 12" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        <span className="text-lg font-semibold text-gray-900">TickFeed</span>
      </header>

      <div className="flex-1 max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Account Deletion Request</h1>
          <p className="mt-2 text-gray-600">
            You can request permanent deletion of your TickFeed account and all associated data at any time.
          </p>
        </div>

        {/* Steps */}
        <section>
          <h2 className="text-base font-semibold text-gray-900 mb-4">How to request deletion</h2>
          <ol className="space-y-4">
            {[
              {
                title: "From inside the app (recommended)",
                body: "Open TickFeed → tap your profile icon (bottom right) → Settings → Delete Account. Your account will be scheduled for deletion immediately.",
              },
              {
                title: "By email",
                body: (
                  <>
                    Send an email to{" "}
                    <a
                      href="mailto:support@tickfeed.in?subject=Account%20Deletion%20Request"
                      className="text-green-600 underline underline-offset-2 font-medium"
                    >
                      support@tickfeed.in
                    </a>{" "}
                    with the subject <span className="font-medium">Account Deletion Request</span>. Include the email address or phone number linked to your account. We will process your request within 7 business days and confirm by email.
                  </>
                ),
              },
            ].map((step, i) => (
              <li key={i} className="flex gap-4">
                <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center mt-0.5">
                  {i + 1}
                </span>
                <div>
                  <p className="font-medium text-gray-900">{step.title}</p>
                  <p className="mt-0.5 text-gray-600 text-sm leading-relaxed">{step.body}</p>
                </div>
              </li>
            ))}
          </ol>
        </section>

        {/* What gets deleted */}
        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <h2 className="text-base font-semibold text-gray-900">What data is deleted</h2>
          <p className="text-sm text-gray-600">
            Upon confirmed deletion, the following data is <span className="font-medium text-gray-800">permanently removed</span> from our servers:
          </p>
          <ul className="space-y-2">
            {[
              "Account profile (name, username, email address)",
              "Watchlist and bookmarked articles",
              "Community posts, likes, and comments",
              "Notification preferences and device tokens",
              "OTP and session records",
            ].map((item) => (
              <li key={item} className="flex items-start gap-2 text-sm text-gray-700">
                <svg className="w-4 h-4 text-green-500 mt-0.5 flex-shrink-0" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path fillRule="evenodd" d="M16.704 4.153a.75.75 0 0 1 .143 1.052l-8 10.5a.75.75 0 0 1-1.127.075l-4.5-4.5a.75.75 0 0 1 1.06-1.06l3.894 3.893 7.48-9.817a.75.75 0 0 1 1.05-.143Z" clipRule="evenodd" />
                </svg>
                {item}
              </li>
            ))}
          </ul>
        </section>

        {/* What is retained */}
        <section className="bg-amber-50 rounded-xl border border-amber-200 p-6 space-y-3">
          <h2 className="text-base font-semibold text-gray-900">What data is retained and why</h2>
          <ul className="space-y-3 text-sm text-gray-700">
            <li>
              <span className="font-medium">Anonymised financial news interactions</span> — retained for up to 90 days in aggregate, anonymised form for AI model improvement. No personally identifiable information is retained.
            </li>
            <li>
              <span className="font-medium">Legal and compliance records</span> — transaction or abuse-related logs may be retained for up to 3 years as required under applicable Indian law.
            </li>
          </ul>
        </section>

        {/* Contact */}
        <section className="text-sm text-gray-500">
          <p>
            Questions? Contact us at{" "}
            <a
              href="mailto:support@tickfeed.in"
              className="text-green-600 underline underline-offset-2"
            >
              support@tickfeed.in
            </a>
            .
          </p>
        </section>
      </div>

      <footer className="border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} TickFeed. All rights reserved.
      </footer>
    </main>
  )
}
