// Use the form's static source slug and the current tab's sessionStorage.
// On mount, display the stored reference if present. Keep a held form intact.
import {readQuoteAttempt, submitQuoteAttempt} from '../homepage-attempt.mjs';
import {prepareBusinessQuote} from './business-quote-body.mjs';

function storageKey(page) {
  return 'feh.business-quote.v1.' + page;
}

export function readBusinessAttempt(storage, page) {
  return readQuoteAttempt(storage, storageKey(page));
}

export async function submitBusinessQuote(form, fields, page, dependencies) {
  const prior = readBusinessAttempt(dependencies.storage, page);
  if (prior.status !== 'ready') return {...prior, existing:true};
  return submitQuoteAttempt(storageKey(page), () => {
    const body = prepareBusinessQuote(form, fields, page);
    return body ? {body} : {error:{}};
  }, dependencies);
}
