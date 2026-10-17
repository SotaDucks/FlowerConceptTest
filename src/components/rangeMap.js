// Schematic dot-matrix distribution map (S. China + Vietnam). Coastlines are
// coarse; highlighted zones only mark regions named in the cited sources.
import { canvas2d } from '../core/dom.js';
import { clamp, hash2 } from '../core/util.js';
import { pointInPoly } from '../core/plate.js';

const BOX = [97, 121, 7, 27.5]; // lon0, lon1, lat0, lat1

const MAINLAND = [
  [120.6, 27.5], [120.6, 27.0], [119.7, 26.1], [119.1, 25.4], [118.6, 24.6], [118.0, 24.4], [117.2, 23.6], [116.5, 23.0],
  [115.5, 22.8], [114.8, 22.6], [114.2, 22.3], [113.6, 22.2], [113.0, 21.9], [112.0, 21.7], [111.0, 21.4], [110.4, 21.2],
  [110.2, 20.3], [109.9, 20.4], [109.7, 21.0], [109.1, 21.5], [108.5, 21.6], [108.0, 21.5], [107.4, 21.2], [106.7, 20.7],
  [106.2, 20.2], [105.8, 19.4], [105.6, 18.8], [106.2, 18.2], [106.6, 17.4], [107.2, 16.7], [108.1, 16.1], [108.6, 15.3],
  [109.0, 14.3], [109.3, 13.0], [109.2, 12.0], [109.0, 11.4], [108.2, 10.9], [107.2, 10.4], [106.6, 9.8], [105.9, 9.0],
  [105.1, 8.6], [104.8, 9.0], [104.9, 9.8], [104.5, 10.4], [103.5, 10.6], [103.0, 11.4], [102.4, 12.2], [101.3, 12.7],
  [100.9, 12.7], [100.5, 13.4], [100.0, 13.3], [99.9, 12.2], [99.6, 11.0], [99.2, 10.3], [99.0, 9.2], [99.8, 8.4],
  [100.2, 7.5], [100.5, 7.0], [99.6, 7.0], [98.5, 8.5], [98.3, 9.8], [98.6, 11.5], [98.6, 13.0], [97.9, 14.8],
  [97.6, 16.3], [97.0, 16.9], [97.0, 27.5],
];
const HAINAN = [[108.6, 19.2], [108.7, 18.5], [109.5, 18.2], [110.1, 18.4], [110.6, 19.0], [111.0, 19.7], [110.7, 20.1], [110.0, 20.1], [109.3, 19.9]];
const TAIWAN = [[120.1, 23.0], [120.7, 22.0], [121.0, 22.5], [121.5, 24.0], [121.9, 25.0], [121.5, 25.3], [120.9, 24.8], [120.2, 23.8]];

// [lon, lat, radius°, label]
export const RANGE_ZONES = [
  [113.6, 23.0, 1.9, '广东', 4, -18],
  [114.15, 22.35, 0.5, '香港', 10, 2],
  [108.8, 23.0, 2.0, '广西', -10, -22],
  [109.8, 19.1, 0.9, '海南', 12, -4],
  [104.6, 23.1, 1.1, '云南', -44, -14],
  [105.6, 21.6, 1.4, '越南', -40, 6],
];

export class RangeMap {
  constructor(w = 384, hh = 230) {
    Object.assign(this, canvas2d(w, hh, 'rangemap', 1.5));
    this.cell = 6;
    const dots = [];
    for (let y = this.cell / 2; y < hh; y += this.cell) {
      for (let x = this.cell / 2; x < w; x += this.cell) {
        const lon = BOX[0] + (x / w) * (BOX[1] - BOX[0]);
        const lat = BOX[3] - (y / hh) * (BOX[3] - BOX[2]);
        const land = pointInPoly(lon, lat, MAINLAND) || pointInPoly(lon, lat, HAINAN) || pointInPoly(lon, lat, TAIWAN);
        if (!land) continue;
        let z = 0;
        for (const [zl, za, zr] of RANGE_ZONES) z = Math.max(z, clamp(1 - Math.hypot(lon - zl, (lat - za) * 1.1) / zr));
        dots.push({ x, y, z, r: hash2(x, y) });
      }
    }
    this.dots = dots;
  }
  toXY(lon, lat) {
    return [((lon - BOX[0]) / (BOX[1] - BOX[0])) * this.w, ((BOX[3] - lat) / (BOX[3] - BOX[2])) * this.h];
  }
  draw(t, land = 1, zones = 1) {
    const { ctx, w, h: hh } = this;
    ctx.clearRect(0, 0, w, hh);
    ctx.strokeStyle = 'rgba(111,231,255,0.08)';
    ctx.lineWidth = 1;
    ctx.beginPath();
    for (let lon = 98; lon <= 120; lon += 2) {
      const [x] = this.toXY(lon, 0);
      ctx.moveTo(x, 0);
      ctx.lineTo(x, hh);
    }
    for (let lat = 8; lat <= 26; lat += 2) {
      const [, y] = this.toXY(0, lat);
      ctx.moveTo(0, y);
      ctx.lineTo(w, y);
    }
    ctx.stroke();
    for (const d of this.dots) {
      const appear = clamp(land * 1.6 - d.r * 0.6);
      if (appear <= 0) continue;
      const hi = d.z > 0.05 ? clamp(zones * 1.5 - d.r * 0.5) * clamp(d.z * 2.2) : 0;
      if (hi > 0.02) {
        const pulse = 0.75 + 0.25 * Math.sin(t * 3 + d.x * 0.1);
        ctx.fillStyle = `rgba(111,231,255,${(0.35 + 0.65 * hi * pulse).toFixed(3)})`;
        ctx.fillRect(d.x - 2, d.y - 2, 4, 4);
      } else {
        ctx.fillStyle = `rgba(150,180,195,${(0.42 * appear).toFixed(3)})`;
        ctx.fillRect(d.x - 1.5, d.y - 1.5, 3, 3);
      }
    }
  }
}
