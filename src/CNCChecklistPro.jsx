import { useState, useEffect, useCallback } from "react";

const SUPABASE_URL     = "YOUR_SUPABASE_URL";
const SUPABASE_ANON_KEY= "YOUR_SUPABASE_ANON_KEY";

const supabase = (() => {
  const headers = {"Content-Type":"application/json","apikey":SUPABASE_ANON_KEY,"Authorization":`Bearer ${SUPABASE_ANON_KEY}`};
  let _s=null;
  const aH=()=>({...headers,"Authorization":`Bearer ${_s?.access_token||SUPABASE_ANON_KEY}`});
  return {
    setSession:s=>{_s=s;}, getSession:()=>_s,
    auth:{
      signUp:async(e,p)=>{const r=await fetch(`${SUPABASE_URL}/auth/v1/signup`,{method:"POST",headers,body:JSON.stringify({email:e,password:p})});return r.json();},
      signIn:async(e,p)=>{const r=await fetch(`${SUPABASE_URL}/auth/v1/token?grant_type=password`,{method:"POST",headers,body:JSON.stringify({email:e,password:p})});const d=await r.json();if(d.access_token)_s=d;return d;},
      signOut:async()=>{await fetch(`${SUPABASE_URL}/auth/v1/logout`,{method:"POST",headers:aH()});_s=null;},
    },
    db:{
      getJobs:async uid=>{const r=await fetch(`${SUPABASE_URL}/rest/v1/jobs?user_id=eq.${uid}&order=updated_at.desc`,{headers:aH()});return r.json();},
      upsertJob:async j=>{const r=await fetch(`${SUPABASE_URL}/rest/v1/jobs`,{method:"POST",headers:{...aH(),"Prefer":"resolution=merge-duplicates"},body:JSON.stringify(j)});return r.json();},
      deleteJob:async id=>{await fetch(`${SUPABASE_URL}/rest/v1/jobs?id=eq.${id}`,{method:"DELETE",headers:aH()});},
    },
  };
})();

// ─── CHECKLIST DATA ───────────────────────────────────────────────────────────
const SECTIONS=[
  {id:"programming",label:"PROGRAMMING",items:[
    {id:"p1", text:"Work offset (G54–G59) selected and matches setup sheet"},
    {id:"p2", text:"All tool numbers match setup sheet and tool list"},
    {id:"p3", text:"Tool length comp (G43/G44) called for every tool"},
    {id:"p4", text:"Cutter radius comp (G41/G42/G40) applied where needed"},
    {id:"p5", text:"Speeds and feeds verified for material and tooling"},
    {id:"p6", text:"Coolant codes (M08/M09) present at correct locations"},
    {id:"p7", text:"Spindle direction (M03/M04) correct for all tools"},
    {id:"p8", text:"Safe Z height clears all clamps and fixtures"},
    {id:"p9", text:"Retract moves between operations are safe"},
    {id:"p10",text:"Program end (M30 or M02) present and correct"},
    {id:"p11",text:"Subprograms (M98/M99) verified if used"},
    {id:"p12",text:"Tool changes (M06) include correct T and H numbers"},
  ]},
  {id:"cam",label:"CAM / SIMULATION",items:[
    {id:"c1",text:"Full simulation run completed — no gouges or collisions flagged"},
    {id:"c2",text:"Holder and fixture models included in simulation"},
    {id:"c3",text:"Toolpath order matches physical setup sequence"},
    {id:"c4",text:"Entry and exit moves verified — no plunging into material"},
    {id:"c5",text:"Tool reach verified — no holder contact on deep or tight features"},
    {id:"c6",text:"Stock model reviewed — material removal looks correct throughout"},
    {id:"c7",text:"Posted G-code reviewed at the control or editor — not just CAM display"},
    {id:"c8",text:"Correct post-processor selected for this machine and control"},
    {id:"c9",text:"Output file name and program number match job traveler"},
  ]},
  {id:"setup",label:"MACHINE SETUP",items:[
    {id:"s1",text:"All tools loaded in correct T number pockets"},
    {id:"s2",text:"Tool lengths measured and offsets entered"},
    {id:"s3",text:"Cutter diameter offsets entered (if using comp)"},
    {id:"s4",text:"Work offset probed/set and verified"},
    {id:"s5",text:"Part is fixtured square and secure"},
    {id:"s6",text:"Clamps clear of all tool paths"},
    {id:"s7",text:"Program transferred to machine (DNC or USB)"},
    {id:"s8",text:"Correct program selected at control"},
    {id:"s9",text:"Machine home / reference return completed"},
  ]},
  {id:"prerun",label:"PRE-RUN / FIRST PIECE",items:[
    {id:"r1",text:"Dry run (no part) completed — feed override at 0%, Z offset raised"},
    {id:"r2",text:"Single block mode ON for first tool"},
    {id:"r3",text:"Feed rate override set to 25% or less for first pass"},
    {id:"r4",text:"Optional stop (M01) active"},
    {id:"r5",text:"First move verified — tool going to correct location"},
    {id:"r6",text:"First piece inspected before running additional parts"},
    {id:"r7",text:"Critical dimensions checked with correct gauging"},
    {id:"r8",text:"Tool wear / surface finish acceptable"},
  ]},
];

// ─── S&F DATA ─────────────────────────────────────────────────────────────────
const SF_MATS={
  "Aluminum 6061":    {sfm:{hss:300,carbide:800}, cl:{0.125:0.004,0.25:0.006,0.375:0.007,0.5:0.008,0.75:0.010,1.0:0.012}},
  "Aluminum 7075":    {sfm:{hss:250,carbide:700}, cl:{0.125:0.003,0.25:0.005,0.375:0.006,0.5:0.007,0.75:0.009,1.0:0.011}},
  "Mild Steel 1018":  {sfm:{hss:100,carbide:400}, cl:{0.125:0.002,0.25:0.003,0.375:0.004,0.5:0.005,0.75:0.006,1.0:0.007}},
  "4140 Steel (Ann.)":{sfm:{hss:80, carbide:350}, cl:{0.125:0.002,0.25:0.003,0.375:0.003,0.5:0.004,0.75:0.005,1.0:0.006}},
  "4140 Steel (HT)":  {sfm:{hss:50, carbide:200}, cl:{0.125:0.001,0.25:0.002,0.375:0.002,0.5:0.003,0.75:0.004,1.0:0.005}},
  "Stainless 304":    {sfm:{hss:60, carbide:250}, cl:{0.125:0.001,0.25:0.002,0.375:0.002,0.5:0.003,0.75:0.004,1.0:0.005}},
  "Stainless 17-4":   {sfm:{hss:50, carbide:200}, cl:{0.125:0.001,0.25:0.002,0.375:0.002,0.5:0.003,0.75:0.003,1.0:0.004}},
  "Ti-6Al-4V":        {sfm:{hss:30, carbide:120}, cl:{0.125:0.001,0.25:0.001,0.375:0.002,0.5:0.002,0.75:0.003,1.0:0.003}},
  "Brass":            {sfm:{hss:200,carbide:600}, cl:{0.125:0.003,0.25:0.005,0.375:0.006,0.5:0.007,0.75:0.009,1.0:0.011}},
  "Copper":           {sfm:{hss:150,carbide:500}, cl:{0.125:0.003,0.25:0.004,0.375:0.005,0.5:0.006,0.75:0.008,1.0:0.010}},
  "Cast Iron":        {sfm:{hss:70, carbide:300}, cl:{0.125:0.002,0.25:0.003,0.375:0.004,0.5:0.004,0.75:0.005,1.0:0.006}},
  "Delrin / Acetal":  {sfm:{hss:400,carbide:900}, cl:{0.125:0.005,0.25:0.008,0.375:0.009,0.5:0.010,0.75:0.012,1.0:0.014}},
  "HDPE / Nylon":     {sfm:{hss:350,carbide:800}, cl:{0.125:0.004,0.25:0.007,0.375:0.008,0.5:0.009,0.75:0.011,1.0:0.013}},
};
const TOOL_DIAS=[0.125,0.25,0.375,0.5,0.75,1.0];

