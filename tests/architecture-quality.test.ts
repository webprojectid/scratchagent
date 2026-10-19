import { describe, test } from "node:test";
import assert from "node:assert/strict";
import {
  validateArchitectureDraft,
  validateDatabaseSchemaDraft,
} from "../src/lib/architecture-quality";

const bookingBrief = `Build a web app where customers search futsal courts by city, surface, date and time.
Venue owners configure recurring opening hours, block maintenance time, set prices and deposits.
Customers reserve a slot during checkout, pay by QRIS through a gateway and receive a receipt.
Prevent double-booking during concurrent checkout. Verify payment provider webhooks and make
duplicate callbacks safe. Staff check in arrivals but cannot edit owner prices. Administrators
moderate venues. Enforce roles on the server. Store timestamps consistently and display schedules
in Asia/Jakarta. Customers may cancel or reschedule according to each venue's policy.`;

const specificArchitecture = `Customers search courts by city and surface, then open a venue's availability grid.
The checkout API creates a held reservation with hold_owner_id and hold_expires_at in a short
database transaction. A PostgreSQL exclusion constraint on the court and occupied time range
rejects simultaneous overlapping holds or confirmed bookings; expiry is persisted, never kept as
an open row lock. The server checks the slot again when a customer starts payment.

The gateway webhook handler verifies the signed callback before changing a payment or booking.
It inserts the provider event ID into a unique webhook_events table in the same transaction as
the booking status transition, making duplicate callbacks idempotent. A failed payment releases
the held court slot after the expiry check.

The server enforces owner and staff permissions against venue ownership before price edits or
check-in. All booking instants are stored in UTC, and venue hours and customer schedules are
converted to Asia/Jakarta at input and display boundaries.`;

const specificSchema = `### bookings
- id UUID PRIMARY KEY, court_id UUID REFERENCES courts(id), customer_id UUID REFERENCES users(id)
- hold_owner_id UUID REFERENCES users(id), hold_expires_at TIMESTAMPTZ
- starts_at TIMESTAMPTZ, ends_at TIMESTAMPTZ, status TEXT CHECK (status IN ('held','confirmed','cancelled'))
- EXCLUDE USING gist (court_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE status IN ('held','confirmed') prevents two active bookings of one court at the same time.
### webhook_events
- provider_event_id TEXT UNIQUE NOT NULL, payment_id UUID REFERENCES payments(id), processed_at TIMESTAMPTZ.
  Insert the event ID and transition the related booking in one transaction.
### venues
- id UUID PRIMARY KEY, owner_id UUID REFERENCES users(id), timezone_id TEXT DEFAULT 'Asia/Jakarta'.
### staff_permissions
- venue_id UUID REFERENCES venues(id), user_id UUID REFERENCES users(id), role TEXT.
  RLS policy scopes price writes to venues.owner_id and check-ins to permitted staff.
Store instants as UTC TIMESTAMPTZ; interpret recurring local hours with the venue's IANA timezone.`;

