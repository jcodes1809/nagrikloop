"use client";
import { useState } from "react";

function Street({ night }: { night?: boolean }) {
  const sky = night ? ["#1b2540", "#34406b"] : ["#bfe3f2", "#fdf0d5"];
  return (
    <>
      <defs>
        <linearGradient id={night ? "skyN" : "skyD"} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0" stopColor={sky[0]} /><stop offset="1" stopColor={sky[1]} />
        </linearGradient>
      </defs>
      <rect width="400" height="240" fill={`url(#${night ? "skyN" : "skyD"})`} />
      {night && [30, 90, 150, 250, 320, 370].map((x, i) => <circle key={x} cx={x} cy={20 + (i % 3) * 18} r="1.4" fill="#fff" opacity=".8" />)}
      <g fill={night ? "#2a3356" : "#cdd9d2"}>
        <rect x="0" y="95" width="70" height="75" /><rect x="76" y="75" width="58" height="95" /><rect x="140" y="105" width="64" height="65" />
        <rect x="262" y="82" width="62" height="88" /><rect x="330" y="100" width="70" height="70" />
      </g>
      <g fill={night ? "#f6d77a" : "#fff"} opacity={night ? 0.55 : 0.6}>
        {[10, 30, 50].map((x) => [105, 125].map((y) => <rect key={`${x}${y}`} x={x} y={y} width="9" height="10" />))}
        {[86, 106].map((x) => [90, 115, 140].map((y) => <rect key={`b${x}${y}`} x={x} y={y} width="9" height="10" />))}
      </g>
      <rect y="160" width="400" height="12" fill="#c4bba8" />
      <rect y="172" width="400" height="68" fill={night ? "#3b3f4a" : "#6d7278"} />
      <g fill="#e9e4d0" opacity=".8">{[10, 90, 170, 250, 330].map((x) => <rect key={x} x={x} y="208" width="40" height="4" rx="2" />)}</g>
    </>
  );
}

function Bag({ x, y, c, r = 1 }: { x: number; y: number; c: string; r?: number }) {
  return (
    <g transform={`translate(${x} ${y}) scale(${r})`}>
      <ellipse cx="0" cy="0" rx="22" ry="17" fill={c} /><path d="M-4 -16 q4 -9 8 0 z" fill={c} />
      <ellipse cx="-7" cy="-6" rx="6" ry="3" fill="#fff" opacity=".25" />
    </g>
  );
}

function Tree() {
  return <g><rect x="338" y="120" width="8" height="46" fill="#7a5a3a" /><circle cx="342" cy="112" r="26" fill="#3f9b5a" /><circle cx="328" cy="124" r="16" fill="#52b06b" /><circle cx="356" cy="122" r="15" fill="#2f8a4d" /></g>;
}

function Spark({ x, y, s = 1 }: { x: number; y: number; s?: number }) {
  return <path transform={`translate(${x} ${y}) scale(${s})`} d="M0 -9 L2.4 -2.4 L9 0 L2.4 2.4 L0 9 L-2.4 2.4 L-9 0 L-2.4 -2.4 Z" fill="#ffd34d" />;
}

