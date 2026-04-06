import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.49.1';

const supabaseUrl = Deno.env.get('SUPABASE_URL')!;
const serviceRoleKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || Deno.env.get('SERVICE_ROLE_KEY')!;

function errorPage(title: string, message: string): Response {
  return new Response(renderPage({ error: true, errorTitle: title, errorMessage: message }), {
    headers: { 'Content-Type': 'text/html; charset=utf-8' },
  });
}

function renderPage(data: {
  error?: boolean;
  errorTitle?: string;
  errorMessage?: string;
  token?: string;
  vowText?: string;
  makerName?: string;
  witnessName?: string;
  amount?: number;
  destination?: string;
  alreadyJudged?: boolean;
  existingVerdict?: string;
}): string {
  if (data.error) {
    return pageShell(`
      <div class="badge error-badge">LINK INVALID</div>
      <h1>${esc(data.errorTitle || 'Error')}</h1>
      <p class="subtitle">${esc(data.errorMessage || '')}</p>
    `);
  }

  if (data.alreadyJudged) {
    const isKept = data.existingVerdict === 'kept';
    return pageShell(`
      <div class="badge ${isKept ? 'kept-badge' : 'broken-badge'}">${isKept ? 'VOW KEPT' : 'VOW BROKEN'}</div>
      <h1>Verdict already recorded.</h1>
      <div class="vow-card">
        <p class="vow-text">"${esc(data.vowText || '')}"</p>
        <p class="vow-meta">${esc(data.makerName || '')} · $${data.amount}</p>
      </div>
      <p class="subtitle">This vow has already been judged. Thanks for being a witness.</p>
    `);
  }

  return pageShell(`
    <div class="badge">VERDICT TIME</div>
    <h1>Did ${esc(data.makerName || 'they')} keep their vow?</h1>
    <div class="vow-card">
      <p class="vow-text">"${esc(data.vowText || '')}"</p>
      <div class="vow-meta-row">
        <span class="vow-meta">${esc(data.makerName || '')} · <span class="gold">$${data.amount}</span> on the line</span>
      </div>
    </div>
    <div class="buttons" id="buttons">
      <button class="btn kept-btn" onclick="showConfirm('kept')">They kept it ✓</button>
      <button class="btn broken-btn" onclick="showConfirm('broken')">They broke it ✗</button>
    </div>
    <div id="confirm-modal" class="modal hidden">
      <div class="modal-card">
        <div id="confirm-icon" class="modal-icon"></div>
        <h2 id="confirm-title"></h2>
        <p id="confirm-text"></p>
        <button id="confirm-btn" class="btn" onclick="doSubmit()">Confirm</button>
        <button class="btn-ghost" onclick="closeModal()">Go back</button>
      </div>
    </div>
    <div id="loading" class="hidden">
      <div class="spinner"></div>
      <p class="subtitle">Submitting verdict...</p>
    </div>
    <div id="success" class="hidden"></div>
    <script>
      const TOKEN = ${JSON.stringify(data.token)};
      const NAME = ${JSON.stringify(data.makerName || 'they')};
      const AMOUNT = ${data.amount || 0};
      const DEST = ${JSON.stringify(data.destination || '')};
      let pendingVerdict = null;

      function showConfirm(v) {
        pendingVerdict = v;
        const t = document.getElementById('confirm-title');
        const p = document.getElementById('confirm-text');
        const b = document.getElementById('confirm-btn');
        const i = document.getElementById('confirm-icon');
        if (v === 'kept') {
          i.className = 'modal-icon kept-icon';
          i.textContent = '✓';
          t.textContent = 'Confirm: Kept';
          p.textContent = "You're confirming that " + NAME + " kept their vow. Their $" + AMOUNT + " will be refunded.";
          b.className = 'btn kept-btn';
        } else {
          i.className = 'modal-icon broken-icon';
          i.textContent = '✗';
          t.textContent = 'Confirm: Broken';
          p.textContent = "You're confirming that " + NAME + " broke their vow. Their $" + AMOUNT + " will go to " + DEST + ". This can\\'t be undone.";
          b.className = 'btn broken-btn';
        }
        document.getElementById('confirm-modal').classList.remove('hidden');
      }

      function closeModal() {
        document.getElementById('confirm-modal').classList.add('hidden');
        pendingVerdict = null;
      }

      async function doSubmit() {
        document.getElementById('confirm-modal').classList.add('hidden');
        document.getElementById('buttons').classList.add('hidden');
        document.getElementById('loading').classList.remove('hidden');
        try {
          const res = await fetch('${supabaseUrl}/functions/v1/submit-verdict', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ token: TOKEN, verdict: pendingVerdict }),
          });
          const json = await res.json();
          document.getElementById('loading').classList.add('hidden');
          if (json.success) {
            const isKept = pendingVerdict === 'kept';
            document.getElementById('success').innerHTML =
              '<div class="badge ' + (isKept ? 'kept-badge' : 'broken-badge') + '">' + (isKept ? 'VOW KEPT' : 'VOW BROKEN') + '</div>' +
              '<h2>Verdict recorded.</h2>' +
              '<p class="subtitle">' + (isKept
                ? NAME + " kept their word. $" + AMOUNT + " refunded."
                : NAME + " broke their vow. $" + AMOUNT + " goes to " + DEST + "."
              ) + '</p>' +
              '<p class="thanks">Thanks for being a witness.</p>';
            document.getElementById('success').classList.remove('hidden');
          } else {
            document.getElementById('success').innerHTML =
              '<div class="badge error-badge">ERROR</div><h2>' + (json.error === 'already_judged' ? 'Already judged' : 'Something went wrong') + '</h2><p class="subtitle">Please try again or contact support.</p>';
            document.getElementById('success').classList.remove('hidden');
          }
        } catch (e) {
          document.getElementById('loading').classList.add('hidden');
          document.getElementById('success').innerHTML =
            '<div class="badge error-badge">ERROR</div><h2>Network error</h2><p class="subtitle">Please check your connection and try again.</p>';
          document.getElementById('success').classList.remove('hidden');
        }
      }
    </script>
  `);
}