// ─── TAP & DRILL DATA ─────────────────────────────────────────────────────────
const TAP_DATA = [
  // UNC
  {tap:"#0-80",   type:"UNF", tpi:80,  major:0.0600, drill75:"3/64",  drillDec:0.0469, closeDrill:"#56", closeHole:0.0465},
  {tap:"#1-64",   type:"UNC", tpi:64,  major:0.0730, drill75:"#53",   drillDec:0.0595, closeDrill:"#52", closeHole:0.0635},
  {tap:"#1-72",   type:"UNF", tpi:72,  major:0.0730, drill75:"#53",   drillDec:0.0595, closeDrill:"#52", closeHole:0.0635},
  {tap:"#2-56",   type:"UNC", tpi:56,  major:0.0860, drill75:"#50",   drillDec:0.0700, closeDrill:"#49", closeHole:0.0730},
  {tap:"#2-64",   type:"UNF", tpi:64,  major:0.0860, drill75:"#50",   drillDec:0.0700, closeDrill:"#49", closeHole:0.0730},
  {tap:"#3-48",   type:"UNC", tpi:48,  major:0.0990, drill75:"#47",   drillDec:0.0785, closeDrill:"#46", closeHole:0.0810},
  {tap:"#4-40",   type:"UNC", tpi:40,  major:0.1120, drill75:"#43",   drillDec:0.0890, closeDrill:"#41", closeHole:0.0960},
  {tap:"#4-48",   type:"UNF", tpi:48,  major:0.1120, drill75:"#42",   drillDec:0.0935, closeDrill:"#40", closeHole:0.0980},
  {tap:"#5-40",   type:"UNC", tpi:40,  major:0.1250, drill75:"#38",   drillDec:0.1015, closeDrill:"#37", closeHole:0.1040},
  {tap:"#6-32",   type:"UNC", tpi:32,  major:0.1380, drill75:"#36",   drillDec:0.1065, closeDrill:"#33", closeHole:0.1130},
  {tap:"#6-40",   type:"UNF", tpi:40,  major:0.1380, drill75:"#33",   drillDec:0.1130, closeDrill:"#32", closeHole:0.1160},
  {tap:"#8-32",   type:"UNC", tpi:32,  major:0.1640, drill75:"#29",   drillDec:0.1360, closeDrill:"#27", closeHole:0.1440},
  {tap:"#8-36",   type:"UNF", tpi:36,  major:0.1640, drill75:"#29",   drillDec:0.1360, closeDrill:"#27", closeHole:0.1440},
  {tap:"#10-24",  type:"UNC", tpi:24,  major:0.1900, drill75:"#25",   drillDec:0.1495, closeDrill:"#20", closeHole:0.1610},
  {tap:"#10-32",  type:"UNF", tpi:32,  major:0.1900, drill75:"#21",   drillDec:0.1590, closeDrill:"#18", closeHole:0.1695},
  {tap:"#12-24",  type:"UNC", tpi:24,  major:0.2160, drill75:"#16",   drillDec:0.1770, closeDrill:"#12", closeHole:0.1890},
  {tap:"1/4-20",  type:"UNC", tpi:20,  major:0.2500, drill75:"#7",    drillDec:0.2010, closeDrill:"F",   closeHole:0.2570},
  {tap:"1/4-28",  type:"UNF", tpi:28,  major:0.2500, drill75:"#3",    drillDec:0.2130, closeDrill:"G",   closeHole:0.2610},
  {tap:"5/16-18", type:"UNC", tpi:18,  major:0.3125, drill75:"F",     drillDec:0.2570, closeDrill:"P",   closeHole:0.3230},
  {tap:"5/16-24", type:"UNF", tpi:24,  major:0.3125, drill75:"I",     drillDec:0.2720, closeDrill:"Q",   closeHole:0.3320},
  {tap:"3/8-16",  type:"UNC", tpi:16,  major:0.3750, drill75:"5/16",  drillDec:0.3125, closeDrill:"W",   closeHole:0.3860},
  {tap:"3/8-24",  type:"UNF", tpi:24,  major:0.3750, drill75:"Q",     drillDec:0.3320, closeDrill:"X",   closeHole:0.3970},
  {tap:"7/16-14", type:"UNC", tpi:14,  major:0.4375, drill75:"U",     drillDec:0.3680, closeDrill:"29/64", closeHole:0.4531},
  {tap:"7/16-20", type:"UNF", tpi:20,  major:0.4375, drill75:"25/64", drillDec:0.3906, closeDrill:"29/64", closeHole:0.4531},
  {tap:"1/2-13",  type:"UNC", tpi:13,  major:0.5000, drill75:"27/64", drillDec:0.4219, closeDrill:"33/64", closeHole:0.5156},
  {tap:"1/2-20",  type:"UNF", tpi:20,  major:0.5000, drill75:"29/64", drillDec:0.4531, closeDrill:"33/64", closeHole:0.5156},
  {tap:"9/16-12", type:"UNC", tpi:12,  major:0.5625, drill75:"31/64", drillDec:0.4844, closeDrill:"37/64", closeHole:0.5781},
  {tap:"9/16-18", type:"UNF", tpi:18,  major:0.5625, drill75:"33/64", drillDec:0.5156, closeDrill:"37/64", closeHole:0.5781},
  {tap:"5/8-11",  type:"UNC", tpi:11,  major:0.6250, drill75:"17/32", drillDec:0.5313, closeDrill:"41/64", closeHole:0.6406},
  {tap:"5/8-18",  type:"UNF", tpi:18,  major:0.6250, drill75:"37/64", drillDec:0.5781, closeDrill:"41/64", closeHole:0.6406},
  {tap:"3/4-10",  type:"UNC", tpi:10,  major:0.7500, drill75:"21/32", drillDec:0.6563, closeDrill:"49/64", closeHole:0.7656},
  {tap:"3/4-16",  type:"UNF", tpi:16,  major:0.7500, drill75:"11/16", drillDec:0.6875, closeDrill:"49/64", closeHole:0.7656},
  {tap:"7/8-9",   type:"UNC", tpi:9,   major:0.8750, drill75:"49/64", drillDec:0.7656, closeDrill:"57/64", closeHole:0.8906},
  {tap:"7/8-14",  type:"UNF", tpi:14,  major:0.8750, drill75:"13/16", drillDec:0.8125, closeDrill:"57/64", closeHole:0.8906},
  {tap:"1-8",     type:"UNC", tpi:8,   major:1.0000, drill75:"7/8",   drillDec:0.8750, closeDrill:"1-1/64", closeHole:1.0156},
  {tap:"1-12",    type:"UNF", tpi:12,  major:1.0000, drill75:"59/64", drillDec:0.9219, closeDrill:"1-1/64", closeHole:1.0156},
  // Metric
  {tap:"M2×0.4",  type:"MET", tpi:null, major:2.0,  drill75:"1.6mm",  drillDec:1.600,  closeDrill:"2.05mm",closeHole:2.05},
  {tap:"M2.5×0.45",type:"MET",tpi:null, major:2.5,  drill75:"2.05mm", drillDec:2.050,  closeDrill:"2.55mm",closeHole:2.55},
  {tap:"M3×0.5",  type:"MET", tpi:null, major:3.0,  drill75:"2.5mm",  drillDec:2.500,  closeDrill:"3.1mm", closeHole:3.10},
  {tap:"M4×0.7",  type:"MET", tpi:null, major:4.0,  drill75:"3.3mm",  drillDec:3.300,  closeDrill:"4.1mm", closeHole:4.10},
  {tap:"M5×0.8",  type:"MET", tpi:null, major:5.0,  drill75:"4.2mm",  drillDec:4.200,  closeDrill:"5.1mm", closeHole:5.10},
  {tap:"M6×1.0",  type:"MET", tpi:null, major:6.0,  drill75:"5.0mm",  drillDec:5.000,  closeDrill:"6.1mm", closeHole:6.10},
  {tap:"M8×1.25", type:"MET", tpi:null, major:8.0,  drill75:"6.8mm",  drillDec:6.800,  closeDrill:"8.1mm", closeHole:8.10},
  {tap:"M10×1.5", type:"MET", tpi:null, major:10.0, drill75:"8.5mm",  drillDec:8.500,  closeDrill:"10.1mm",closeHole:10.10},
  {tap:"M12×1.75",type:"MET", tpi:null, major:12.0, drill75:"10.2mm", drillDec:10.200, closeDrill:"12.1mm",closeHole:12.10},
  {tap:"M14×2.0", type:"MET", tpi:null, major:14.0, drill75:"12.0mm", drillDec:12.000, closeDrill:"14.1mm",closeHole:14.10},
  {tap:"M16×2.0", type:"MET", tpi:null, major:16.0, drill75:"14.0mm", drillDec:14.000, closeDrill:"16.1mm",closeHole:16.10},
  {tap:"M20×2.5", type:"MET", tpi:null, major:20.0, drill75:"17.5mm", drillDec:17.500, closeDrill:"20.1mm",closeHole:20.10},
  {tap:"M24×3.0", type:"MET", tpi:null, major:24.0, drill75:"21.0mm", drillDec:21.000, closeDrill:"24.1mm",closeHole:24.10},
];

// ─── TOLERANCE DATA ───────────────────────────────────────────────────────────
// ISO 286 hole basis fits — fundamental deviations in mm per tolerance grade
// Values: [lower_dev_mm, upper_dev_mm] for shaft (external), hole (internal)
const FIT_CLASSES = {
  "H7/p6 — Press Fit":          {desc:"Permanent assembly, requires press",         holeGrade:7, shaftCode:"p", type:"interference"},
  "H7/s6 — Force Fit":          {desc:"Heavy press, shrink, or freeze required",    holeGrade:7, shaftCode:"s", type:"interference"},
  "H7/n6 — Locating Press":     {desc:"Light press, non-permanent",                 holeGrade:7, shaftCode:"n", type:"transition"},
  "H7/k6 — Transition":         {desc:"Push fit, accurate location",                holeGrade:7, shaftCode:"k", type:"transition"},
  "H7/h6 — Sliding Clearance":  {desc:"Accurate slide, no appreciable play",        holeGrade:7, shaftCode:"h", type:"clearance"},
  "H7/g6 — Close Running":      {desc:"Precision running, light oil film",          holeGrade:7, shaftCode:"g", type:"clearance"},
  "H7/f7 — Free Running":       {desc:"General running fit, moderate speeds",       holeGrade:7, shaftCode:"f", type:"clearance"},
  "H8/e8 — Loose Running":      {desc:"Generous clearance, wide tolerances",        holeGrade:8, shaftCode:"e", type:"clearance"},
  "H11/c11 — Coarse Clearance": {desc:"Large clearance, coarse work",               holeGrade:11,shaftCode:"c", type:"clearance"},
};

// IT grades (tolerance values in microns) — simplified for common sizes
// Returns microns for a given nominal diameter (mm) and grade
function getIT(diam_mm, grade) {
  // Standard tolerance unit: i = 0.45*D^(1/3) + 0.001*D  where D = geometric mean of range
  const i = 0.45 * Math.pow(diam_mm, 1/3) + 0.001 * diam_mm;
  const grades = {6:10*i, 7:16*i, 8:25*i, 9:40*i, 10:64*i, 11:100*i};
  return (grades[grade] || 16*i) / 1000; // return in mm
}

// Fundamental deviation for shaft codes (mm) — simplified approximation
function getShaftDev(diam_mm, code, grade) {
  const IT = getIT(diam_mm, grade);
  switch(code) {
    case "c":  return { es: -(140 + 0.85*diam_mm)/1000, ei: -(140 + 0.85*diam_mm)/1000 - IT };
    case "e":  return { es: -(11 * Math.pow(diam_mm, 0.41))/1000, ei: -(11 * Math.pow(diam_mm, 0.41))/1000 - IT };
    case "f":  return { es: -(5.5 * Math.pow(diam_mm, 0.41))/1000, ei: -(5.5 * Math.pow(diam_mm, 0.41))/1000 - IT };
    case "g":  return { es: -(2.5 * Math.pow(diam_mm, 0.34))/1000, ei: -(2.5 * Math.pow(diam_mm, 0.34))/1000 - IT };
    case "h":  return { es: 0, ei: -IT };
    case "k":  return { ei: 0.6 * Math.pow(diam_mm, 1/3) / 1000, es: 0.6 * Math.pow(diam_mm, 1/3) / 1000 + IT };
    case "n":  return { ei: IT * 0.5, es: IT * 1.5 };
    case "p":  return { ei: IT + getIT(diam_mm, 6) * 0.4, es: IT * 2 + getIT(diam_mm, 6) * 0.4 };
    case "s":  return { ei: IT * 1.5, es: IT * 2.5 };
    default:   return { es: 0, ei: -IT };
  }
}

const fmt4 = n => n === 0 ? "0.0000" : (n >= 0 ? "+" : "") + n.toFixed(4);
const fmtIn = (mm, decimals=4) => (mm / 25.4).toFixed(decimals);

