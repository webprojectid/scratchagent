/**
 * Business Rule Detection Engine (Item #36 - MOST IMPORTANT!)
 * Auto-detect implicit business problems dari brief/user input
 */

export interface DetectedRule {
  id: string;
  ruleId: string;
  pattern: string;
  category: string;
  displayName: string;
  description: string;
  triggers: string[];
  constraints: string[];
  enforcement: string;
  testCases: string[];
}

/**
 * Trigger patterns yang akan activate business rule analysis
 */
const TRIGGER_PATTERNS = [
  {
    pattern: /booking|reservasi|pemesanan/i,
    category: "concurrency",
    defaultRules: [
      {
        id: "no-double-booking",
        name: "No Double Booking Conflict",
        displayName: "Satu Slot ≠ Dua Booking Aktif Bertabrakan",
        description: "Prevent two active bookings from overlapping on the same resource slot",
        triggers: ["Multiple concurrent booking requests for same slot"],
        constraints: [
          "One slot cannot have two confirmed overlapping bookings",
          "Booking must be rejected if slot already occupied",
          "Timeout mechanism to release held slots"
        ],
        enforcement: "Implement optimistic locking with slot reservation and timeout. Use database-level uniqueness constraints on overlapping time ranges.",
        testCases: [
          "Two simultaneous requests don't create double bookings",
          "Second request returns conflict error",
          "Expired reservations are released automatically"
        ]
      },
      {
        id: "payment-timeout",
        name: "Payment Timeout Handling",
        displayName: "Berapa Lama Slot Ditahan Saat Menunggu Payment?",
        description: "Define and enforce payment timeout for pending bookings",
        triggers: ["Payment pending after booking creation"],
        constraints: [
          "Slot must be released after timeout period",
          "Pending bookings should expire automatically",
          "Clear policy on what happens when payment is late"
        ],
        enforcement: "Set explicit timeout (e.g., 15 minutes). Implement background job to cancel unpaid bookings. Notify user before expiry.",
        testCases: [
          "Unpaid booking expires after X minutes",
          "Slot becomes available again after expiry",
          "User notified before cancellation"
        ]
      }
    ]
  },
  {
    pattern: /payment|pembayaran|transaksi/i,
    category: "payment",
    defaultRules: [
      {
        id: "webhook-idempotency",
        name: "Webhook Idempotency",
        displayName: "Webhook Berulang Tidak Buat Konfirmasi Ganda",
        description: "Ensure payment webhooks are processed idempotently",
        triggers: ["Payment gateway webhook notifications"],
        constraints: [
          "Duplicate webhook events must not create duplicate confirmations",
          "Must track processed webhook IDs",
          "Network retries should not cause side effects"
        ],
        enforcement: "Use webhook event ID as unique key. Store processed events in database. Check existence before processing.",
        testCases: [
          "Same webhook sent twice creates only one confirmation",
          "Processed webhook ID is recorded",
          "Retry mechanism doesn't reprocess"
        ]
      },
      {
        id: "refund-consistency",
        name: "Refund Consistency",
        displayName: "Pembatalan Harus Rekonsiliasi Refund",
        description: "Cancellation must trigger proper refund reconciliation",
        triggers: ["User cancels booking/transaction"],
        constraints: [
          "Refund must be initiated to original payment method",
          "Status changes must be atomic",
          "Payment gateway must be notified of cancellation"
        ],
        enforcement: "Implement transaction handler that coordinates status update + gateway API call. UseSaga pattern for distributed transactions.",
        testCases: [
          "Cancellation updates DB and calls gateway",
          "Partial refunds handled correctly",
          "Failed refund creates alert for manual review"
        ]
      },
      {
        id: "price-change-protection",
        name: "Price Change During Transaction",
        displayName: "Harga Tidak Boleh Berubah Saat Transaksi Berjalan",
        description: "Prevent price modifications mid-transaction",
        triggers: ["Price lookup during checkout process"],
        constraints: [
          "Price at booking time must be locked",
          "Final amount charged equals initial quote",
          "Price updates shouldn't affect pending transactions"
        ],
        enforcement: "Snapshot price at cart/checkout start. Store final agreed price in transaction record. Reference snapshot for charging.",
        testCases: [
          "Price change after checkout start doesn't affect existing cart",
          "Invoice shows locked price",
          "Refund uses original transaction amount"
        ]
      }
    ]
  },
  {
    pattern: /multi-vendor|marketplace|penjual|pembeli/i,
    category: "access",
    defaultRules: [
      {
        id: "tenant-isolation",
        name: "Data Tenant Isolation",
        displayName: "Vendor Data Terpisah Penuh Antar Organisasi",
        description: "Ensure complete data isolation between vendors/tenants",
        triggers: ["Multi-tenant architecture detected"],
        constraints: [
          "Vendor A cannot see Vendor B's data",
          "Data queries must always filter by tenant_id",
          "Cross-tenant operations require admin approval"
        ],
        enforcement: "Add tenant_id to every query. Use database row-level security. Implement middleware that injects tenant context.",
        testCases: [
          "Query without tenant filter fails",
          "API responses filtered by current tenant",
          "Admin can access all tenants, regular users only their own"
        ]
      }
    ]
  },
  {
    pattern: /upload|file|document|attachment/i,
    category: "data",
    defaultRules: [
      {
        id: "file-size-limits",
        name: "File Size & Type Restrictions",
        displayName: "Batasan Ukuran dan Jenis File yang Di-upload",
        description: "Enforce file upload size limits and type restrictions",
        triggers: ["File upload functionality"],
        constraints: [
          "Maximum file size must be enforced server-side",
          "Only allowlisted file types accepted",
          "Malicious files must be rejected"
        ],
        enforcement: "Validate size/type on upload endpoint. Scan for malware. Store metadata about accepted files.",
        testCases: [
          "Large files rejected with clear error",
          "Wrong file type denied",
          "Allowed file types verified"
        ]
      }
    ]
  },
  {
    pattern: /api|integrasi|webhook|third.*party/i,
    category: "integration",
    defaultRules: [
      {
        id: "api-timeout-handling",
        name: "External API Timeout Handling",
        displayName: "Timeout Dan Retry Pada Integrasi Eksternal",
        description: "Handle external API failures gracefully",
        triggers: ["Integration with third-party APIs"],
        constraints: [
          "External API calls must have timeouts",
          "Must retry failed requests with backoff",
          "Circuit breaker pattern recommended"
        ],
        enforcement: "Configure HTTP client timeouts. Implement exponential backoff retry logic. Track failure rates and implement circuit breaker.",
        testCases: [
          "Slow API doesn't block entire request",
          "Retry happens with increasing delays",
          "After N failures, temporary fallback or error returned"
        ]
      },
      {
        id: "rate-limiting",
        name: "External Service Rate Limiting",
        displayName: "Respect Third-Party Rate Limits",
        description: "Don't exceed external API rate limits",
        triggers: ["Repeated calls to external services"],
        constraints: [
          "Track request counts against provider limits",
          "Implement local caching to reduce calls",
          "Rate limit violations must be handled"
        ],
        enforcement: "Monitor usage counters. Implement token bucket algorithm. Cache responses where appropriate.",
        testCases: [
          "Rapid repeated requests throttle appropriately",
          "Cache prevents unnecessary API calls",
          "429 response from provider handled gracefully"
        ]
      }
    ]
  },
  {
    pattern: /existing|migration|upgrade|legacy/i,
    category: "compatibility",
    defaultRules: [
      {
        id: "backward-compatibility",
        name: "Backward Compatibility Maintenance",
        displayName: "Aplikasi Existing Tetap Kompatibel Setelah Perubahan",
        description: "Changes must not break existing functionality",
        triggers: ["Modifying existing application"],
        constraints: [
          "Existing APIs must continue working",
          "Database migrations must preserve data",
          "Regression tests required for existing features"
        ],
        enforcement: "Maintain versioned APIs. Create migration scripts with rollback capability. Run full regression suite before deploy.",
        testCases: [
          "Old API endpoints still return expected data",
          "Migration preserves all existing records",
          "Existing features pass regression tests"
        ]
      },
      {
        id: "rollback-safety",
        name: "Safe Rollback Strategy",
        displayName: "Kemampuan Rollback ke Versi Sebelumnya",
        description: "Must be able to roll back changes safely",
        triggers: ["Deployment to production environment"],
        constraints: [
          "Every deployment must have rollback plan",
          "Database schema must support down migration",
          "Rollback tested before production deploy"
        ],
        enforcement: "Document rollback steps for each deployment. Create reverse migration scripts. Test rollback procedure in staging.",
        testCases: [
          "Rollback script executes successfully",
          "Data integrity maintained after rollback",
          "Service resumes without errors"
        ]
      }
    ]
  }
];

