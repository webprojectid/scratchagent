# Manual live simulations

The automated suite is tests/*.test.ts and runs offline. These four standalone scripts intentionally use real providers; they are not dead unit tests and must not be added to the CI glob.

| Runner name | Existing script | Side effects |
| --- | --- | --- |
| plan-generation | e2e-plan-generation.ts | Paid generation and database writes |
| full-plan | full-plan-simulation.ts | Paid generation |
| providers | simulate-llm-config.ts | Live provider requests |
| local-generation | verify-local-test.ts | Paid generation |

Use test-provider credentials. The runner requires explicit live consent, rejects CI/production, and does not reuse the application's DATABASE_URL. Database-writing execution requires a separate MANUAL_TEST_DATABASE_URL; configure that variable only for a disposable test database. Other modes use memory storage unless that separate test database is supplied.

The four old entry points remain available for compatibility. Executing them directly bypasses these runner protections; do not put direct execution into automation. The existing offline npm test command is unchanged.

```sh
npm run test:manual -- providers --allow-live
```

This example is potentially billable. It is not part of normal setup or release validation. Do not run against production data merely to satisfy a test count.
