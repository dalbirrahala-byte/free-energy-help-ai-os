// Static router paths from the public build. Four industry forms use shorter
// submission tags than their URLs. Attribution does not select a CRM route.
const pagePaths = new Map([
  'business-gas-prices', 'business-energy-quotes', 'business-energy-contract-renewal',
  'business-energy-suppliers', 'british-gas-business', 'edf-business-energy', 'eon-next-business',
  'octopus-business-energy', 'scottishpower-business', 'totalenergies-business',
  'yu-energy-business', 'valda-energy-business', 'ovo-business-energy', 'pozitive-energy', 'industries',
].map(tag => [tag, '/' + tag]));
for (const sector of ['restaurants', 'takeaways', 'hotels', 'pubs']) {
  pagePaths.set('business-energy-' + sector, '/business-energy-for-' + sector);
}

// Call after preventDefault() and before setting the form's sending state.
// Scope this adapter to the business enquiry forms with name and company inputs.
export function prepareBusinessQuote(form, fields, source) {
  const {name, company, ...details} = fields;
  for (const [key, value, message] of [
    ['name', name, 'Please enter your name.'],
    ['company', company, 'Please enter your business name.'],
  ]) {
    if (typeof value === 'string' && value.trim()) continue;
    const input = form.elements.namedItem(key);
    input.setCustomValidity(message);
    input.addEventListener('input', () => input.setCustomValidity(''), {once:true});
    input.reportValidity();
    return null;
  }
  return {...details, contactName:name, businessName:company, source, sourcePage:pagePaths.get(source) ?? null};
}
