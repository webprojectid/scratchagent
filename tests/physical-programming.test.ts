import { test } from "node:test";
import assert from "node:assert/strict";
import { physicalInputSchema, physicalSource, physicalDefaults, physicalCategories } from "@/lib/physical-domain";
import { physicalChoiceOptions } from "@/lib/physical-choice-options";
import { hardwareCatalog } from "@/lib/physical-catalog";
import { physicalProgrammingNotes } from "@/lib/physical-programming";
import { validatePhysicalEngineering } from "@/lib/physical-generation";
import { physicalEngineering, physicalInput, physicalFoundation } from "./fixtures/physical-plan";

const manual = (value:string) => ({mode:"manual" as const,value});
test("language and framework selections remain optional for existing drafts and preserve custom values",()=>{
 assert.equal(physicalInputSchema.safeParse(physicalInput).success,true);
 const input=physicalInputSchema.parse({...physicalDefaults(),choices:{language:{mode:"custom",value:"TinyGo with custom HAL"},firmware:{mode:"custom",value:"Internal embedded runtime v2"}}});
 const source=physicalSource("Synthetic robot brief",input);
 assert.ok(source.includes("TinyGo with custom HAL"));assert.ok(source.includes("Internal embedded runtime v2"));
 assert.equal(physicalInputSchema.safeParse({...input,choices:{language:{mode:"custom",value:""}}}).success,false);
 assert.ok(physicalProgrammingNotes(input,"en").some(note=>note.includes("Custom")));
});
test("known language/runtime pairs avoid mismatch warnings while incompatible selections stay intact",()=>{
 for(const [language,firmware] of [["C++","ESP-IDF"],["Python","MicroPython"],["Python","CircuitPython"],["Rust","Embassy"],["Structured Text (ST)","Arduino PLC IDE"]]){
  const input={...physicalDefaults(),choices:{language:manual(language),firmware:manual(firmware)}};
  assert.deepEqual(physicalProgrammingNotes(input,"en"),[]);
 }
 const input={...physicalDefaults(),choices:{language:manual("Python"),firmware:manual("ESP-IDF"),controller:manual("Raspberry Pi Pico")}};
 assert.equal(physicalProgrammingNotes(input,"en").length,2);
 assert.ok(physicalProgrammingNotes(input,"id").every(note=>!note.includes("Verify")));
 assert.equal(input.choices.language.value,"Python");
 assert.equal(physicalProgrammingNotes({...physicalDefaults(),choices:{language:{mode:"auto",value:""},firmware:{mode:"auto",value:""}}},"en").length,0);
});
test("no-programming and no-framework decisions are preserved and inconsistencies are explained",()=>{
 assert.deepEqual(physicalProgrammingNotes({...physicalDefaults(),choices:{language:{mode:"none",value:""},firmware:{mode:"none",value:""}}},"en"),[]);
 assert.equal(physicalProgrammingNotes({...physicalDefaults(),choices:{language:{mode:"none",value:""},firmware:manual("ESP-IDF")}},"en").length,1);
});
test("engineering validation requires explicit programming selections to appear unchanged",()=>{
 const input={...physicalInput,choices:{...physicalInput.choices,language:manual("C++"),firmware:manual("Arduino framework")}};
 const engineering=structuredClone(physicalEngineering);
 assert.ok(validatePhysicalEngineering(engineering,input,physicalFoundation.requirements.map(r=>r.id)).length>0);
 engineering.sections[0].content+='\nC++ and Arduino framework are manual selections; board and driver compatibility remain to be verified.';
 assert.deepEqual(validatePhysicalEngineering(engineering,input,physicalFoundation.requirements.map(r=>r.id)),[]);
 assert.ok(hardwareCatalog.filter(e=>e.category==='language').length>=8);
 assert.ok(hardwareCatalog.filter(e=>e.category==='firmware').length>=9);
});

test("every hardware Choose category has a populated, unique list without changing the user input contract",()=>{
 for(const category of physicalCategories){
  const options=physicalChoiceOptions(category);
  assert.ok(options.length>=2,category);assert.equal(new Set(options).size,options.length);
  assert.ok(options.every(option=>option.trim().length>0));
  assert.equal(physicalInputSchema.safeParse({...physicalDefaults(),choices:{[category]:{mode:"manual",value:options[0]}}}).success,true,category);
 }
});
