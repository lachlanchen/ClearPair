import { spawnSync } from "node:child_process";
import { access, readFile, writeFile, mkdir, copyFile } from "node:fs/promises";
import { exportNativeIcons } from './icons.mjs';
import { updateIosInfo } from './native-metadata.mjs';
const [app, platform] = process.argv.slice(2);
if (
  !["handf", "landr", "english", "chinese", "korean", "arabic", "cantonese"].includes(app) ||
  !["android", "ios"].includes(platform)
)
  throw new Error("Usage: npm run native:sync -- <app> <android|ios>");
const env = { ...process.env, CLEARPAIR_APP: app };
function run(command, args) {
  const r = spawnSync(command, args, { env, stdio: "inherit" });
  if (r.status !== 0) process.exit(r.status || 1);
}
run(process.execPath, ["tools/build.mjs", `--app=${app}`, "--native"]);
try {
  await access(`native/apps/${app}/${platform}`);
} catch {
  run(process.execPath, [
    "node_modules/@capacitor/cli/bin/capacitor",
    "add",
    platform,
  ]);
}
run(process.execPath, [
  "node_modules/@capacitor/cli/bin/capacitor",
  "sync",
  platform,
]);
if (platform === "ios") {
  const file = `native/apps/${app}/ios/App/App/Info.plist`,
    text = await readFile(file, "utf8");
  await writeFile(file, updateIosInfo(text));
  await exportNativeIcons(app, platform);
  const project=`native/apps/${app}/ios/App/App.xcodeproj/project.pbxproj`;
  await writeFile(project,(await readFile(project,'utf8')).replaceAll('MARKETING_VERSION = 1.0;', 'MARKETING_VERSION = 0.1.0;'));
} else {
  await exportNativeIcons(app, platform);
  const gradle=`native/apps/${app}/android/app/build.gradle`;
  await writeFile(gradle,(await readFile(gradle,'utf8')).replace('versionName "1.0"','versionName "0.1.0"'));
}
