import { describe, test } from "node:test";
import assert from "node:assert/strict";
import { removeUnrequestedCriteria, validateScopeClaims } from "../src/lib/scope-quality";

const brief = "Customers book futsal courts and owners manage prices and bookings. Admins review owner onboarding. " +
  "No marketplace reviews, social networking, dynamic pricing, or a mobile app.";

describe("scope quality gate", () => {
  test("rejects explicit exclusions and optional add-ons missing from the brief", () => {
    const titles = [
      "Venue Feedback and Reviews Management",
      "Venue Social Media Links Management",
      "Peak Hour Pricing Configuration",
      "Promotions and Discounts Management",
      "Customer Loyalty Points",
      "Friend Referral Program",
      "Premium Venue Membership",
      "Booking History CSV Export",
      "Downloadable PDF Receipts",
      "Export Venue Reports",
      "Customer Notification Preferences",
      "Payment Reminders",
      "QR Code Check-in Scanning",
      "Walk-in Reservations",
      "Offline Cache for Bookings",
      "Staff ID Badges",
      "Native Mobile App",
    ];
    const issues = validateScopeClaims({
      brief,
      candidates: titles.map((text, index) => ({ path: `sub_features[${index}].title`, text })),
    });
    assert.equal(issues.length, titles.length);
    for (const [index, issue] of issues.entries()) assert.ok(issue.includes(`sub_features[${index}].title`));
  });

  test("catches feature leakage inside otherwise requested acceptance criteria", () => {
    const issues = validateScopeClaims({
      brief,
      candidates: [
        { path: "court_details", text: "Customers can see the court's rating and reviews." },
        { path: "search", text: "Customers can sort results by rating." },
        { path: "reports", text: "Venue owners can filter and export reports." },
        { path: "notifications", text: "Customers choose notification preferences for payment reminders." },
        { path: "checkin", text: "Staff check in arrivals by scanning a QR code." },
      ],
    });
    assert.equal(issues.length, 6);
  });

  test("drops an invented extra criterion only when enough grounded criteria remain", () => {
    const criteria = [
      "Customers can see court operating hours on the details page.",
      "Customers can see the required deposit before checkout.",
      "Customers can see the venue cancellation policy before paying.",
      "Customers can see the court rating and reviews.",
    ];
    assert.deepEqual(removeUnrequestedCriteria(criteria, { brief }, 3), criteria.slice(0, 3));
    assert.deepEqual(removeUnrequestedCriteria(criteria, { brief }, 4), criteria);
  });

  test("checks functional requirements and accepts genuinely requested capabilities", () => {
    const requested = "Customers can post venue reviews, follow social media links, pay peak-hour prices, " +
      "apply promotional discounts, earn loyalty points, use referral codes and memberships, " +
      "export bookings to CSV and PDF, book walk-in visits, read offline cached data, view staff ID badges, and use a mobile app.";
    const claims = [
      "Customers can post venue reviews after a match.",
      "Owners can configure peak-hour pricing for each court.",
      "Customers can export booking history to CSV.",
      "Staff can generate ID badges for on-site access.",
    ];
    assert.deepEqual(validateScopeClaims({
      brief: requested,
      candidates: claims.map((text, index) => ({ path: `requirements.fungsional[${index}]`, text })),
    }), []);
  });

  test("ordinary reviews, transactions, caching and UI badges are not treated as new features", () => {
    const claims = [
      "Administrators review owner onboarding and approve submitted venues.",
      "Customers review the booking total before paying a deposit.",
      "Customer reviews the booking total before payment.",
      "Staff can check in arrivals and mark no-shows.",
      "Cache available court slots briefly to reduce repeated requests.",
      "Show a notification badge when a booking status changes.",
      "Owners can download the receipt after a completed booking.",
      "Owners inspect bookings for quick review. Venue owners can open booking details in the dashboard.",
    ];
    assert.deepEqual(validateScopeClaims({
      brief,
      candidates: claims.map((text, index) => ({ path: `requirements.fungsional[${index}]`, text })),
    }), []);
  });

  test("staff authorization membership rows are distinct from paid membership products", () => {
    assert.deepEqual(validateScopeClaims({
      brief: "Venue owners invite staff and assign access to their courts.",
      candidates: [{ path: "database", text: "staff_memberships links a staff user to the venue_id and role." }],
    }), []);
    assert.ok(validateScopeClaims({
      brief: "Venue owners invite staff and assign access to their courts.",
      candidates: [{ path: "feature", text: "Customers can buy a membership plan for priority slots." }],
    }).length > 0);
  });

  test("does not turn a simple court price into unrequested pricing tiers", () => {
    const claim = [{ path: "requirements", text: "Owner can configure custom pricing tiers for each court." }];
    assert.ok(validateScopeClaims({ brief: "Owners set court prices and deposit rules.", candidates: claim }).length > 0);
    assert.deepEqual(validateScopeClaims({ brief: "Owners set court pricing tiers.", candidates: claim }), []);
  });

  test("rejects optional Pro padding found in a real booking outline", () => {
    const candidates = [
      "Booking History Export", "Search Result Map View", "Timeslot Hold Extension",
      "Analytics Data Alerts", "Moderation Note Template Library",
      "Two-Factor Authentication", "Booking Feedback Submission", "Export Metrics",
      "Metric Alerts", "Owner Daily Summary Report", "Manual Booking Creation",
      "Booking Calendar Integration", "Booking Status Batch Updates",
      "Listing Suspension Appeal", "Audit Log Integration with Third-Party Tools",
    ].map((text, index) => ({ path: `sub[${index}]`, text }));
    const issues = validateScopeClaims({ brief: "Customers book courts and view a map on each court page. Owners see revenue reports.", candidates });
    assert.equal(issues.length, candidates.length);
  });

  test("explicitly requested extras remain eligible", () => {
    const claims = ["Two-Factor Authentication", "Manual Booking Creation", "Export Metrics"];
    assert.deepEqual(validateScopeClaims({
      brief: "We need two-factor authentication, manual booking creation, and metric export for owners.",
      candidates: claims.map((text, index) => ({ path: `sub[${index}]`, text })),
    }), []);
  });

  test("review feature titles are distinct from a customer checking booking details", () => {
    const issues = validateScopeClaims({
      brief,
      candidates: [
        { path: "title", text: "Customer Reviews" },
        { path: "flow", text: "Customer reviews the booking details before payment." },
      ],
    });
    assert.equal(issues.length, 1);
    assert.ok(issues[0].includes("title"));
  });

  test("a confirmed answer can revise scope, including a short yes or no", () => {
    const candidates = [{ path: "sub_features[0].title", text: "Booking CSV Export" }];
    assert.equal(validateScopeClaims({ brief: "No CSV export.", candidates }).length, 1);
    assert.deepEqual(validateScopeClaims({
      brief: "No CSV export.",
      confirmedAnswers: [{ question: "Should customers be able to export bookings to CSV?", answer: "Yes" }],
      candidates,
    }), []);
    assert.equal(validateScopeClaims({
      brief: "Customers can export bookings to CSV.",
      confirmedAnswers: [{ question: "Should customers be able to export bookings to CSV?", answer: "No" }],
      candidates,
    }).length, 1);
  });

  test("does not flag negative requirements and catches a separate literal exclusion", () => {
    const candidates = [
      { path: "requirements.fungsional[0]", text: "Customers cannot post public reviews for courts." },
      { path: "requirements.fungsional[1]", text: "Customers cannot export booking history as CSV." },
      { path: "requirements.fungsional[2]", text: "Fans can create chat rooms for each court." },
    ];
    const issues = validateScopeClaims({ brief: `${brief} Do not add chat rooms.`, candidates });
    assert.equal(issues.length, 1);
    assert.ok(issues[0].includes("chat rooms"));
  });

  test("architecture can explain that a native mobile app is unnecessary", () => {
    const statements = [
      "This is a responsive website, not a native mobile app.",
      "A native mobile app is not required for this web release.",
      "A mobile application is not needed because customers use a browser.",
      "A native mobile app is out of scope.",
    ];
    for (const text of statements) {
      assert.deepEqual(validateScopeClaims({ brief: "Build a responsive booking website.", candidates: [{ path: "architecture", text }] }), [], text);
    }
  });

  test("a negative mention cannot hide an affirmative mobile capability", () => {
    const statements = [
      "A mobile app is not required. Build a native mobile app for customers.",
      "The mobile app is not only for customers; owners use it too.",
      "Do not add marketplace reviews. Customers can post venue reviews.",
    ];
    for (const text of statements) {
      assert.ok(validateScopeClaims({ brief: "Build a booking website.", candidates: [{ path: "architecture", text }] }).length > 0, text);
    }
  });

  test("affirmative and excluded capabilities in one clause do not cancel each other", () => {
    const issues = validateScopeClaims({
      brief: "No social networking, but include CSV export for owners.",
      candidates: [
        { path: "social", text: "Social Networking Feed" },
        { path: "csv", text: "Owner CSV Export" },
      ],
    });
    assert.equal(issues.length, 1);
    assert.ok(issues[0].includes("social"));
  });
});
