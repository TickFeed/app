import type { Metadata } from "next"

export const metadata: Metadata = {
  title: "Contact — TickFeed",
  description: "Get in touch with the TickFeed team.",
}

export default function ContactPage() {
  return (
    <main className="h-screen overflow-y-auto bg-[#f9fafb]">
      <header className="bg-white border-b border-gray-200 px-6 py-4 sticky top-0 z-10">
        <span className="text-2xl font-bold">
          <span className="text-gray-900">Tick</span>
          <span className="text-green-500">Feed</span>
        </span>
      </header>

      <div className="max-w-2xl mx-auto w-full px-6 py-10 space-y-8">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Contact Us</h1>
          <p className="mt-3 text-gray-600 text-sm leading-relaxed">
            Have a question, feedback, or need support? We&apos;d love to hear from you.
          </p>
        </div>

        <section className="bg-white rounded-xl border border-gray-200 p-6 space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700">Email</p>
            <a
              href="mailto:tickfeednewz@gmail.com"
              className="text-green-600 underline underline-offset-2 text-sm"
            >
              tickfeednewz@gmail.com
            </a>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">App</p>
            <p className="text-sm text-gray-600">
              Profile → Help &amp; Support (available inside the TickFeed app)
            </p>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700">Developer</p>
            <p className="text-sm text-gray-600">Kanishak Mittal, India</p>
          </div>
        </section>

        <p className="text-sm text-gray-500">
          We typically respond within 1–2 business days.
        </p>
      </div>

      <footer className="border-t border-gray-200 py-4 px-6 text-center text-xs text-gray-400">
        © {new Date().getFullYear()} TickFeed. All rights reserved.
      </footer>
    </main>
  )
}
