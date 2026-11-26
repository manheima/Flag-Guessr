import React, { useEffect, useRef, useState } from 'react';
import { geoGraticule10, geoOrthographic, geoPath } from 'd3-geo';
import versor from 'versor';
import { RotateCcw, FastForward } from 'lucide-react';
import { CONTINENT_VIEW } from '../data/countries';
import {
  COUNTRY_BORDERS,
  COUNTRY_FEATURES,
  getCountryFeature,
  getFeatureBaseColor,
  getFeatureContinent,
} from '../data/worldMap';
import type { Country } from '../types/game';

interface GlobeRevealProps {
  country: Country;
  compact?: boolean;
  skipIntro?: boolean;
  showReplay?: boolean;
  onAnimationComplete?: () => void;
  onSkip?: () => void;
}

const GRATICULE = geoGraticule10();
const TOTAL_DURATION_MS = 1750; // Crisp, satisfying, strictly <= 2s!
const PHASE1_END = 0.34; // 0 -> 595ms: Spin globe to center continent & zoom slightly
const PHASE2_END = 0.72; // 595ms -> 1260ms: Glide & zoom into country
// PHASE3: 1260ms -> 1750ms: Highlight country + pulse beacon + final zoom settle

function easeInOutCubic(t: number): number {
  return t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;
}

function easeOutQuart(t: number): number {
  return 1 - Math.pow(1 - t, 4);
}

function clamp01(v: number): number {
  return Math.max(0, Math.min(1, v));
}

