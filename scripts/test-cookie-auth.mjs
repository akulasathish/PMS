import { createClient } from '@supabase/supabase-js';

const url = 'http://127.0.0.1:54321';
const anonKey = 'sb_publishable_ACJWlzQHlZjBrEguHvfOxg_3BJgxAaH'; // From env

// We initialize supabase client
const supabase = createClient(url, anonKey);

async function run() {
  console.log("1. Authenticating as staysync@online.com...");
  const { data, error } = await supabase.auth.signInWithPassword({
    email: 'staysync@online.com',
    password: '8686113435'
  });

  if (error) {
    console.error("Authentication failed:", error.message);
    process.exit(1);
  }

  const { access_token, refresh_token } = data.session;
  console.log("✅ Authenticated successfully!");
  console.log(`Access Token (truncated): ${access_token.substring(0, 30)}...`);

  // Supabase SSR uses cookies named `sb-access-token` and `sb-refresh-token` 
  // or `sb-<ref>-auth-token` or similar. Let's send the token via standard headers or cookies.
  // Let's perform a fetch to /admin using the simulated cookies.
  const cookieHeader = `sb-access-token=${access_token}; sb-refresh-token=${refresh_token}`;

  console.log("\n2. Making authenticated request to Next.js /admin...");
  const res = await fetch('http://127.0.0.1:3000/admin', {
    method: 'GET',
    headers: {
      'Cookie': cookieHeader,
      'User-Agent': 'Integration-Tester'
    },
    redirect: 'manual' // Do not follow redirects so we can inspect the headers
  });

  console.log(`Response Status: ${res.status}`);
  console.log(`Response Headers:`, JSON.stringify([...res.headers.entries()]));

  if (res.status === 200) {
    console.log("🎉 SUCCESS! Next.js middleware recognized the login and allowed access (status 200).");
  } else if (res.status === 307 || res.status === 302) {
    const location = res.headers.get('location');
    console.log(`❌ REDIRECTED to ${location}. Next.js middleware did not recognize the cookie or role.`);
  } else {
    console.log(`❌ Unexpected response: ${res.status}`);
  }
}

run().catch(console.error);
