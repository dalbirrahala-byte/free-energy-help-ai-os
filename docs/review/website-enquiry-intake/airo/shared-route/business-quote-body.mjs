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
  return {...details, contactName:name, businessName:company, source};
}
