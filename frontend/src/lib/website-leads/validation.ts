import { RENEWAL_TIMING_OPTIONS } from "./constants";
import type {
  WebsiteLeadFormErrors,
  WebsiteLeadFormInput,
  RenewalTimingValue,
} from "./types";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export function validateWebsiteLeadForm(
  input: WebsiteLeadFormInput,
): WebsiteLeadFormErrors {
  const errors: WebsiteLeadFormErrors = {};

  if (!input.businessName.trim()) {
    errors.businessName = "Enter your business name.";
  }

  if (!input.contactName.trim()) {
    errors.contactName = "Enter a contact name.";
  }

  const telephone = input.telephone.replace(/\s/g, "");
  if (!telephone) {
    errors.telephone = "Enter a telephone number.";
  } else if (telephone.length < 10) {
    errors.telephone = "Enter a valid UK telephone number.";
  }

  const email = input.email.trim();
  if (!email) {
    errors.email = "Enter an email address.";
  } else if (!EMAIL_PATTERN.test(email)) {
    errors.email = "Enter a valid email address.";
  }

  if (!input.postcode.trim()) {
    errors.postcode = "Enter your business postcode.";
  }

  const validTiming = RENEWAL_TIMING_OPTIONS.some(
    (option) => option.value === input.renewalTiming,
  );
  if (!input.renewalTiming || !validTiming) {
    errors.renewalTiming = "Select when your contract renews.";
  }

  if (!input.consent) {
    errors.consent = "Consent is required so we can contact you about your enquiry.";
  }

  return errors;
}

export function isValidRenewalTiming(value: string): value is RenewalTimingValue {
  return RENEWAL_TIMING_OPTIONS.some((option) => option.value === value);
}

export function hasFormErrors(errors: WebsiteLeadFormErrors): boolean {
  return Object.keys(errors).length > 0;
}