describe("architecture quality gates", () => {
  test("accepts mechanisms grounded in a detailed booking brief", () => {
    assert.deepEqual(validateArchitectureDraft(specificArchitecture, { brief: bookingBrief }), []);
    assert.deepEqual(validateDatabaseSchemaDraft(specificSchema, { brief: bookingBrief }), []);
  });

  test("rejects a repetitive catalog of framework names without critical flows", () => {
    const generic = `The application is built using a frontend framework and a hosted database.
The architecture is designed to handle concurrent checkouts and role-based access control.
The application will be built using a frontend framework and a hosted database.
The architecture is designed to handle concurrent checkouts and role-based access control.
The application will be built using a frontend framework and a hosted database.
The architecture is designed to handle concurrent checkouts and role-based access control.
This provides a scalable and reliable environment for payment processing and schedules.`;
    const issues = validateArchitectureDraft(generic, { brief: bookingBrief });
    assert.ok(issues.some((issue) => issue.includes("boilerplate")));
    assert.ok(issues.some((issue) => issue.includes("atomic operation")));
    assert.ok(issues.some((issue) => issue.includes("signed payment")));
    assert.ok(issues.some((issue) => issue.includes("display timezone")));
  });

  test("rejects a table inventory with no durable hold, slot constraint or webhook event key", () => {
    const inventory = `### users: id UUID PRIMARY KEY, email TEXT UNIQUE, role TEXT.
### courts: id UUID PRIMARY KEY, venue_id UUID, start_time TIMESTAMPTZ.
### time_slots: id UUID PRIMARY KEY, court_id UUID, start_time TIMESTAMPTZ,
end_time TIMESTAMPTZ, status TEXT (available, held, booked).
### bookings: id UUID PRIMARY KEY, user_id UUID, time_slot_id UUID,
booking_code TEXT UNIQUE, payment_status TEXT, created_at TIMESTAMPTZ.
### payments: id UUID PRIMARY KEY, booking_id UUID, transaction_id TEXT UNIQUE.
### staff_permissions: venue_id UUID, user_id UUID, role TEXT.`;
    const issues = validateDatabaseSchemaDraft(inventory, { brief: bookingBrief });
    assert.ok(issues.some((issue) => issue.includes("persist a checkout hold")));
    assert.ok(issues.some((issue) => issue.includes("unique or exclusion rule")));
    assert.ok(issues.some((issue) => issue.includes("unique callback event key")));
    assert.ok(issues.some((issue) => issue.includes("schedule timezone")));
    assert.ok(issues.some((issue) => issue.includes("authorization boundary")));
  });

  test("rejects a minutes-long transaction lock as a checkout hold", () => {
    const broken = `${specificArchitecture}\nKeep a database row lock for 15 minutes while the customer pays.`;
    assert.ok(validateArchitectureDraft(broken, { brief: bookingBrief })
      .some((issue) => issue.includes("row lock must last only for the transaction")));
  });

  test("accepts canonical unique slot rows and conditional state transitions", () => {
    const alternative = `### time_slots
- id UUID PRIMARY KEY, court_id UUID, starts_at TIMESTAMPTZ, status TEXT,
  hold_user_id UUID REFERENCES users(id), hold_expires_at TIMESTAMPTZ.
- UNIQUE (court_id, starts_at). An UPDATE time_slots SET status = 'held'
  WHERE id = ? AND status = 'available' RETURNING id is the only path from free to held.
### payments
- id UUID PRIMARY KEY, booking_id UUID, transaction_id TEXT UNIQUE, status TEXT.
- For duplicate webhooks, UPDATE payments SET status = 'paid'
  WHERE id = ? AND status = 'pending' RETURNING id; only the returning row drives booking confirmation.
### venues
- id UUID PRIMARY KEY, owner_id UUID REFERENCES users(id), timezone_id TEXT DEFAULT 'Asia/Jakarta'.
### staff_permissions
- user_id UUID, venue_id UUID, role TEXT; RLS policy checks venue ownership on writes.
All stored instants use UTC TIMESTAMPTZ before converting display schedules to the venue timezone.`;
    assert.deepEqual(validateDatabaseSchemaDraft(alternative, { brief: bookingBrief }), []);
  });

  test("reads hold owner and expiry from multiline hold table fields", () => {
    const separatedHolds = specificSchema.replace(
      "- hold_owner_id UUID REFERENCES users(id), hold_expires_at TIMESTAMPTZ",
      "- hold_id UUID REFERENCES booking_holds(id)",
    ) + `\n### booking_holds
- id UUID PRIMARY KEY
- court_id UUID REFERENCES courts(id)
- user_id UUID REFERENCES users(id)
- expires_at TIMESTAMPTZ NOT NULL
- status TEXT CHECK (status IN ('active','expired','converted'))`;
    assert.deepEqual(validateDatabaseSchemaDraft(separatedHolds, { brief: bookingBrief }), []);
  });

  test("reads customer and hold expiry from a long SQL bookings table", () => {
    const sql = `CREATE TABLE bookings (
      id UUID PRIMARY KEY,
      customer_id UUID NOT NULL REFERENCES users(id),
      court_id UUID NOT NULL,
      ${Array.from({ length: 25 }, (_, index) => `field_${index} TEXT,`).join("\n")}
      hold_expires_at TIMESTAMPTZ,
      status TEXT
    );\n${specificSchema}`;
    assert.deepEqual(validateDatabaseSchemaDraft(sql, { brief: bookingBrief }), []);
  });

  test("rejects invented venue-policy defaults but permits labeled proposals", () => {
    const invented = `${specificSchema}\n- hold_duration_minutes INT DEFAULT 10\n- cancellation_refund_percentage NUMERIC DEFAULT 50.00`;
    assert.ok(validateDatabaseSchemaDraft(invented, { brief: bookingBrief })
      .some((issue) => issue.includes("business-policy durations")));
    const proposed = `${specificSchema}\n- hold_duration_minutes INT DEFAULT 10 -- proposed assumption, confirm with venue owner`;
    assert.deepEqual(validateDatabaseSchemaDraft(proposed, { brief: bookingBrief }), []);
  });

  test("does not demand booking, payments or RBAC from an unrelated short brief", () => {
    const brief = "A personal portfolio showing paintings and artist statements.";
    const architecture = `The public page presents image thumbnails from an object store and keeps
large originals outside the HTML response. An image manifest records the alt text, media
dimensions and order for each painting. The build creates static pages from that manifest;
invalid file references fail the build instead of leaving a broken gallery. A visitor can open
a painting detail page, move between adjacent works and read the artist statement.`;
    const schema = `### paintings
- id UUID PRIMARY KEY, title TEXT NOT NULL, image_path TEXT NOT NULL,
  alt_text TEXT NOT NULL, display_order INT UNIQUE, width INT, height INT.
### statements
- id UUID PRIMARY KEY, painting_id UUID REFERENCES paintings(id), body TEXT.
The artist updates metadata before each static build. There are no customer accounts or
payment records because the portfolio has no authenticated or transactional workflow.`;
    assert.deepEqual(validateArchitectureDraft(architecture, { brief }), []);
    assert.deepEqual(validateDatabaseSchemaDraft(schema, { brief }), []);
  });
});

