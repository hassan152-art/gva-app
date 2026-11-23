const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

/**
 * Client-side sign-up validation (mirrors backend rules in auth.js).
 * @returns {Record<string, string>}
 */
export function validateSignUpForm({ fullName, email, phoneCountry, phoneDigits, password, confirm, consent }) {
  const errors = {};

  const name = fullName?.trim() ?? '';
  if (!name) errors.fullName = 'Enter your full name';
  else if (name.length < 2) errors.fullName = 'Use at least 2 characters';

  const mail = email?.trim() ?? '';
  if (!mail) errors.email = 'Enter your email address';
  else if (!EMAIL_RE.test(mail)) errors.email = 'Enter a valid email address';

  const digits = phoneDigits ?? '';
  if (!digits) errors.phone = 'Enter your phone number';
  else if (!phoneCountry?.isComplete(digits)) {
    errors.phone =
      phoneCountry?.code === 'PK'
        ? 'Enter a valid mobile number (03xx… or 3xx… without the leading 0)'
        : `Enter a complete ${phoneCountry.label} number`;
  }

  if (!password) errors.password = 'Choose a password';
  else if (password.length < 8 || !/\d/.test(password)) {
    errors.password = 'At least 8 characters, with a number';
  }

  if (!confirm) errors.confirm = 'Confirm your password';
  else if (password !== confirm) errors.confirm = 'Passwords do not match';

  if (!consent) errors.consent = 'Accept the Terms of Service and Privacy Policy';

  return errors;
}

export function firstValidationMessage(errors) {
  const order = ['fullName', 'email', 'phone', 'password', 'confirm', 'consent'];
  for (const key of order) {
    if (errors[key]) return errors[key];
  }
  return null;
}
