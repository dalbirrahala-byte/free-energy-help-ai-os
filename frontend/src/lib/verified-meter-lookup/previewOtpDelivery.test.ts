import assert from "node:assert/strict";
import test from "node:test";

import { deliverPreviewOtp, evaluatePreviewDeliveryPolicy } from "./previewOtpDelivery.ts";

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

test("SMS delivery is allowlisted, bounded, redacted and never retried", async () => {
  const values = {
    VERCEL_ENV: "preview",
    TELNYX_API_KEY: "synthetic-test-key",
    TELNYX_MESSAGING_FROM: "+447700900001",
    OTP_PREVIEW_ALLOWED_PHONES: "07700900002",
  };
  const previous = Object.fromEntries(Object.keys(values).map((key) => [key, process.env[key]]));
  const previousFetch = globalThis.fetch;
  let calls = 0;
  let status = 200;
  let throws = false;
  let body: unknown;
  const messageId = "12345678-1234-1234-1234-123456789abc";
  try {
    Object.assign(process.env, values);
    globalThis.fetch = async (url, init) => {
      calls++;
      assert.equal(url, "https://api.telnyx.com/v2/messages");
      assert.equal(init?.method, "POST");
      assert.equal(init?.redirect, "error");
      assert.equal(init?.cache, "no-store");
      assert.ok(init?.signal instanceof AbortSignal);
      assert.deepEqual(JSON.parse(String(init?.body)), {
        from: values.TELNYX_MESSAGING_FROM, to: "+447700900002", type: "SMS",
        text: "Free Energy Help verification code: 123456. It expires shortly. If you did not request it, ignore this message.",
      });
      if (throws) throw new Error("private provider detail and secret");
      return new Response(JSON.stringify(body), { status });
    };
    const input = { channel: "SMS" as const, destination: "07700900002", code: "123456" };
    await assert.rejects(deliverPreviewOtp({ ...input, destination: "07700900003" }), /not_allowlisted/);
    await assert.rejects(deliverPreviewOtp({ ...input, code: "12345" }), /invalid_otp_code/);
    assert.equal(calls, 0);

    body = { data: { id: messageId, record_type: "message", direction: "outbound", type: "SMS",
      from: { phone_number: values.TELNYX_MESSAGING_FROM }, to: [{ phone_number: "+447700900002", status: "queued" }], errors: [] } };
    assert.deepEqual(await deliverPreviewOtp(input), { channel: "SMS", mode: "provider", providerReference: messageId });
    assert.equal(calls, 1);

    for (const fixture of [{ status: 200, body: {} }, { status: 401, body: { error: "secret" } }, { status: 500, body: null }]) {
      status = fixture.status; body = fixture.body;
      const before: number = calls;
      await assert.rejects(deliverPreviewOtp(input), { message: "otp_sms_submission_indeterminate_check_telnyx_before_retry" });
      assert.equal(calls, before + 1);
    }
    throws = true;
    const before: number = calls;
    await assert.rejects(deliverPreviewOtp(input), { message: "otp_sms_submission_indeterminate_check_telnyx_before_retry" });
    assert.equal(calls, before + 1);

    process.env.VERCEL_ENV = "production";
    await assert.rejects(deliverPreviewOtp(input), /disabled_in_production/);
    assert.equal(calls, before + 1);
  } finally {
    globalThis.fetch = previousFetch;
    for (const [key, value] of Object.entries(previous)) {
      if (value === undefined) delete process.env[key]; else process.env[key] = value;
    }
  }
});
