import { ENERGY_SUPPLY_OPTIONS, RENEWAL_TIMING_OPTIONS } from "./constants.ts";
import type {
  WebsiteLeadFormErrors,
  WebsiteLeadFormInput,
  RenewalTimingValue,
} from "./types.ts";

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const UK_TELEPHONE_PATTERN = /^(?:\+44|0)[0-9 ()-]{9,18}$/;
const ISO_DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

export function isValidIsoCalendarDate(value: string): boolean {
  if (!ISO_DATE_PATTERN.test(value)) return false;
  const [year, month, day] = value.split("-").map(Number);
  const date = new Date(Date.UTC(year, month - 1, day));
  return date.getUTCFullYear() === year
    && date.getUTCMonth() === month - 1
    && date.getUTCDate() === day;
}

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

  const telephone = input.telephone.trim();
  if (!telephone) {
    errors.telephone = "Enter a telephone number.";
  } else if (!UK_TELEPHONE_PATTERN.test(telephone) || telephone.replace(/\D/g, "").length < 10) {
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

  const validSupply = ENERGY_SUPPLY_OPTIONS.some((option) => option.value === input.energySupply);
  if (!input.energySupply || !validSupply) {
    errors.energySupply = "Select whether your enquiry is about electricity, gas or both.";
  }

  const painPoint = input.painPoint.trim();
  if (!painPoint) {
    errors.painPoint = "Tell us what you would like help with.";
  } else if (painPoint.length > 160) {
    errors.painPoint = "Keep your enquiry details to 160 characters or fewer.";
  }

  if (input.contractEndDate && !isValidIsoCalendarDate(input.contractEndDate)) {
    errors.contractEndDate = "Enter a valid contract end date, or leave it blank if unknown.";
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