// ─── HELPERS ─────────────────────────────────────────────────────────────────
const ALL_IDS  = SECTIONS.flatMap(s=>s.items.map(i=>i.id));
const initChk  = ()=>Object.fromEntries(ALL_IDS.map(id=>[id,false]));
const initNts  = ()=>Object.fromEntries(ALL_IDS.map(id=>[id,""]));
const blankJob = (uid,name="")=>({id:`job_${Date.now()}`,user_id:uid,name,machine:"",operator:"",material:"",date:new Date().toLocaleDateString(),checked:initChk(),notes:initNts(),updated_at:new Date().toISOString()});

// ─── STYLES ───────────────────────────────────────────────────────────────────
const CSS=`
  @import url('https://fonts.googleapis.com/css2?family=IBM+Plex+Mono:wght@400;500;600;700&family=IBM+Plex+Sans:wght@400;500;600&display=swap');
  *{box-sizing:border-box;margin:0;padding:0}
  body{background:#f4f4f2;font-family:'IBM Plex Mono',monospace}
  ::-webkit-scrollbar{width:4px}::-webkit-scrollbar-thumb{background:#bbb}
  .hr:hover{background:#f0f0ee!important}
  .hn:hover{background:#1a1a1a!important;color:#fff!important}
  .ck:hover{filter:brightness(0.92);transform:scale(0.97)}
  .ck:active{transform:scale(0.93)}
  input:focus,select:focus,textarea:focus{border-color:#111!important}
  @media print{body *{visibility:hidden!important}#pz,#pz *{visibility:visible!important}#pz{position:fixed;inset:0;padding:32px;background:#fff}}
`;
const F={mono:"'IBM Plex Mono',monospace",sans:"'IBM Plex Sans',sans-serif"};
const mkB=(v="outline",sz="md")=>{
  const b={fontFamily:F.mono,letterSpacing:"1.5px",cursor:"pointer",border:"1.5px solid #000",transition:"all 0.15s",display:"inline-flex",alignItems:"center",gap:"6px",fontSize:sz==="sm"?"10px":"11px",padding:sz==="sm"?"5px 12px":"9px 20px",fontWeight:"600"};
  if(v==="solid")  return{...b,background:"#111",color:"#fff"};
  if(v==="outline")return{...b,background:"#fff",color:"#111"};
  if(v==="ghost")  return{...b,background:"transparent",border:"1.5px solid #444",color:"#aaa"};
  if(v==="danger") return{...b,background:"#c82000",color:"#fff",borderColor:"#c82000"};
  return b;
};
const ISt={fontFamily:F.mono,fontSize:"12px",color:"#111",background:"#fff",border:"1.5px solid #ccc",padding:"8px 12px",outline:"none",width:"100%"};
const Card=({children,style})=><div style={{background:"#fff",border:"1.5px solid #e0e0dc",padding:"16px",...style}}>{children}</div>;
const Label=({children})=><div style={{fontSize:"8px",letterSpacing:"2px",color:"#888",marginBottom:"5px"}}>{children}</div>;
const ResBox=({label,val,unit,big})=>(
  <div style={{background:big?"#111":"#fff",border:`2px solid ${big?"#111":"#e0e0dc"}`,padding:"14px 16px"}}>
    <div style={{fontSize:"8px",letterSpacing:"2px",color:big?"#555":"#999",marginBottom:"5px"}}>{label}</div>
    <div style={{fontSize:big?"28px":"18px",fontWeight:"700",color:big?"#fff":"#111",fontFamily:F.mono,lineHeight:1}}>
      {val||"—"}{val?<span style={{fontSize:"11px",fontWeight:"400",marginLeft:"4px",color:big?"#666":"#aaa"}}>{unit}</span>:null}
    </div>
  </div>
);

// ─── HEADER ───────────────────────────────────────────────────────────────────
function Header({screen,setScreen,jobs,saving,isDemo,signOut}){
  const nav=[
    {id:"checklist",label:"CHECKLIST"},
    {id:"jobs",     label:`JOBS (${jobs.length})`},
    {id:"sfcalc",   label:"S&F"},
    {id:"trig",     label:"TRIG"},
    {id:"tolerance",label:"TOLERANCE"},
    {id:"tapdrillchart",   label:"TAP/DRILL"},
    {id:"calc",     label:"CALC"},
    {id:"print",    label:"🖨"},
  ];
  return(
    <div style={{background:"#111",padding:"12px 24px",display:"flex",alignItems:"center",justifyContent:"space-between",flexWrap:"wrap",gap:"10px",borderBottom:"3px solid #333"}}>
      <div>
        <div style={{fontSize:"8px",letterSpacing:"5px",color:"#555"}}>CNC MACHINING</div>
        <div style={{fontSize:"17px",fontWeight:"700",letterSpacing:"2px",color:"#fff"}}>FIRSTPIECE PRO</div>
      </div>
      <div style={{display:"flex",gap:"5px",flexWrap:"wrap",alignItems:"center"}}>
        {saving&&<span style={{fontSize:"9px",color:"#666",letterSpacing:"2px"}}>SAVING...</span>}
        {isDemo&&<span style={{fontSize:"9px",color:"#e6a800",border:"1px solid #e6a800",padding:"2px 8px"}}>DEMO</span>}
        {nav.map(n=>(
          <button key={n.id} className="hn" onClick={()=>setScreen(n.id)} style={{background:screen===n.id?"#fff":"transparent",color:screen===n.id?"#111":"#888",border:`1.5px solid ${screen===n.id?"#fff":"#444"}`,fontFamily:F.mono,fontSize:"10px",letterSpacing:"1.5px",padding:"5px 10px",cursor:"pointer",fontWeight:"600",transition:"all 0.15s"}}>{n.label}</button>
        ))}
        <button className="hn" onClick={signOut} style={{background:"transparent",color:"#555",border:"1.5px solid #333",fontFamily:F.mono,fontSize:"10px",padding:"5px 10px",cursor:"pointer",letterSpacing:"1.5px"}}>OUT</button>
      </div>
    </div>
  );
}

