import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

const LOGO_URL = 'https://play-lh.googleusercontent.com/6GoMgqNIG0997uH91CHQ9H6cTH276ts2zEChCVIHonrF0m800CRowJc15XEhH1XeVng'

export default function Login() {
  const { signInWithGoogle, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-background">
        <div className="text-muted-foreground text-sm">Loading...</div>
      </div>
    )
  }

  return (
    <div
      className="min-h-screen flex items-center justify-center px-4"
      style={{
        background: 'linear-gradient(135deg, hsl(221,83%,18%) 0%, hsl(221,83%,38%) 50%, hsl(271,81%,40%) 100%)',
        fontFamily: "'Inter', system-ui, sans-serif",
      }}
    >
      <div className="w-full max-w-sm">
        {/* Card */}
        <div className="bg-white rounded-2xl shadow-2xl overflow-hidden">
          {/* Top accent bar */}
          <div className="h-1.5 w-full" style={{ background: 'linear-gradient(90deg, hsl(221,83%,53%), hsl(271,81%,56%), hsl(0,84%,60%))' }} />

          <div className="px-8 py-10 flex flex-col items-center gap-6">
            {/* Logo */}
            <div className="w-20 h-20 rounded-2xl overflow-hidden shadow-lg ring-4 ring-blue-100">
              <img
                src={LOGO_URL}
                alt="Habit Tracker"
                className="w-full h-full object-cover"
              />
            </div>

            {/* Title */}
            <div className="text-center space-y-1">
              <h1 className="text-2xl font-bold text-gray-900 tracking-tight">Habit Tracker</h1>
              <p className="text-sm text-gray-500">Build consistency. Track your daily habits.</p>
            </div>

            {/* Divider */}
            <div className="w-full flex items-center gap-3">
              <div className="flex-1 h-px bg-gray-200" />
              <span className="text-xs text-gray-400 uppercase tracking-wider">Sign in</span>
              <div className="flex-1 h-px bg-gray-200" />
            </div>

            {/* Google button */}
            <button
              onClick={signInWithGoogle}
              className="flex items-center gap-3 w-full justify-center bg-white text-gray-700 border border-gray-300 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-50 hover:border-gray-400 transition-all shadow-sm"
            >
              <GoogleIcon />
              Continue with Google
            </button>

            <p className="text-xs text-gray-400 text-center leading-relaxed">
              By signing in you agree to track your habits<br />and build better routines.
            </p>
          </div>
        </div>

        {/* Footer */}
        <p className="text-center text-white/50 text-xs mt-6">Habit Tracker · {new Date().getFullYear()}</p>
      </div>
    </div>
  )
}

function GoogleIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 18 18" xmlns="http://www.w3.org/2000/svg">
      <path d="M17.64 9.2c0-.637-.057-1.251-.164-1.84H9v3.481h4.844c-.209 1.125-.843 2.078-1.796 2.717v2.258h2.908c1.702-1.567 2.684-3.875 2.684-6.615z" fill="#4285F4"/>
      <path d="M9 18c2.43 0 4.467-.806 5.956-2.184l-2.908-2.258c-.806.54-1.837.86-3.048.86-2.344 0-4.328-1.584-5.036-3.711H.957v2.332A8.997 8.997 0 0 0 9 18z" fill="#34A853"/>
      <path d="M3.964 10.707A5.41 5.41 0 0 1 3.682 9c0-.593.102-1.17.282-1.707V4.961H.957A8.996 8.996 0 0 0 0 9c0 1.452.348 2.827.957 4.039l3.007-2.332z" fill="#FBBC05"/>
      <path d="M9 3.58c1.321 0 2.508.454 3.44 1.345l2.582-2.58C13.463.891 11.426 0 9 0A8.997 8.997 0 0 0 .957 4.961L3.964 7.293C4.672 5.163 6.656 3.58 9 3.58z" fill="#EA4335"/>
    </svg>
  )
}