export function Scene({ kind, label }: { kind: string; label?: string }) {
  const k = kind.replace("scene:", "");
  const night = k === "light" || k === "litlight";
  return (
    <svg viewBox="0 0 400 240" preserveAspectRatio="xMidYMid slice" className="scene" role="img" aria-label={label ?? `Illustration: ${k}`}>
      <Street night={night} />
      {k === "garbage" && (
        <g>
          <ellipse cx="195" cy="182" rx="95" ry="12" fill="#000" opacity=".14" />
          <Bag x={140} y={165} c="#2e3b34" r={1.15} /><Bag x={185} y={150} c="#3b5d7a" r={1.2} /><Bag x={232} y={165} c="#2e3b34" r={1.15} />
          <Bag x={162} y={138} c="#6b7a52" /><Bag x={212} y={134} c="#33415c" /><Bag x={188} y={116} c="#4a5a3d" r={0.95} />
          <Bag x={118} y={178} c="#586b8a" r={0.8} /><Bag x={262} y={180} c="#3b3b3b" r={0.8} />
          <g transform="rotate(-70 300 160)"><rect x="285" y="130" width="34" height="42" rx="4" fill="#2f7d52" /><rect x="282" y="126" width="40" height="7" rx="3" fill="#256542" /></g>
          <g fill="#222" opacity=".7">{[[170, 100], [200, 92], [226, 108], [150, 118]].map(([x, y], i) => <circle key={i} cx={x} cy={y} r="1.8" />)}</g>
          <g fill="#e7e1cf">{[[90, 192], [310, 196], [60, 184]].map(([x, y], i) => <rect key={i} x={x} y={y} width="9" height="6" rx="1" transform={`rotate(${i * 25} ${x} ${y})`} />)}</g>
        </g>
      )}
      {k === "clean" && (
        <g>
          <Tree />
          <rect x="120" y="128" width="34" height="42" rx="4" fill="#2f7d52" /><rect x="116" y="123" width="42" height="8" rx="3" fill="#256542" />
          <Spark x={200} y={120} s={1.4} /><Spark x={246} y={150} /><Spark x={90} y={140} s={0.8} /><Spark x={300} y={110} s={0.9} />
          <g fill="#58b36e">{[40, 70, 230, 270].map((x) => <circle key={x} cx={x} cy="166" r="6" />)}</g>
        </g>
      )}
      {k === "pothole" && (
        <g>
          <ellipse cx="200" cy="205" rx="82" ry="22" fill="#2a2d31" /><ellipse cx="200" cy="201" rx="64" ry="14" fill="#1a1c1f" />
          <path d="M120 200 l-30 -8 M280 198 l34 -10 M170 186 l-8 -16 M232 186 l10 -14" stroke="#2a2d31" strokeWidth="3" fill="none" strokeLinecap="round" />
          <g transform="translate(300 175)"><path d="M0 40 L12 0 L24 40 Z" fill="#f2761f" /><rect x="3" y="18" width="18" height="6" fill="#fff" /></g>
        </g>
      )}
      {k === "cleanroad" && (
        <g>
          <rect x="120" y="186" width="160" height="34" rx="8" fill="#5a5f66" /><rect x="120" y="186" width="160" height="6" rx="3" fill="#7b8189" opacity=".6" />
          <Spark x={200} y={170} s={1.3} /><Spark x={290} y={185} s={0.8} /><Tree />
        </g>
      )}
      {k === "light" && (
        <g>
          <rect x="196" y="62" width="8" height="106" fill="#4b5563" /><path d="M200 62 h44 v8 h-44 z" fill="#4b5563" />
          <rect x="228" y="70" width="26" height="9" rx="4" fill="#20242c" />
          <text x="150" y="40" fontSize="11" fill="#9fb0d9" opacity=".9">dark since 7 days</text>
        </g>
      )}
      {k === "litlight" && (
        <g>
          <circle cx="241" cy="80" r="46" fill="#ffd96a" opacity=".28" /><circle cx="241" cy="80" r="26" fill="#ffd96a" opacity=".35" />
          <rect x="196" y="62" width="8" height="106" fill="#4b5563" /><path d="M200 62 h44 v8 h-44 z" fill="#4b5563" />
          <rect x="228" y="70" width="26" height="9" rx="4" fill="#fff3b0" />
          <path d="M215 80 L270 170 L190 170 Z" fill="#ffe9a0" opacity=".16" />
        </g>
      )}
      {k === "water" && (
        <g>
          <rect x="60" y="150" width="280" height="10" rx="5" fill="#8b949e" /><rect x="190" y="146" width="20" height="18" fill="#6b747d" />
          <g fill="#4aa8e8">{[[192, 130], [200, 118], [208, 128], [184, 118], [216, 116], [198, 104]].map(([x, y], i) => <path key={i} transform={`translate(${x} ${y})`} d="M0 -7 q6 8 0 12 q-6 -4 0 -12z" />)}</g>
          <ellipse cx="200" cy="205" rx="90" ry="16" fill="#4aa8e8" opacity=".75" /><ellipse cx="190" cy="202" rx="40" ry="6" fill="#bfe6fb" opacity=".6" />
        </g>
      )}
      {k === "drain" && (
        <g>
          <ellipse cx="200" cy="203" rx="100" ry="20" fill="#6b5b3e" opacity=".85" /><ellipse cx="200" cy="198" rx="40" ry="9" fill="#2a2d31" />
          <circle cx="170" cy="188" r="5" fill="#8a7650" /><circle cx="236" cy="192" r="6" fill="#8a7650" /><circle cx="214" cy="180" r="4" fill="#8a7650" />
        </g>
      )}
    </svg>
  );
}

export function Photo({ src, alt }: { src: string; alt?: string }) {
  if (src.startsWith("scene:")) return <Scene kind={src} label={alt} />;
  if (src.startsWith("data:image/")) {
    // eslint-disable-next-line @next/next/no-img-element
    return <img className="photo" src={src} alt={alt ?? "Citizen photo"} />;
  }
  return <Scene kind="scene:garbage" label={alt} />;
}

