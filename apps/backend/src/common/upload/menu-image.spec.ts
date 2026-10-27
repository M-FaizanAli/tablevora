import { mkdtempSync, writeFileSync, existsSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { menuItemPhotoSchema } from '@nodedr-restaurant/types';
import { assertValidInlineMenuPhoto, menuImageDataUrl } from './image-upload.config';

const png = Buffer.from('iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+a7X0AAAAASUVORK5CYII=', 'base64');
describe('durable bounded menu photos', () => {
  let directory: string;
  beforeEach(() => { directory = mkdtempSync(join(tmpdir(), 'tablevora-photo-')); });
  afterEach(() => rmSync(directory, { recursive: true, force: true }));
  it('returns self-contained raster bytes and removes temporary disk storage', () => {
    const path = join(directory, 'photo.png');
    writeFileSync(path, png);
    const url = menuImageDataUrl(path);
    expect(Buffer.from(url.split(',')[1], 'base64')).toEqual(png);
    expect(existsSync(path)).toBe(false);
    expect(() => assertValidInlineMenuPhoto(url)).not.toThrow();
  });
  it('rejects and removes oversized uploads', () => {
    const path = join(directory, 'large.png');
    writeFileSync(path, Buffer.concat([png, Buffer.alloc(61 * 1024)]));
    expect(() => menuImageDataUrl(path)).toThrow();
    expect(existsSync(path)).toBe(false);
  });
  it('rejects disguised SVG/HTML raster bytes', () => {
    expect(() => assertValidInlineMenuPhoto('data:image/png;base64,' + Buffer.from('<svg onload="alert(1)"/>').toString('base64'))).toThrow();
  });
  it('allows explicit clearing and rejects extra administrative fields', () => {
    expect(menuItemPhotoSchema.safeParse({ imageUrl: null }).success).toBe(true);
    expect(menuItemPhotoSchema.safeParse({ imageUrl: null, price: 0 }).success).toBe(false);
    expect(menuItemPhotoSchema.safeParse({ imageUrl: 'https://example.com/file.svg' }).success).toBe(false);
  });
});
