// Review candidate for src/pages/index.tsx. Supply the tab's sessionStorage,
// crypto.randomUUID, and the homepage's POST transport when integrating.
const homepageKey = 'feh.homepage-quote.v1';
const legacyHealthCheckKey = 'feh_hc_attempt';
const healthCheckKey = 'feh.health-check.quote.v1';
const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;
const limits = {businessName:255, contactName:255, email:255, phone:40, currentSupplier:255, message:2000};

function validate(fields) {
  for (const [field, limit] of Object.entries(limits)) {
    if (typeof fields[field] !== 'string') return {field, message:'Please check this field.'};
    if (Array.from(fields[field].trim()).length > limit)
      return {field, message:`Use ${limit} characters or fewer.`};
  }
  for (const field of ['businessName', 'contactName', 'email']) {
    if (!fields[field].trim()) return {field, message:'Please fill in this field.'};
  }
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(fields.email))
    return {field:'email', message:'Please check your email address.'};
}

export function readHomepageAttempt(storage) {
  return readQuoteAttempt(storage, homepageKey);
}

export function readQuoteAttempt(storage, key) {
  try {
    const raw = storage.getItem(key);
    if (raw === null) return {status:'ready'};
    const value = JSON.parse(raw);
    if (typeof value?.submissionId === 'string' && uuid.test(value.submissionId) &&
        ['held', 'saved'].includes(value.status))
      return {status:value.status, submissionId:value.submissionId};
  } catch { /* An unreadable previous attempt cannot safely be replaced. */ }
  return {status:'unavailable'};
}

export async function submitHomepageQuote(fields, dependencies) {
  return submitQuoteAttempt(homepageKey, () => {
    const error = validate(fields);
    if (error) return {error};
    const body = {source:'homepage-quote-form'};
    for (const field of Object.keys(limits)) body[field] = fields[field];
    return {body};
  }, dependencies);
}

export function readHealthCheckAttempt(storage) {
  const receipt = readQuoteAttempt(storage, healthCheckKey);
  try {
    const raw = storage.getItem(legacyHealthCheckKey);
    if (raw === null) return receipt;
    const record = JSON.parse(raw);
    if (typeof record?.submissionId !== 'string' || !uuid.test(record.submissionId) ||
        typeof record.inFlight !== 'boolean') return {status:'unavailable'};
    if (receipt.status === 'ready') return {status:'held', submissionId:record.submissionId};
    if (receipt.submissionId === record.submissionId) return receipt;
  } catch { /* An unreadable hold cannot safely be replaced. */ }
  return {status:'unavailable'};
}

export function submitHealthCheckQuote(body, dependencies) {
  return submitAtPath('/api/health-check/quote', healthCheckKey, () => {
    if (body?.source !== 'health-check-form') return {error:{field:'source'}};
    return {body};
  }, dependencies);
}

export function submitQuoteAttempt(key, prepare, dependencies) {
  return submitAtPath('/api/quote', key, prepare, dependencies);
}

async function submitAtPath(path, key, prepare, {storage, newId, post, recordConversion}) {
  const previous = key === healthCheckKey ? readHealthCheckAttempt(storage) : readQuoteAttempt(storage, key);
  if (previous.status !== 'ready') return previous;
  const {body, error} = prepare();
  if (error) return {status:'invalid', ...error};

  let submissionId;
  try {
    submissionId = newId();
    if (typeof submissionId !== 'string' || !uuid.test(submissionId)) return {status:'unavailable'};
    // Set before the first await so a second click/remount sees the hold.
    if (key === healthCheckKey) {
      // The previous Airo handler blocks on this exact two-field record after rollback.
      storage.setItem(legacyHealthCheckKey, JSON.stringify({submissionId, inFlight:true}));
    }
    storage.setItem(key, JSON.stringify({status:'held', submissionId}));
  } catch { return {status:'unavailable'}; }

  const held = {status:'held', submissionId};
  try {
    const response = await post(path, {
      method:'POST', redirect:'error', credentials:'same-origin', mode:'same-origin',
      headers:{'Content-Type':'application/json'}, body:JSON.stringify({...body, submissionId}),
      signal:AbortSignal.timeout(15000),
    });
    if (response.status !== 201 || response.redirected ||
        response.headers.get('content-type')?.split(';')[0].trim().toLowerCase() !== 'application/json') return held;
    const receipt = await response.json();
    // An existing reference does not confirm that this form's details were saved.
    if (receipt?.ok !== true || receipt.submissionId !== submissionId || receipt.created !== true)
      return held;

    const saved = {status:'saved', submissionId};
    // An earlier held marker still prevents replay if this second write fails.
    try { storage.setItem(key, JSON.stringify(saved)); } catch { /* Keep the confirmed on-screen receipt. */ }
    void Promise.resolve().then(() => recordConversion?.()).catch(() => {});
    return saved;
  } catch { return held; }
}
