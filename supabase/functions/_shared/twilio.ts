export async function sendSMS(to: string, body: string): Promise<string> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')!;

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams({ To: to, From: from, Body: body }),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new Error(`Twilio error: ${result.message}`);
  }
  return result.sid;
}
