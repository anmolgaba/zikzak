"use client";

import { Howl } from "howler";
import type { Application, Graphics } from "pixi.js";
import { useEffect, useRef, useState } from "react";

type KeyConfig = { color: string; sound: string };
type Circle = { graphic: Graphics; hue: number; saturation: number; lightness: number };

const KEY_DATA: Record<string, KeyConfig> = {
  q: { sound: "bubbles.mp3", color: "#1abc9c" }, w: { sound: "clay.mp3", color: "#2ecc71" },
  e: { sound: "confetti.mp3", color: "#3498db" }, r: { sound: "corona.mp3", color: "#9b59b6" },
  t: { sound: "dotted-spiral.mp3", color: "#34495e" }, y: { sound: "flash-1.mp3", color: "#16a085" },
  u: { sound: "flash-2.mp3", color: "#27ae60" }, i: { sound: "flash-3.mp3", color: "#2980b9" },
  o: { sound: "glimmer.mp3", color: "#8e44ad" }, p: { sound: "moon.mp3", color: "#2c3e50" },
  a: { sound: "pinwheel.mp3", color: "#f1c40f" }, s: { sound: "piston-1.mp3", color: "#e67e22" },
  d: { sound: "piston-2.mp3", color: "#e74c3c" }, f: { sound: "prism-1.mp3", color: "#95a5a6" },
  g: { sound: "prism-2.mp3", color: "#f39c12" }, h: { sound: "prism-3.mp3", color: "#d35400" },
  j: { sound: "splits.mp3", color: "#1abc9c" }, k: { sound: "squiggle.mp3", color: "#2ecc71" },
  l: { sound: "strike.mp3", color: "#3498db" }, z: { sound: "suspension.mp3", color: "#9b59b6" },
  x: { sound: "timer.mp3", color: "#34495e" }, c: { sound: "ufo.mp3", color: "#16a085" },
  v: { sound: "veil.mp3", color: "#27ae60" }, b: { sound: "wipe.mp3", color: "#2980b9" },
  n: { sound: "zig-zag.mp3", color: "#8e44ad" }, m: { sound: "moon.mp3", color: "#2c3e50" },
};

function hexToHsl(hex: string) {
  const value = Number.parseInt(hex.slice(1), 16);
  const red = ((value >> 16) & 255) / 255;
  const green = ((value >> 8) & 255) / 255;
  const blue = (value & 255) / 255;
  const max = Math.max(red, green, blue);
  const min = Math.min(red, green, blue);
  const lightness = (max + min) / 2;
  const delta = max - min;
  const saturation = delta === 0 ? 0 : delta / (1 - Math.abs(2 * lightness - 1));
  const hue = delta === 0 ? 0 : ((max === red ? (green - blue) / delta : max === green ? (blue - red) / delta + 2 : (red - green) / delta + 4) * 60 + 360) % 360;
  return { hue, saturation, lightness };
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const chroma = (1 - Math.abs(2 * lightness - 1)) * saturation;
  const component = (hue / 60) % 6;
  const offset = lightness - chroma / 2;
  const [red, green, blue] = [[chroma, chroma * (1 - Math.abs(component % 2 - 1)), 0], [chroma * (1 - Math.abs(component % 2 - 1)), chroma, 0], [0, chroma, chroma * (1 - Math.abs(component % 2 - 1))], [0, chroma * (1 - Math.abs(component % 2 - 1)), chroma], [chroma * (1 - Math.abs(component % 2 - 1)), 0, chroma], [chroma, 0, chroma * (1 - Math.abs(component % 2 - 1))]][Math.floor(component)];
  return ((Math.round((red + offset) * 255) << 16) | (Math.round((green + offset) * 255) << 8) | Math.round((blue + offset) * 255));
}

export default function Home() {
  const stageRef = useRef<HTMLDivElement>(null);
  const [hasPressedKey, setHasPressedKey] = useState(false);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;
    let app: Application | undefined;
    let cancelled = false;
    let removeKeyListener = () => {};
    const circles: Circle[] = [];
    const sounds = Object.fromEntries(Object.entries(KEY_DATA).map(([key, { sound }]) => [key, new Howl({ src: [`/sounds/${sound}`] })])) as Record<string, Howl>;

    const start = async () => {
      const PIXI = await import("pixi.js");
      if (cancelled) return;
      app = new PIXI.Application();
      await app.init({ antialias: true, background: "#000000", resizeTo: stage, resolution: Math.min(window.devicePixelRatio, 2) });
      if (cancelled) { app.destroy(true, { children: true }); return; }
      stage.append(app.canvas);

      const handleKeyDown = (event: KeyboardEvent) => {
        const key = event.key.toLowerCase();
        const keyConfig = KEY_DATA[key];
        if (!keyConfig || !app) return;
        setHasPressedKey(true);
        const color = hexToHsl(keyConfig.color);
        const graphic = new PIXI.Graphics().circle(0, 0, 500).fill(0xffffff);
        graphic.tint = hslToHex(color.hue, color.saturation, color.lightness);
        graphic.position.set(Math.random() * app.screen.width, Math.random() * app.screen.height);
        app.stage.addChild(graphic);
        circles.push({ graphic, ...color });
        sounds[key].play();
      };

      app.ticker.add((ticker) => {
        const delta = Math.min(ticker.deltaTime, 3);
        for (let index = circles.length - 1; index >= 0; index -= 1) {
          const circle = circles[index];
          circle.hue = (circle.hue + delta) % 360;
          circle.graphic.tint = hslToHex(circle.hue, circle.saturation, circle.lightness);
          circle.graphic.scale.set(circle.graphic.scale.x * Math.pow(0.9, delta));
          if (Math.PI * 500 ** 2 * circle.graphic.scale.x ** 2 < 1) {
            circle.graphic.destroy();
            circles.splice(index, 1);
          }
        }
      });

      window.addEventListener("keydown", handleKeyDown);
      return () => window.removeEventListener("keydown", handleKeyDown);
    };

    void start().then((removeListener) => { if (removeListener) removeKeyListener = removeListener; });
    return () => {
      cancelled = true;
      removeKeyListener();
      circles.forEach(({ graphic }) => graphic.destroy());
      Object.values(sounds).forEach((sound) => sound.unload());
      app?.destroy(true, { children: true });
    };
  }, []);

  return (
    <div ref={stageRef} aria-label="Interactive sound circles" role="application">
      <p
        aria-hidden={hasPressedKey}
        className={`keyboard-prompt${hasPressedKey ? " keyboard-prompt--dismissed" : ""}`}
        role="status"
      >
        Press any key from A to Z, and turn up the speakers
      </p>
    </div>
  );
}
