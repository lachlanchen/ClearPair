import test from 'node:test';
import assert from 'node:assert/strict';
import {totalPss,ownedRendererPids} from './memory.mjs';
test('PSS varies across Android versions; absent is unknown, never zero',()=>{
 assert.equal(totalPss('  TOTAL: 135610 TOTAL SWAP PSS: 126'),135610);
 assert.equal(totalPss('TOTAL PSS: 451234'),451234);
 assert.equal(totalPss('No process found'),null);
});
test('renderer ownership requires exact caller and package, not just process name',()=>{
 const record=(app,caller,pid)=>`  *APP* ProcessRecord{0 ${pid}:com.google.android.webview:sandboxed_process0/u0a1}\n user uid=1 ISOLATED uid=2\n packageList={${app}}\n pid=${pid} starting=false\n callerPackage=${caller}\n`;
 assert.deepEqual(ownedRendererPids(record('qa','qa',42)+record('other','other',43)+record('qa','other',44),'qa'),['42']);
});
