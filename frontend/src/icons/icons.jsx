/* ─── SVG primitives ─── */
export const Svg = ({ s=24, vb="0 0 24 24", children, style={} }) => (
  <svg width={s} height={s} viewBox={vb} fill="none" style={style}>{children}</svg>
);

export const WeatherIcon = ({ type, s=28 }) => {
  if (type === "sun") return (
    <Svg s={s} style={{filter:"drop-shadow(0 0 6px rgba(251,191,36,0.7))"}}>
      <circle cx="12" cy="12" r="4.5" fill="#FCD34D" stroke="#F59E0B" strokeWidth="0.5"/>
      {[0,45,90,135,180,225,270,315].map((deg,i)=>{
        const r=Math.PI*deg/180, x1=12+7.5*Math.cos(r), y1=12+7.5*Math.sin(r), x2=12+9.8*Math.cos(r), y2=12+9.8*Math.sin(r);
        return <line key={i} x1={x1} y1={y1} x2={x2} y2={y2} stroke="#FBBF24" strokeWidth="2" strokeLinecap="round"/>;
      })}
    </Svg>
  );
  if (type === "rain") return (
    <Svg s={s}>
      <path d="M18 9.5h-1.1A7 7 0 1 0 8 18.5h10a4.5 4.5 0 0 0 0-9z" fill="#93C5FD" stroke="#60A5FA" strokeWidth="0.5"/>
      {[[8,22],[11,21],[14,22],[17,21]].map(([cx,cy],i)=>(
        <ellipse key={i} cx={cx} cy={cy} rx="1.2" ry="2" fill="#3B82F6" opacity="0.85"/>
      ))}
    </Svg>
  );
  if (type === "cloud") return (
    <Svg s={s}>
      <path d="M18 9.5h-1.1A7 7 0 1 0 8 18.5h10a4.5 4.5 0 0 0 0-9z" fill="#E2E8F0" stroke="#CBD5E1" strokeWidth="0.5"/>
    </Svg>
  );
  return (
    <Svg s={s}>
      <path d="M18 9.5h-1.1A7 7 0 1 0 8 18.5h10a4.5 4.5 0 0 0 0-9z" fill="#93C5FD" stroke="#60A5FA" strokeWidth="0.5"/>
      {[[8,22],[11,21],[14,22]].map(([cx,cy],i)=>(
        <ellipse key={i} cx={cx} cy={cy} rx="1.2" ry="2" fill="#3B82F6" opacity="0.85"/>
      ))}
    </Svg>
  );
};

export const KVLogo = ({ size=72 }) => (
  <div style={{position:"relative",width:size,height:size,display:"inline-block"}}>
    <div style={{position:"absolute",inset:-4,borderRadius:"30%",background:"radial-gradient(circle,rgba(22,163,74,0.18) 0%,transparent 70%)",animation:"kvGlow 3s ease-in-out infinite"}}/>
    <svg width={size} height={size} viewBox="0 0 80 80" style={{position:"relative",zIndex:1,filter:"drop-shadow(0 6px 18px rgba(22,163,74,0.38))"}}>
      <defs>
        <linearGradient id="bgG" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#052e16"/><stop offset="45%" stopColor="#14532d"/><stop offset="100%" stopColor="#16a34a"/>
        </linearGradient>
        <linearGradient id="stalkG" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor="#86efac"/><stop offset="100%" stopColor="#4ade80"/>
        </linearGradient>
        <linearGradient id="grainG1" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#bbf7d0"/><stop offset="100%" stopColor="#86efac"/>
        </linearGradient>
        <linearGradient id="grainG2" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#86efac"/><stop offset="100%" stopColor="#4ade80"/>
        </linearGradient>
        <linearGradient id="grainG3" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4ade80"/><stop offset="100%" stopColor="#22c55e"/>
        </linearGradient>
        <clipPath id="roundRect"><rect x="0" y="0" width="80" height="80" rx="22" ry="22"/></clipPath>
      </defs>
      <rect width="80" height="80" rx="22" ry="22" fill="url(#bgG)"/>
      <rect width="80" height="40" rx="22" ry="22" fill="rgba(255,255,255,0.06)" clipPath="url(#roundRect)"/>
      <line x1="40" y1="70" x2="40" y2="12" stroke="url(#stalkG)" strokeWidth="2.8" strokeLinecap="round"/>
      <ellipse cx="33" cy="54" rx="6.5" ry="3.2" transform="rotate(-40 33 54)" fill="url(#grainG1)" opacity="0.95"/>
      <ellipse cx="47" cy="54" rx="6.5" ry="3.2" transform="rotate(40 47 54)" fill="url(#grainG1)" opacity="0.95"/>
      <ellipse cx="33.5" cy="43" rx="6" ry="2.9" transform="rotate(-38 33.5 43)" fill="url(#grainG2)" opacity="0.95"/>
      <ellipse cx="46.5" cy="43" rx="6" ry="2.9" transform="rotate(38 46.5 43)" fill="url(#grainG2)" opacity="0.95"/>
      <ellipse cx="34" cy="33" rx="5.2" ry="2.6" transform="rotate(-35 34 33)" fill="url(#grainG3)" opacity="0.92"/>
      <ellipse cx="46" cy="33" rx="5.2" ry="2.6" transform="rotate(35 46 33)" fill="url(#grainG3)" opacity="0.92"/>
      <ellipse cx="40" cy="15" rx="3.5" ry="6" fill="#22c55e" opacity="0.9"/>
    </svg>
  </div>
);

