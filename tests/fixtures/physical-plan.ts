import { hardwareSections, physicalDefaults, type HardwareEngineering, type HardwareFoundation } from "@/lib/physical-domain";

export const physicalBrief = "Build an offline balcony irrigation controller. Keep the pump disabled when the reservoir is empty.";
export const physicalInput = { ...physicalDefaults(), choices: { controller: { mode: "manual" as const, value: "ESP32" }, companion: { mode: "none" as const, value: "" }, learning: { mode: "none" as const, value: "" } } };
export const physicalFoundation: HardwareFoundation = {
  title: "Balcony irrigation prototype", assumptions: ["Sensor and pump models still need selection and datasheet checks."], openDecisions: ["Confirm supply, operating duration, moisture threshold and pump rating before wiring."],
  requirements: [
    { id: "R01", statement: "The controller operates without an internet connection.", sourceQuote: "offline balcony irrigation controller", verification: "Disconnect external networking and exercise the agreed operating sequence.", openDecisions: [] },
    { id: "R02", statement: "The pump remains disabled when the reservoir is empty.", sourceQuote: "Keep the pump disabled when the reservoir is empty.", verification: "A human records the pump state during a controlled low-water condition.", openDecisions: ["Confirm the sensor and electrical control design before testing."] },
  ],
};
const sectionContent: Record<string, string> = {
  overview: "An offline irrigation prototype for balcony plants. The operator supplies water and reviews its operation.",
  operation: "Startup checks the reservoir indication before allowing pump control. Missing or invalid indication leaves the pump command disabled pending review.",
  architecture: "ESP32 reads the reservoir and moisture indications. A separately selected driver controls the pump. No cloud, database or application is required.",
  mechanical: "Plan a serviceable enclosure and mounting. Select dimensions and moisture protection after checking the intended balcony environment.",
  electronics: "Select the supply, driver and protective components from the actual pump and sensor specifications. Wiring is not yet verified.",
  control: "Implement a testable control state machine. Keep dry-run behavior explicit; thresholds and timing remain open until component tests.",
  interfaces: "Verify voltage levels, connector orientation, units and input behavior for the exact selected revisions. Record calibration separately.",
  resources: "Measure normal and peak current on the selected prototype and establish the control response requirement. Unknown ratings are not assumed to pass.",
  failure: "Record low reservoir, invalid sensor and interrupted supply cases. Review the required behavior before energizing the prototype.",
  assembly: "A human checks the approved connection plan and assembles the selected parts before applying power under the reviewed test procedure.",
  verification: "R01 is checked with networking unavailable. R02 requires human-reported physical evidence and review of pump behavior.",
  maintenance: "Provide access to reservoir, tubing, sensor and driver. Define inspection and replacement needs after prototype operation.",
  learning: "Not required: the requested behavior uses an explicit control sequence, not a trained policy.",
  simulation: "No simulator selected. Digital control tests are planned and do not validate physical plumbing or electrical behavior.",
  companion: "Not required: the user excluded a companion application.",
};
export const physicalEngineering: HardwareEngineering = {
  sections: Object.keys(hardwareSections).map(id => ({ id: id as keyof typeof hardwareSections, applicability: ["learning", "simulation", "companion"].includes(id) ? "not_applicable" : "required", content: sectionContent[id] })),
  components: [{ id: "C01", role: "Control processor", specification: "Check the exact board revision, input levels and available pins against selected sensors and driver.", candidate: "ESP32", quantity: 1, unitPrice: null, currency: null, source: "Not retrieved", checkedAt: null, status: "unverified", requirementIds: ["R01", "R02"] }],
};
export const physicalPhases = [
  { title: "Control logic", goal: "Implement the offline control sequence before integration.", acceptance: ["Digital checks record the expected offline and low-water states."], requirementIds: ["R01"], packages: [{ title: "Firmware state machine", goal: "Separate sensor inputs from pump command decisions.", acceptance: ["Command transitions can be exercised without physical actuation."], tasks: [{ id: "T01", title: "Implement and test offline command transitions", discipline: "firmware" as const, executor: "ai" as const, requirementIds: ["R01"], inputs: ["Accepted operating sequence and open electrical decisions"], tools: ["Selected firmware toolchain and digital test harness"], deliverables: ["Firmware source and observed digital test report"], acceptance: ["Offline behavior is exercised and actual results are recorded."], verification: "Run control logic tests with networking unavailable.", evidenceKind: "digital" as const, reviewRequired: false, deps: [] }] }] },
  { title: "Prototype validation", goal: "Assemble and verify the reviewed prototype with a human.", acceptance: ["Actual offline and reservoir response are recorded and reviewed."], requirementIds: ["R01", "R02"], packages: [{ title: "Assembly and reservoir test", goal: "Validate the integrated device after electrical and mechanical review.", acceptance: ["Physical results are tied to the tested revision."], tasks: [{ id: "T01", title: "Assemble and record the low-water pump response", discipline: "assembly" as const, executor: "human" as const, requirementIds: ["R01", "R02"], inputs: ["Reviewed design, selected parts and verified firmware revision"], tools: ["Appropriate measurement equipment and reviewed assembly procedure"], deliverables: ["Assembled prototype and human-reported verification record"], acceptance: ["Observed pump behavior is recorded under agreed conditions and reviewed."], verification: "A human checks the agreed reservoir condition and records the actual pump state.", evidenceKind: "physical" as const, reviewRequired: true, deps: [] }] }] },
];
export const physicalOutline = { phases: physicalPhases.map((phase, i) => ({ ...phase, dependsOnPhases: i ? [0] : [], packages: phase.packages.map(w => ({ title: w.title, goal: w.goal, acceptance: w.acceptance })) })) };
