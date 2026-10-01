import { describe, expect, it } from 'vitest';
import sharp from 'sharp';
// @ts-expect-error Repository tooling is JavaScript.
import { iconSvg, iconThemes } from '../tools/icons.mjs';

describe('seven vivid, platform-safe icons', () => {
  it('keeps all seven identities and omits the tiny brand wordmark', () => {
    expect(Object.keys(iconThemes)).toHaveLength(7);
    for(const id of Object.keys(iconThemes)) {
      expect(iconSvg(id)).not.toContain('<text');
      expect(iconSvg(id)).toContain('data:image/png;base64,');
    }
    expect(() => iconSvg('unknown')).toThrow();
  });
  for(const id of Object.keys(iconThemes)) it(`${id}: opaque store icon and safe adaptive artwork`, async () => {
    const icon = await sharp(Buffer.from(iconSvg(id))).flatten().png().toBuffer();
    const metadata = await sharp(icon).metadata();
    expect(metadata.width).toBe(1024); expect(metadata.height).toBe(1024); expect(metadata.hasAlpha).toBe(false);
    const {data,info} = await sharp(Buffer.from(iconSvg(id,'adaptive'))).resize(216).raw().toBuffer({resolveWithObject:true});
    expect(info.channels).toBe(4);
    let occupied=0;
    for(let y=0;y<216;y++) for(let x=0;x<216;x++) if(data[(y*216+x)*4+3]>100) {
      occupied++;
      expect(Math.hypot(x-108,y-108)).toBeLessThanOrEqual(67); // 66dp radius at 2x, 1px antialias tolerance
    }
    expect(occupied).toBeGreaterThan(1000);
  });
});