// ─── TRIG CALCULATOR ─────────────────────────────────────────────────────────
function TrigCalc(){
  const [mode,setMode]=useState("right_triangle"); // right_triangle | sine_bar | bolt_circle | taper
  const [inp,setInp]=useState({});
  const set=(k,v)=>setInp(p=>({...p,[k]:v}));
  const n=(k)=>parseFloat(inp[k])||0;
  const deg=r=>r*(180/Math.PI);
  const rad=d=>d*(Math.PI/180);
  const fmt=(v,d=5)=>isNaN(v)||!isFinite(v)?"—":parseFloat(v.toFixed(d)).toString();

  // RIGHT TRIANGLE
  const rtResults=(()=>{
    const a=n("rt_a"),b=n("rt_b"),c=n("rt_c"),A=n("rt_A"),B=n("rt_B");
    if(a&&b) return {c:fmt(Math.sqrt(a*a+b*b)),A:fmt(deg(Math.atan2(a,b))),B:fmt(deg(Math.atan2(b,a))),note:"From sides a & b"};
    if(c&&A) {const Ar=rad(A);return {a:fmt(c*Math.sin(Ar)),b:fmt(c*Math.cos(Ar)),B:fmt(90-A),note:"From hyp & angle A"};}
    if(c&&B) {const Br=rad(B);return {b:fmt(c*Math.sin(Br)),a:fmt(c*Math.cos(Br)),A:fmt(90-B),note:"From hyp & angle B"};}
    if(a&&A) {const Ar=rad(A);return {b:fmt(a/Math.tan(Ar)),c:fmt(a/Math.sin(Ar)),B:fmt(90-A),note:"From side a & angle A"};}
    return null;
  })();

  // SINE BAR
  const sbLen=n("sb_len")||5;
  const sbAngle=n("sb_angle");
  const sbGage=n("sb_gage");
  const sbFromAngle=sbAngle?fmt(sbLen*Math.sin(rad(sbAngle))):null;
  const sbFromGage=sbGage?fmt(deg(Math.asin(sbGage/sbLen))):null;

  // BOLT CIRCLE
  const bcDia=n("bc_dia"),bcN=Math.round(n("bc_n"))||0,bcStart=n("bc_start")||0;
  const bcPoints=bcN>0&&bcDia>0?Array.from({length:bcN},(_,i)=>{
    const angle=rad(bcStart+(360/bcN)*i);
    return {i:i+1,x:fmt((bcDia/2)*Math.cos(angle)),y:fmt((bcDia/2)*Math.sin(angle)),angle:fmt(bcStart+(360/bcN)*i,3)};
  }):[];

  // TAPER
  const tpDia1=n("tp_d1"),tpDia2=n("tp_d2"),tpLen=n("tp_len"),tpAngle=n("tp_angle");
  const tpTPF=tpDia1&&tpDia2&&tpLen?fmt(((tpDia1-tpDia2)/tpLen)*12,4):null;
  const tpHalfAngle=tpDia1&&tpDia2&&tpLen?fmt(deg(Math.atan((tpDia1-tpDia2)/(2*tpLen))),4):null;
  const tpIncAngle=tpDia1&&tpDia2&&tpLen?fmt(deg(Math.atan((tpDia1-tpDia2)/(2*tpLen)))*2,4):null;
  const tpFromAngle=tpAngle&&tpLen&&tpDia2?fmt(tpDia2+2*tpLen*Math.tan(rad(tpAngle/2)),4):null;

  const InpRow=({label,k,placeholder})=>(
    <div style={{marginBottom:"10px"}}>
      <Label>{label}</Label>
      <input value={inp[k]||""} onChange={e=>set(k,e.target.value)} placeholder={placeholder||"0"} style={ISt}/>
    </div>
  );
  const Res=({label,val})=>val?<div style={{display:"flex",justifyContent:"space-between",padding:"8px 12px",background:"#f4f4f2",marginBottom:"4px",border:"1px solid #e8e8e4"}}><span style={{fontSize:"10px",color:"#888",letterSpacing:"1px"}}>{label}</span><span style={{fontSize:"14px",fontWeight:"700",fontFamily:F.mono}}>{val}</span></div>:null;

  const tabs=[{id:"right_triangle",label:"RIGHT TRIANGLE"},{id:"sine_bar",label:"SINE BAR"},{id:"bolt_circle",label:"BOLT CIRCLE"},{id:"taper",label:"TAPER"}];

  return(
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"28px 24px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",fontWeight:"700",marginBottom:"20px"}}>ANGLE & TRIG CALCULATOR</div>

      {/* Sub-tabs */}
      <div style={{display:"flex",gap:"0",marginBottom:"24px",border:"1.5px solid #111"}}>
        {tabs.map(t=>(
          <button key={t.id} className="hr" onClick={()=>{setMode(t.id);setInp({});}} style={{flex:1,padding:"9px 4px",background:mode===t.id?"#111":"#fff",color:mode===t.id?"#fff":"#555",border:"none",borderRight:"1px solid #ccc",fontFamily:F.mono,fontSize:"9px",letterSpacing:"1.5px",cursor:"pointer",fontWeight:mode===t.id?"700":"400"}}>{t.label}</button>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>

        {/* RIGHT TRIANGLE */}
        {mode==="right_triangle"&&<>
          <div>
            <div style={{marginBottom:"16px",fontSize:"11px",color:"#888",lineHeight:"1.6",fontFamily:F.sans}}>
              Enter any two known values. The triangle is solved automatically.<br/>
              <strong style={{color:"#111"}}>a</strong> = opposite, <strong style={{color:"#111"}}>b</strong> = adjacent, <strong style={{color:"#111"}}>c</strong> = hypotenuse<br/>
              <strong style={{color:"#111"}}>A</strong> = angle opposite a, <strong style={{color:"#111"}}>B</strong> = angle opposite b
            </div>
            <InpRow label="SIDE a" k="rt_a"/>
            <InpRow label="SIDE b" k="rt_b"/>
            <InpRow label="HYPOTENUSE c" k="rt_c"/>
            <InpRow label="ANGLE A (degrees)" k="rt_A"/>
            <InpRow label="ANGLE B (degrees)" k="rt_B"/>
          </div>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"2px",fontWeight:"700",marginBottom:"12px"}}>RESULTS</div>
            {rtResults?<>
              <div style={{fontSize:"9px",color:"#aaa",letterSpacing:"1px",marginBottom:"8px"}}>{rtResults.note}</div>
              <Res label="SIDE a"        val={rtResults.a}/>
              <Res label="SIDE b"        val={rtResults.b}/>
              <Res label="HYPOTENUSE c"  val={rtResults.c}/>
              <Res label="ANGLE A (°)"   val={rtResults.A}/>
              <Res label="ANGLE B (°)"   val={rtResults.B}/>
              {rtResults.A&&rtResults.B&&<Res label="VERIFY A+B" val={fmt(parseFloat(rtResults.A||0)+parseFloat(rtResults.B||0))+" °"}/>}
            </>:<div style={{padding:"24px",color:"#bbb",fontSize:"11px",textAlign:"center",border:"1.5px dashed #e0e0dc"}}>ENTER ANY TWO VALUES</div>}
          </div>
        </>}

        {/* SINE BAR */}
        {mode==="sine_bar"&&<>
          <div>
            <div style={{marginBottom:"16px",fontSize:"11px",color:"#888",lineHeight:"1.6",fontFamily:F.sans}}>Set your sine bar length, then either enter the angle to find the gage block height, or enter the gage height to find the angle.</div>
            <InpRow label="SINE BAR LENGTH (inches)" k="sb_len" placeholder="5"/>
            <InpRow label="DESIRED ANGLE (degrees)" k="sb_angle"/>
            <div style={{textAlign:"center",padding:"8px",fontSize:"10px",color:"#aaa",letterSpacing:"2px"}}>— OR —</div>
            <InpRow label="GAGE BLOCK HEIGHT (inches)" k="sb_gage"/>
          </div>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"2px",fontWeight:"700",marginBottom:"12px"}}>RESULTS</div>
            {sbFromAngle&&<><div style={{fontSize:"9px",color:"#aaa",marginBottom:"8px"}}>From angle → gage height</div><Res label="GAGE BLOCK HEIGHT" val={`${sbFromAngle}"`}/></>}
            {sbFromGage&&<><div style={{fontSize:"9px",color:"#aaa",marginBottom:"8px",marginTop:"12px"}}>From gage height → angle</div><Res label="ANGLE" val={`${sbFromGage}°`}/><Res label="SIN VALUE" val={fmt(parseFloat(inp.sb_gage)/sbLen)}/></>}
            {!sbFromAngle&&!sbFromGage&&<div style={{padding:"24px",color:"#bbb",fontSize:"11px",textAlign:"center",border:"1.5px dashed #e0e0dc"}}>ENTER VALUES ABOVE</div>}
          </div>
        </>}

        {/* BOLT CIRCLE */}
        {mode==="bolt_circle"&&<>
          <div>
            <div style={{marginBottom:"16px",fontSize:"11px",color:"#888",lineHeight:"1.6",fontFamily:F.sans}}>Calculates X/Y coordinates for equally spaced holes on a bolt circle. Origin is at center.</div>
            <InpRow label="BOLT CIRCLE DIAMETER" k="bc_dia"/>
            <InpRow label="NUMBER OF HOLES" k="bc_n"/>
            <InpRow label="START ANGLE (degrees, 0=3 o'clock)" k="bc_start" placeholder="90"/>
          </div>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"2px",fontWeight:"700",marginBottom:"12px"}}>HOLE COORDINATES</div>
            {bcPoints.length>0?(
              <div style={{overflowY:"auto",maxHeight:"320px"}}>
                <div style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 1fr",gap:"4px",marginBottom:"6px"}}>
                  {["#","X","Y","ANGLE"].map(h=><div key={h} style={{fontSize:"8px",letterSpacing:"2px",color:"#aaa"}}>{h}</div>)}
                </div>
                {bcPoints.map(p=>(
                  <div key={p.i} style={{display:"grid",gridTemplateColumns:"40px 1fr 1fr 1fr",gap:"4px",padding:"6px 0",borderBottom:"1px solid #f0f0ee"}}>
                    <div style={{fontSize:"11px",color:"#aaa"}}>{p.i}</div>
                    <div style={{fontSize:"11px",fontWeight:"600",fontFamily:F.mono}}>{p.x}</div>
                    <div style={{fontSize:"11px",fontWeight:"600",fontFamily:F.mono}}>{p.y}</div>
                    <div style={{fontSize:"10px",color:"#888"}}>{p.angle}°</div>
                  </div>
                ))}
              </div>
            ):<div style={{padding:"24px",color:"#bbb",fontSize:"11px",textAlign:"center",border:"1.5px dashed #e0e0dc"}}>ENTER DIAMETER & HOLE COUNT</div>}
          </div>
        </>}

        {/* TAPER */}
        {mode==="taper"&&<>
          <div>
            <div style={{marginBottom:"16px",fontSize:"11px",color:"#888",lineHeight:"1.6",fontFamily:F.sans}}>Calculate taper-per-foot, included angle, or large diameter from known values.</div>
            <InpRow label="LARGE DIAMETER (d1)" k="tp_d1"/>
            <InpRow label="SMALL DIAMETER (d2)" k="tp_d2"/>
            <InpRow label="LENGTH" k="tp_len"/>
            <div style={{textAlign:"center",padding:"8px",fontSize:"10px",color:"#aaa",letterSpacing:"2px"}}>— OR FIND LARGE DIA FROM: —</div>
            <InpRow label="INCLUDED ANGLE (°)" k="tp_angle"/>
          </div>
          <div>
            <div style={{fontSize:"9px",letterSpacing:"2px",fontWeight:"700",marginBottom:"12px"}}>RESULTS</div>
            {(tpTPF||tpFromAngle)?<>
              {tpTPF&&<><Res label="TAPER PER FOOT (TPF)" val={tpTPF}/><Res label="HALF ANGLE (°)" val={tpHalfAngle}/><Res label="INCLUDED ANGLE (°)" val={tpIncAngle}/></>}
              {tpFromAngle&&<Res label="LARGE DIAMETER (from angle)" val={tpFromAngle}/>}
            </>:<div style={{padding:"24px",color:"#bbb",fontSize:"11px",textAlign:"center",border:"1.5px dashed #e0e0dc"}}>ENTER VALUES ABOVE</div>}
          </div>
        </>}
      </div>
    </div>
  );
}

