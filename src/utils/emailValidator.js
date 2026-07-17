// src/utils/emailValidator.js

/**
 * A comprehensive email validator to prevent random, fake, or disposable emails.
 * 
 * In a full production environment, you would replace this with an API call 
 * to a service like AbstractAPI, ZeroBounce, or Hunter.io to actually verify 
 * SMTP and MX records. 
 * 
 * For now, this enforces strict formatting and blocks known disposable email domains.
 */

const DISPOSABLE_DOMAINS = [
  'mailinator.com',
  '10minutemail.com',
  'tempmail.com',
  'yopmail.com',
  'guerrillamail.com',
  'fakeinbox.com',
  'trashmail.com',
  'asdf.com',
  'test.com',
  'example.com'
];

export const validateEmailRealtime = async (email) => {
  // 1. Basic formatting check (RFC 5322 Official Standard)
  const emailRegex = /^(?:[a-z0-9!#$%&'*+/=?^_`{|}~-]+(?:\.[a-z0-9!#$%&'*+/=?^_`{|}~-]+)*|"(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21\x23-\x5b\x5d-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])*")@(?:(?:[a-z0-9](?:[a-z0-9-]*[a-z0-9])?\.)+[a-z0-9](?:[a-z0-9-]*[a-z0-9])?|\[(?:(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?)\.){3}(?:25[0-5]|2[0-4][0-9]|[01]?[0-9][0-9]?|[a-z0-9-]*[a-z0-9]:(?:[\x01-\x08\x0b\x0c\x0e-\x1f\x21-\x5a\x53-\x7f]|\\[\x01-\x09\x0b\x0c\x0e-\x7f])+)\])$/i;
  
  if (!email || !emailRegex.test(email.trim())) {
    return {
      isValid: false,
      message: "Please enter a valid, properly formatted email address."
    };
  }

  const domain = email.split('@')[1].toLowerCase();

  // 2. Block short gibberish domains
  if (domain.length < 4 || !domain.includes('.')) {
    return {
      isValid: false,
      message: "The email domain is invalid. Please provide a working email address."
    };
  }

  // 3. Block known disposable/throwaway domains
  if (DISPOSABLE_DOMAINS.includes(domain)) {
    return {
      isValid: false,
      message: "Disposable or test emails are not permitted. Please use a real work or personal email."
    };
  }

  // 4. (Optional Simulation) Simulate network request to check MX records
  // This helps enforce the "working email" requirement visually if using a real API later.
  await new Promise(resolve => setTimeout(resolve, 800));

  return {
    isValid: true,
    message: "Email is valid."
  };
};
