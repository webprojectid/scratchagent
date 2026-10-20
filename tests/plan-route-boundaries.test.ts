import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { runInNewContext } from "node:vm";
import ts from "typescript";
import { NextResponse } from "next/server";
import { z } from "zod";
import { accessPlan, unauthorized, type AuthUser } from "../src/lib/api-auth";
import type { Plan } from "../src/lib/types";

const foreignUser: AuthUser = { userId: "boundary-other", email: "other@example.test", via: "session" };
const plan: Plan = { id: "boundary-plan", userId: "boundary-owner", title: "Private synthetic plan", brief: "Synthetic content", stack: [], asumsi: [], features: [], status: "generating" };

test("plan routes reject another account before exports, changes or provider work", async () => {
  delete process.env.DATABASE_URL;
  const routes: [string, string][] = [
    ["plans/[planId]/route.ts", "GET"], ["plans/[planId]/route.ts", "DELETE"],
    ["plans/[planId]/export/route.ts", "GET"], ["plans/[planId]/overview/route.ts", "GET"],
    ["plans/[planId]/overview/route.ts", "PATCH"], ["plans/[planId]/progress/route.ts", "GET"],
    ["plans/[planId]/generate-tasks/route.ts", "POST"], ["plans/[planId]/generate-all/route.ts", "POST"],
    ["plans/[planId]/retry-generation/route.ts", "POST"], ["plans/[planId]/structure/route.ts", "DELETE"],
    ["plans/[planId]/ideas/route.ts", "GET"], ["plans/[planId]/ideas/route.ts", "POST"],
    ["v1/plans/[planId]/route.ts", "GET"], ["v1/plans/[planId]/next/route.ts", "GET"],
    ...["start", "complete", "fail", "retry"].map(action => [`v1/tasks/[ref]/${action}/route.ts`, "POST"] as [string, string]),
  ];
  for (const [route, method] of routes) {
    let gates = 0;
    const unsafe = new Proxy({}, { get: (_target, name) => { if (name === "__esModule") return true; return () => { throw new Error(`Unexpected work before access denial: ${route} ${String(name)}`); }; } });
    const mocks: Record<string, unknown> = {
      "next/server": { NextResponse }, "zod": { z },
      "@/lib/api-auth": { getRequestUser: async () => foreignUser, unauthorized, accessPlan: async (id: string, user: AuthUser, options: { write?: boolean } = {}) => { gates++; return accessPlan(id, user, { write: options.write, loadPlan: async () => plan }); } },
      "@/lib/write-origin": { writeOriginGate: () => null },
      "@/lib/ui-messages": { apiText: (text: string) => text },
      "@/lib/billing": { getAccountState: async () => ({ tier: "pro" }), isAdminEmail: () => false },
      "@/lib/account-capabilities": { hasProFeatures: () => true },
      "@/lib/task-response": { taskResponse: (action: () => Promise<Response>) => action() },
      "@/lib/security": { getClientIp: async () => "synthetic", clientKey: () => "boundary", rateLimit: () => null, logSecurity: async () => {}, RATE_LIMITS: { structure: { limit: 10, windowMs: 1000 }, agent: { limit: 100, windowMs: 1000 } } },
    };
    const fixture = { exports: {} as Record<string, (request: Request, context: unknown) => Promise<Response>> };
    const output = ts.transpileModule(readFileSync(`src/app/api/${route}`, "utf8"), { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText;
    runInNewContext(output, { module: fixture, exports: fixture.exports, require: (name: string) => mocks[name] ?? unsafe, URL, console: { error() {} } });
    const request = new Request("https://example.test/api?planId=boundary-plan", { method, ...(method === "POST" || method === "PATCH" ? { body: JSON.stringify({ featureIndex: 0, reason: "Synthetic" }) } : {}) });
    const response = await fixture.exports[method](request, { params: Promise.resolve({ planId: plan.id, ref: "F01-S01-T01" }) });
    assert.equal(response.status, 404, `${method} ${route}`);
    assert.equal(gates, 1, route);
    assert.doesNotMatch(await response.text(), /Private synthetic plan|Synthetic content/);
  }
});