test("customer-owned records with RLS satisfy the role boundary without a user_id alias", () => {
  const schema = `### reservations
- id UUID PRIMARY KEY, customer_id UUID REFERENCES profiles(id), start_time TIMESTAMPTZ.
Each reservation belongs to a customer profile. The foreign key preserves that relationship when the reservation is stored and retrieved.
### profiles
- id UUID PRIMARY KEY REFERENCES auth.users(id), role TEXT CHECK (role IN ('customer', 'manager')).
RLS policy restricts reservation reads and writes to customer_id = auth.uid(); manager role checks run server-side.`;
  assert.deepEqual(validateDatabaseSchemaDraft(schema, { brief: "Customers and managers have role-based access to reservations." }), []);
  assert.ok(validateDatabaseSchemaDraft(schema.replace(/customer_id/g, "court_id"), { brief: "Customers and managers have role-based access to reservations." }).some(issue => issue.includes("authorization boundary")));
  assert.ok(validateDatabaseSchemaDraft(schema.replace(/RLS policy[\s\S]*/, ""), { brief: "Customers and managers have role-based access to reservations." }).some(issue => issue.includes("authorization boundary")));
});

test("durable holds can live on canonical resource slots instead of a bookings table", () => {
  const schema = `### court_slots
- id uuid PK, court_id uuid FK REFERENCES courts(id)
- reserved_by_booking_id uuid FK REFERENCES bookings(id), hold_expires_at TIMESTAMPTZ
- Atomic conditional update court_slots checks status and owner, returns affected row count before confirming a slot.
- UNIQUE (court_id, starts_at, ends_at) indexes schedule availability.
### bookings
- id uuid PK, customer_id uuid FK REFERENCES users(id), status text
- Persists confirmed booking history; slots hold the live reservation reference and expiry.`;
  const issues = validateDatabaseSchemaDraft(schema, { brief: "Prevent double-booking during concurrent checkout.", featureTitles: ["Court checkout"] });
  assert.equal(issues.some(issue => issue.includes("persist a checkout hold")), false);
  const missingBinding = schema.replace(/reserved_by_booking_id uuid FK REFERENCES bookings\(id\), /, "");
  assert.equal(validateDatabaseSchemaDraft(missingBinding, { brief: "Prevent double-booking during concurrent checkout.", featureTitles: ["Court checkout"] }).some(issue => issue.includes("persist a checkout hold")), true);
});
