import assert from "node:assert/strict";
import { test } from "node:test";
import { buildEnquiryInbox, type EnquiryInboxInput } from "./enquiryInbox.ts";

const TODAY = "2026-10-29";
const lead = (patch: Partial<EnquiryInboxInput> = {}): EnquiryInboxInput => ({
  id: 1,
  company_name: "Synthetic Business",
  status: "New",
  lead_source: "meta_ads",
  lead_owner: null,
  next_action: "Review enquiry and assign follow-up",
  follow_up_required: true,
  follow_up_date: null,
  created_at: "2026-10-28T12:00:00Z",
  ...patch,
});

test("new Meta lead without owner or date is visible immediately, not after 14 days", () => {
  const inbox = buildEnquiryInbox([lead()], TODAY);
  assert.equal(inbox.count, 1);
  assert.equal(inbox.items[0].ownerLabel, "Unassigned");
  assert.deepEqual(inbox.items[0].reasons, ["unassigned_owner", "missing_follow_up_date", "new_enquiry"]);
  assert.equal(inbox.items[0].sourceLabel, "meta_ads");
});

test("overdue follow-up outranks other attention signals; ISO key uses no timezone guess", () => {
  const inbox = buildEnquiryInbox([
    lead({id:1, follow_up_date:null}),
    lead({id:2, follow_up_date:"2026-10-28", lead_owner:"Approved staff"}),
    lead({id:3, follow_up_date:TODAY, lead_owner:"Approved staff"}),
  ], TODAY);
  assert.deepEqual(inbox.items.map(x=>x.id), [2,3,1]);
  assert.equal(inbox.items[0].reasons[0], "overdue_follow_up");
  assert.equal(inbox.items[1].reasons[0], "follow_up_due_today");
});

test("future follow-up is not incorrectly presented as due", () => {
  const result = buildEnquiryInbox([lead({status:"Contacted",lead_owner:"Approved",next_action:"Call next week",follow_up_date:"2026-11-01"})], TODAY);
  assert.equal(result.count, 0);
});

test("won and lost leads are omitted even if owner missing", () => {
  const result = buildEnquiryInbox([lead({status:"Won"}),lead({id:2,status:"Lost"})], TODAY);
  assert.equal(result.count, 0);
});

test("missing owner or next action is surfaced even without a due date", () => {
  const result = buildEnquiryInbox([lead({status:"Contacted",follow_up_required:false,follow_up_date:null,next_action:null})], TODAY);
  assert.equal(result.count, 1);
  assert.deepEqual(result.items[0].reasons, ["unassigned_owner", "missing_next_action"]);
});

test("explicit false follow-up flag is not quietly upgraded to scheduled", () => {
  const result = buildEnquiryInbox([lead({status:"Contacted",lead_owner:"Approved",next_action:"Reviewed",follow_up_required:false,follow_up_date:"2026-10-25"})], TODAY);
  assert.equal(result.count, 0);
});

test("invalid follow-up date triggers scheduling review without overdue claim", () => {
  const result = buildEnquiryInbox([lead({status:"Contacted",lead_owner:"Approved",next_action:"Call",follow_up_date:"2026-02-30"})], TODAY);
  assert.deepEqual(result.items[0].reasons, ["missing_follow_up_date"]);
  assert.equal(result.items[0].followUpDate, null);
});

test("does not invent missing company, source, owner or next action", () => {
  const result = buildEnquiryInbox([lead({company_name:null,lead_source:null,lead_owner:" ",next_action:" ",status:null})], TODAY);
  assert.equal(result.items[0].companyName,"Company not recorded");
  assert.equal(result.items[0].sourceLabel,"Source not recorded");
  assert.deepEqual(result.items[0].reasons,["unassigned_owner","missing_follow_up_date","new_enquiry","missing_next_action"]);
});

test("stable ordering and eight-item display cap while count covers all qualifying rows", () => {
  const rows = Array.from({length:12}, (_,i)=>lead({id:12-i}));
  const result = buildEnquiryInbox(rows,TODAY);
  assert.equal(result.count,12);
  assert.deepEqual(result.items.map(x=>x.id),[1,2,3,4,5,6,7,8]);
});

test("repeated and malformed IDs cannot create duplicate work items", () => {
  const result = buildEnquiryInbox([lead(),lead({company_name:"Changed"}),lead({id:0}),lead({id:2.2})], TODAY);
  assert.equal(result.count,1);
});

test("bad today and invalid limits reject rather than guessing", () => {
  assert.throws(()=>buildEnquiryInbox([lead()],"2026-02-31"),/invalid_today_key/);
  assert.throws(()=>buildEnquiryInbox([lead()],TODAY,0),/invalid_inbox_limit/);
});

test("no customer contact details or contact authorization escape the inbox output", () => {
  const result = buildEnquiryInbox([lead()], TODAY);
  assert.deepEqual(Object.keys(result.items[0]).sort(),["companyName","followUpDate","id","ownerLabel","priority","reasons","sourceLabel"].sort());
  assert.equal((result.items[0] as unknown as {executionAllowed?: boolean}).executionAllowed, undefined);
});

test("literal Unassigned owner is not treated as an actual staff member", () => {
  const result = buildEnquiryInbox([lead({ lead_owner: "Unassigned", status: "Contacted", next_action: "Call", follow_up_required: false })], TODAY);
  assert.equal(result.items[0].ownerLabel, "Unassigned");
  assert.deepEqual(result.items[0].reasons, ["unassigned_owner"]);
});
