"""Read-only framework deployment-metadata gate before export/upload."""
import pathlib,plistlib,re,subprocess,sys
app=pathlib.Path(sys.argv[1]);assert app.name=='App.app' and app.is_dir()
version=lambda s:tuple(map(int,s.split('.')))
for framework in sorted((app/'Frameworks').glob('*.framework')):
    info=plistlib.loads((framework/'Info.plist').read_bytes())
    binary=framework/info['CFBundleExecutable']
    build=subprocess.check_output(['xcrun','vtool','-show-build',str(binary)],text=True)
    minima=re.findall(r'^\s*minos\s+([0-9.]+)\s*$',build,re.M)
    if not minima:continue
    declared=info.get('MinimumOSVersion');assert declared,framework.name+' has no deployment metadata'
    assert all(version(declared)>=version(m) for m in minima),framework.name+' declares an unsupported minimum OS'
print('Embedded framework minimum-OS metadata verified')
