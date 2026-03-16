import { useAuth } from '@/context/AuthContext'

export default function Upgrade() {
  const { user, signOut } = useAuth()

  return (
    <div className="min-h-screen flex items-center justify-center bg-background">
      <div className="bg-card border border-border rounded-xl p-10 flex flex-col items-center gap-6 shadow-lg w-full max-w-sm text-center">
        <div className="text-4xl">🔒</div>
        <div>
          <h1 className="text-xl font-bold text-foreground">Access Required</h1>
          <p className="text-sm text-muted-foreground mt-2">
            Get lifetime access to your personal habit tracker.
          </p>
        </div>

        <div className="w-full bg-secondary/40 rounded-lg p-4 space-y-2 text-sm text-foreground">
          <div className="flex items-center gap-2">✅ <span>Track unlimited habits</span></div>
          <div className="flex items-center gap-2">✅ <span>Syncs across all your devices</span></div>
          <div className="flex items-center gap-2">✅ <span>Realtime updates</span></div>
          <div className="flex items-center gap-2">✅ <span>Your data stored securely</span></div>
        </div>

        {/* Stripe button goes here once you integrate */}
        <button
          disabled
          className="w-full bg-primary text-primary-foreground py-2.5 rounded-lg font-semibold opacity-60 cursor-not-allowed"
        >
          Buy Access — Coming Soon
        </button>

        <div className="text-xs text-muted-foreground">
          Signed in as {user?.email}
        </div>
        <button onClick={signOut} className="text-xs text-muted-foreground underline">
          Sign out
        </button>
      </div>
    </div>
  )
}