function esc(s: string): string {
  return s.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}

function pageShell(content: string): string {
  return `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Unbreakable Vow — Verdict</title>
<style>
*{margin:0;padding:0;box-sizing:border-box}
body{background:#05070B;color:#F6F7FB;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;min-height:100vh;display:flex;justify-content:center;padding:24px 20px}
.container{max-width:420px;width:100%;display:flex;flex-direction:column;align-items:center;gap:20px;padding-top:40px}
.badge{display:inline-flex;padding:6px 14px;border-radius:20px;font-size:11px;font-weight:700;letter-spacing:1px;background:rgba(212,162,79,0.1);border:1px solid rgba(212,162,79,0.25);color:#D4A24F}
.error-badge{background:rgba(255,100,100,0.1);border-color:rgba(255,100,100,0.25);color:#FF7B7B}
.kept-badge{background:rgba(82,214,154,0.1);border-color:rgba(82,214,154,0.25);color:#52D69A}
.broken-badge{background:rgba(212,162,79,0.1);border-color:rgba(212,162,79,0.25);color:#D4A24F}
h1{font-size:24px;font-weight:700;text-align:center;line-height:1.3;letter-spacing:-0.3px}
h2{font-size:20px;font-weight:700;text-align:center;line-height:1.3}
.subtitle{color:#8B8FA3;font-size:14px;text-align:center;line-height:1.5}
.gold{color:#D4A24F;font-weight:700}
.vow-card{width:100%;background:#0D1017;border:1px solid rgba(255,255,255,0.08);border-radius:20px;padding:20px;display:flex;flex-direction:column;gap:12px}
.vow-text{font-size:18px;line-height:1.5;font-weight:600;font-style:italic;color:#F6F7FB}
.vow-meta-row{display:flex;justify-content:space-between;align-items:center}
.vow-meta{color:#8B8FA3;font-size:13px}
.buttons{width:100%;display:flex;flex-direction:column;gap:12px}
.btn{width:100%;min-height:56px;border-radius:16px;border:1px solid transparent;font-size:16px;font-weight:700;cursor:pointer;display:flex;align-items:center;justify-content:center;transition:all 0.15s}
.kept-btn{background:rgba(82,214,154,0.12);border-color:rgba(82,214,154,0.25);color:#52D69A}
.kept-btn:active{background:rgba(82,214,154,0.2)}
.broken-btn{background:rgba(212,162,79,0.12);border-color:rgba(212,162,79,0.25);color:#D4A24F}
.broken-btn:active{background:rgba(212,162,79,0.2)}
.btn-ghost{width:100%;min-height:44px;background:none;border:none;color:#8B8FA3;font-size:14px;font-weight:600;cursor:pointer}
.modal{position:fixed;inset:0;background:rgba(0,0,0,0.7);display:flex;align-items:center;justify-content:center;padding:28px;z-index:10}
.modal-card{width:100%;max-width:380px;background:#141820;border:1px solid rgba(255,255,255,0.08);border-radius:24px;padding:28px;display:flex;flex-direction:column;align-items:center;gap:14px}
.modal-icon{width:56px;height:56px;border-radius:28px;display:flex;align-items:center;justify-content:center;font-size:24px;font-weight:700}
.kept-icon{background:rgba(82,214,154,0.12);border:1px solid rgba(82,214,154,0.25);color:#52D69A}
.broken-icon{background:rgba(212,162,79,0.12);border:1px solid rgba(212,162,79,0.25);color:#D4A24F}
.hidden{display:none!important}
.spinner{width:32px;height:32px;border:3px solid rgba(212,162,79,0.2);border-top-color:#D4A24F;border-radius:50%;animation:spin 0.8s linear infinite}
@keyframes spin{to{transform:rotate(360deg)}}
#loading{display:flex;flex-direction:column;align-items:center;gap:16px}
.thanks{color:#D4A24F;font-size:14px;text-align:center;margin-top:8px}
#success{display:flex;flex-direction:column;align-items:center;gap:16px}
</style>
</head>
<body>
<div class="container">
${content}
</div>
</body>
</html>`;
}

