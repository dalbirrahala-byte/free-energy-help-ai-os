import assert from "node:assert/strict";
import test from "node:test";

import { evaluatePreviewDeliveryPolicy } from "./previewOtpDelivery.ts";

function withEnv(values: Record<string, string | undefined>, fn: () => void) {
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  try {
    for (const [key, value] of Object.entries(values)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
    fn();
  } finally {
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key];
      else process.env[key] = value;
    }
  }
}

test("preview defaults to echo mode when providers are absent", () => {
  withEnv({
    VERCEL_ENV: "preview",
    RESEND_API_KEY: undefined,
    OTP_EMAIL_FROM: undefined,
    OTP_PREVIEW_ECHO_CODE: undefined,
  }, () => {
    assert.equal(
      evaluatePreviewDeliveryPolicy({ channel: "EMAIL", destination: "test@example.com" }),
      "echo",
    );
  });
});

test("echo can be explicitly disabled", () => {
  withEnv({
    VERCEL_ENV: "preview",
    RESEND_API_KEY: undefined,
    OTP_EMAIL_FROM: undefined,
    OTP_PREVIEW_ECHO_CODE: "false",
  }, () => {
    assert.throws(
      () => evaluatePreviewDeliveryPolicy({ channel: "EMAIL", destination: "test@example.com" }),
      /otp_provider_not_configured/,
    );
  });
});

test("configured provider requires an allowlisted destination", () => {
  withEnv({
    VERCEL_ENV: "preview",
    RESEND_API_KEY: "test-key",
    OTP_EMAIL_FROM: "verify@example.com",
    OTP_PREVIEW_ALLOWED_EMAILS: "allowed@example.com",
  }, () => {
    assert.throws(
      () => evaluatePreviewDeliveryPolicy({ channel: "EMAIL", destination: "other@example.com" }),
      /preview_destination_not_allowlisted/,
    );
    assert.equal(
      evaluatePreviewDeliveryPolicy({ channel: "EMAIL", destination: "allowed@example.com" }),
      "provider",
    );
  });
});

test("production always fails closed", () => {
  withEnv({
    VERCEL_ENV: "production",
    OTP_PREVIEW_ECHO_CODE: "true",
  }, () => {
    assert.throws(
      () => evaluatePreviewDeliveryPolicy({ channel: "EMAIL", destination: "test@example.com" }),
      /preview_otp_delivery_disabled_in_production/,
    );
  });
});
