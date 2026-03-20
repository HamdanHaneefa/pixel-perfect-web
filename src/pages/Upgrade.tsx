import { useState } from 'react'
import { useAuth } from '@/context/AuthContext'
import { CheckCircle2, Lock } from 'lucide-react'

const STORE_URL = 'https://store.elamai.in/buy?s=1&qty%5Bw9Ko3%5D=1&cart_links%5B%5D=w9Ko3'

const FEATURES = [
  'Daily, weekly & monthly habit views',
  'Fully customisable — your habits, your way',
  'Real-time progress tracking',
  'Works on any device, any browser',
  'All future updates included',
]

export default function Upgrade() {
  const { user, signOut } = useAuth()
  const [signingOut, setSigningOut] = useState(false)

  const handleSignOut = async () => {
    setSigningOut(true)
    // Optimistic — navigate away immediately, supabase cleans up in background
    try { await signOut() } catch { /* ignore */ }
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">

      {/* Brand */}
      <div className="mb-8 text-center">
        <span className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          trackly
          <span className="inline-flex items-center justify-center w-7 h-7 bg-red-600 rounded text-white text-sm font-black">T</span>
        </span>
        <p className="text-gray-500 text-xs tracking-widest uppercase mt-1">progress.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col gap-6">

        <div className="flex flex-col items-center gap-2 text-center">
          <div className="w-10 h-10 rounded-xl bg-gray-800 flex items-center justify-center mb-1">
            <Lock className="h-5 w-5 text-gray-400" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Required</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Purchase Trackly to unlock your personal habit tracker.
          </p>
        </div>

        {/* Features */}
        <div className="flex flex-col gap-2.5">
          {FEATURES.map((f) => (
            <div key={f} className="flex items-center gap-3">
              <CheckCircle2 className="h-4 w-4 text-green-500 flex-shrink-0" />
              <span className="text-sm text-gray-300">{f}</span>
            </div>
          ))}
        </div>

        <div className="h-px bg-gray-800" />

        {/* CTA */}
        <a
          href={STORE_URL}
          className="block w-full py-3.5 bg-white text-gray-900 font-semibold text-sm rounded-xl text-center hover:bg-gray-100 active:scale-[0.98] transition-all"
        >
          Get Access — $13.00
        </a>

        {/* User + sign out */}
        <div className="text-center space-y-2">
          <p className="text-xs text-gray-600">
            Signed in as <span className="text-gray-400 font-medium">{user?.email}</span>
          </p>
          <button
            onClick={handleSignOut}
            disabled={signingOut}
            className="text-xs text-gray-500 hover:text-white transition-colors font-medium disabled:opacity-50"
          >
            {signingOut ? 'Signing out…' : 'Sign out'}
          </button>
        </div>

      </div>

      <p className="text-gray-700 text-xs mt-8">Trackly · {new Date().getFullYear()}</p>
    </div>
  )
}
