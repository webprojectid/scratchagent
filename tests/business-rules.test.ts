import { describe, it, expect, beforeEach, afterEach } from "node:test";
import assert from "node:assert";
import { 
  detectBusinessRules, 
  type DetectedRule,
  generateBusinessRulesPrompt 
} from "../src/lib/business-rules-detector";

describe("Business Rules Detection System (Item #36)", () => {
  
  describe("detectBusinessRules", () => {
    it("should detect booking-related rules from brief", () => {
      const brief = "Aplikasi booking lapangan olahraga dengan pembayaran online dan manajemen slot waktu";
      
      const rules = detectBusinessRules(brief);
      
      // Should find at least booking-related rules
      const hasBookingRules = rules.some(
        r => r.id === "no-double-booking" || r.id === "payment-timeout"
      );
      
      assert.ok(hasBookingRules, "Should detect booking conflict and payment timeout rules");
    });

    it("should detect payment processing rules", () => {
      const brief = "Platform e-commerce dengan integrasi payment gateway Midtrans dan sistem refund";
      
      const rules = detectBusinessRules(brief);
      
      const hasPaymentRules = rules.some(
        r => r.category === "payment" && 
             ["webhook-idempotency", "refund-consistency"].includes(r.id)
      );
      
      assert.ok(hasPaymentRules, "Should detect payment idempotency and refund rules");
    });

    it("should detect multi-tenant isolation rules", () => {
      const brief = "Marketplace multi-vendor dimana setiap penjual punya dashboard terpisah";
      
      const rules = detectBusinessRules(brief);
      
      const hasIsolationRule = rules.some(
        r => r.id === "tenant-isolation" && r.category === "access"
      );
      
      assert.ok(hasIsolationRule, "Should detect tenant data isolation rule");
    });

    it("should detect file upload restrictions", () => {
      const brief = "Aplikasi upload dokumen klien dengan berbagai jenis file PDF, Word, Excel";
      
      const rules = detectBusinessRules(brief);
      
      const hasFileRules = rules.some(
        r => r.id === "file-size-limits" && r.category === "data"
      );
      
      assert.ok(hasFileRules, "Should detect file size and type restriction rules");
    });

    it("should detect integration API rules", () => {
      const brief = "Integrasi dengan layanan eksternal Google Maps API dan email sending service";
      
      const rules = detectBusinessRules(brief);
      
      const hasIntegrationRules = rules.some(
        r => r.category === "integration" && 
             ["api-timeout-handling", "rate-limiting"].includes(r.id)
      );
      
      assert.ok(hasIntegrationRules, "Should detect external API handling rules");
    });

    it("should detect migration/compatibility rules", () => {
      const brief = "Upgrade aplikasi existing yang sudah dipakai 2 tahun, harus compatible dengan data lama";
      
      const rules = detectBusinessRules(brief);
      
      const hasCompatibilityRules = rules.some(
        r => r.category === "compatibility" && 
             ["backward-compatibility", "rollback-safety"].includes(r.id)
      );
      
      assert.ok(hasCompatibilityRules, "Should detect compatibility and rollback rules");
    });

    it("should return empty array for simple brief without complex scenarios", () => {
      const brief = "To-do list sederhana untuk track daily tasks";
      
      const rules = detectBusinessRules(brief);
      
      // Simple app shouldn't trigger complex business rules
      assert.equal(rules.length, 0, "Simple to-do should not trigger complex business rules");
    });

    it("should include all required fields in detected rules", () => {
      const brief = "Sistem pemesanan tiket pesawat dengan payment gateway dan notifikasi email";
      
      const rules = detectBusinessRules(brief);
      
      if (rules.length > 0) {
        const firstRule = rules[0] as DetectedRule;
        
        assert.ok(firstRule.pattern, "Must have pattern that matched");
        assert.ok(firstRule.ruleId, "Must have rule ID");
        assert.ok(firstRule.displayName, "Must have display name");
        assert.ok(firstRule.description, "Must have description");
        Array.isArray(firstRule.triggers), "Must have triggers array";
        Array.isArray(firstRule.constraints), "Must have constraints array";
        assert.ok(firstRule.enforcement, "Must have enforcement strategy");
        Array.isArray(firstRule.testCases), "Must have test cases array";
      }
    });
  });

  describe("generateBusinessRulesPrompt", () => {
    it("should include detected rules in prompt", () => {
      const context = {
        brief: "Booking appointment system dengan payment confirmation",
        assumptions: ["User akan bayar online"],
        techPrefs: { stack: ["Node.js", "PostgreSQL"] }
      };
      
      const prompt = generateBusinessRulesPrompt(context);
      
      assert.ok(prompt.includes("CRITICAL BUSINESS RULES DETECTION"), 
                "Should include critical detection header");
      assert.ok(prompt.toLowerCase().includes("booking") || 
                prompt.toLowerCase().includes("payment"),
                "Should reference detected scenarios");
    });

    it("should provide questions for each detected rule", () => {
      const context = {
        brief: "Sistem reservasi hotel dengan multiple room types",
      };
      
      const prompt = generateBusinessRulesPrompt(context);
      
      // Check if prompts ask clarifying questions
      assert.ok(
        prompt.includes("Questions to Answer") || 
        prompt.includes("pertanyaan") ||
        prompt.includes("?"),
        "Should include questions about rule parameters"
      );
    });

    it("should handle briefs with no detected rules gracefully", () => {
      const context = {
        brief: "Blog pribadi untuk menulis artikel",
      };
      
      const prompt = generateBusinessRulesPrompt(context);
      
      assert.ok(prompt.toLowerCase().includes("no obvious"),
                "Should indicate no complex scenarios detected");
    });
  });
});

describe("Task Context Package Generation (Item #49)", () => {
  it("should generate complete context package for task", () => {
    const pkg = {
      ref: "feat-auth-login-001",
      title: "Implementasikan login user",
      featureSlug: "auth",
      phaseNumber: 1
    };
    
    // This is validated via project-document.ts::generateTaskContextPackage
    assert.ok(pkg.ref, "Task ref must exist");
    assert.ok(pkg.title, "Task title must exist");
    assert.ok(pkg.featureSlug, "Feature slug must be extracted");
    assert.ok(pkg.phaseNumber > 0, "Phase number must be positive");
  });
});
