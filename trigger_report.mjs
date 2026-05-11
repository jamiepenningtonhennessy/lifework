import { SignJWT } from 'jose';

const secret = process.env.JWT_SECRET;
const appId = process.env.VITE_APP_ID;
const secretKey = new TextEncoder().encode(secret);

// Create a session token matching the SDK's expected payload: { openId, appId, name }
const token = await new SignJWT({
  openId: 'kp593JGV8xod3AbausKBGx',
  appId: appId,
  name: 'Jamie Pennington',
})
  .setProtectedHeader({ alg: 'HS256', typ: 'JWT' })
  .setExpirationTime('1h')
  .sign(secretKey);

console.log('Token created, triggering report generation...');

// Call the generate endpoint
const resp = await fetch('http://localhost:3000/api/trpc/wowReport.generate', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Cookie': `app_session_id=${token}`,
  },
  body: JSON.stringify({ json: { clientId: 720002, reportType: 'standard', writingStyle: 'house', forceRegenerate: false } }),
});

const data = await resp.json();
console.log('Response:', JSON.stringify(data, null, 2));
