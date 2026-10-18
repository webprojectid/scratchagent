import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { validateRequirementsDraft, type RequirementsDraft } from "../src/lib/requirements-quality";

const brief = "FutsalGo lets customers book futsal courts and owners manage availability. Court search should return within 2 seconds at p95 for 100 concurrent customers. The MVP excludes social sharing and reviews. No CSV/PDF export.";

function draft(): RequirementsDraft {
  return {
    user_flow: [
      { title: "Customer booking", steps: [
        "Customer filters courts by city, date, and available start time.",
        "Customer selects an open slot and confirms a booking after payment succeeds.",
        "If the slot becomes unavailable, checkout rejects it and shows another time.",
      ] },
      { title: "Owner availability", steps: [
        "Owner sets opening hours and blocks a court during maintenance.",
        "Owner sees the blocked period disappear from the public availability list.",
      ] },
    ],
    requirements: {
      fungsional: [
        "Customers can filter courts by city, date, and available start time.",
        "Customers can select a court and confirm an open timeslot after payment.",
        "Checkout rejects a slot that another customer booked during payment.",
        "Owners can update court opening hours and temporarily block a slot.",
        "Owners can inspect booking status and payment reference for each court.",
        "The API records cancellation requests against the relevant booking ID.",
      ],
      non_fungsional: [
        "Court search returns within 2 seconds at p95 with 100 concurrent customers.",
        "Row-level security prevents customers from reading another customer's bookings.",
        "Payment webhooks remain idempotent when a provider retries the same event.",
        "Admin changes are recorded in an audit log with actor ID and timestamp.",
      ],
    },
    tech_stack: [
      { name: "Next.js", desc: "Renders court search and booking pages for customers and owners." },
      { name: "Supabase", desc: "Stores court schedules, bookings, and owner access policies." },
    ],
  };
}

