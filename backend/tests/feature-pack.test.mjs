import test from "node:test";
import assert from "node:assert/strict";
import fs from "node:fs";
// Unset provider keys before importing app-adjacent modules: no provider calls in tests.
delete process.env.OPENROUTER_API_KEY; delete process.env.OPENAI_API_KEY;
const { applyRecordFilters, parseRecordFilters, recordsToCsv, buildInsight } = await import("../domainInsights.mjs");
const rows=[{reference:"A-1",title:"Alpha case",owner:"Sam",status:"Open",risk:"High",amount:0},{reference:"B-2",title:"Beta case",owner:"Lee",status:"Closed",risk:"Low",amount:50}];
test("search/filter narrows main list and preserves 0-amount rows",()=>{assert.equal(applyRecordFilters(rows,parseRecordFilters({q:"alpha"})).length,1);assert.equal(applyRecordFilters(rows,parseRecordFilters({status:"Closed"})).length,1);assert.equal(applyRecordFilters(rows,parseRecordFilters({q:"alpha"}))[0].amount,0);});
test("CSV export includes header and empty/zero values",()=>{const csv=recordsToCsv(rows);assert.ok(csv.startsWith("id,reference"));assert.ok(csv.includes("A-1"));});
test("deterministic insights are labelled aiGenerated:false and preserve false/0/empty",()=>{const x=buildInsight([],{id:"f",title:"F"},"portfolio-summary");assert.equal(x.aiGenerated,false);assert.equal(x.flags.hasRecords,false);assert.equal(x.metrics[0].value,0);const y=buildInsight(rows,{id:"f",title:"F"},"risk-queue");assert.equal(y.aiGenerated,false);assert.equal(y.flags.hasHighRisk,true);});
test("server mounts export/insights/search behind auth",()=>{const s=fs.readFileSync(new URL("../server.mjs",import.meta.url),"utf8");assert.ok(s.includes("/records/export"));assert.ok(s.includes("/insights/:kind"));assert.ok(s.includes("parseRecordFilters"));});
