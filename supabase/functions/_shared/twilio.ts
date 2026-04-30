export class TwilioSMSFailure extends Error {
  code?: number;
  status?: number;

  constructor(message: string, code?: number, status?: number) {
    super(message);
    this.name = 'TwilioSMSFailure';
    this.code = code;
    this.status = status;
  }
}

export async function sendSMS(to: string, body: string): Promise<string> {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID')!;
  const authToken = Deno.env.get('TWILIO_AUTH_TOKEN')!;
  const from = Deno.env.get('TWILIO_PHONE_NUMBER')!;
  const messagingServiceSid = Deno.env.get('TWILIO_MESSAGING_SERVICE_SID');

  const params: Record<string, string> = { To: to, Body: body };
  if (messagingServiceSid) {
    params.MessagingServiceSid = messagingServiceSid;
  } else {
    params.From = from;
  }

  const response = await fetch(
    `https://api.twilio.com/2010-04-01/Accounts/${accountSid}/Messages.json`,
    {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa(`${accountSid}:${authToken}`),
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: new URLSearchParams(params),
    }
  );

  const result = await response.json();
  if (!response.ok) {
    throw new TwilioSMSFailure(`Twilio error: ${result.message}`, result.code, response.status);
  }
  return result.sid;
}
