import React, { useEffect, useRef } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import {
  COUNTRY_BORDERS,
  COUNTRY_FEATURES,
  getFeatureBaseColor,
} from '../data/worldMap';

const GRATICULE = geoGraticule10();

/**
 * Lightweight, slowly rotating 3D orthographic Earth for the startup screen hero.
 */
export const HeroGlobe: React.FC<{ size?: number }> = ({ size = 116 }) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    canvas.width = Math.floor(size * dpr);
    canvas.height = Math.floor(size * dpr);
    canvas.style.width = `${size}px`;
    canvas.style.height = `${size}px`;

    let rafId = 0;
    const startTime = performance.now();

    const draw = (now: number) => {
      const elapsedSec = (now - startTime) / 1000;
      const lon = -15 + elapsedSec * 12; // Gentle 12 deg/sec rotation
      const lat = -16 + Math.sin(elapsedSec * 0.35) * 6;

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, size, size);

      const cx = size / 2;
      const cy = size / 2;
      const radius = size * 0.41;

      const projection = geoOrthographic()
        .scale(radius)
        .translate([cx, cy])
        .rotate([lon, lat, 0])
        .clipAngle(90);

      const path = geoPath(projection, ctx);

      // Soft atmospheric halo
      const halo = ctx.createRadialGradient(cx, cy, radius * 0.88, cx, cy, radius * 1.2);
      halo.addColorStop(0, 'rgba(56, 189, 248, 0.34)');
      halo.addColorStop(0.55, 'rgba(10, 132, 255, 0.12)');
      halo.addColorStop(1, 'rgba(10, 132, 255, 0)');
      ctx.fillStyle = halo;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.2, 0, Math.PI * 2);
      ctx.fill();

      // Sunlit ocean sphere
      const ocean = ctx.createRadialGradient(
        cx - radius * 0.32,
        cy - radius * 0.32,
        radius * 0.05,
        cx,
        cy,
        radius
      );
      ocean.addColorStop(0, '#24669c');
      ocean.addColorStop(0.55, '#133a60');
      ocean.addColorStop(1, '#091c33');

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = ocean;
      ctx.fill();

      ctx.save();
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.clip();

      // Subtle graticule
      ctx.beginPath();
      path(GRATICULE);
      ctx.strokeStyle = 'rgba(148, 204, 255, 0.12)';
      ctx.lineWidth = 0.5;
      ctx.stroke();

      // Continents & subtly highlighted country pulse
      const highlightIdx = Math.floor(elapsedSec / 2.6) % COUNTRY_FEATURES.length;
      for (let i = 0; i < COUNTRY_FEATURES.length; i++) {
        const feat = COUNTRY_FEATURES[i];
        ctx.beginPath();
        path(feat);
        if (i === highlightIdx) {
          ctx.fillStyle = '#4ade80';
        } else {
          ctx.fillStyle = getFeatureBaseColor(feat);
        }
        ctx.fill();
      }

      // Crisp thin borders
      ctx.beginPath();
      path(COUNTRY_BORDERS);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.25)';
      ctx.lineWidth = 0.45;
      ctx.stroke();

      ctx.restore();

      // Rim highlight
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.42)';
      ctx.lineWidth = 1.1;
      ctx.stroke();

      ctx.restore();

      rafId = requestAnimationFrame(draw);
    };

    rafId = requestAnimationFrame(draw);
    return () => cancelAnimationFrame(rafId);
  }, [size]);

  return (
    <canvas
      ref={canvasRef}
      aria-hidden="true"
      className="block shrink-0 select-none pointer-events-none"
    />
  );
};
