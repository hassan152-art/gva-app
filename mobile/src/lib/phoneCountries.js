/**
 * Phone country presets for masked national-number entry.
 * Digits-only storage; `format` produces the display string.
 */

export const DEFAULT_PHONE_COUNTRY_CODE = 'PK';

/** @typedef {{ code: string, dial: string, label: string, flag: string, placeholder: string, maxDigits: number, format: (digits: string) => string, isComplete: (digits: string) => boolean, toDisplayPhone: (digits: string) => string }} PhoneCountry */

/** @type {PhoneCountry[]} */
export const PHONE_COUNTRIES = [
  {
    code: 'PK',
    dial: '+92',
    label: 'Pakistan',
    flag: '🇵🇰',
    placeholder: '03xx xxx xxxx or 3xx xxx xxxx',
    maxDigits: 11,
    format(digits) {
      if (digits.startsWith('0')) {
        return [digits.slice(0, 4), digits.slice(4, 7), digits.slice(7, 11)].filter(Boolean).join(' ');
      }
      return [digits.slice(0, 3), digits.slice(3, 6), digits.slice(6, 10)].filter(Boolean).join(' ');
    },
    isComplete(digits) {
      if (digits.startsWith('0')) return digits.length === 11 && digits[1] === '3';
      return digits.length === 10 && digits.startsWith('3');
    },
    toDisplayPhone(digits) {
      const national = digits.startsWith('0') ? digits.slice(1) : digits;
      return `+92 ${national}`;
    },
  },
  {
    code: 'US',
    dial: '+1',
    label: 'United States',
    flag: '🇺🇸',
    placeholder: '(555) 555-5555',
    maxDigits: 10,
    format(digits) {
      const a = digits.slice(0, 3);
      const b = digits.slice(3, 6);
      const c = digits.slice(6, 10);
      if (digits.length <= 3) return a ? `(${a}` : '';
      if (digits.length <= 6) return `(${a}) ${b}`;
      return `(${a}) ${b}-${c}`;
    },
    isComplete(digits) {
      return digits.length === 10;
    },
    toDisplayPhone(digits) {
      return `+1 ${digits.slice(0, 3)} ${digits.slice(3, 6)} ${digits.slice(6)}`;
    },
  },
  {
    code: 'GB',
    dial: '+44',
    label: 'United Kingdom',
    flag: '🇬🇧',
    placeholder: '7xxx xxxxxx',
    maxDigits: 10,
    format(digits) {
      return [digits.slice(0, 4), digits.slice(4, 10)].filter(Boolean).join(' ');
    },
    isComplete(digits) {
      return digits.length === 10;
    },
    toDisplayPhone(digits) {
      return `+44 ${digits.slice(0, 4)} ${digits.slice(4)}`;
    },
  },
  {
    code: 'AE',
    dial: '+971',
    label: 'United Arab Emirates',
    flag: '🇦🇪',
    placeholder: '50 xxx xxxx',
    maxDigits: 9,
    format(digits) {
      return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean).join(' ');
    },
    isComplete(digits) {
      return digits.length === 9;
    },
    toDisplayPhone(digits) {
      return `+971 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    },
  },
  {
    code: 'SA',
    dial: '+966',
    label: 'Saudi Arabia',
    flag: '🇸🇦',
    placeholder: '5x xxx xxxx',
    maxDigits: 9,
    format(digits) {
      return [digits.slice(0, 2), digits.slice(2, 5), digits.slice(5, 9)].filter(Boolean).join(' ');
    },
    isComplete(digits) {
      return digits.length === 9;
    },
    toDisplayPhone(digits) {
      return `+966 ${digits.slice(0, 2)} ${digits.slice(2, 5)} ${digits.slice(5)}`;
    },
  },
];

export function getPhoneCountry(code) {
  return PHONE_COUNTRIES.find((c) => c.code === code) ?? PHONE_COUNTRIES[0];
}

/** Strip to digits and enforce per-country length cap. */
export function sanitizePhoneDigits(text, country) {
  let digits = String(text).replace(/\D/g, '');
  if (country.code === 'PK') {
    if (digits.startsWith('0')) return digits.slice(0, 11);
    return digits.slice(0, 10);
  }
  return digits.slice(0, country.maxDigits);
}

export function formatPhoneDisplay(digits, country) {
  if (!digits) return '';
  return country.format(digits);
}
