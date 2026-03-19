import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabase = createClient(
  Deno.env.get('SUPABASE_URL')!,
  Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!
)

Deno.serve(async (req) => {
  if (req.method !== 'POST') {
    return new Response('Method not allowed', { status: 405 })
  }

  // Secret token check
  const secret = Deno.env.get('WEBHOOK_SECRET')
  if (secret) {
    const authHeader = req.headers.get('authorization') ?? ''
    const tokenFromQuery = new URL(req.url).searchParams.get('secret') ?? ''
    if (authHeader !== `Bearer ${secret}` && tokenFromQuery !== secret) {
      return new Response('Unauthorized', { status: 401 })
    }
  }

  let body: Record<string, unknown>
  try {
    body = await req.json()
  } catch {
    return new Response('Invalid JSON', { status: 400 })
  }

  // Only process paid events
  if (body.type && body.type !== 'paid') {
    return new Response(JSON.stringify({ skipped: true, type: body.type }), { status: 200 })
  }

  // Universal email extraction
  const email = (
    (body.email as string) ||
    (body.buyer_email as string) ||
    (body.customer_email as string) ||
    ((body.data as any)?.attributes?.user_email as string)
  )?.toLowerCase().trim() ?? null

  if (!email) {
    return new Response('No email found in payload', { status: 400 })
  }

  // Check if profile already exists
  const { data: existingProfile } = await supabase
    .from('profiles')
    .select('id')
    .eq('email', email)
    .maybeSingle()

  if (existingProfile) {
    // User exists — just flip is_paid to true
    await supabase
      .from('profiles')
      .update({ is_paid: true })
      .eq('email', email)

    return new Response(JSON.stringify({ success: true, action: 'updated', email }), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    })
  }

  // User doesn't exist — create auth user + profile with is_paid: true
  const { data: newUser, error: createError } = await supabase.auth.admin.createUser({
    email,
    email_confirm: true, // mark email as confirmed so they can log in
  })

  if (createError || !newUser?.user) {
    return new Response(JSON.stringify({ error: createError?.message }), { status: 500 })
  }

  await supabase.from('profiles').upsert({
    id: newUser.user.id,
    email,
    is_paid: true,
  })

  return new Response(JSON.stringify({ success: true, action: 'created', email }), {
    status: 200,
    headers: { 'Content-Type': 'application/json' },
  })
})
