import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Delete Account — TickFeed",
  description: "Request deletion of your TickFeed account and associated data.",
}

export default function DeleteAccountPage() {
  return (
    <main className="bg-[#f9fafb]">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 px-6 py-4 flex items-center gap-3 sticky top-0 z-10">
        <img src="/icon.svg" alt="TickFeed" width={32} height={32} className="rounded-lg" />
        <span className="text-lg font-semibold text-gray-900">TickFeed</span>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
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
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center mt-0.5">
                1
              </span>
              <div>
                <p className="font-medium text-gray-900">From inside the app (recommended)</p>
                <p className="mt-0.5 text-gray-600 text-sm leading-relaxed">
                  Open TickFeed → tap your profile icon (bottom right) → Help &amp; Support → select category <span className="font-medium">Account Issue</span> → write <span className="font-medium">"Delete my account"</span> in the subject → submit. We will process your request within 7 business days.
                </p>
              </div>
            </li>
            <li className="flex gap-4">
              <span className="flex-shrink-0 w-7 h-7 rounded-full bg-green-100 text-green-700 text-sm font-bold flex items-center justify-center mt-0.5">
                2
              </span>
              <div>
                <p className="font-medium text-gray-900">By email</p>
                <p className="mt-0.5 text-gray-600 text-sm leading-relaxed">
                  Send an email to{" "}
                  <a
                    href="mailto:tickfeednewz@gmail.com?subject=Account%20Deletion%20Request"
                    className="text-green-600 underline underline-offset-2 font-medium"
                  >
                    tickfeednewz@gmail.com
                  </a>{" "}
                  with subject <span className="font-medium">Account Deletion Request</span>, including the email address linked to your account.
                </p>
              </div>
            </li>
          </ol>
        </section>

        {/* Data table */}
        <section className="bg-white rounded-xl border border-gray-200 overflow-hidden">
          <h2 className="text-base font-semibold text-gray-900 px-5 pt-5 pb-3">What happens to your data</h2>
          <table className="w-full text-sm">
            <thead>
              <tr className="border-t border-gray-100 bg-gray-50">
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide w-1/2">Data</th>
                <th className="text-left px-5 py-2.5 text-xs font-semibold text-gray-500 uppercase tracking-wide">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-100">
              {[
                ["Account profile (name, username, email)", "Deleted immediately"],
                ["Watchlist & bookmarked articles", "Deleted immediately"],
                ["Community posts, likes & comments", "Deleted immediately"],
                ["AI chat history", "Deleted immediately"],
                ["Notification preferences & device tokens", "Deleted immediately"],
                ["OTP & session records", "Deleted immediately"],
                ["Anonymised usage analytics", "Retained up to 90 days, no PII"],
                ["Legal / abuse-related logs", "Retained up to 3 years (Indian law)"],
              ].map(([data, action]) => (
                <tr key={data}>
                  <td className="px-5 py-3 text-gray-700">{data}</td>
                  <td className={`px-5 py-3 font-medium ${action.startsWith("Deleted") ? "text-green-600" : "text-amber-600"}`}>
                    {action}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        {/* Contact */}
        <p className="text-sm text-gray-500 pb-6">
          Questions? Contact us at{" "}
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
