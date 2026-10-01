export function totalPss(text){
 const match=text.match(/\bTOTAL PSS:\s*(\d+)/)||text.match(/^\s*TOTAL:\s*(\d+)/m);
 return match?Number(match[1]):null;
}
/** Only an isolated renderer explicitly attributed to this exact application. */
export function ownedRendererPids(text,application){
 return text.split(/(?=^\s*\*APP\*)/m).filter(block=>
   block.includes(`packageList={${application}}`)&&block.includes(`callerPackage=${application}`)&&
   /ISOLATED uid=/.test(block)&&/com\.google\.android\.webview:sandboxed_process/.test(block))
   .map(block=>block.match(/\bpid=(\d+) starting=/)?.[1]).filter(Boolean);
}
