import assert from "node:assert/strict";
import test from "node:test";
import { classifyTelnyxSmsResult, type TelnyxSmsRequest } from "./telnyxSmsResult.ts";

const request: TelnyxSmsRequest = { from: "+447700900001", to: "+447700900002", text: "Test", type: "SMS" };
const id = "12345678-1234-1234-1234-123456789abc";
function response() {
  return { data: { id, record_type: "message", direction: "outbound", type: "SMS", from: { phone_number: request.from },
    to: [{ phone_number: request.to, status: "queued" }], errors: [] as unknown[] } };
}

test("queued SMS is accepted submission with a reference, not proof of delivery", () => {
  assert.deepEqual(classifyTelnyxSmsResult({ outcome: "response", httpStatus: 200, body: response() }, request),
    { status: "success", providerReference: id });
});

for (const status of [400, 401, 403, 408, 409, 422, 429, 500, 503, 302, NaN]) {
  test(`HTTP ${status} cannot authorize a resend`, () => {
    assert.deepEqual(classifyTelnyxSmsResult({ outcome: "response", httpStatus: status, body: response() }, request),
      { status: "indeterminate" });
  });
}

test("transport uncertainty is not a definitive failure", () => {
  assert.deepEqual(classifyTelnyxSmsResult({ outcome: "transport_error" }, request), { status: "indeterminate" });
});

for (const [name, change] of Object.entries({
  "missing ID": (body: ReturnType<typeof response>) => { body.data.id = ""; },
  "arbitrary reference": (body: ReturnType<typeof response>) => { body.data.id = "secret-containing error"; },
  "different sender": (body: ReturnType<typeof response>) => { body.data.from.phone_number = request.to; },
  "different recipient": (body: ReturnType<typeof response>) => { body.data.to[0].phone_number = request.from; },
  "multiple recipients": (body: ReturnType<typeof response>) => { body.data.to.push(body.data.to[0]); },
  "failed delivery": (body: ReturnType<typeof response>) => { body.data.to[0].status = "delivery_failed"; },
  "unknown status": (body: ReturnType<typeof response>) => { body.data.to[0].status = "mystery"; },
  "provider errors": (body: ReturnType<typeof response>) => { body.data.errors = [{ detail: "private provider error" }]; },
  "inbound message": (body: ReturnType<typeof response>) => { body.data.direction = "inbound"; },
  "wrong message type": (body: ReturnType<typeof response>) => { body.data.type = "MMS"; },
})) {
  test(`${name} stays indeterminate without leaking response data`, () => {
    const body = response(); change(body);
    assert.deepEqual(classifyTelnyxSmsResult({ outcome: "response", httpStatus: 200, body }, request), { status: "indeterminate" });
  });
}

for (const body of [null, {}, [], { data: null }, { data: { id } }]) {
  test(`malformed success body ${JSON.stringify(body)} is indeterminate`, () => {
    assert.deepEqual(classifyTelnyxSmsResult({ outcome: "response", httpStatus: 200, body }, request), { status: "indeterminate" });
  });
}