// ─── TOLERANCE / FIT CALCULATOR ───────────────────────────────────────────────
function ToleranceCalc(){
  const [nomMM,setNomMM]=useState("");
  const [fitClass,setFitClass]=useState("H7/g6 — Close Running");
  const [unit,setUnit]=useState("inch"); // inch | mm

  const nom=parseFloat(nomMM)||0;
  const fit=FIT_CLASSES[fitClass];

  const results=(()=>{
    if(!nom||!fit) return null;
    const holeIT=getIT(nom,fit.holeGrade);
    const shaft=getShaftDev(nom,fit.shaftCode,fit.holeGrade);
    // Hole is always H: lower dev=0, upper dev=+IT
    const holeLow=nom;
    const holeHigh=nom+holeIT;
    const shaftHigh=nom+shaft.es;
    const shaftLow=nom+shaft.ei;
    const maxClear=holeLow-shaftHigh;
    const minClear=holeHigh-shaftLow;
    const isInt=fit.type==="interference";
    const conv=unit==="inch"?1/25.4:1;
    const f=v=>unit==="inch"?(v/25.4).toFixed(5):(v).toFixed(4);
    const fd=v=>unit==="inch"?fmt4(v/25.4):fmt4(v);
    return {
      holeLow:f(holeLow),holeHigh:f(holeHigh),holeIT:fd(holeIT),
      shaftLow:f(shaftLow),shaftHigh:f(shaftHigh),shaftIT:fd(shaft.es-shaft.ei),
      maxClear:fd(maxClear),minClear:fd(minClear),
      isInt,type:fit.type,desc:fit.desc,
    };
  })();

  const Row=({label,val,hi})=>(
    <div style={{display:"flex",justifyContent:"space-between",padding:"9px 12px",background:hi?"#f4f4f2":"#fff",borderBottom:"1px solid #f0f0ec"}}>
      <span style={{fontSize:"10px",color:"#888",letterSpacing:"1px"}}>{label}</span>
      <span style={{fontSize:"13px",fontWeight:"700",fontFamily:F.mono,color:"#111"}}>{val}</span>
    </div>
  );

  return(
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"28px 24px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",fontWeight:"700",marginBottom:"20px"}}>TOLERANCE & FIT CALCULATOR</div>

      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"24px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div>
            <Label>NOMINAL DIAMETER (mm)</Label>
            <input value={nomMM} onChange={e=>setNomMM(e.target.value)} placeholder="e.g. 25.4" style={ISt}/>
          </div>
          <div>
            <Label>FIT CLASS</Label>
            <select value={fitClass} onChange={e=>setFitClass(e.target.value)} style={{...ISt,cursor:"pointer"}}>
              {Object.entries(FIT_CLASSES).map(([k,v])=>(
                <option key={k} value={k}>{k}</option>
              ))}
            </select>
            {fit&&<div style={{fontSize:"10px",color:"#666",marginTop:"6px",fontFamily:F.sans,lineHeight:"1.5"}}>{fit.desc}</div>}
          </div>
          <div>
            <Label>DISPLAY UNITS</Label>
            <div style={{display:"flex",gap:"8px"}}>
              {["inch","mm"].map(u=>(
                <button key={u} onClick={()=>setUnit(u)} style={{flex:1,padding:"9px",fontFamily:F.mono,fontSize:"10px",letterSpacing:"2px",fontWeight:"700",cursor:"pointer",transition:"all 0.15s",background:unit===u?"#111":"#fff",color:unit===u?"#fff":"#555",border:`1.5px solid ${unit===u?"#111":"#ccc"}`}}>{u.toUpperCase()}</button>
              ))}
            </div>
          </div>

          {/* Fit type legend */}
          <div style={{background:"#f4f4f2",border:"1.5px solid #e0e0dc",padding:"14px"}}>
            <div style={{fontSize:"8px",letterSpacing:"2px",color:"#888",marginBottom:"10px"}}>FIT TYPE GUIDE</div>
            {[["CLEARANCE","Shaft always smaller than hole. Parts slide."],["TRANSITION","May be clearance or interference. Push fit."],["INTERFERENCE","Shaft larger than hole. Press or shrink required."]].map(([t,d])=>(
              <div key={t} style={{marginBottom:"8px"}}>
                <span style={{fontSize:"9px",fontWeight:"700",letterSpacing:"1px",color:"#111"}}>{t}: </span>
                <span style={{fontSize:"10px",color:"#666",fontFamily:F.sans}}>{d}</span>
              </div>
            ))}
          </div>
        </div>

        <div>
          <div style={{fontSize:"9px",letterSpacing:"2px",fontWeight:"700",marginBottom:"12px"}}>RESULTS — {unit==="inch"?"INCHES":"MILLIMETERS"}</div>
          {results?(
            <>
              <div style={{background:results.type==="interference"?"#fff5f5":results.type==="transition"?"#fffbe6":"#f5fff8",border:`2px solid ${results.type==="interference"?"#c82000":results.type==="transition"?"#cc8800":"#006633"}`,padding:"10px 14px",marginBottom:"14px"}}>
                <div style={{fontSize:"9px",fontWeight:"700",letterSpacing:"2px",color:results.type==="interference"?"#c82000":results.type==="transition"?"#cc8800":"#006633",marginBottom:"2px"}}>{results.type.toUpperCase()}</div>
                <div style={{fontSize:"11px",color:"#444",fontFamily:F.sans}}>{results.desc}</div>
              </div>

              <div style={{border:"1.5px solid #e0e0dc",marginBottom:"14px"}}>
                <div style={{fontSize:"8px",letterSpacing:"2px",padding:"8px 12px",background:"#f4f4f2",borderBottom:"1px solid #e0e0dc",color:"#888"}}>HOLE (INTERNAL)</div>
                <Row label="LOWER LIMIT" val={results.holeLow}/>
                <Row label="UPPER LIMIT" val={results.holeHigh} hi/>
                <Row label="TOLERANCE (+)" val={results.holeIT}/>
              </div>

              <div style={{border:"1.5px solid #e0e0dc",marginBottom:"14px"}}>
                <div style={{fontSize:"8px",letterSpacing:"2px",padding:"8px 12px",background:"#f4f4f2",borderBottom:"1px solid #e0e0dc",color:"#888"}}>SHAFT (EXTERNAL)</div>
                <Row label="LOWER LIMIT" val={results.shaftLow}/>
                <Row label="UPPER LIMIT" val={results.shaftHigh} hi/>
                <Row label="TOLERANCE" val={results.shaftIT}/>
              </div>

              <div style={{border:"1.5px solid #e0e0dc"}}>
                <div style={{fontSize:"8px",letterSpacing:"2px",padding:"8px 12px",background:"#f4f4f2",borderBottom:"1px solid #e0e0dc",color:"#888"}}>CLEARANCE / INTERFERENCE</div>
                <Row label={results.type==="interference"?"MIN INTERFERENCE":"MAX CLEARANCE"} val={results.maxClear}/>
                <Row label={results.type==="interference"?"MAX INTERFERENCE":"MIN CLEARANCE"} val={results.minClear} hi/>
              </div>

              <div style={{fontSize:"10px",color:"#888",marginTop:"12px",fontFamily:F.sans,lineHeight:"1.5"}}>
                ⚠ Based on ISO 286 approximations. Verify against your tolerance table for critical fits.
              </div>
            </>
          ):<div style={{padding:"40px 24px",color:"#bbb",fontSize:"11px",textAlign:"center",border:"1.5px dashed #e0e0dc"}}>ENTER NOMINAL DIAMETER TO CALCULATE</div>}
        </div>
      </div>
    </div>
  );
}

// ─── TAP & DRILL CHART ────────────────────────────────────────────────────────
function TapDrillChart(){
  const [filter,setFilter]=useState("ALL"); // ALL | UNC | UNF | MET
  const [search,setSearch]=useState("");

  const filtered=TAP_DATA.filter(r=>{
    const matchType=filter==="ALL"||r.type===filter;
    const matchSearch=!search||r.tap.toLowerCase().includes(search.toLowerCase());
    return matchType&&matchSearch;
  });

  const typeColor={UNC:"#005599",UNF:"#006633",MET:"#884400"};

  return(
    <div style={{maxWidth:"900px",margin:"0 auto",padding:"28px 24px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",fontWeight:"700",marginBottom:"20px"}}>TAP & DRILL CHART</div>

      {/* Controls */}
      <div style={{display:"flex",gap:"10px",marginBottom:"20px",flexWrap:"wrap",alignItems:"center"}}>
        <div style={{display:"flex",gap:"0",border:"1.5px solid #111"}}>
          {["ALL","UNC","UNF","MET"].map(f=>(
            <button key={f} onClick={()=>setFilter(f)} style={{padding:"8px 16px",background:filter===f?"#111":"#fff",color:filter===f?"#fff":"#555",border:"none",borderRight:"1px solid #ccc",fontFamily:F.mono,fontSize:"10px",letterSpacing:"2px",cursor:"pointer",fontWeight:filter===f?"700":"400"}}>{f}</button>
          ))}
        </div>
        <input value={search} onChange={e=>setSearch(e.target.value)} placeholder="SEARCH (e.g. 1/4 or M6)..." style={{...ISt,width:"220px",padding:"7px 12px"}}/>
        {search&&<button onClick={()=>setSearch("")} style={{...mkB("ghost","sm"),borderColor:"#ccc",color:"#aaa"}}>CLEAR</button>}
        <span style={{fontSize:"10px",color:"#aaa",letterSpacing:"1px",marginLeft:"auto"}}>{filtered.length} ENTRIES</span>
      </div>

      {/* Legend */}
      <div style={{display:"flex",gap:"16px",marginBottom:"14px"}}>
        {[["UNC","Unified Coarse"],["UNF","Unified Fine"],["MET","Metric"]].map(([t,l])=>(
          <div key={t} style={{display:"flex",alignItems:"center",gap:"6px"}}>
            <div style={{width:"10px",height:"10px",background:typeColor[t]}}/>
            <span style={{fontSize:"9px",color:"#666",letterSpacing:"1px"}}>{t} — {l}</span>
          </div>
        ))}
      </div>

      {/* Table header */}
      <div style={{display:"grid",gridTemplateColumns:"100px 60px 80px 90px 90px 90px 90px",gap:"0",background:"#111",padding:"8px 12px"}}>
        {["TAP SIZE","TYPE","TPI","75% DRILL","DEC EQUIV","CLOSE DRILL","CLOSE HOLE"].map(h=>(
          <div key={h} style={{fontSize:"7px",letterSpacing:"2px",color:"#aaa",fontFamily:F.mono}}>{h}</div>
        ))}
      </div>

      {/* Table rows */}
      <div style={{border:"1.5px solid #e0e0dc",overflowY:"auto",maxHeight:"520px"}}>
        {filtered.length===0?(
          <div style={{padding:"32px",textAlign:"center",color:"#bbb",fontSize:"11px"}}>NO RESULTS</div>
        ):filtered.map((r,i)=>(
          <div key={r.tap} className="hr" style={{display:"grid",gridTemplateColumns:"100px 60px 80px 90px 90px 90px 90px",gap:"0",padding:"9px 12px",borderBottom:"1px solid #f0f0ec",background:i%2===0?"#fff":"#fafafa"}}>
            <div style={{fontFamily:F.mono,fontSize:"12px",fontWeight:"700",color:"#111"}}>{r.tap}</div>
            <div style={{display:"flex",alignItems:"center"}}>
              <span style={{fontSize:"8px",fontWeight:"700",color:typeColor[r.type],letterSpacing:"1px",border:`1px solid ${typeColor[r.type]}`,padding:"1px 5px"}}>{r.type}</span>
            </div>
            <div style={{fontFamily:F.mono,fontSize:"11px",color:"#444"}}>{r.tpi||"—"}</div>
            <div style={{fontFamily:F.mono,fontSize:"11px",fontWeight:"600",color:"#111"}}>{r.drill75}</div>
            <div style={{fontFamily:F.mono,fontSize:"11px",color:"#555"}}>{r.type==="MET"?`${r.drillDec}mm`:`${r.drillDec}"`}</div>
            <div style={{fontFamily:F.mono,fontSize:"11px",color:"#888"}}>{r.closeDrill}</div>
            <div style={{fontFamily:F.mono,fontSize:"11px",color:"#888"}}>{r.type==="MET"?`${r.closeHole}mm`:`${r.closeHole}"`}</div>
          </div>
        ))}
      </div>

      <div style={{fontSize:"10px",color:"#aaa",marginTop:"12px",fontFamily:F.sans,lineHeight:"1.5"}}>
        75% thread engagement drill sizes shown. For through-hole or softer materials, a slightly larger drill may be appropriate. Close clearance holes sized for bolt body OD.
      </div>
    </div>
  );
}