export const Ic = ({ d, s=16, c="currentColor", w=1.8, style={} }) => (
  <svg width={s} height={s} viewBox="0 0 24 24" fill="none" stroke={c} strokeWidth={w} strokeLinecap="round" strokeLinejoin="round" style={style}>
    {(Array.isArray(d)?d:[d]).map((p,i)=><path key={i} d={p}/>)}
  </svg>
);
export const paths = {
  user:["M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2","M12 3a4 4 0 1 0 0 8 4 4 0 0 0 0-8z"],
  globe:["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M2 12h20","M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z"],
  bell:["M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9","M13.73 21a2 2 0 0 1-3.46 0"],
  map:["M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0 1 18 0z","M12 7a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  alert:["M10.29 3.86L1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z","M12 9v4","M12 17h.01"],
  shield:["M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"],
  zap:["M13 2L3 14h9l-1 8 10-12h-9l1-8z"],
  activity:["M22 12h-4l-3 9L9 3l-3 9H2"],
  check:["M22 11.08V12a10 10 0 1 1-5.93-9.14","M22 4L12 14.01l-3-3"],
  clock:["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 6v6l4 2"],
  download:["M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4","M7 10l5 5 5-5","M12 15V3"],
  drop:["M12 2.69l5.66 5.66a8 8 0 1 1-11.31 0z"],
  thermo:["M14 14.76V3.5a2.5 2.5 0 0 0-5 0v11.26a4.5 4.5 0 1 0 5 0z"],
  trending:["M23 6l-9.5 9.5-5-5L1 18","M17 6h6v6"],
  rupee:["M6 3h12","M6 8h12","M6 13l8.5 8"],
  sprout:["M7 20s4-6 4-10S7 4 7 4","M17 20s-4-6-4-10 4-6 4-6"],
  back:["M19 12H5","M12 5l-7 7 7 7"],
  info:["M12 2a10 10 0 1 0 0 20 10 10 0 0 0 0-20z","M12 16v-4","M12 8h.01"],
  leaf:["M12 2C6 2 3 7 3 12c0 4 2.5 7 6 8.5","M12 2c6 0 9 5 9 10 0 4-2.5 7-6 8.5","M12 2v18"],
  camera:["M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z","M12 17a4 4 0 1 0 0-8 4 4 0 0 0 0 8z"],
  eye:["M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z","M12 9a3 3 0 1 0 0 6 3 3 0 0 0 0-6z"],
  eyeoff:["M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94","M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19","M1 1l22 22"],
  phone:["M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6A19.79 19.79 0 0 1 2.12 4.18 2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.127.96.361 1.903.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.907.339 1.85.573 2.81.7A2 2 0 0 1 22 16.92z"],
  lock:["M19 11H5a2 2 0 0 0-2 2v7a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7a2 2 0 0 0-2-2z","M7 11V7a5 5 0 0 1 10 0v4"],
  arrow:["M5 12h14","M12 5l7 7-7 7"],
  star:["M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z"],
  scan:["M3 7V5a2 2 0 0 1 2-2h2","M17 3h2a2 2 0 0 1 2 2v2","M21 17v2a2 2 0 0 1-2 2h-2","M7 21H5a2 2 0 0 1-2-2v-2"],
  wind:["M9.59 4.59A2 2 0 1 1 11 8H2","M12.59 19.41A2 2 0 1 0 14 16H2","M17.59 11.41A2 2 0 1 1 19 8H2"],
  micro:["M12 1a3 3 0 0 0-3 3v8a3 3 0 0 0 6 0V4a3 3 0 0 0-3-3z","M19 10v2a7 7 0 0 1-14 0v-2","M12 19v4","M8 23h8"],
  wheat:["M12 22V2","M7 7c0-2.5 5-4 5-4s5 1.5 5 4","M7 12c0-2.5 5-4 5-4s5 1.5 5 4","M7 17c0-2.5 5-4 5-4s5 1.5 5 4"],
  close:["M18 6L6 18","M6 6l12 12"],
  gps:["M12 2a7 7 0 0 1 7 7c0 5-7 13-7 13S5 14 5 9a7 7 0 0 1 7-7z","M12 9a2 2 0 1 0 0-4 2 2 0 0 0 0 4z"],
};
export const G=({n,s=16,c="currentColor",w=1.8,style={}})=><Ic d={paths[n]||paths.info} s={s} c={c} w={w} style={style}/>;