Deno.serve(async (req) => {
  const url = new URL(req.url);
  const token = url.searchParams.get('token');

  if (!token) {
    return errorPage('Invalid link', 'This verdict link is missing a token.');
  }

  const supabase = createClient(supabaseUrl, serviceRoleKey);

  const { data: vow, error } = await supabase
    .from('vows')
    .select('*')
    .eq('witness_invite_token', token)
    .single();

  if (error || !vow) {
    return errorPage('Link not found', 'This verdict link is no longer valid.');
  }

  // Get maker's display name
  const { data: profile } = await supabase
    .from('users')
    .select('display_name')
    .eq('id', vow.user_id)
    .single();

  const makerName = profile?.display_name || 'Someone';
  const amountDollars = Math.round(vow.stake_amount / 100);

  // Already judged
  if (['kept', 'broken'].includes(vow.status)) {
    return new Response(renderPage({
      alreadyJudged: true,
      existingVerdict: vow.verdict || vow.status,
      vowText: vow.refined_text,
      makerName,
      amount: amountDollars,
    }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
  }

  // Not yet sealable
  if (!['active', 'awaiting_verdict'].includes(vow.status)) {
    return errorPage("Not ready yet", "This vow hasn't been activated yet.");
  }

  // If witness hasn't accepted yet, redirect to the witness landing page
  // which now handles acceptance gating
  if (!vow.witness_accepted_at) {
    return new Response(null, {
      status: 302,
      headers: { 'Location': `https://unbreakablevow.app/w/${token}` },
    });
  }

  // Show verdict page
  return new Response(renderPage({
    token,
    vowText: vow.refined_text,
    makerName,
    witnessName: vow.witness_name,
    amount: amountDollars,
    destination: vow.destination,
  }), { headers: { 'Content-Type': 'text/html; charset=utf-8' } });
});
