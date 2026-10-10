import demo from "./demo-futsalgo.json";

const english = [
  {
    title: "Nearby Courts & Search Filters",
    description: "Find futsal courts near your location and compare availability, prices, and facilities.",
    criteria: ["Search returns courts within the selected radius.", "Filters narrow results by price, facilities, and availability.", "Each result links to court details and booking slots."],
    sub: "Location-Based Search",
    tasks: [
      "Build a location search endpoint with coordinates and a search radius.",
      "Test coordinate validation, radius limits, and search edge cases.",
      "Build a location input with automatic detection, manual entry, and validation.",
      "Handle location access failures and invalid input with a manual-entry fallback.",
      "Test the full search flow from entering coordinates to displaying results.",
    ],
  },
  {
    title: "Live Availability & Booking",
    description: "Browse available court slots for the next seven days and book consecutive hours.",
    criteria: ["The schedule distinguishes available, booked, and unavailable slots.", "Users can select one to four consecutive hours.", "Checkout holds selected slots for ten minutes to prevent duplicate bookings."],
    sub: "Daily Schedule",
    tasks: [
      "Build the daily schedule with shared state and date validation.",
      "Build GET /api/slots with parameter validation and error responses.",
      "Test the schedule component and its API integration.",
      "Connect the booking screens with routing, error boundaries, and shared state.",
      "Test booking, live slot updates, and booking history end to end.",
    ],
  },
  {
    title: "Online Deposits & Payments",
    description: "Collect a deposit of at least 50% through bank transfers, digital wallets, or cards.",
    criteria: ["Checkout opens the payment provider securely.", "A successful deposit updates the booking and notifies the owner.", "Failed or expired payments release the held slots within ten minutes."],
    sub: "Deposit Checkout",
    tasks: [
      "Build the deposit checkout endpoint with input validation and error responses.",
      "Build an accessible deposit payment form with validation and loading states.",
      "Test input validation and the deposit checkout flow.",
      "Unit test backend validation and payment error handling.",
    ],
  },
  {
    title: "Rescheduling & Cancellations",
    description: "Let customers change or cancel a booking under the court's cancellation policy.",
    criteria: ["Active bookings offer reschedule and cancel actions.", "Rescheduling requires an available slot and meets the notice period.", "The old slot is released, the new slot is reserved, and the owner is notified."],
    sub: "Reschedule a Booking",
    tasks: [
      "Build the booking reschedule endpoint.",
      "Validate the requested booking and replacement time slot.",
      "Add shared state for booking details.",
      "Build the reschedule dialog.",
      "Add loading and error states for rescheduling and cancellation.",
      "Support keyboard navigation and screen readers in booking dialogs.",
      "Unit test reschedule input validation.",
      "Integration test the reschedule flow across the UI and API.",
    ],
  },
  {
    title: "Court Owner Dashboard",
    description: "Give owners tools to manage courts, operating hours, hourly rates, and incoming bookings.",
    criteria: ["Owners register with a verified email and business details.", "Owners can set opening hours, hourly rates, and blocked slots.", "Owners can accept or reject bookings with a reason."],
    sub: "Court Management",
    tasks: [
      "Build court create, read, update, and delete endpoints with input validation.",
      "Build the court list and add/edit form.",
      "Test the court API and interface at unit and integration level.",
      "Connect shared state across the owner dashboard.",
      "Test dashboard accessibility and performance.",
      "Add consistent error handling for owner API requests.",
    ],
  },
  {
    title: "Revenue Reports & Booking Analytics",
    description: "Track bookings, gross revenue, platform fees, and net earnings over a selected period.",
    criteria: ["Owners can select a daily, weekly, monthly, or custom date range.", "Reports show bookings, gross revenue, fees, and net earnings.", "Owners can export data for further analysis."],
    sub: "Daily Revenue Summary",
    tasks: [
      "Build the daily revenue endpoint with input validation and error responses.",
      "Set up shared report state with a Redux slice.",
      "Build the daily revenue summary and connect it to the API and shared state.",
      "Integration test the daily revenue endpoint and summary component.",
    ],
  },
  {
    title: "Booking Reminders",
    description: "Send customers and court owners a reminder 24 hours before a scheduled booking.",
    criteria: ["Reminders are scheduled 24 hours before the booking starts.", "Customers receive a clear push notification and email.", "Owners receive a reminder for each upcoming booking."],
    sub: "Reminder Scheduling",
    tasks: [
      "Schedule a daily job to send reminders 24 hours before bookings.",
      "Build an endpoint to retrieve reminder schedule status.",
      "Build an admin view of upcoming reminders.",
      "Test that reminders run at the scheduled time.",
    ],
  },
];

export function landingSessions(lang: "en" | "id" = "en") {
  return demo.features.map((feature, index) => {
    const copy = english[index];
    const sub = feature.subFeatures[0];
    const tasks = sub.tasks.map((task, taskIndex) => ({ ...task, title: lang === "en" ? copy.tasks[taskIndex] : task.title }));
    const order: Record<string, number> = { frontend: 0, backend: 1, qa: 2 };
    return {
      ...feature,
      title: lang === "en" ? copy.title : feature.title,
      description: lang === "en" ? copy.description : feature.description,
      selesaiBila: lang === "en" ? copy.criteria : feature.selesaiBila.slice(0, 3),
      subFeatures: [{ ...sub, title: lang === "en" ? copy.sub : sub.title, tasks }],
      tasks: [...tasks].sort((a, b) => a.phase - b.phase || order[a.layer] - order[b.layer] || a.ref.localeCompare(b.ref)),
    };
  });
}
