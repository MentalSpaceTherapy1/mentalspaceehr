import { serve } from 'https://deno.land/std@0.168.0/http/server.ts'
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const twilioAccountSid = Deno.env.get('TWILIO_ACCOUNT_SID')
const twilioApiKey = Deno.env.get('TWILIO_API_KEY')
const twilioApiSecret = Deno.env.get('TWILIO_API_SECRET')

serve(async (req) => {
  try {
    const { identity, room_name } = await req.json()

    if (!identity || !room_name) {
      return new Response(
        JSON.stringify({ error: 'Missing identity or room_name' }),
        { status: 400, headers: { 'Content-Type': 'application/json' } }
      )
    }

    if (!twilioAccountSid || !twilioApiKey || !twilioApiSecret) {
      console.error('Missing Twilio credentials')
      return new Response(
        JSON.stringify({ error: 'Server configuration error' }),
        { status: 500, headers: { 'Content-Type': 'application/json' } }
      )
    }

    // Generate Twilio Access Token
    const token = await generateToken(identity, room_name)

    return new Response(
      JSON.stringify({ token }),
      { headers: { 'Content-Type': 'application/json' } }
    )
  } catch (error) {
    console.error('Error generating token:', error)
    return new Response(
      JSON.stringify({ error: error instanceof Error ? error.message : 'Unknown error' }),
      { status: 500, headers: { 'Content-Type': 'application/json' } }
    )
  }
})

async function generateToken(identity: string, roomName: string): Promise<string> {
  const now = Math.floor(Date.now() / 1000)
  const exp = now + 3600 // 1 hour expiration

  const videoGrant = {
    room: roomName
  }

  const payload = {
    iss: twilioApiKey,
    sub: twilioAccountSid,
    exp: exp,
    jti: `${twilioApiKey}-${now}`,
    grants: {
      identity: identity,
      video: videoGrant
    }
  }

  // Use jose library for JWT creation
  const jose = await import('https://deno.land/x/jose@v4.14.4/index.ts')
  const secret = new TextEncoder().encode(twilioApiSecret)
  
  const jwt = await new jose.SignJWT(payload)
    .setProtectedHeader({ alg: 'HS256', cty: 'twilio-fpa;v=1' })
    .sign(secret)

  return jwt
}
