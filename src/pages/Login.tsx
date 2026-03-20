import { useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '@/context/AuthContext'

export default function Login() {
  const { signInWithGoogle, user, loading } = useAuth()
  const navigate = useNavigate()

  useEffect(() => {
    if (!loading && user) navigate('/', { replace: true })
  }, [user, loading, navigate])

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-950">
        <div className="w-5 h-5 border-2 border-white/20 border-t-white rounded-full animate-spin" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-gray-950 flex flex-col items-center justify-center px-4">

      {/* Logo / Brand */}
      <div className="mb-8 text-center">
        <span className="text-3xl font-black text-white tracking-tight flex items-center justify-center gap-2">
          trackly
          <span className="inline-flex items-center justify-center w-7 h-7 bg-red-600 rounded text-white text-sm font-black">T</span>
        </span>
        <p className="text-gray-500 text-xs tracking-widest uppercase mt-1">progress.</p>
      </div>

      {/* Card */}
      <div className="w-full max-w-sm bg-gray-900 border border-gray-800 rounded-2xl p-8 flex flex-col gap-6">

        <div className="text-center">
          <h1 className="text-xl font-bold text-white mb-1">Sign in to Trackly</h1>
          <p className="text-gray-400 text-sm leading-relaxed">
            Use the same email you used at checkout
          </p>
        </div>

        <button
          onClick={signInWithGoogle}
          className="flex items-center justify-center gap-3 w-full bg-white text-gray-900 border border-gray-200 rounded-xl px-4 py-3 text-sm font-semibold hover:bg-gray-50 active:scale-[0.98] transition-all shadow-sm"
        >
          <GoogleIcon />
          Continue with Google
        </button>

        <div className="bg-amber-950/40 border border-amber-800/40 rounded-xl px-4 py-3">
          <p className="text-amber-300 text-xs leading-relaxed text-center">
            Sign in with the Google account that matches the email you used at checkout.
          </p>
        </div>

      </div>

      <p className="text-gray-700 text-xs mt-8">Trackly · {new Date().getFullYear()}</p>
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
