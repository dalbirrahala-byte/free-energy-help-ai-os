import assert from "node:assert/strict";
import test from "node:test";
import { buildDailyAssistantBrief } from "./dailyAssistant.ts";

test("morning brief prioritises overdue work before follow-ups and renewals", () => {
  const brief = buildDailyAssistantBrief({
    hourLocal: 8,
    priorityActions: [
      { id:"renewals-due", label:"3 renewals due within 90 days", count:3, href:"/customers", severity:"info" },
      { id:"follow-up-leads", label:"4 leads need follow-up", count:4, href:"/leads", severity:"warning" },
      { id:"overdue-tasks", label:"2 overdue tasks need attention", count:2, href:"/tasks", severity:"critical" },
    ],
    sourceState:{overdueTasksAvailable:true,followUpLeadsAvailable:true,renewalsAvailable:true},
  });
  assert.equal(brief.greeting,"Good morning, Free Energy Help");
  assert.equal(brief.headline,"9 items need attention from the available CRM data.");
  assert.equal(brief.topAction?.id,"overdue-tasks");
  assert.equal(brief.evidenceState,"LIVE_FACTS");
});

test("unavailable sources never manufacture counts", () => {
  const brief=buildDailyAssistantBrief({
    hourLocal:14,
    priorityActions:[],
    sourceState:{overdueTasksAvailable:false,followUpLeadsAvailable:true,renewalsAvailable:false},
  });
  assert.equal(brief.greeting,"Good afternoon, Free Energy Help");
  assert.equal(brief.evidenceState,"PARTIAL_FACTS");
  assert.match(brief.headline,/No attention items are currently proven/);
  assert.equal(brief.notes.length,2);
});

test("no sources produces an honest unavailable state", () => {
  const brief=buildDailyAssistantBrief({
    hourLocal:22,
    priorityActions:[],
    sourceState:{overdueTasksAvailable:false,followUpLeadsAvailable:false,renewalsAvailable:false},
  });
  assert.equal(brief.greeting,"Good evening, Free Energy Help");
  assert.equal(brief.evidenceState,"NO_FACTS");
  assert.equal(brief.headline,"Today's priorities are not available yet.");
});

test("invalid hour does not guess a daypart", () => {
  const brief=buildDailyAssistantBrief({
    hourLocal:99,
    priorityActions:[],
    sourceState:{overdueTasksAvailable:true,followUpLeadsAvailable:true,renewalsAvailable:true},
  });
  assert.equal(brief.greeting,"Hello, Free Energy Help");
});

test("equal severity is ordered by larger proven count", () => {
  const brief=buildDailyAssistantBrief({
    hourLocal:10,
    priorityActions:[
      {id:"a",label:"A",count:1,href:"/a",severity:"warning"},
      {id:"b",label:"B",count:5,href:"/b",severity:"warning"},
    ],
    sourceState:{overdueTasksAvailable:true,followUpLeadsAvailable:true,renewalsAvailable:true},
  });
  assert.equal(brief.topAction?.id,"b");
});
