// The private page a customer opens to view, approve or pay.
export const customerLink = w => `${location.origin}${location.pathname}#/q/${w.token}`;
export const validEmail = e => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(e || '');