describe("requirements quality gate", () => {
  test("rejects bloated repeated requirement inventories", () => {
    const sample = draft();
    const requirements = sample.requirements as { fungsional: string[]; non_fungsional: string[] };
    requirements.fungsional = Array.from({ length: 21 }, (_, index) => `Customer can inspect court option ${index} before booking a timeslot.`);
    requirements.non_fungsional = Array.from({ length: 13 }, (_, index) => `The server rejects duplicate booking request ${index} using a unique slot constraint.`);
    const issues = validateRequirementsDraft(sample, { brief });
    assert.ok(issues.some((issue) => issue.includes("20 requirement")));
    assert.ok(issues.some((issue) => issue.includes("12 requirement")));
  });
  test("accepts specific flows, functional rules, and testable nonfunctional requirements", () => {
    assert.deepEqual(validateRequirementsDraft(draft(), { brief }), []);
  });

  test("reports missing collections, empty content, and duplicate entries", () => {
    const incomplete = draft();
    const flows = incomplete.user_flow as Array<{ title: string; steps: string[] }>;
    flows[1].title = flows[0].title;
    flows[0].steps[1] = flows[0].steps[0];
    const reqs = incomplete.requirements as { fungsional: string[]; non_fungsional: string[] };
    reqs.fungsional[2] = reqs.fungsional[1];
    reqs.fungsional[3] = "Done";
    const stack = incomplete.tech_stack as Array<{ name: string; desc: string }>;
    stack[1] = { name: "Next.js", desc: "TBD" };
    const issues = validateRequirementsDraft(incomplete);
    assert.ok(issues.some((issue) => issue.includes("user_flow.title") && issue.includes("duplikat")));
    assert.ok(issues.some((issue) => issue.includes("steps") && issue.includes("duplikat")));
    assert.ok(issues.some((issue) => issue.includes("fungsional") && issue.includes("duplikat")));
    assert.ok(issues.some((issue) => issue.includes("requirement harus")));
    assert.ok(issues.some((issue) => issue.includes("tech_stack") && issue.includes("duplikat")));
    assert.ok(issues.some((issue) => issue.includes("tech_stack") && issue.includes("peran")));
    assert.ok(validateRequirementsDraft({}).some((issue) => issue.includes("user_flow")));
  });

  test("rejects generic nonfunctional claims while preserving measurable ones", () => {
    const weak = draft();
    const nfr = (weak.requirements as { non_fungsional: string[] }).non_fungsional;
    nfr[0] = "The system must be responsive and provide a seamless user experience across devices.";
    nfr[1] = "The platform must be scalable to accommodate future growth and additional features.";
    nfr[2] = "The system must comply with relevant regulations and standards.";
    const issues = validateRequirementsDraft(weak);
    assert.equal(issues.filter((issue) => issue.includes("klaim kualitas masih umum")).length, 3);
    nfr[0] = "Court search must return within 2 seconds at p95 for 100 concurrent customers.";
    nfr[1] = "Booking records use row-level security to deny access to other customers.";
    nfr[2] = "The checkout announces invalid payment fields to screen readers before submission.";
    assert.deepEqual(validateRequirementsDraft(weak, { brief }), []);
  });

  test("rejects polished-sounding but untestable reliability claims", () => {
    const weak = draft();
    const nfr = (weak.requirements as { non_fungsional: string[] }).non_fungsional;
    nfr[0] = "All timestamps must be stored consistently across the platform.";
    nfr[1] = "The email service must send transactional emails reliably.";
    nfr[2] = "In-app notifications must arrive in a timely manner.";
    nfr[3] = "The map integration must display venue locations accurately.";
    assert.equal(validateRequirementsDraft(weak, { brief }).filter((issue) => issue.includes("klaim kualitas masih umum")).length, 4);
    nfr[0] = "Booking timestamps are stored as UTC TIMESTAMPTZ and displayed in Asia/Jakarta.";
    nfr[1] = "Failed transactional emails enter a retry queue and retain the provider event ID.";
    nfr[2] = "Notification delivery failures are recorded in an audit log with the recipient ID.";
    nfr[3] = "Venue map pins use stored latitude and longitude coordinates from owner listings.";
    assert.deepEqual(validateRequirementsDraft(weak, { brief }), []);
  });

  test("rejects features explicitly excluded by the brief but allows requirements that forbid them", () => {
    const bad = draft();
    const functional = (bad.requirements as { fungsional: string[] }).fungsional;
    functional[0] = "Customers can post reviews for courts after a completed booking.";
    functional[1] = "Customers can export booking history as a CSV file from their dashboard.";
    const flows = bad.user_flow as Array<{ title: string; steps: string[] }>;
    flows[0].steps[0] = "Customers use social sharing to send each court listing to friends.";
    const issues = validateRequirementsDraft(bad, { brief });
    assert.ok(issues.some((issue) => issue.includes("reviews")));
    assert.ok(issues.some((issue) => issue.includes("csv pdf export")));
    assert.ok(issues.some((issue) => issue.includes("social sharing")));

    functional[0] = "The application must not allow customers to post public reviews for courts.";
    functional[1] = "Booking history does not include CSV or PDF export for customers.";
    flows[0].steps[0] = "Customers cannot use social sharing from any court listing page.";
    assert.deepEqual(validateRequirementsDraft(bad, { brief }), []);
  });

  test("respects every item in a comma-separated do-not-invent list", () => {
    const excluded = "Scope is an MVP; do not invent marketplace reviews, social networking, dynamic pricing, or a mobile app.";
    const bad = draft();
    const functional = (bad.requirements as { fungsional: string[] }).fungsional;
    functional[0] = "Customers can post marketplace reviews for completed court bookings.";
    functional[1] = "Customers can join social networking groups for each venue.";
    functional[2] = "Venue owners can enable dynamic pricing for busy hours.";
    functional[3] = "Customers can use a mobile app to reserve a court.";
    const issues = validateRequirementsDraft(bad, { brief: excluded });
    for (const excludedTerm of ["marketplace reviews", "social networking", "dynamic pricing", "mobile app"]) {
      assert.ok(issues.some((issue) => issue.includes(excludedTerm)), `${excludedTerm} must be rejected`);
    }
  });

  test("a negative product rule does not reject its prevention requirement", () => {
    const constrained = draft();
    const functional = (constrained.requirements as { fungsional: string[] }).fungsional;
    functional[0] = "Checkout rejects overlapping slots when two customers book the same court.";
    assert.deepEqual(validateRequirementsDraft(constrained, {
      brief: `${brief} No overlapping slots during concurrent checkout.`,
    }), []);
  });

  test("flags invented time and performance guarantees even when they sound testable", () => {
    const invented = draft();
    const flows = invented.user_flow as Array<{ title: string; steps: string[] }>;
    flows[0].steps[1] = "Customer selects an open slot, which is held for 15 minutes before payment.";
    const reqs = invented.requirements as { fungsional: string[]; non_fungsional: string[] };
    reqs.fungsional[1] = "A selected court slot stays reserved for 15 minutes after checkout begins.";
    reqs.non_fungsional[1] = "Availability changes reach booking clients in under 1 second.";
    reqs.non_fungsional[2] = "The webhook responds within 2000ms after receiving a payment event.";
    const issues = validateRequirementsDraft(invented, { brief });
    assert.ok(issues.some((issue) => issue.includes("user_flow[0].steps[1]") && issue.includes("15 minutes")));
    assert.ok(issues.some((issue) => issue.includes("requirements.fungsional[1]") && issue.includes("15 minutes")));
    assert.ok(issues.some((issue) => issue.includes("requirements.non_fungsional[1]") && issue.includes("1 second")));
    assert.ok(issues.some((issue) => issue.includes("requirements.non_fungsional[2]") && issue.includes("2000ms")));
  });

  test("preserves user-supplied scope, unit-equivalent targets, and protocol identifiers", () => {
    const grounded = draft();
    const reqs = grounded.requirements as { fungsional: string[]; non_fungsional: string[] };
    reqs.fungsional[0] = "Owners can manage 7 courts in the launch configuration.";
    reqs.non_fungsional[0] = "Court search must complete within 2000ms at p95 for 100 concurrent users.";
    reqs.non_fungsional[1] = "The API returns HTTP 200 with dates in ISO-8601 and times in UTC+7.";
    reqs.non_fungsional[2] = "The audit endpoint includes a SHA-512 digest on each archived log entry.";
    assert.deepEqual(validateRequirementsDraft(grounded, { brief: `${brief} Launch scope has 7 courts.` }), []);
  });

  test("allows explicit proposals but not metrics in rejected clarification questions", () => {
    const proposed = draft();
    const reqs = proposed.requirements as { fungsional: string[]; non_fungsional: string[] };
    reqs.fungsional[0] = "Proposed, pending user confirmation: hold a selected slot for 15 minutes.";
    reqs.non_fungsional[1] = "Assumption to confirm: updates appear in under 1 second on the booking screen.";
    assert.deepEqual(validateRequirementsDraft(proposed, { brief }), []);

    reqs.fungsional[0] = "A selected slot stays reserved for 15 minutes after checkout begins.";
    const denied = validateRequirementsDraft(proposed, {
      brief,
      confirmedAnswers: [{ question: "Should the hold last 15 minutes?", answer: "No" }],
    });
    assert.ok(denied.some((issue) => issue.includes("15 minutes")));

    const approved = validateRequirementsDraft(proposed, {
      brief,
      confirmedAnswers: [{ question: "Should the hold last 15 minutes?", answer: "Yes" }],
    });
    assert.deepEqual(approved, []);
  });

  test("catches invented reference lengths and always-on claims in actual PRD phrasing", () => {
    const invented = draft();
    const flows = invented.user_flow as Array<{ title: string; steps: string[] }>;
    flows[0].steps[0] = "Staff finds a booking using an 8-character reference code.";
    const reqs = invented.requirements as { non_fungsional: string[] };
    reqs.non_fungsional[1] = "Booking and payment services remain available 24/7 for customers.";
    const issues = validateRequirementsDraft(invented, { brief });
    assert.ok(issues.some((issue) => issue.includes("8-character")));
    assert.ok(issues.some((issue) => issue.includes("24/7")));

    const supplied = `${brief} Booking references use 8 characters and booking service runs 24/7.`;
    assert.deepEqual(validateRequirementsDraft(invented, { brief: supplied }), []);
  });

  test("a clarification revision does not authorize the rejected number", () => {
    const revised = draft();
    const reqs = revised.requirements as { fungsional: string[] };
    const answers = [{ question: "Should checkout hold a slot for 15 minutes?", answer: "Yes, but use 10 minutes instead." }];
    reqs.fungsional[0] = "Checkout holds a selected slot for 15 minutes after it opens.";
    assert.ok(validateRequirementsDraft(revised, { brief, confirmedAnswers: answers })
      .some((issue) => issue.includes("15 minutes")));
    reqs.fungsional[0] = "Checkout holds a selected slot for 10 minutes after it opens.";
    assert.deepEqual(validateRequirementsDraft(revised, { brief, confirmedAnswers: answers }), []);

    const negativeAnswers = [{ question: "Should checkout hold a slot for 15 minutes?", answer: "No, use 10 minutes instead of 15." }];
    assert.deepEqual(validateRequirementsDraft(revised, { brief, confirmedAnswers: negativeAnswers }), []);
    reqs.fungsional[0] = "Checkout holds a selected slot for 15 minutes after it opens.";
    assert.ok(validateRequirementsDraft(revised, { brief, confirmedAnswers: negativeAnswers })
      .some((issue) => issue.includes("15 minutes")));
  });

  test("a proposed target does not excuse a separate hard target in the next sentence", () => {
    const mixed = draft();
    const reqs = mixed.requirements as { non_fungsional: string[] };
    reqs.non_fungsional[1] = "Proposed target: payment updates appear within 1 second. Webhooks must respond within 2000ms.";
    const issues = validateRequirementsDraft(mixed, { brief });
    assert.ok(!issues.some((issue) => issue.includes("1 second")));
    assert.ok(issues.some((issue) => issue.includes("2000ms")));
  });
});

