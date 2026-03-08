export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#EFF2F7] flex items-center justify-center p-6">
      <div className="bg-white rounded-[2rem] shadow-xl p-12 max-w-md w-full text-center">
        <div className="w-20 h-20 bg-[#0A2E6E]/10 rounded-full flex items-center justify-center mx-auto mb-6">
          <svg className="w-10 h-10 text-[#0A2E6E]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5}
              d="M18.364 5.636a9 9 0 010 12.728m-3.536-3.536a4 4 0 000-5.656M6.343 6.343a9 9 0 000 12.728m3.536-3.536a4 4 0 010-5.656M12 12h.01" />
          </svg>
        </div>
        <h1 className="text-2xl font-bold text-[#0A2E6E] mb-3">You're offline</h1>
        <p className="text-gray-500 mb-8">
          No internet connection. Your saved tickets are still available — check the Tickets page.
        </p>
        <a
          href="/tickets"
          className="inline-block bg-[#0569b9] text-white font-semibold px-8 py-3 rounded-full hover:bg-[#0A2E6E] transition"
        >
          View My Tickets
        </a>
      </div>
    </div>
  );
}