/**
 * Detect business rules from brief text
 */
export function detectBusinessRules(brief: string): DetectedRule[] {
  const detected: DetectedRule[] = [];
  
  const lowerBrief = brief.toLowerCase();
  
  for (const trigger of TRIGGER_PATTERNS) {
    // Check if any pattern matches
    if (trigger.pattern.test(lowerBrief)) {
      for (const rule of trigger.defaultRules) {
        detected.push({
          pattern: trigger.pattern.source,
          category: trigger.category,
          ruleId: rule.id,
          ...rule
        });
      }
    }
  }
  
  return detected;
}

/**
 * Generate enhanced prompt that includes business rules detection instruction
 */
export function generateBusinessRulesPrompt(context: {
  brief: string;
  assumptions?: string[];
  techPrefs?: Record<string, any>;
}): string {
  const detected = detectBusinessRules(context.brief);
  
  let prompt = `## CRITICAL BUSINESS RULES DETECTION\n`;
  prompt += `Based on your brief, I've detected potential business rule scenarios:\n\n`;
  
  if (detected.length > 0) {
    prompt += `**Detected Scenarios:**\n`;
    for (const rule of detected) {
      prompt += `\n### ${rule.displayName}\n`;
      prompt += `${rule.description}\n`;
      prompt += `**Key Constraints:**\n`;
      for (const constraint of rule.constraints) {
        prompt += `- ${constraint}\n`;
      }
      prompt += `\n**Questions to Answer:**\n`;
      prompt += `- What's the specific timeout/limit value? (e.g., 15 minutes)\n`;
      prompt += `- Who decides the enforcement policy? (user choice or technical decision)\n`;
      prompt += `- How will we test this works correctly?\n`;
    }
    prompt += `\n`;
  } else {
    prompt += `**No obvious complex scenarios detected.** If your application involves:\n`;
    prompt += `- Payment processing\n`;
    prompt += `- Multi-user concurrency\n`;
    prompt += `- External integrations\n`;
    prompt += `- Sensitive data handling\n`;
    prompt += `- Regulatory requirements\n`;
    prompt += `\nPlease clarify these aspects as they may introduce business rules.\n\n`;
  }
  
  return prompt;
}