test("equivalent worded reminder durations are grounded without new assumptions", () => {
  for (const source of ["Send a reminder one day before the booking.", "Send a reminder a day before the booking.", "Kirim pengingat sehari sebelum booking.", "Kirim pengingat H-1 sebelum booking.", "Send a D-1 reminder for the booking."]) {
    const sample = draft();
    (sample.requirements as { fungsional: string[] }).fungsional[0] = "Send the customer a reminder 24 hours before the booking starts.";
    assert.deepEqual(validateRequirementsDraft(sample, { brief: `${brief} ${source}` }), [], source);
  }
});

test("reminder timing remains separate from checkout holds and changed durations", () => {
  const sample = draft();
  const reqs = sample.requirements as { fungsional: string[] };
  reqs.fungsional[0] = "Checkout keeps the selected slot on hold for 24 hours.";
  assert.ok(validateRequirementsDraft(sample, { brief: `${brief} Send a reminder one day before booking.` }).some(issue => issue.includes("24 hours")));
  reqs.fungsional[0] = "Send the customer a reminder 48 hours before the booking starts.";
  assert.ok(validateRequirementsDraft(sample, { brief: `${brief} Send a reminder one day before booking.` }).some(issue => issue.includes("48 hours")));
});

test("querying reminder records does not make a reminder duration a search latency", () => {
  const sample = draft();
  const flows = sample.user_flow as Array<{ title: string; steps: string[] }>;
  flows[0].steps[0] = "The worker queries confirmed reservations starting 24 hours away that lack a recorded reminder timestamp.";
  (sample.requirements as { non_fungsional: string[] }).non_fungsional[1] = "The interface is responsive at 360px width with minimum touch target dimensions of 44 pixels and no horizontal overflow.";
  assert.deepEqual(validateRequirementsDraft(sample, { brief: `${brief} Send a reminder one day before the reservation.` }), []);
});