export const GlobeReveal: React.FC<GlobeRevealProps> = ({
  country,
  compact = false,
  skipIntro = false,
  showReplay = true,
  onAnimationComplete,
  onSkip,
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const completedRef = useRef(false);
  const onCompleteRef = useRef(onAnimationComplete);
  onCompleteRef.current = onAnimationComplete;

  const [stageLabel, setStageLabel] = useState<string>(country.continent);
  const stageCountryShownRef = useRef(false);
  const [replaySeed, setReplaySeed] = useState(0);

  // Interactive drag, pinch-to-zoom, and momentum state when resting in compact mode
  const dragRotationRef = useRef<[number, number, number] | null>(null);
  const activePointersRef = useRef<Map<number, [number, number]>>(new Map());
  const lastPinchDistRef = useRef<number | null>(null);
  const velocityRef = useRef<[number, number]>([0, 0]);
  const lastMoveTimeRef = useRef<number>(0);
  const currentZoomRef = useRef<number>(country.zoom);
  const currentRadiusRef = useRef<number>(180);
  const animFinishedRef = useRef<boolean>(skipIntro);

  // Reset state whenever country or replay changes
  useEffect(() => {
    completedRef.current = skipIntro;
    animFinishedRef.current = skipIntro;
    stageCountryShownRef.current = skipIntro;
    dragRotationRef.current = null;
    activePointersRef.current.clear();
    lastPinchDistRef.current = null;
    velocityRef.current = [0, 0];
    setStageLabel(skipIntro ? country.name : country.continent);
  }, [country.code, country.name, country.continent, replaySeed, skipIntro]);

  // Prevent browser scroll / pull-to-refresh on touch devices & support wheel zoom in compact mode
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !compact) return;

    const onTouchMove = (e: TouchEvent) => {
      e.preventDefault();
    };

    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      if (!dragRotationRef.current) {
        dragRotationRef.current = [-country.lon, -country.lat, 0];
      }
      const factor = Math.exp(-e.deltaY * 0.002);
      const maxZoom = Math.max(country.zoom * 1.4, 6.2);
      currentZoomRef.current = Math.max(0.95, Math.min(maxZoom, currentZoomRef.current * factor));
    };

    canvas.addEventListener('touchmove', onTouchMove, { passive: false });
    canvas.addEventListener('wheel', onWheel, { passive: false });
    return () => {
      canvas.removeEventListener('touchmove', onTouchMove);
      canvas.removeEventListener('wheel', onWheel);
    };
  }, [compact, country.lon, country.lat, country.zoom]);

  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    const contView = CONTINENT_VIEW[country.continent];
    const targetFeature = getCountryFeature(country);

    // Choose a dramatic starting rotation (~95 deg offset so the globe always spins clearly)
    const startLon = contView.lon - 95;
    const startLat = contView.lat > 10 ? -15 : 22;

    const rotStart: [number, number, number] = [-startLon, -startLat, 0];
    const rotContinent: [number, number, number] = [-contView.lon, -contView.lat, 0];
    const rotCountry: [number, number, number] = [-country.lon, -country.lat, 0];

    const interpToContinent = versor.interpolate(rotStart, rotContinent);
    const interpToCountry = versor.interpolate(rotContinent, rotCountry);

    const startZoom = 0.96;
    const continentZoom = contView.zoom;
    const midCountryZoom = Math.min(country.zoom * 0.9, country.zoom - 0.15);
    const finalCountryZoom = country.zoom;

    let rafId = 0;
    const startTime = performance.now();

    const drawFrame = (now: number) => {
      const rect = container.getBoundingClientRect();
      const width = Math.max(200, Math.floor(rect.width));
      const height = Math.max(160, Math.floor(rect.height));
      const dpr = Math.min(window.devicePixelRatio || 1, 2);

      if (canvas.width !== Math.floor(width * dpr) || canvas.height !== Math.floor(height * dpr)) {
        canvas.width = Math.floor(width * dpr);
        canvas.height = Math.floor(height * dpr);
        canvas.style.width = `${width}px`;
        canvas.style.height = `${height}px`;
      }

      ctx.save();
      ctx.scale(dpr, dpr);
      ctx.clearRect(0, 0, width, height);

      const elapsed = now - startTime;
      // If we entered compact mode after animation already ran, jump directly to final state
      const rawT = animFinishedRef.current ? 1 : clamp01(elapsed / TOTAL_DURATION_MS);

      let rotation: [number, number, number];
      let zoom: number;
      let continentGlow = 0;
      let countryGlow = 0;
      let pulseT = 0;

      if (dragRotationRef.current) {
        // Apply gentle swipe inertia when no fingers are touching
        if (activePointersRef.current.size === 0) {
          const [vx, vy] = velocityRef.current;
          if (Math.abs(vx) > 0.015 || Math.abs(vy) > 0.015) {
            const [lon, lat, roll] = dragRotationRef.current;
            dragRotationRef.current = [
              lon + vx,
              Math.max(-85, Math.min(85, lat + vy)),
              roll,
            ];
            velocityRef.current = [vx * 0.9, vy * 0.9];
          } else {
            velocityRef.current = [0, 0];
          }
        }
        rotation = dragRotationRef.current;
        zoom = currentZoomRef.current;
        continentGlow = 0.45;
        countryGlow = 1;
        pulseT = ((now % 1800) / 1800);
      } else if (rawT <= PHASE1_END) {
        const p1 = easeInOutCubic(rawT / PHASE1_END);
        rotation = interpToContinent(p1);
        zoom = startZoom + (continentZoom - startZoom) * p1;
        continentGlow = clamp01((p1 - 0.35) / 0.65);
        countryGlow = 0;
      } else if (rawT <= PHASE2_END) {
        const p2 = easeInOutCubic((rawT - PHASE1_END) / (PHASE2_END - PHASE1_END));
        rotation = interpToCountry(p2);
        zoom = continentZoom + (midCountryZoom - continentZoom) * p2;
        continentGlow = 1 - p2 * 0.55;
        countryGlow = clamp01((p2 - 0.45) / 0.55) * 0.65;
      } else {
        const p3 = easeOutQuart((rawT - PHASE2_END) / (1 - PHASE2_END));
        rotation = rotCountry;
        zoom = midCountryZoom + (finalCountryZoom - midCountryZoom) * p3;
        continentGlow = 0.45;
        countryGlow = 0.65 + 0.35 * p3;
        pulseT = animFinishedRef.current ? (now % 2200) / 2200 : p3;
      }

      currentZoomRef.current = zoom;

      if (!stageCountryShownRef.current && rawT >= PHASE2_END) {
        stageCountryShownRef.current = true;
        setStageLabel(country.name);
      }

      // Base radius fits nicely inside container
      const baseRadius = Math.min(width, height) * (compact ? 0.46 : 0.44);
      const radius = baseRadius * zoom;
      currentRadiusRef.current = radius;
      const cx = width / 2;
      const cy = height / 2;

      const projection = geoOrthographic()
        .scale(radius)
        .translate([cx, cy])
        .rotate(rotation)
        .clipAngle(90);

      const path = geoPath(projection, ctx);

      // 1. Subtle space/atmosphere outer glow
      const atmoGrad = ctx.createRadialGradient(
        cx,
        cy,
        radius * 0.92,
        cx,
        cy,
        radius * 1.14
      );
      atmoGrad.addColorStop(0, 'rgba(56, 189, 248, 0.24)');
      atmoGrad.addColorStop(0.5, 'rgba(37, 99, 235, 0.08)');
      atmoGrad.addColorStop(1, 'rgba(15, 23, 42, 0)');
      ctx.fillStyle = atmoGrad;
      ctx.beginPath();
      ctx.arc(cx, cy, radius * 1.14, 0, Math.PI * 2);
      ctx.fill();

      // 2. Ocean Sphere with 3D sunlit radial gradient
      const oceanGrad = ctx.createRadialGradient(
        cx - radius * 0.28,
        cy - radius * 0.28,
        radius * 0.06,
        cx,
        cy,
        radius
      );
      oceanGrad.addColorStop(0, '#1e4e79');
      oceanGrad.addColorStop(0.55, '#133354');
      oceanGrad.addColorStop(1, '#0b1e36');

      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.fillStyle = oceanGrad;
      ctx.fill();

      // Clip all subsequent map drawing cleanly inside the sphere
      ctx.save();
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.clip();

      // 3. Subtle graticule lines
      ctx.beginPath();
      path(GRATICULE);
      ctx.strokeStyle = 'rgba(148, 204, 255, 0.11)';
      ctx.lineWidth = 0.65;
      ctx.stroke();

      // 4. Draw all countries with warm muted atlas palette + soft continent highlight
      for (const feat of COUNTRY_FEATURES) {
        const isTarget = feat === targetFeature;
        if (isTarget) continue; // draw target on top with glow!

        const featCont = getFeatureContinent(feat);
        const isSameContinent = featCont === country.continent;

        ctx.beginPath();
        path(feat);

        if (isSameContinent && continentGlow > 0.01) {
          ctx.fillStyle = getFeatureBaseColor(feat);
          ctx.fill();
          ctx.fillStyle = `rgba(125, 211, 252, ${0.14 * continentGlow})`;
          ctx.fill();
        } else {
          ctx.fillStyle = getFeatureBaseColor(feat);
          ctx.fill();
        }
      }

      // 5. Crisp country borders
      ctx.beginPath();
      path(COUNTRY_BORDERS);
      ctx.strokeStyle = 'rgba(203, 213, 225, 0.34)';
      ctx.lineWidth = Math.min(1.1, 0.55 + zoom * 0.12);
      ctx.stroke();

      // 6. Highlight target country polygon with vivid emerald glow!
      if (targetFeature && countryGlow > 0.01) {
        ctx.save();
        ctx.shadowColor = `rgba(74, 222, 128, ${0.9 * countryGlow})`;
        ctx.shadowBlur = 18 * countryGlow;

        ctx.beginPath();
        path(targetFeature);
        ctx.fillStyle = `rgba(74, 222, 128, ${0.25 + 0.72 * countryGlow})`;
        ctx.fill();

        ctx.lineWidth = Math.max(1.8, Math.min(2.8, 1.3 + zoom * 0.25));
        ctx.strokeStyle = `rgba(220, 252, 231, ${countryGlow})`;
        ctx.stroke();
        ctx.restore();
      }

      // 7. Beacon / radar ring for the country center (especially critical for microstates/islands!)
      const projected = projection([country.lon, country.lat]);
      if (projected && countryGlow > 0.15) {
        const [px, py] = projected;
        const needsStrongBeacon = Boolean(country.isMicrostate || !targetFeature);

        // Expanding radar pulse ring
        const ringAlpha = (1 - pulseT) * (needsStrongBeacon ? 0.9 : 0.65) * countryGlow;
        const maxRingR = needsStrongBeacon ? 28 : 20;
        const ringR = 5 + pulseT * maxRingR;

        if (ringAlpha > 0.02) {
          ctx.beginPath();
          ctx.arc(px, py, ringR, 0, Math.PI * 2);
          ctx.strokeStyle = `rgba(134, 239, 172, ${ringAlpha})`;
          ctx.lineWidth = needsStrongBeacon ? 2.4 : 1.8;
          ctx.stroke();
        }

        // Steady spotlight halo for microstates/tiny islands so they're unmistakable
        if (needsStrongBeacon) {
          ctx.beginPath();
          ctx.arc(px, py, 12, 0, Math.PI * 2);
          ctx.fillStyle = `rgba(74, 222, 128, ${0.22 * countryGlow})`;
          ctx.fill();
          ctx.strokeStyle = `rgba(187, 247, 208, ${0.9 * countryGlow})`;
          ctx.lineWidth = 1.6;
          ctx.stroke();
        }

        // Crisp center dot
        ctx.beginPath();
        ctx.arc(px, py, needsStrongBeacon ? 4.2 : 3.2, 0, Math.PI * 2);
        ctx.fillStyle = '#ffffff';
        ctx.fill();
        ctx.lineWidth = 1.6;
        ctx.strokeStyle = '#15803d';
        ctx.stroke();
      }

      ctx.restore(); // end sphere clip

      // 8. Crisp sphere rim outline
      ctx.beginPath();
      path({ type: 'Sphere' });
      ctx.strokeStyle = 'rgba(125, 211, 252, 0.35)';
      ctx.lineWidth = 1.3;
      ctx.stroke();

      ctx.restore();

      if (rawT < 1) {
        rafId = requestAnimationFrame(drawFrame);
      } else {
        animFinishedRef.current = true;
        if (!completedRef.current) {
          completedRef.current = true;
          onCompleteRef.current?.();
        }
        // Keep a gentle slow pulse alive while resting in compact mode
        if (compact) {
          rafId = requestAnimationFrame(drawFrame);
        }
      }
    };

    rafId = requestAnimationFrame(drawFrame);
    return () => cancelAnimationFrame(rafId);
  }, [country, compact, replaySeed]);

  // Smooth 1-finger / mouse drag + 2-finger pinch-to-zoom once resting in compact mode
  const handlePointerDown = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!compact) return;
    e.preventDefault();
    activePointersRef.current.set(e.pointerId, [e.clientX, e.clientY]);
    velocityRef.current = [0, 0];
    lastMoveTimeRef.current = performance.now();

    if (!dragRotationRef.current) {
      dragRotationRef.current = [-country.lon, -country.lat, 0];
    }

    if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      lastPinchDistRef.current = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
    }

    try {
      e.currentTarget.setPointerCapture(e.pointerId);
    } catch {
      // ignore if capture is unavailable
    }
  };

  const handlePointerMove = (e: React.PointerEvent<HTMLCanvasElement>) => {
    if (!compact || !activePointersRef.current.has(e.pointerId) || !dragRotationRef.current) {
      return;
    }
    e.preventDefault();

    const prevPos = activePointersRef.current.get(e.pointerId)!;
    const nextPos: [number, number] = [e.clientX, e.clientY];
    activePointersRef.current.set(e.pointerId, nextPos);

    if (activePointersRef.current.size === 1) {
      const dx = nextPos[0] - prevPos[0];
      const dy = nextPos[1] - prevPos[1];

      // True 1:1 spherical arc sensitivity matched to current rendered globe radius
      const degPerPx = (180 / Math.PI) / Math.max(48, currentRadiusRef.current);
      const [lon, lat, roll] = dragRotationRef.current;
      const lonCos = Math.max(0.35, Math.cos((lat * Math.PI) / 180));
      const dLon = (dx * degPerPx) / lonCos;
      const dLat = -dy * degPerPx;

      dragRotationRef.current = [
        lon + dLon,
        Math.max(-85, Math.min(85, lat + dLat)),
        roll,
      ];

      // Smooth velocity sample for gentle flick inertia
      const now = performance.now();
      const dt = Math.max(8, now - lastMoveTimeRef.current);
      lastMoveTimeRef.current = now;
      const scale = 16 / dt;
      velocityRef.current = [
        velocityRef.current[0] * 0.45 + dLon * scale * 0.55,
        velocityRef.current[1] * 0.45 + dLat * scale * 0.55,
      ];
    } else if (activePointersRef.current.size === 2) {
      const pts = Array.from(activePointersRef.current.values());
      const dist = Math.hypot(pts[1][0] - pts[0][0], pts[1][1] - pts[0][1]);
      if (lastPinchDistRef.current && lastPinchDistRef.current > 8 && dist > 8) {
        const ratio = dist / lastPinchDistRef.current;
        const maxZoom = Math.max(country.zoom * 1.4, 6.2);
        currentZoomRef.current = Math.max(
          0.95,
          Math.min(maxZoom, currentZoomRef.current * ratio)
        );
      }
      lastPinchDistRef.current = dist;
      velocityRef.current = [0, 0];
    }
  };

  const handlePointerUp = (e: React.PointerEvent<HTMLCanvasElement>) => {
    activePointersRef.current.delete(e.pointerId);
    if (activePointersRef.current.size < 2) {
      lastPinchDistRef.current = null;
    }
    // Zero out inertia if the user paused before lifting finger
    if (performance.now() - lastMoveTimeRef.current > 80) {
      velocityRef.current = [0, 0];
    }
    try {
      if (e.currentTarget.hasPointerCapture(e.pointerId)) {
        e.currentTarget.releasePointerCapture(e.pointerId);
      }
    } catch {
      // ignore
    }
  };

  const handleReplay = () => {
    dragRotationRef.current = null;
    activePointersRef.current.clear();
    lastPinchDistRef.current = null;
    velocityRef.current = [0, 0];
    animFinishedRef.current = false;
    completedRef.current = true; // don't re-trigger phase advance on manual replay
    setReplaySeed((s) => s + 1);
  };

  return (
    <div
      className={`relative w-full overflow-hidden rounded-2xl bg-[#0e1522] border border-white/10 shadow-xl transition-all duration-300 select-none ${
        compact ? 'h-[190px] sm:h-[210px] touch-none' : 'h-[320px] sm:h-[360px]'
      }`}
    >
      <div ref={containerRef} className="w-full h-full">
        <canvas
          ref={canvasRef}
          onPointerDown={handlePointerDown}
          onPointerMove={handlePointerMove}
          onPointerUp={handlePointerUp}
          onPointerCancel={handlePointerUp}
          onContextMenu={(e) => e.preventDefault()}
          className={`block w-full h-full select-none ${
            compact ? 'touch-none cursor-grab active:cursor-grabbing' : ''
          }`}
        />
      </div>

      {/* Top-left location badge */}
      <div className="pointer-events-none absolute top-3 left-3 flex items-center gap-2">
        <span className="inline-flex items-center gap-1.5 rounded-full bg-black/65 backdrop-blur-md px-3 py-1 text-xs font-semibold text-emerald-300 border border-emerald-400/30 shadow-sm">
          <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
          {compact ? country.name : stageLabel}
        </span>
        <span className="rounded-full bg-black/55 backdrop-blur-md px-2.5 py-1 text-[11px] font-medium text-slate-300 border border-white/10">
          {country.continent}
        </span>
      </div>

      {/* Top-right action button: Skip during reveal, or Replay in compact capital view */}
      <div className="absolute top-3 right-3 flex items-center gap-1.5">
        {!compact && onSkip && (
          <button
            type="button"
            onClick={onSkip}
            className="inline-flex items-center gap-1 rounded-full bg-black/60 hover:bg-black/80 text-slate-200 hover:text-white px-2.5 py-1 text-xs font-medium border border-white/15 transition cursor-pointer"
            title="Skip animation (Space)"
          >
            <span>Skip</span>
            <FastForward className="w-3.5 h-3.5" />
          </button>
        )}
        {compact && showReplay && (
          <button
            type="button"
            onClick={handleReplay}
            className="inline-flex items-center gap-1 rounded-full bg-black/60 hover:bg-black/80 text-slate-200 hover:text-white px-2.5 py-1 text-[11px] font-medium border border-white/15 transition cursor-pointer"
            title="Replay globe zoom"
          >
            <RotateCcw className="w-3 h-3" />
            <span>Replay</span>
          </button>
        )}
      </div>

      {/* Bottom subtle hint when compact */}
      {compact && (
        <div className="pointer-events-none absolute bottom-2 right-3 text-[10px] text-slate-400/80 bg-black/40 px-2 py-0.5 rounded-full">
          Drag or pinch to explore
        </div>
      )}
    </div>
  );
};
