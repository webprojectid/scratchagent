import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { removeUnrequestedCriteria, scopeGuidance, validateScopeClaims } from "../src/lib/scope-quality";

const candidates = (...texts: string[]) => texts.map((text, index) => ({ path: `claims[${index}]`, text }));

describe("brief-first scope policy", () => {
  test("absence from the brief does not reject supporting capabilities", () => {
    assert.deepEqual(validateScopeClaims({
      brief: "Customers reserve courts and owners manage bookings.",
      candidates: candidates("Booking Reminders", "Owner Daily Summary Report", "Booking CSV Export", "Customer Notification Preferences", "Two-Factor Authentication"),
    }), []);
  });

  test("a rephrased reminder request cannot fail the plan", () => {
    assert.deepEqual(validateScopeClaims({
      brief: "Send confirmation plus a reminder one day before the reservation.",
      candidates: candidates("Booking and Payment Reminders", "Notification Scheduling"),
    }), []);
  });

  test("guidance prioritizes requested workflows and distinguishes supporting proposals", () => {
    const guidance = scopeGuidance();
    assert.match(guidance, /Preserve every requested actor, workflow, delivery platform/);
    assert.match(guidance, /label it as a supporting proposal rather than a user requirement/);
    assert.match(guidance, /Explicit exclusions and later user clarifications take priority/);
    assert.match(guidance, /Never replace requested capabilities/);
  });

  test("explicit exclusions still reject additions across titles and criteria", () => {
    const issues = validateScopeClaims({
      brief: "Build a booking website. No marketplace reviews, social networking, dynamic pricing, or a mobile app.",
      candidates: candidates("Venue Reviews", "Social Networking Feed", "Peak Hour Pricing", "Native Mobile App", "Owner Daily Summary Report"),
    });
    assert.equal(issues.length, 4);
    assert.ok(issues.every(issue => !issue.includes("claims[4]")));
  });

  test("a later short clarification can approve or reject a capability", () => {
    const claims = candidates("Booking CSV Export");
    assert.deepEqual(validateScopeClaims({ brief: "No CSV export.", confirmedAnswers: [{ question: "Allow CSV export?", answer: "Yes" }], candidates: claims }), []);
    assert.equal(validateScopeClaims({ brief: "Include CSV export.", confirmedAnswers: [{ question: "Allow CSV export?", answer: "No" }], candidates: claims }).length, 1);
    assert.equal(validateScopeClaims({ brief: "No CSV export.", confirmedAnswers: [{ question: "Allow CSV export?", answer: "Yes" }, { question: "Allow CSV export?", answer: "No" }], candidates: claims }).length, 1);
  });

  test("literal exclusions apply beyond the capability catalog", () => {
    assert.equal(validateScopeClaims({ brief: "Do not add chat rooms.", candidates: candidates("Customers can create chat rooms for their team.") }).length, 1);
    assert.deepEqual(validateScopeClaims({ brief: "Do not add chat rooms.", candidates: candidates("Customers cannot create chat rooms.") }), []);
  });

  test("a negative sentence cannot hide a later affirmative excluded feature", () => {
    assert.equal(validateScopeClaims({ brief: "No mobile app.", candidates: candidates("A mobile app is not required. Build a native mobile app for customers.") }).length, 1);
  });

  test("web architecture can explain why a native app is unnecessary", () => {
    for (const text of ["This is a website, not a native mobile app.", "A native mobile app is not required.", "A native mobile app is out of scope."]) {
      assert.deepEqual(validateScopeClaims({ brief: "No mobile app.", candidates: candidates(text) }), [], text);
    }
  });

  test("omission of a capability is not confused with checking existing data", () => {
    assert.deepEqual(validateScopeClaims({ brief: "No marketplace reviews.", candidates: candidates("Customer reviews the booking details before payment.", "Administrators review submitted venue applications.") }), []);
  });

  test("safety constraints and the next comma-separated action are not excluded features", () => {
    assert.deepEqual(validateScopeClaims({
      brief: "Reserve slots without double booking, pay a deposit, and receive reminders. No duplicate payments.",
      candidates: candidates("Booking Reminders", "Prevent double booking using an atomic reservation.", "Reject duplicate payments before applying changes.", "Customers pay a deposit to reserve a slot."),
    }), []);
  });

  test("prevention of an explicitly forbidden outcome is permitted", () => {
    assert.deepEqual(validateScopeClaims({ brief: "No overlapping reservations.", candidates: candidates("Prevent overlapping reservations at checkout.") }), []);
    assert.equal(validateScopeClaims({ brief: "No overlapping reservations.", candidates: candidates("Allow overlapping reservations at checkout.") }).length, 1);
  });

  test("criteria retain supporting details and remove only explicit conflicts", () => {
    const criteria = ["Customers see court opening hours.", "Customers receive booking reminders.", "Customers export booking history to CSV.", "Customers post venue reviews."];
    assert.deepEqual(removeUnrequestedCriteria(criteria, { brief: "Customers book courts. No marketplace reviews." }, 3), criteria.slice(0, 3));
    assert.deepEqual(removeUnrequestedCriteria(criteria, { brief: "Customers book courts." }, 3), criteria);
  });

  test("explicit exclusions override a proposal label", () => {
    assert.equal(validateScopeClaims({ brief: "No loyalty points.", candidates: candidates("Supporting proposal: Customers earn loyalty points after each booking.") }).length, 1);
  });
});