// ─── S&F CALCULATOR ───────────────────────────────────────────────────────────
function SFCalc(){
  const [mat,setMat]=useState("Aluminum 6061");
  const [tool,setTool]=useState("carbide");
  const [dia,setDia]=useState(0.5);
  const [flutes,setFlutes]=useState(4);
  const [custD,setCustD]=useState("");
  const [useCust,setUseCust]=useState(false);
  const [doc,setDoc]=useState("");
  const [woc,setWoc]=useState("");
  const [sfmOvr,setSfmOvr]=useState("");
  const matData=SF_MATS[mat];
  const effDia=useCust?(parseFloat(custD)||0):dia;
  const getCL=()=>{
    if(!matData||!effDia)return 0;
    const keys=Object.keys(matData.cl).map(Number).sort((a,b)=>a-b);
    let cl=matData.cl[keys[0]],minD=Infinity;
    for(const k of keys){const d=Math.abs(k-effDia);if(d<minD){minD=d;cl=matData.cl[k];}}
    return cl;
  };
  const sfm=sfmOvr?parseFloat(sfmOvr):(matData?matData.sfm[tool]:0);
  const cl=getCL();
  const rpm=effDia>0?Math.round((sfm*12)/(Math.PI*effDia)):0;
  const ipm=rpm&&cl?parseFloat((rpm*cl*flutes).toFixed(2)):0;
  const docV=parseFloat(doc)||effDia*0.5;
  const wocV=parseFloat(woc)||effDia*0.5;
  const mrr=ipm&&docV&&wocV?parseFloat((ipm*docV*wocV).toFixed(4)):0;
  const SS={...ISt,padding:"8px 10px",cursor:"pointer"};
  return(
    <div style={{maxWidth:"800px",margin:"0 auto",padding:"28px 24px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",fontWeight:"700",marginBottom:"20px"}}>SPEEDS & FEEDS CALCULATOR</div>
      <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:"28px"}}>
        <div style={{display:"flex",flexDirection:"column",gap:"14px"}}>
          <div><Label>MATERIAL</Label><select value={mat} onChange={e=>setMat(e.target.value)} style={SS}>{Object.keys(SF_MATS).map(m=><option key={m}>{m}</option>)}</select></div>
          <div><Label>TOOL TYPE</Label><div style={{display:"flex",gap:"8px"}}>{["carbide","hss"].map(t=><button key={t} onClick={()=>setTool(t)} style={{flex:1,padding:"9px",fontFamily:F.mono,fontSize:"10px",letterSpacing:"2px",fontWeight:"700",cursor:"pointer",transition:"all 0.15s",background:tool===t?"#111":"#fff",color:tool===t?"#fff":"#666",border:`1.5px solid ${tool===t?"#111":"#ccc"}`}}>{t.toUpperCase()}</button>)}</div></div>
          <div>
            <Label>TOOL DIAMETER (INCHES)</Label>
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:"6px",marginBottom:"8px"}}>{TOOL_DIAS.map(d=><button key={d} onClick={()=>{setDia(d);setUseCust(false);}} style={{padding:"8px 4px",fontFamily:F.mono,fontSize:"11px",fontWeight:"600",cursor:"pointer",transition:"all 0.15s",background:!useCust&&dia===d?"#111":"#fff",color:!useCust&&dia===d?"#fff":"#555",border:`1.5px solid ${!useCust&&dia===d?"#111":"#ccc"}`}}>{d}"</button>)}</div>
            <input value={custD} onChange={e=>{setCustD(e.target.value);setUseCust(true);}} placeholder='CUSTOM (e.g. 0.625")' style={{...ISt,fontSize:"11px"}}/>
          </div>
          <div><Label>NUMBER OF FLUTES</Label><div style={{display:"flex",gap:"8px"}}>{[2,3,4].map(f=><button key={f} onClick={()=>setFlutes(f)} style={{flex:1,padding:"10px",fontFamily:F.mono,fontSize:"14px",fontWeight:"700",cursor:"pointer",transition:"all 0.15s",background:flutes===f?"#111":"#fff",color:flutes===f?"#fff":"#555",border:`1.5px solid ${flutes===f?"#111":"#ccc"}`}}>{f}</button>)}</div></div>
          <div style={{borderTop:"1.5px solid #e0e0dc",paddingTop:"14px"}}>
            <Label>OPTIONAL OVERRIDES</Label>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px"}}>
              {[{l:"SFM",v:sfmOvr,s:setSfmOvr,p:"e.g. 400"},{l:"DOC",v:doc,s:setDoc,p:"e.g. 0.25"},{l:"WOC",v:woc,s:setWoc,p:"e.g. 0.25"}].map(({l,v,s,p})=>(
                <div key={l}><div style={{fontSize:"7px",letterSpacing:"2px",color:"#aaa",marginBottom:"4px"}}>{l}</div><input value={v} onChange={e=>s(e.target.value)} placeholder={p} style={{...ISt,fontSize:"11px",padding:"6px 8px"}}/></div>
              ))}
            </div>
          </div>
        </div>
        <div style={{display:"flex",flexDirection:"column",gap:"9px"}}>
          <ResBox label="SPINDLE SPEED"        val={rpm?rpm.toLocaleString():""}   unit="RPM"      big/>
          <ResBox label="FEED RATE"            val={ipm?ipm.toLocaleString():""}   unit="IPM"      big/>
          <ResBox label="CHIP LOAD / TOOTH"    val={cl?cl.toFixed(4):""}           unit="IN"/>
          <ResBox label="SURFACE FEET / MIN"   val={sfm||""}                        unit="SFM"/>
          <ResBox label="MATERIAL REMOVAL RATE"val={mrr||""}                        unit="IN³/MIN"/>
          <div style={{background:"#f4f4f2",border:"1.5px solid #e0e0dc",padding:"12px 14px"}}>
            <div style={{fontSize:"8px",letterSpacing:"2px",color:"#888",marginBottom:"8px"}}>FORMULAS</div>
            {[["RPM","(SFM × 12) ÷ (π × DIA)"],["IPM","RPM × CHIP LOAD × FLUTES"],["MRR","IPM × DOC × WOC"]].map(([l,f])=>(
              <div key={l} style={{display:"flex",gap:"8px",marginBottom:"4px",fontSize:"10px"}}><span style={{fontWeight:"700",width:"32px"}}>{l}</span><span style={{color:"#666"}}>= {f}</span></div>
            ))}
          </div>
          <div style={{fontSize:"10px",color:"#888",lineHeight:"1.6",fontFamily:F.sans,padding:"10px 12px",background:"#fff",border:"1px solid #e8e8e4"}}>
            ⚠ Starting point values. Adjust for machine rigidity, tool condition, and coolant.
          </div>
        </div>
      </div>
    </div>
  );
}