export function CharminarArt() {
  const minaret = (x: number, d = 0) => (
    <g key={x} opacity={d ? 0.78 : 1}>
      <rect x={x - 7} y={74} width="14" height="200" fill={d ? "#d3b98c" : "#ecd9b2"} />
      <rect x={x - 7} y={74} width="5" height="200" fill="#c9ab78" opacity=".55" />
      <rect x={x - 12} y={132} width="24" height="6" fill="#b89560" /><rect x={x - 11} y={102} width="22" height="5" fill="#b89560" />
      <path d={`M${x - 10} 74 Q${x} 36 ${x + 10} 74 Z`} fill={d ? "#d9bf93" : "#f3e3c0"} />
      <rect x={x - 1} y={28} width="2" height="16" fill="#b89560" /><circle cx={x} cy={26} r="3" fill="#e8890c" />
    </g>
  );
  return (
    <svg viewBox="0 0 800 300" preserveAspectRatio="xMidYMid slice" className="scene" role="img" aria-label="Illustration of the Charminar, Hyderabad, at sunset">
      <defs>
        <linearGradient id="ch-sky" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#f6a54a" /><stop offset=".5" stopColor="#fbd186" /><stop offset="1" stopColor="#fdeccb" /></linearGradient>
        <linearGradient id="ch-g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stopColor="#0f6b63" /><stop offset="1" stopColor="#0a4a45" /></linearGradient>
      </defs>
      <rect width="800" height="300" fill="url(#ch-sky)" />
      <circle cx="610" cy="96" r="44" fill="#fff3d1" opacity=".85" /><circle cx="610" cy="96" r="70" fill="#fff3d1" opacity=".25" />
      <g fill="#e4b77a" opacity=".7"><rect x="0" y="190" width="120" height="110" /><rect x="110" y="170" width="70" height="130" /><rect x="610" y="180" width="90" height="120" /><rect x="690" y="160" width="110" height="140" /></g>
      <g fill="#d9a766" opacity=".8">{[40, 78, 126, 640, 720, 760].map((x) => <path key={x} d={`M${x} 190 q10 -22 20 0 z`} />)}</g>
      <rect x="0" y="262" width="800" height="38" fill="url(#ch-g)" />
<g transform="translate(190 0)">
      {minaret(344, 1)}{minaret(456, 1)}
      <rect x="312" y="128" width="176" height="146" fill="#f0dfb9" />
      <rect x="312" y="128" width="176" height="10" fill="#c9ab78" /><rect x="312" y="156" width="176" height="6" fill="#c9ab78" />
      {[330, 352, 374, 400, 426, 448, 470].map((x) => <path key={x} d={`M${x - 9} 156 q9 -26 18 0 z`} fill="#f7ead0" />)}
      <path d="M382 128 Q400 84 418 128 Z" fill="#f7ead0" /><rect x="399" y="70" width="2" height="22" fill="#b89560" /><circle cx="400" cy="68" r="3.5" fill="#e8890c" />
      {[322, 478].map((x) => <path key={x} d={`M${x - 9} 128 q9 -26 18 0 z`} fill="#f7ead0" />)}
      <path d="M330 274 v-50 q22 -34 44 0 v50 z" fill="#7a5a3a" /><path d="M426 274 v-50 q22 -34 44 0 v50 z" fill="#7a5a3a" />
      <path d="M376 274 v-70 q24 -48 48 0 v70 z" fill="#5d4129" />
      <path d="M382 274 v-62 q18 -38 36 0 v62 z" fill="#ffd27a" opacity=".55" />
      {minaret(318)}{minaret(482)}
      </g>
      <g fill="#6b4a2a" opacity=".85">{[[120, 70], [160, 52], [560, 62], [210, 90]].map(([x, y], i) => <path key={i} d={`M${x} ${y} q8 -8 16 0 q8 -8 16 0`} stroke="#6b4a2a" strokeWidth="2" fill="none" />)}</g>
    </svg>
  );
}

export function HeroPhoto() {
  const [ok, setOk] = useState(false);
  return (
    <div className="hero-art">
      <CharminarArt />
      {/* Drop a real photo at public/photos/charminar.jpg and it fades in automatically. */}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/photos/charminar.jpg" alt="Charminar, Hyderabad" onLoad={() => setOk(true)} onError={() => setOk(false)} style={{ opacity: ok ? 1 : 0 }} className="hero-photo" />
    </div>
  );
}
