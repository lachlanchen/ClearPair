// Family defaults remain intact when a single app needs a focused beta.
export function appRelease(release,app){
 if(!release.apps?.includes(app))throw Error('Unknown release app');
 const build=release.appBuilds?.[app]??release.build;
 if(!Number.isSafeInteger(build)||build<1||typeof release.version!=='string')throw Error('Invalid release identity');
 return {...release,build};
}
export function selectedRelease(release,selected){
 const apps=selected.length?selected:release.apps;
 if(new Set(apps).size!==apps.length||!apps.length)throw Error('Invalid release selection');
 const identities=apps.map(app=>appRelease(release,app));
 if(new Set(identities.map(r=>r.build)).size!==1)throw Error('Different app build numbers: select one release lane explicitly');
 return {...identities[0],apps};
}
// Build numbers are per app. Freeze each selected lane independently so a
// later English 10 cannot overwrite evidence for an already distributed L&R 10.
export function sourceManifestPaths(release){
 const lane=release.apps.length===1?`${release.apps[0]}-${release.build}`:`family-${release.build}`;
 return {files:`.runtime/store/source-files-${lane}.txt`,verification:`.runtime/store/source-verification-${lane}.json`};
}
