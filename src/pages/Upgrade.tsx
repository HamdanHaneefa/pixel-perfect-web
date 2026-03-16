import { useAuth } from '@/context/AuthContext'

const LOGO_URL = 'https://play-lh.googleusercontent.com/6GoMgqNIG0997uH91CHQ9H6cTH276ts2zEChCVIHonrF0m800CRowJc15XEhH1XeVng'

const FEATURES = [
  { text: 'Track unlimited habits' },
  { text: 'Syncs across all your devices' },
  { text: 'Realtime updates' },
  { text: 'Your data stored securely' },
]

export default function Upgrade() {
  const { user, signOut } = useAuth()

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, hsl(221,83%,18%) 0%, hsl(221,83%,38%) 50%, hsl(271,81%,40%) 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-sm">
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, hsl(221,83%,53%), hsl(271,81%,56%), hsl(0,84%,60%))' }} />

          <div className="px-8 py-10 flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-blue-100">
              <img src={LOGO_URL} alt="Habit Tracker" className="w-full h-full object-cover" />
            </div>

            {/* Title */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Access Required</h1>
              <p className="text-sm text-gray-500">Get lifetime access to your personal habit tracker.</p>
            </div>

            {/* Features */}
            <div className="w-full rounded-xl border border-gray-100 bg-gray-50 divide-y divide-gray-100">
              {FEATURES.map((f, i) => (
                <div key={i} className="flex items-center gap-3 px-4 py-3">
                  <span className="flex-shrink-0 w-5 h-5 rounded-full flex items-center justify-center" style={{ backgroundColor: 'hsl(221,83%,53%)' }}>
                    <svg viewBox="0 0 12 12" className="w-3 h-3" fill="none">
                      <path d="M2 6l3 3 5-5" stroke="white" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </span>
                  <span className="text-sm text-gray-700 font-medium">{f.text}</span>
                </div>
              ))}
            </div>

            {/* CTA button */}
            <button
              disabled
              className="w-full py-3 rounded-xl font-semibold text-sm text-white cursor-not-allowed"
              style={{ background: 'linear-gradient(90deg, hsl(221,83%,53%), hsl(271,81%,56%))', opacity: 0.7 }}
            >
              Buy Access — Coming Soon
            </button>

            {/* User info */}
            <div className="text-center space-y-2">
              <p className="text-xs text-gray-400">Signed in as <span className="text-gray-600 font-medium">{user?.email}</span></p>
              <button
                onClick={signOut}
                className="text-xs text-blue-500 hover:text-blue-700 font-medium transition-colors"
              >
                Sign out
              </button>
            </div>
          </div>
        </div>

        <p className="text-center text-white/50 text-xs mt-6">Habit Tracker · {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}