// ─── REGULAR CALCULATOR ───────────────────────────────────────────────────────
function RegularCalc(){
  const [display,setDisplay]=useState("0");
  const [expr,setExpr]=useState("");
  const [fresh,setFresh]=useState(true);
  const press=val=>{
    if(val==="C"){setDisplay("0");setExpr("");setFresh(true);return;}
    if(val==="±"){setDisplay(d=>d==="0"?"0":String(parseFloat(d)*-1));return;}
    if(val==="%"){setDisplay(d=>String(parseFloat(d)/100));return;}
    if(val==="="){try{const r=Function(`"use strict";return (${expr+display})`)();setDisplay(String(parseFloat(r.toFixed(10))));setExpr("");setFresh(true);}catch{setDisplay("ERR");setExpr("");setFresh(true);}return;}
    if(["+","−","×","÷"].includes(val)){const op=val==="−"?"-":val==="×"?"*":val==="÷"?"/":"+";setExpr(expr+display+op);setFresh(true);return;}
    if(val==="."){if(fresh){setDisplay("0.");setFresh(false);return;}if(!display.includes("."))setDisplay(d=>d+".");return;}
    if(fresh){setDisplay(val);setFresh(false);}else setDisplay(d=>d==="0"?val:d+val);
  };
  const rows=[["C","±","%","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],[["0",2],".",["=",1]]];
  const isOp=v=>["÷","×","−","+","="].includes(v);
  const isUtil=v=>["C","±","%"].includes(v);
  return(
    <div style={{maxWidth:"340px",margin:"32px auto",padding:"0 16px"}}>
      <div style={{fontSize:"10px",letterSpacing:"3px",fontWeight:"700",marginBottom:"16px"}}>CALCULATOR</div>
      <div style={{background:"#111",padding:"18px 20px",marginBottom:"10px",border:"2px solid #111"}}>
        <div style={{fontSize:"10px",color:"#444",fontFamily:F.mono,textAlign:"right",minHeight:"16px"}}>{expr||"\u00a0"}</div>
        <div style={{fontSize:display.length>10?"22px":"38px",fontWeight:"700",color:"#fff",fontFamily:F.mono,textAlign:"right",lineHeight:"1.1",marginTop:"4px",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{display}</div>
      </div>
      <div style={{display:"grid",gap:"7px"}}>
        {[["C","±","%","÷"],["7","8","9","×"],["4","5","6","−"],["1","2","3","+"],["0",".","="]].map((row,ri)=>(
          <div key={ri} style={{display:"grid",gridTemplateColumns:row.length===3?"2fr 1fr 1fr":"repeat(4,1fr)",gap:"7px"}}>
            {row.map(val=>(
              <button key={val} className="ck" onClick={()=>press(val)} style={{padding:"18px 8px",background:isOp(val)?"#111":isUtil(val)?"#d8d8d4":"#fff",color:isOp(val)?"#fff":"#111",border:`1.5px solid ${isOp(val)?"#111":"#d0d0cc"}`,fontFamily:F.mono,fontSize:"20px",fontWeight:"600",cursor:"pointer",transition:"all 0.1s"}}>{val}</button>
            ))}
          </div>
        ))}
      </div>
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App(){
  const [authView,setAuthView]=useState("login");
  const [session,setSession]=useState(null);
  const [authLoading,setAuthLoading]=useState(false);
  const [authError,setAuthError]=useState("");
  const [email,setEmail]=useState("");
  const [password,setPassword]=useState("");
  const [jobs,setJobs]=useState([]);
  const [activeJobId,setActiveJobId]=useState(null);
  const [activeSection,setActiveSection]=useState("programming");
  const [screen,setScreen]=useState("checklist");
  const [expandedNotes,setExpandedNotes]=useState({});
  const [deleteConfirm,setDeleteConfirm]=useState(null);
  const [saving,setSaving]=useState(false);
  const [loadingJobs,setLoadingJobs]=useState(false);
  const [saveTimer,setSaveTimer]=useState(null);
  const isDemo=SUPABASE_URL==="YOUR_SUPABASE_URL";

  const handleAuth=async e=>{
    e.preventDefault();setAuthLoading(true);setAuthError("");
    try{
      if(isDemo){const fs={user:{id:"demo-user",email},access_token:"demo"};supabase.setSession(fs);setSession(fs);return;}
      const data=authView==="login"?await supabase.auth.signIn(email,password):await supabase.auth.signUp(email,password);
      if(data.error||data.msg){setAuthError(data.error_description||data.msg||"Auth failed");return;}
      supabase.setSession(data);setSession(data);
    }catch{setAuthError("Connection error.");}finally{setAuthLoading(false);}
  };
  const signOut=async()=>{if(!isDemo)await supabase.auth.signOut();setSession(null);setJobs([]);setActiveJobId(null);setEmail("");setPassword("");};

  useEffect(()=>{
    if(!session)return;
    const uid=session.user.id;
    if(isDemo){const j=blankJob(uid,"DEMO-PART-001");setJobs([j]);setActiveJobId(j.id);return;}
    setLoadingJobs(true);
    supabase.db.getJobs(uid).then(data=>{
      if(Array.isArray(data)&&data.length>0){const p=data.map(j=>({...j,checked:typeof j.checked==="string"?JSON.parse(j.checked):j.checked,notes:typeof j.notes==="string"?JSON.parse(j.notes):j.notes}));setJobs(p);setActiveJobId(p[0].id);}
      else{const j=blankJob(uid,"");setJobs([j]);setActiveJobId(j.id);}
      setLoadingJobs(false);
    });
  },[session]);

  const scheduleS=useCallback(upd=>{
    if(isDemo||!session)return;
    if(saveTimer)clearTimeout(saveTimer);
    const t=setTimeout(async()=>{setSaving(true);const j=upd.find(j=>j.id===activeJobId);if(j)await supabase.db.upsertJob({...j,updated_at:new Date().toISOString()});setSaving(false);},1200);
    setSaveTimer(t);
  },[saveTimer,activeJobId,session,isDemo]);

  const job=jobs.find(j=>j.id===activeJobId);
  const updateJob=upd=>{const u=jobs.map(j=>j.id===activeJobId?{...j,...upd}:j);setJobs(u);scheduleS(u);};
  const toggle=id=>{if(!job)return;updateJob({checked:{...job.checked,[id]:!job.checked[id]}});};
  const setNote=(id,v)=>{if(!job)return;updateJob({notes:{...job.notes,[id]:v}});};
  const addJob=async()=>{const j=blankJob(session.user.id,"");const u=[j,...jobs];setJobs(u);setActiveJobId(j.id);setScreen("checklist");setActiveSection("programming");if(!isDemo)await supabase.db.upsertJob(j);};
  const deleteJob=async id=>{const rem=jobs.filter(j=>j.id!==id);if(rem.length===0){const j=blankJob(session.user.id,"");setJobs([j]);setActiveJobId(j.id);if(!isDemo){await supabase.db.deleteJob(id);await supabase.db.upsertJob(j);}}else{setJobs(rem);if(activeJobId===id)setActiveJobId(rem[0].id);if(!isDemo)await supabase.db.deleteJob(id);}setDeleteConfirm(null);};

  const secProg=sec=>{if(!job)return{done:0,total:sec.items.length,pct:0};const done=sec.items.filter(i=>job.checked?.[i.id]).length;return{done,total:sec.items.length,pct:Math.round((done/sec.items.length)*100)};};
  const totalDone=job?ALL_IDS.filter(id=>job.checked?.[id]).length:0;
  const totalItems=ALL_IDS.length;
  const totalPct=Math.round((totalDone/totalItems)*100);
  const curSec=SECTIONS.find(s=>s.id===activeSection);
  const {done:sd,total:st}=secProg(curSec);
  const allDone=sd===st;
  const curIdx=SECTIONS.findIndex(s=>s.id===activeSection);
  const hP={screen,setScreen,jobs,saving,isDemo,signOut};

  // AUTH
  if(!session)return(
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"#f4f4f2",display:"flex",alignItems:"center",justifyContent:"center",padding:"24px"}}>
      <div style={{width:"100%",maxWidth:"400px"}}>
        <div style={{textAlign:"center",marginBottom:"32px"}}>
          <div style={{fontSize:"9px",letterSpacing:"5px",color:"#999",marginBottom:"6px"}}>CNC MACHINING</div>
          <div style={{fontSize:"26px",fontWeight:"700",letterSpacing:"2px"}}>FIRSTPIECE</div>
          <div style={{fontSize:"9px",letterSpacing:"3px",color:"#666",marginTop:"3px"}}>PRO CHECKLIST</div>
        </div>
        <div style={{background:"#fff",border:"2px solid #111",padding:"30px"}}>
          <div style={{fontSize:"11px",letterSpacing:"3px",fontWeight:"600",marginBottom:"22px"}}>{authView==="login"?"SIGN IN":"CREATE ACCOUNT"}</div>
          {isDemo&&<div style={{background:"#fffbe6",border:"1px solid #e6c800",padding:"10px 12px",fontSize:"11px",marginBottom:"18px",color:"#664400",lineHeight:"1.5"}}>⚠ DEMO MODE — any email/password works.</div>}
          <form onSubmit={handleAuth}>
            <div style={{marginBottom:"12px"}}><Label>EMAIL</Label><input type="email" value={email} onChange={e=>setEmail(e.target.value)} placeholder="you@shop.com" required style={ISt}/></div>
            <div style={{marginBottom:"18px"}}><Label>PASSWORD</Label><input type="password" value={password} onChange={e=>setPassword(e.target.value)} placeholder="••••••••" required minLength={6} style={ISt}/></div>
            {authError&&<div style={{fontSize:"11px",color:"#c82000",marginBottom:"12px",padding:"8px 10px",border:"1px solid #c82000"}}>{authError}</div>}
            <button type="submit" disabled={authLoading} style={{...mkB("solid"),width:"100%",justifyContent:"center",opacity:authLoading?0.6:1}}>{authLoading?"LOADING...":authView==="login"?"SIGN IN":"CREATE ACCOUNT"}</button>
          </form>
          <div style={{marginTop:"18px",textAlign:"center",fontSize:"11px",color:"#666"}}>
            {authView==="login"?<>No account? <span onClick={()=>setAuthView("signup")} style={{cursor:"pointer",fontWeight:"600",color:"#111",textDecoration:"underline"}}>Sign up free</span></>:<>Have an account? <span onClick={()=>setAuthView("login")} style={{cursor:"pointer",fontWeight:"600",color:"#111",textDecoration:"underline"}}>Sign in</span></>}
          </div>
        </div>
      </div>
    </div></>
  );

  if(loadingJobs)return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2",display:"flex",alignItems:"center",justifyContent:"center",fontSize:"11px",letterSpacing:"3px",color:"#777"}}>LOADING JOBS...</div></>);

  // TOOL SCREENS
  if(screen==="calc")     return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2"}}><Header {...hP}/><RegularCalc/></div></>);
  if(screen==="sfcalc")   return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2"}}><Header {...hP}/><SFCalc/></div></>);
  if(screen==="trig")     return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2"}}><Header {...hP}/><TrigCalc/></div></>);
  if(screen==="tolerance")return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2"}}><Header {...hP}/><ToleranceCalc/></div></>);
  if(screen==="tapdrillchart")  return(<><style>{CSS}</style><div style={{minHeight:"100vh",background:"#f4f4f2"}}><Header {...hP}/><TapDrillChart/></div></>);

  // PRINT
  if(screen==="print")return(
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"#f4f4f2"}}>
      <Header {...hP}/>
      <div style={{maxWidth:"800px",margin:"24px auto",padding:"0 24px"}}>
        <button onClick={()=>window.print()} style={{...mkB("solid","sm"),marginBottom:"20px"}}>🖨 PRINT / SAVE AS PDF</button>
        <div id="pz" style={{background:"#fff",border:"2px solid #111",padding:"32px",fontFamily:F.mono}}>
          <div style={{borderBottom:"3px solid #111",paddingBottom:"12px",marginBottom:"20px"}}>
            <div style={{fontSize:"8px",letterSpacing:"5px",color:"#888",marginBottom:"4px"}}>CNC MACHINING</div>
            <div style={{fontSize:"20px",fontWeight:"700",letterSpacing:"2px"}}>FIRSTPIECE PRO</div>
          </div>
          <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:"10px",marginBottom:"24px"}}>
            {[["JOB / PART #",job?.name||"—"],["DATE",job?.date||"—"],["MACHINE",job?.machine||"—"],["OPERATOR",job?.operator||"—"],["MATERIAL",job?.material||"—"],["COMPLETION",`${totalDone}/${totalItems} (${totalPct}%)${totalPct===100?" ✓":""}`]].map(([l,v])=>(
              <div key={l} style={{borderBottom:"1px solid #ddd",paddingBottom:"6px"}}><div style={{fontSize:"7px",letterSpacing:"2px",color:"#999",marginBottom:"2px"}}>{l}</div><div style={{fontSize:"12px",fontWeight:"600"}}>{v}</div></div>
            ))}
          </div>
          {SECTIONS.map(sec=>{
            const {done,total}=secProg(sec);
            return(<div key={sec.id} style={{marginBottom:"20px"}}>
              <div style={{fontSize:"8px",letterSpacing:"3px",fontWeight:"700",borderBottom:"2px solid #111",paddingBottom:"4px",marginBottom:"8px",display:"flex",justifyContent:"space-between"}}><span>{sec.label}</span><span>{done}/{total}{done===total?" ✓":""}</span></div>
              {sec.items.map((item,idx)=>(
                <div key={item.id} style={{marginBottom:"7px"}}>
                  <div style={{display:"flex",gap:"10px",alignItems:"flex-start"}}>
                    <div style={{width:"13px",height:"13px",border:"2px solid #111",background:job?.checked?.[item.id]?"#111":"#fff",flexShrink:0,marginTop:"2px",display:"flex",alignItems:"center",justifyContent:"center"}}>{job?.checked?.[item.id]&&<span style={{color:"#fff",fontSize:"9px",lineHeight:1}}>✓</span>}</div>
                    <span style={{fontSize:"9px",color:"#bbb",minWidth:"18px"}}>{String(idx+1).padStart(2,"0")}</span>
                    <span style={{fontSize:"10px",color:job?.checked?.[item.id]?"#999":"#111",textDecoration:job?.checked?.[item.id]?"line-through":"none",lineHeight:"1.4"}}>{item.text}</span>
                  </div>
                  {job?.notes?.[item.id]&&<div style={{marginLeft:"41px",marginTop:"2px",fontSize:"9px",color:"#555",fontStyle:"italic"}}>NOTE: {job.notes[item.id]}</div>}
                </div>
              ))}
            </div>);
          })}
          <div style={{borderTop:"2px solid #111",marginTop:"16px",paddingTop:"10px",display:"flex",justifyContent:"space-between",fontSize:"8px",letterSpacing:"1px",color:"#999"}}><span>FIRSTPIECE PRO</span><span>{new Date().toLocaleString().toUpperCase()}</span></div>
        </div>
      </div>
    </div></>
  );

  // JOBS
  if(screen==="jobs")return(
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"#f4f4f2"}}>
      <Header {...hP}/>
      <div style={{maxWidth:"700px",margin:"0 auto",padding:"28px 24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"20px"}}>
          <div style={{fontSize:"11px",letterSpacing:"3px",fontWeight:"700"}}>YOUR JOBS</div>
          <button onClick={addJob} style={mkB("solid","sm")}>+ NEW JOB</button>
        </div>
        {jobs.length===0?<div style={{textAlign:"center",padding:"48px",color:"#aaa",fontSize:"11px",letterSpacing:"2px",border:"1.5px dashed #ccc",background:"#fff"}}>NO JOBS YET</div>:
        <div style={{display:"flex",flexDirection:"column",gap:"8px"}}>
          {jobs.map(j=>{
            const d=ALL_IDS.filter(id=>j.checked?.[id]).length;const p=Math.round((d/totalItems)*100);
            return(<div key={j.id} className="hr" style={{background:"#fff",border:`2px solid ${j.id===activeJobId?"#111":"#e0e0dc"}`,padding:"14px 16px",display:"flex",alignItems:"center",gap:"14px"}}>
              <div style={{flex:1,cursor:"pointer"}} onClick={()=>{setActiveJobId(j.id);setScreen("checklist");}}>
                <div style={{fontWeight:"700",fontSize:"13px",marginBottom:"3px"}}>{j.name||<span style={{color:"#bbb"}}>UNNAMED JOB</span>}</div>
                <div style={{fontSize:"10px",color:"#777",letterSpacing:"1px",marginBottom:"8px"}}>{j.date}{j.machine?` · ${j.machine}`:""}{j.operator?` · ${j.operator}`:""}</div>
                <div style={{height:"3px",background:"#eee"}}><div style={{height:"100%",width:`${p}%`,background:p===100?"#006633":"#111",transition:"width 0.3s"}}/></div>
                <div style={{fontSize:"9px",letterSpacing:"1px",marginTop:"4px",color:p===100?"#006633":"#777",fontWeight:p===100?"700":"400"}}>{d}/{totalItems} — {p}%{p===100?" ✓ COMPLETE":""}</div>
              </div>
              {deleteConfirm===j.id?<div style={{display:"flex",gap:"6px"}}><button onClick={()=>deleteJob(j.id)} style={mkB("danger","sm")}>DELETE</button><button onClick={()=>setDeleteConfirm(null)} style={mkB("ghost","sm")}>CANCEL</button></div>:<button onClick={()=>setDeleteConfirm(j.id)} style={{...mkB("ghost","sm"),borderColor:"#ddd",color:"#ccc",padding:"5px 10px"}}>✕</button>}
            </div>);
          })}
        </div>}
      </div>
    </div></>
  );

  // CHECKLIST (main)
  return(
    <><style>{CSS}</style>
    <div style={{minHeight:"100vh",background:"#f4f4f2"}}>
      <Header {...hP}/>
      <div style={{background:"#fff",borderBottom:"1.5px solid #e0e0dc",padding:"12px 24px"}}>
        <div style={{maxWidth:"860px",margin:"0 auto",display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(140px,1fr))",gap:"12px"}}>
          {[{l:"JOB / PART #",k:"name",p:"PART-001..."},{l:"MACHINE",k:"machine",p:"VMC-01..."},{l:"OPERATOR",k:"operator",p:"YOUR NAME..."},{l:"MATERIAL",k:"material",p:"4140 STEEL..."}].map(({l,k,p})=>(
            <div key={k}><Label>{l}</Label><input value={job?.[k]||""} onChange={e=>updateJob({[k]:e.target.value})} placeholder={p} style={{...ISt,fontSize:"11px",padding:"6px 10px"}}/></div>
          ))}
        </div>
      </div>
      <div style={{background:"#fff",borderBottom:"1.5px solid #e0e0dc",padding:"10px 24px"}}>
        <div style={{maxWidth:"860px",margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",marginBottom:"5px"}}>
            <span style={{fontSize:"8px",letterSpacing:"2px",color:"#999"}}>OVERALL PROGRESS</span>
            <span style={{fontSize:"8px",letterSpacing:"2px",fontWeight:"700",color:totalPct===100?"#006633":"#111"}}>{totalDone}/{totalItems} — {totalPct}%</span>
          </div>
          <div style={{height:"3px",background:"#e8e8e4"}}><div style={{height:"100%",width:`${totalPct}%`,background:totalPct===100?"#006633":"#111",transition:"width 0.3s"}}/></div>
        </div>
      </div>
      <div style={{background:"#fff",borderBottom:"2px solid #111",display:"flex",overflowX:"auto"}}>
        {SECTIONS.map(sec=>{const {done,total,pct}=secProg(sec);const isA=activeSection===sec.id;return(<button key={sec.id} className="hr" onClick={()=>setActiveSection(sec.id)} style={{background:isA?"#111":"#fff",border:"none",color:isA?"#fff":"#666",padding:"12px 20px",fontFamily:F.mono,fontSize:"9px",letterSpacing:"2px",cursor:"pointer",whiteSpace:"nowrap",fontWeight:isA?"700":"400",display:"flex",flexDirection:"column",alignItems:"center",gap:"3px",minWidth:"120px"}}><span>{sec.label}</span><span style={{fontSize:"8px",opacity:0.7}}>{done}/{total}{pct===100?" ✓":""}</span></button>);})}
      </div>
      <div style={{maxWidth:"860px",margin:"0 auto",padding:"24px"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:"14px"}}>
          <div style={{fontSize:"11px",letterSpacing:"3px",fontWeight:"700"}}>{curSec.label}</div>
          <div style={{fontSize:"10px",letterSpacing:"1px",color:allDone?"#006633":"#999",fontWeight:allDone?"700":"400"}}>{allDone?"✓ SECTION COMPLETE":`${sd} OF ${st} CHECKED`}</div>
        </div>
        <div style={{height:"2px",background:"#e8e8e4",marginBottom:"18px"}}><div style={{height:"100%",width:`${(sd/st)*100}%`,background:"#111",transition:"width 0.3s"}}/></div>
        <div style={{display:"flex",flexDirection:"column",gap:"6px"}}>
          {curSec.items.map((item,idx)=>{
            const ck=job?.checked?.[item.id];const nOpen=expandedNotes[item.id];const hasN=job?.notes?.[item.id]?.trim().length>0;
            return(<div key={item.id} className="hr" style={{background:ck?"#f0f0ee":"#fff",border:`1.5px solid ${ck?"#ccc":"#e0e0dc"}`}}>
              <div style={{display:"flex",alignItems:"center",gap:"12px",padding:"12px 14px",cursor:"pointer",userSelect:"none"}} onClick={()=>toggle(item.id)}>
                <div style={{width:"20px",height:"20px",border:"2px solid #111",flexShrink:0,background:ck?"#111":"#fff",display:"flex",alignItems:"center",justifyContent:"center",transition:"background 0.12s"}}>{ck&&<span style={{color:"#fff",fontSize:"12px",fontWeight:"700",lineHeight:1}}>✓</span>}</div>
                <span style={{fontSize:"9px",color:"#ccc",width:"20px",flexShrink:0}}>{String(idx+1).padStart(2,"0")}</span>
                <span style={{fontSize:"12px",flex:1,lineHeight:"1.5",color:ck?"#aaa":"#111",textDecoration:ck?"line-through":"none",fontFamily:F.sans}}>{item.text}</span>
                <button onClick={e=>{e.stopPropagation();setExpandedNotes(p=>({...p,[item.id]:!p[item.id]}));}} style={{background:hasN?"#111":"transparent",border:`1px solid ${hasN?"#111":"#ddd"}`,color:hasN?"#fff":"#ccc",fontSize:"9px",padding:"3px 8px",cursor:"pointer",fontFamily:F.mono,flexShrink:0,letterSpacing:"1px"}}>{hasN?"NOTE ✓":"+ NOTE"}</button>
              </div>
              {nOpen&&<div style={{padding:"0 14px 12px 54px"}}><textarea value={job?.notes?.[item.id]||""} onChange={e=>setNote(item.id,e.target.value)} placeholder="Add a job-specific note..." rows={2} style={{...ISt,fontSize:"11px",resize:"vertical",fontFamily:F.sans}}/></div>}
            </div>);
          })}
        </div>
        <div style={{display:"flex",justifyContent:"space-between",marginTop:"28px",gap:"12px"}}>
          {curIdx>0&&<button onClick={()=>setActiveSection(SECTIONS[curIdx-1].id)} style={mkB("outline","sm")}>← PREV</button>}
          <div style={{flex:1}}/>
          {curIdx<SECTIONS.length-1?<button onClick={()=>setActiveSection(SECTIONS[curIdx+1].id)} style={mkB(allDone?"solid":"outline","sm")}>NEXT →</button>:totalPct===100&&<div style={{background:"#006633",color:"#fff",padding:"9px 28px",fontSize:"11px",letterSpacing:"3px",fontWeight:"700"}}>✓ READY TO RUN</div>}
        </div>
        {totalPct===100&&(
          <div style={{marginTop:"20px",padding:"20px",border:"2px solid #006633",background:"#f0fff8",textAlign:"center"}}>
            <div style={{fontSize:"9px",letterSpacing:"4px",color:"#006633",marginBottom:"6px",fontWeight:"700"}}>ALL CHECKS COMPLETE</div>
            <div style={{fontSize:"14px",fontWeight:"700",color:"#111",letterSpacing:"1px",marginBottom:"12px"}}>{job?.name?`${job.name} — `:""}CLEARED TO RUN</div>
            <button onClick={()=>setScreen("print")} style={mkB("solid","sm")}>🖨 PRINT REPORT</button>
          </div>
        )}
      </div>
    </div></>
  );
}

