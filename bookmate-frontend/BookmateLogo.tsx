import { useMemo } from 'react';
import { View } from 'react-native';
import { SvgXml } from 'react-native-svg';

let _uid = 0;

export default function BookmateLogo({ size = 88 }: { size?: number }) {
  // Unique prefix per instance — prevents SVG id collisions on web
  const p = useMemo(() => `bm${++_uid}`, []);
  const r = Math.round(size * 0.28);

  const xml = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="88 88 224 224" preserveAspectRatio="xMidYMid meet">
  <defs>
    <radialGradient id="${p}orb1" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#5830c8" stop-opacity="0.30"/>
      <stop offset="100%" stop-color="#5830c8" stop-opacity="0"/>
    </radialGradient>
    <radialGradient id="${p}orb2" cx="50%" cy="50%" r="50%">
      <stop offset="0%" stop-color="#2662d2" stop-opacity="0.18"/>
      <stop offset="100%" stop-color="#2662d2" stop-opacity="0"/>
    </radialGradient>
    <filter id="${p}glow1" x="-60%" y="-60%" width="220%" height="220%">
      <feGaussianBlur stdDeviation="32"/>
    </filter>
    <filter id="${p}glow2" x="-50%" y="-50%" width="200%" height="200%">
      <feGaussianBlur stdDeviation="18"/>
    </filter>
    <filter id="${p}glow3" x="-40%" y="-40%" width="180%" height="180%">
      <feGaussianBlur stdDeviation="9"/>
    </filter>
    <linearGradient id="${p}pinGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#d4beff" stop-opacity="0.97"/>
      <stop offset="52%" stop-color="#8a3ee4" stop-opacity="0.86"/>
      <stop offset="100%" stop-color="#4516aa" stop-opacity="0.78"/>
    </linearGradient>
    <linearGradient id="${p}shine" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.60"/>
      <stop offset="100%" stop-color="#ffffff" stop-opacity="0"/>
    </linearGradient>
    <linearGradient id="${p}personGrad" x1="0" y1="0" x2="0" y2="1">
      <stop offset="0%" stop-color="#ffffff" stop-opacity="0.96"/>
      <stop offset="100%" stop-color="#e8d8ff" stop-opacity="0.82"/>
    </linearGradient>
    <clipPath id="${p}cClip">
      <circle cx="200" cy="178" r="65"/>
    </clipPath>
    <clipPath id="${p}pClip">
      <path d="M200,113 A65,65 0,0,1 232.5,236 L200,314 L167.5,236 A65,65 0,0,1 200,113 Z"/>
    </clipPath>
  </defs>

  <ellipse cx="70"  cy="85"  rx="210" ry="210" fill="url(#${p}orb1)"/>
  <ellipse cx="345" cy="335" rx="165" ry="165" fill="url(#${p}orb2)"/>

  <ellipse cx="200" cy="215" rx="115" ry="125" fill="#8855cc" fill-opacity="0.20" filter="url(#${p}glow1)"/>
  <ellipse cx="200" cy="210" rx="88"  ry="98"  fill="#c8a8ff" fill-opacity="0.12" filter="url(#${p}glow2)"/>
  <ellipse cx="200" cy="205" rx="68"  ry="76"  fill="#ffffff" fill-opacity="0.06"  filter="url(#${p}glow3)"/>
  <ellipse cx="200" cy="162" rx="52"  ry="18"  fill="#ffffff" fill-opacity="0.08"  filter="url(#${p}glow3)"/>

  <path d="M200,113 A65,65 0,0,1 232.5,236 L200,314 L167.5,236 A65,65 0,0,1 200,113 Z"
    fill="url(#${p}pinGrad)" stroke="#dbbfff" stroke-width="1" stroke-opacity="0.35" stroke-linejoin="round"/>

  <ellipse cx="200" cy="148" rx="32" ry="17" fill="url(#${p}shine)" clip-path="url(#${p}cClip)"/>
  <circle cx="200" cy="178" r="64" fill="none" stroke="#ffffff" stroke-width="1.2" stroke-opacity="0.22"/>

  <g clip-path="url(#${p}cClip)">
    <circle cx="182" cy="160" r="15" fill="url(#${p}personGrad)"/>
    <path d="M144,200 Q182,178 202,192" fill="none" stroke="url(#${p}personGrad)" stroke-width="17" stroke-linecap="round"/>
    <circle cx="218" cy="160" r="15" fill="url(#${p}personGrad)"/>
    <path d="M198,192 Q218,178 256,200" fill="none" stroke="url(#${p}personGrad)" stroke-width="17" stroke-linecap="round"/>
    <path d="M191,162 Q200,153 209,162" fill="none" stroke="#ffffff" stroke-opacity="0.38" stroke-width="2" stroke-linecap="round"/>
  </g>

  <line x1="200" y1="314" x2="168" y2="239" stroke="#ffffff" stroke-width="1" stroke-opacity="0.14" stroke-linecap="round"/>

  <g clip-path="url(#${p}pClip)">
    <rect x="187" y="244" width="26" height="21" rx="4" fill="#ffffff" fill-opacity="0.20" stroke="#ffffff" stroke-width="0.8" stroke-opacity="0.35"/>
    <line x1="192" y1="244" x2="192" y2="240" stroke="#ffffff" stroke-opacity="0.52" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="208" y1="244" x2="208" y2="240" stroke="#ffffff" stroke-opacity="0.52" stroke-width="1.5" stroke-linecap="round"/>
    <line x1="187" y1="251" x2="213" y2="251" stroke="#ffffff" stroke-opacity="0.28" stroke-width="0.7"/>
    <rect x="190" y="254" width="5" height="5" rx="1.2" fill="#ffffff" fill-opacity="0.60"/>
    <rect x="198" y="254" width="5" height="5" rx="1.2" fill="#ffffff" fill-opacity="0.60"/>
    <rect x="206" y="254" width="5" height="5" rx="1.2" fill="#ffffff" fill-opacity="0.60"/>
  </g>
</svg>`;

  return (
    <View style={{ width: size, height: size, borderRadius: r, overflow: 'hidden' }}>
      <SvgXml xml={xml} width={size} height={size} />
    </View>
  );
}
