import { useState, useEffect, useRef } from "react";

// ── Config ──────────────────────────────────────────────────
import { API_BASE } from "./config/api";

// ── Theme ───────────────────────────────────────────────────
import { T, sh, shM } from "./theme/theme";

// ── Icons ───────────────────────────────────────────────────
import { G, KVLogo, WeatherIcon } from "./icons/icons";

// ── Constants ───────────────────────────────────────────────
import { MSP_DB, getMSP } from "./constants/msp";
import { SCHEMES, getStateFromLocation, SCHEME_FILTERS } from "./constants/schemes";
import { LANGS, STEPS, TOUR_STEPS } from "./constants/appData";

// ── Components ──────────────────────────────────────────────
import { Card, SLabel, Badge, ITile, PrimaryBtn } from "./components/UIComponents";
import { tierStyle, fungicideColor } from "./components/UIHelpers";
import { LoginPage } from "./components/LoginPage";
import { CropPopup } from "./components/CropPopup";
import { TourBubble, CSS } from "./components/TourBubble";

export default function App(){
  const [page,setPage]       = useState(()=>localStorage.getItem("kv_token")?"main":"login");
  const [screen,setScreen]   = useState("home");
  const [screenHistory,setScreenHistory] = useState([]);

  const go = s => {
    setScreenHistory(prev => [...prev, screen]); // push current screen to history
    setScreen(s);
    setShowProf(false);
  };

  const goBack = () => {
    if(screenHistory.length === 0){ setScreen("home"); return; }
    const prev = screenHistory[screenHistory.length - 1];
    setScreenHistory(h => h.slice(0, -1));
    setScreen(prev);
    setShowProf(false);
  };
  const [showLang,setShowLang]   = useState(false);
  const [showProf,setShowProf]   = useState(false);
  const [showEditProfile,setShowEditProfile] = useState(false);
  const [editName,setEditName]   = useState(()=>{
    try{ const u=JSON.parse(localStorage.getItem("kv_user")||"null"); return u?.name||"Farmer"; }catch{ return "Farmer"; }
  });
  const [editState,setEditState] = useState("");
  const [downloads,setDownloads] = useState([]);
  const [csLabel,setCSLabel]     = useState(null);
  const [drag,setDrag]           = useState(false);
  const [filter,setFilter]       = useState("All");
  const [analyzing,setAnalyzing] = useState(false);
  const [showCropPopup,setShowCropPopup] = useState(false);
  const [farmData,setFarmData]   = useState(null);
  const [pulse,setPulse]         = useState(false);
  const [selectedImage,setSelectedImage] = useState(null);
  const [selectedFile,setSelectedFile]   = useState(null);
  const [schemeDetail,setSchemeDetail]   = useState(null);
  const [showMoreFilters,setShowMoreFilters] = useState(false);
  const [expandedScheme,setExpandedScheme]   = useState(null);
  const [scanHistory,setScanHistory]         = useState([]);
  const [expandedHistory,setExpandedHistory] = useState(null);
  const [loggedInUser,setLoggedInUser]       = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("kv_user")||"null"); }catch{ return null; }
  });
  const [authToken,setAuthToken]             = useState(()=>localStorage.getItem("kv_token")||"");

  // ── LOAD HISTORY FROM DATABASE ON APP START ───────────────
  useEffect(()=>{
    const token = localStorage.getItem("kv_token");
    if(!token) return;

    // Load scan history from DB
    fetch(`${API_BASE}/scans/history`,{
      headers:{"Authorization":`Bearer ${token}`}
    })
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      if(data?.scans){
        setScanHistory(data.scans.map(s=>({
          id:     s.id,
          date:   new Date(s.scanned_at).toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),
          time:   new Date(s.scanned_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
          image:  s.image||null,
          crop:   s.crop,
          land:   s.land,
          result: s.result,
          weather:{location:s.location,temperature:s.temperature},
        })));
      }
    })
    .catch(()=>{});

    // Load downloads from DB
    fetch(`${API_BASE}/downloads/list`,{
      headers:{"Authorization":`Bearer ${token}`}
    })
    .then(r=>r.ok?r.json():null)
    .then(data=>{
      if(data?.downloads){
        setDownloads(data.downloads.map(d=>({
          id:           d.id,
          title:        d.title,
          date:         new Date(d.downloaded_at).toLocaleDateString("en-IN",{day:"2-digit",month:"long",year:"numeric"}),
          time:         new Date(d.downloaded_at).toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
          crop:         d.crop,
          land:         d.land,
          disease:      d.disease,
          confidence:   d.confidence,
          severity:     d.severity,
          health_score: d.health_score,
          image:        d.image||null,
          html:         d.html,
        })));
      }
    })
    .catch(()=>{});
  },[authToken]);

  // ═══════════════════════════════════════════════════════════
  // API RESULT STATE
  // apiResult is populated by POST /predict response from Flask
  // Every result dashboard value comes from here — NOTHING hardcoded
  // ═══════════════════════════════════════════════════════════
  const [apiResult,setApiResult] = useState(null);

  // ═══════════════════════════════════════════════════════════
  // WEATHER STATE
  // weatherData is populated by GET /weather?lat=X&lon=Y
  // Loaded on app start using browser GPS
  // Also returned inside /predict response
  // ═══════════════════════════════════════════════════════════
  const [weatherData,setWeatherData] = useState(null);
  const [gpsStatus,setGpsStatus]     = useState("detecting"); // detecting | live | denied | error

  // GPS coordinates state
  const [userLat,setUserLat] = useState(30.9010);  // default Ludhiana
  const [userLon,setUserLon] = useState(75.8573);

  const fileInputRef = useRef(null);
  const [tourStep,setTourStep]   = useState(0);
  const [tourActive,setTourActive] = useState(true);
  const [tourDone,setTourDone]   = useState(false);

  useEffect(()=>{const id=setInterval(()=>setPulse(p=>!p),1800);return()=>clearInterval(id);},[]);

  // ═══════════════════════════════════════════════════════════
  // GPS AUTO-DETECTION
  // Uses browser Geolocation API to get farmer's real coordinates
  // Then fetches live weather from Flask /weather endpoint
  // ═══════════════════════════════════════════════════════════
  useEffect(()=>{
    if(page !== "main") return;
    if(!navigator.geolocation){
      setGpsStatus("error");
      fetchWeather(userLat, userLon);
      return;
    }
    setGpsStatus("detecting");
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const lat = pos.coords.latitude;
        const lon = pos.coords.longitude;
        setUserLat(lat);
        setUserLon(lon);
        setGpsStatus("live");
        fetchWeather(lat, lon);
      },
      (err) => {
        console.warn("GPS denied:", err.message);
        setGpsStatus("denied");
        fetchWeather(userLat, userLon);  // fallback to default coords
      },
      { timeout: 8000, enableHighAccuracy: true }
    );
  }, [page]);

  // ═══════════════════════════════════════════════════════════
  // FETCH LIVE WEATHER
  // Calls Flask GET /weather endpoint with real GPS coordinates
  // ═══════════════════════════════════════════════════════════
  const fetchWeather = async (lat, lon) => {
    try {
      // ── BACKEND CONNECTION POINT ──────────────────────────
      // Flask weather endpoint: GET http://localhost:5000/weather
      // lat and lon come from browser GPS above
      // Response populates the entire weather strip on home screen
      // ─────────────────────────────────────────────────────
      const res = await fetch(`${API_BASE}/weather?lat=${lat}&lon=${lon}`);
      if(res.ok){
        const data = await res.json();
        setWeatherData(data);
      }
    } catch(err){
      console.warn("Weather fetch failed:", err);
      // Keep weatherData as null — will show loading state
    }
  };

  const cs=l=>setCSLabel(l);
  // go and goBack defined above with screenHistory
  const inferredState = getStateFromLocation(weatherData?.location || "");
  const filtered = filter==="All" ? SCHEMES : SCHEMES.filter(s=>{
    if(filter==="Central") return s.state==="Central";
    return s.state===filter;
  });

  const handleUpload=()=>{ if(fileInputRef.current) fileInputRef.current.click(); };

  const handleFileSelected=(e)=>{
    const file=e.target.files[0];
    if(!file) return;
    setSelectedFile(file);
    const reader=new FileReader();
    reader.onload=(ev)=>setSelectedImage(ev.target.result);
    reader.readAsDataURL(file);
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE ANALYZE — sends image to Flask backend
  // ═══════════════════════════════════════════════════════════
  const handleAnalyze = async () => {
    if(!selectedImage) return;
    setAnalyzing(true);
    try {
      // ── BACKEND CONNECTION POINT ──────────────────────────
      // POST http://localhost:5000/predict
      // FormData fields sent:
      //   image -> crop leaf image file (required)
      //   crop  -> from farmData.crop (set in crop popup)
      //   land  -> from farmData.land (set in crop popup)
      //   lat   -> GPS latitude from browser
      //   lon   -> GPS longitude from browser
      //
      // These are added again here because analyze may be
      // called before or after crop popup submission
      // ─────────────────────────────────────────────────────
      const formData = new FormData();
      formData.append("image", selectedFile);
      formData.append("lat",   userLat.toString());
      formData.append("lon",   userLon.toString());

      // crop and land are appended later in handleCropSubmit
      // if already available, include them now
      if(farmData){
        formData.append("crop", farmData.crop);
        formData.append("land", farmData.land.toString());
      }

      const res = await fetch(`${API_BASE}/predict`, {
        method: "POST",
        body: formData,
      });

      if(res.ok){
        const data = await res.json();
        setApiResult(data);
        // Update weather from the predict response too
        if(data.weather){
          setWeatherData(data.weather);
        }
      } else {
        setApiResult(null);  // will use demo fallback in render
      }
    } catch(err){
      console.warn("Backend not running — using demo mode:", err);
      setApiResult(null);
    }
    setAnalyzing(false);
    setShowCropPopup(true);
  };

  const handleRemoveImage=()=>{
    setSelectedImage(null);setSelectedFile(null);setApiResult(null);
    if(fileInputRef.current) fileInputRef.current.value="";
  };

  // ═══════════════════════════════════════════════════════════
  // HANDLE CROP SUBMIT — after user fills popup
  // Also sends final predict request with crop+land attached
  // ═══════════════════════════════════════════════════════════
  const handleCropSubmit = async (data) => {
    setFarmData(data);
    setShowCropPopup(false);

    // Track fresh result from API call
    let freshResult = apiResult;
    let freshWeather = weatherData;

    // If we already have a result, re-request with crop+land included
    if(selectedFile){
      setAnalyzing(true);
      try {
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("crop",  data.crop);
        formData.append("land",  data.land.toString());
        formData.append("lat",   userLat.toString());
        formData.append("lon",   userLon.toString());

        const res = await fetch(`${API_BASE}/predict`, {
          method: "POST",
          body: formData,
        });
        if(res.ok){
          const result = await res.json();
          setApiResult(result);
          if(result.weather) setWeatherData(result.weather);
          freshResult = result;
          if(result.weather) freshWeather = result.weather;
        }
      } catch(err){
        console.warn("Re-predict failed:", err);
      }
      setAnalyzing(false);
    }
    // ── SAVE TO HISTORY (memory + database) ──────────────────
    const newScan = {
      id: Date.now(),
      date: new Date().toLocaleDateString("en-IN",{day:"2-digit",month:"short",year:"numeric"}),
      time: new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}),
      image: selectedImage,
      crop: data.crop,
      land: data.land,
      result: freshResult,
      weather: freshWeather,
    };
    setScanHistory(prev => [newScan, ...prev].slice(0, 50));

    // Save to database permanently
    const token = localStorage.getItem("kv_token");
    if(token){
      fetch(`${API_BASE}/scans/save`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({
          crop:         data.crop,
          land:         data.land,
          result:       apiResult,
          weather:      weatherData,
          image_base64: selectedImage||"",
        })
      }).catch(()=>{});
    }
    go("results");
  };

  // ═══════════════════════════════════════════════════════════
  // RESULT DATA — all values from API, nothing hardcoded
  // Falls back to demo values only when backend is offline
  // ═══════════════════════════════════════════════════════════
  const _demoCrop = farmData?.crop?.toLowerCase() || "tomato";
  const _c = (s) => _demoCrop.includes(s);
  const _demoDisease =
      _c("potato")                       ? "Potato Late Blight"
    : _c("wheat")                        ? "Wheat Yellow Rust"
    : _c("maize")||_c("corn")            ? "Maize Common Rust"
    : _c("rice")||_c("paddy")            ? "Rice Blast"
    : _c("grape")||_c("angoor")          ? "Grape Black Rot"
    : _c("apple")||_c("seb")            ? "Apple Scab"
    : _c("onion")||_c("pyaaz")          ? "Onion Purple Blotch"
    : _c("chilli")||_c("mirch")         ? "Chilli Anthracnose"
    : _c("groundnut")||_c("peanut")||_c("moongfali") ? "Groundnut Tikka Leaf Spot"
    : _c("soybean")||_c("soya")         ? "Soybean Leaf Spot"
    : _c("mustard")||_c("sarson")       ? "Mustard White Rust"
    : _c("sugarcane")||_c("ganna")      ? "Sugarcane Red Rot"
    : _c("cotton")                      ? "Cotton Leaf Curl Virus"
    : _c("banana")||_c("kela")          ? "Banana Leaf Spot"
    : _c("mango")||_c("aam")            ? "Mango Anthracnose"
    : _c("brinjal")||_c("eggplant")     ? "Brinjal Shoot Borer"
    : _c("cauliflower")||_c("cabbage")  ? "Cauliflower Black Rot"
    : "Tomato Late Blight";

  const _demoScores =
      _c("potato")                       ? {"Potato Late Blight":87.4,"Potato Early Blight":7.2,"Potato Healthy":3.8,"Other":1.6}
    : _c("wheat")                        ? {"Wheat Yellow Rust":87.4,"Wheat Brown Rust":7.2,"Wheat Healthy":3.8,"Other":1.6}
    : _c("maize")||_c("corn")            ? {"Maize Common Rust":87.4,"Maize Northern Leaf Blight":7.2,"Maize Healthy":3.8,"Other":1.6}
    : _c("rice")||_c("paddy")            ? {"Rice Blast":87.4,"Rice Sheath Blight":7.2,"Rice Healthy":3.8,"Other":1.6}
    : _c("grape")||_c("angoor")          ? {"Grape Black Rot":87.4,"Grape Leaf Blight":7.2,"Grape Healthy":3.8,"Other":1.6}
    : _c("apple")||_c("seb")            ? {"Apple Scab":87.4,"Apple Black Rot":7.2,"Apple Healthy":3.8,"Other":1.6}
    : _c("onion")||_c("pyaaz")          ? {"Onion Purple Blotch":87.4,"Onion Downy Mildew":7.2,"Onion Healthy":3.8,"Other":1.6}
    : _c("chilli")||_c("mirch")         ? {"Chilli Anthracnose":87.4,"Chilli Leaf Curl Virus":7.2,"Chilli Healthy":3.8,"Other":1.6}
    : _c("groundnut")||_c("peanut")     ? {"Groundnut Tikka Leaf Spot":87.4,"Groundnut Rust":7.2,"Groundnut Healthy":3.8,"Other":1.6}
    : {"Tomato Late Blight":87.4,"Tomato Early Blight":7.2,"Tomato Leaf Mold":3.8,"Tomato Healthy":1.6};

  const R = apiResult || {
    disease: _demoDisease,
    confidence:87.4, severity:"High",
    yield_loss:"50-80%", loss_pct:0.65, health_score:3,
    urgency:{hours:18, label:"Act within 18 hours", description:"Demo mode — backend offline. Deploy Flask server to see real AI results.", critical:true},
    all_scores: _demoScores,
    checklist:[
      {tier:"Do TODAY",color:"red",items:["Apply Metalaxyl+Mancozeb spray immediately","Remove infected leaves and burn them","Stop overhead irrigation"]},
      {tier:"Within 3 Days",color:"yellow",items:["Switch to drip irrigation","Apply foliar potassium spray"]},
      {tier:"This Week",color:"green",items:["Prune canopy for better airflow","Get soil test done"]},
      {tier:"Next Season",color:"blue",items:["Use blight-resistant varieties","3-year crop rotation"]},
    ],
    fungicides:[
      {name:"Ridomil Gold (Metalaxyl+Mancozeb)",dose:"2g/L water",timing:"Morning only",type:"Systemic"},
      {name:"Dithane M-45 (Mancozeb 75WP)",dose:"2.5g/L water",timing:"Every 7 days",type:"Contact"},
      {name:"Blitox 50 (Copper Oxychloride)",dose:"3g/L water",timing:"Preventive",type:"Contact"},
    ],
    economics: farmData ? {
      projected_loss: Math.round(farmData.land * 8000 * 12 * 0.65),
      treatment_cost: Math.round(farmData.land * 1200),
      net_saving: Math.round(farmData.land * 8000 * 12 * 0.65) - Math.round(farmData.land * 1200),
      insurance_cover: Math.min(Math.round(farmData.land * 8000 * 12 * 0.65), 200000),
      risk_label: "SEVERE",
      msp_per_kg: 12,
      effective_loss_pct: 56.8,
    } : null,
    demo: true,
  };

  // Weather display values — from live API or fallback
  const W = weatherData || {
    location: gpsStatus === "detecting" ? "Detecting location..." : "Ludhiana, Punjab",
    temperature: "--", humidity: "--", rain_prob: "--", wind_kph: "--",
    risk_score: 0, risk_label: "...",
    warnings: [], forecast: [], live: false,
  };

  // Economics shorthand
  const econ = R.economics;

  // ── UNIVERSAL HEALTHY CHECK ──────────────────────────────────────────────
  // Works for ALL crops: Tomato, Wheat, Rice, Potato, Maize, Grape, Apple etc.
  // Checks the top-detected disease name — if it contains "Healthy", crop is fine.
  const isHealthy = R.disease
    ? R.disease.toLowerCase().includes("healthy")
    : true; // if no disease returned at all, treat as healthy (safe default)

  // ── UNIVERSAL LOSS CALCULATION ───────────────────────────────────────────
  // Priority 1: backend projected_loss (accurate when confidence > 0)
  // Priority 2: compute from R.loss_pct (the raw yield loss fraction from predictor.py)
  //             This works even when backend confidence is 0 — loss_pct is set per-disease
  // Priority 3: compute from econ.effective_loss_pct
  // If healthy: always ₹0
  const msp       = econ?.msp_per_kg || 12;
  const landAcres = farmData?.land || 1;
  // Standard yield estimate: 8000 kg/acre (conservative across crops)
  const yieldKg   = landAcres * 8000;

  let lossAmt = 0;
  if (!isHealthy) {
    if (econ?.projected_loss > 0) {
      lossAmt = econ.projected_loss;
    } else if (R.loss_pct > 0) {
      // loss_pct comes directly from ADVICE_DB in predictor.py per disease
      lossAmt = Math.round(yieldKg * msp * R.loss_pct);
    } else if (econ?.effective_loss_pct > 0) {
      lossAmt = Math.round(yieldKg * msp * (econ.effective_loss_pct / 100));
    } else {
      // Last resort: parse yield_loss string e.g. "50-80%" → use midpoint
      const ylStr = R.yield_loss || "";
      const nums  = ylStr.match(/\d+/g);
      if (nums && nums.length >= 1) {
        const mid = nums.length >= 2
          ? (parseInt(nums[0]) + parseInt(nums[1])) / 2
          : parseInt(nums[0]);
        lossAmt = Math.round(yieldKg * msp * (mid / 100));
      }
    }
  }

  const treatCost = econ?.treatment_cost || 0;
  const netSaving = isHealthy ? 0 : (lossAmt - treatCost > 0 ? lossAmt - treatCost : 0);
  const riskLabel = econ?.risk_label || "MODERATE";
  const riskColor = riskLabel==="SEVERE"?T.red:riskLabel==="HIGH"?T.yel:T.green;

  // ── SCHEMES: only when crop is NOT healthy AND there is real loss ─────────
  const eligibleSchemes = (!isHealthy && lossAmt > 0) ? SCHEMES.filter(s =>
    s.eligFn(farmData?.crop || "", lossAmt, inferredState)
  ).slice(0, 5) : [];

  // All scores for confidence bars — dynamic colors based on rank not hardcoded names
  const BAR_COLORS = [T.red, "#f97316", T.blu, T.green, "#7c3aed", "#0891b2"];
  const CONF_BARS = Object.entries(R.all_scores||{})
    .sort((a,b) => b[1] - a[1])
    .map(([name, val], idx) => ({
      name,
      val,
      color: name.toLowerCase().includes("healthy") ? T.green : BAR_COLORS[idx] || T.muted,
    }));

  // ═══════════════════════════════════════════════════════════
  // DOWNLOAD FULL REPORT AS PDF
  // Generates a clean HTML report and triggers browser print/save
  // ═══════════════════════════════════════════════════════════
  const downloadReport = () => {
    if(!apiResult && !farmData) { cs("Please scan a crop first to download a report"); return; }
    const now = new Date();
    const dateStr = now.toLocaleDateString("en-IN", {day:"2-digit",month:"long",year:"numeric"});
    const timeStr = now.toLocaleTimeString("en-IN", {hour:"2-digit",minute:"2-digit"});

    const checklistHTML = (R.checklist||[]).map(c=>`
      <div style="margin-bottom:12px;padding:10px 14px;border-left:4px solid ${c.color==="red"?"#dc2626":c.color==="yellow"?"#d97706":c.color==="blue"?"#2563eb":"#16a34a"};background:${c.color==="red"?"#fff5f5":c.color==="yellow"?"#fffdf0":c.color==="blue"?"#f0f7ff":"#f0fdf4"};border-radius:6px;">
        <div style="font-weight:700;font-size:13px;margin-bottom:6px;color:${c.color==="red"?"#dc2626":c.color==="yellow"?"#d97706":c.color==="blue"?"#2563eb":"#16a34a"}">${c.tier}</div>
        ${(c.items||[]).map(item=>`<div style="font-size:12px;color:#374151;margin-bottom:3px;">• ${item}</div>`).join("")}
      </div>`).join("");

    const fungicidesHTML = (R.fungicides||[]).map(f=>`
      <div style="display:flex;justify-content:space-between;align-items:center;padding:8px 12px;margin-bottom:8px;background:#f9fafb;border-radius:6px;border:1px solid #e5e7eb;">
        <div>
          <div style="font-weight:700;font-size:12px;color:#1f2937">${f.name} <span style="font-size:10px;color:#6b7280;font-weight:400">(${f.type})</span></div>
          <div style="font-size:11px;color:#6b7280;margin-top:2px">Dose: ${f.dose} · ${f.timing}</div>
        </div>
      </div>`).join("");

    const schemesHTML = (eligibleSchemes||[]).map(s=>`
      <div style="padding:8px 12px;margin-bottom:8px;background:#f0fdf4;border-radius:6px;border:1px solid #bbf7d0;">
        <div style="font-weight:700;font-size:12px;color:#14532d">${s.name}</div>
        <div style="font-size:11px;color:#374151;margin-top:2px">${s.benefit}</div>
        <div style="font-size:10px;color:#6b7280;margin-top:2px">${s.link}</div>
      </div>`).join("");

    const html = `<!DOCTYPE html>
<html>
<head>
  <meta charset="UTF-8"/>
  <title>KrishiVigil.ai — Crop Report</title>
  <style>
    * { margin:0; padding:0; box-sizing:border-box; }
    body { font-family: 'Segoe UI', Arial, sans-serif; color:#1f2937; background:#fff; padding:32px; max-width:700px; margin:0 auto; }
    .header { background:linear-gradient(135deg,#052e16,#16a34a); color:#fff; padding:24px 28px; border-radius:14px; margin-bottom:24px; }
    .header h1 { font-size:22px; font-weight:900; margin-bottom:4px; }
    .header .sub { font-size:12px; opacity:0.8; letter-spacing:2px; text-transform:uppercase; }
    .header .meta { font-size:12px; opacity:0.75; margin-top:10px; }
    .section { background:#fff; border:1px solid #e5e7eb; border-radius:12px; padding:18px 20px; margin-bottom:16px; }
    .section-title { font-size:11px; font-weight:700; color:#14532d; text-transform:uppercase; letter-spacing:1px; margin-bottom:14px; padding-bottom:8px; border-bottom:1px solid #dcfce7; }
    .score-box { background:linear-gradient(135deg,#052e16,#16a34a); color:#fff; border-radius:12px; padding:18px 20px; margin-bottom:16px; display:flex; justify-content:space-between; align-items:center; }
    .score-num { font-size:48px; font-weight:900; line-height:1; }
    .score-label { font-size:11px; opacity:0.8; text-transform:uppercase; letter-spacing:1px; margin-bottom:4px; }
    .grid2 { display:grid; grid-template-columns:1fr 1fr; gap:12px; margin-bottom:12px; }
    .tile { background:#f9fafb; border:1px solid #e5e7eb; border-radius:8px; padding:12px; }
    .tile-label { font-size:10px; color:#6b7280; margin-bottom:4px; }
    .tile-val { font-size:16px; font-weight:800; color:#1f2937; }
    .disease-name { font-size:22px; font-weight:900; color:#14532d; margin-bottom:6px; }
    .badge { display:inline-block; padding:3px 10px; border-radius:20px; font-size:10px; font-weight:700; }
    .loss-box { background:#fff5f5; border:1px solid #fecaca; border-radius:10px; padding:16px; text-align:center; margin-bottom:14px; }
    .loss-amt { font-size:32px; font-weight:900; color:#dc2626; }
    .footer { text-align:center; font-size:10px; color:#9ca3af; margin-top:24px; padding-top:16px; border-top:1px solid #e5e7eb; }
    @media print { body { padding:16px; } }
  </style>
</head>
<body>
  <div class="header">
    <div class="sub">KrishiVigil.ai · Smart Crop Protection</div>
    <h1>🌿 Crop Disease Report</h1>
    <div class="meta">Generated: ${dateStr} at ${timeStr}${farmData?` · Farmer: Krishna Singh · Crop: ${farmData.crop} · Land: ${farmData.land} acres`:""}</div>
  </div>

  <div class="score-box">
    <div>
      <div class="score-label">Crop Health Score</div>
      <div class="score-num">${R.health_score}<span style="font-size:18px;opacity:0.7">/10</span></div>
      <div style="font-size:12px;margin-top:8px;opacity:0.85">${R.health_score<=3?"Critical — Immediate action needed":R.health_score<=6?"Moderate — Treatment recommended":"Good — Preventive care only"}</div>
    </div>
    <div style="text-align:right">
      <div style="font-size:11px;opacity:0.7;margin-bottom:4px">AI Model</div>
      <div style="font-size:13px;font-weight:700">MobileNetV2</div>
      <div style="font-size:11px;opacity:0.7;margin-top:2px">38 PlantVillage Classes</div>
      <div style="margin-top:8px;background:rgba(255,255,255,0.2);border-radius:8px;padding:4px 10px;font-size:11px">${R.demo?"Demo Mode":"✅ Real AI Result"}</div>
    </div>
  </div>

  <div class="section">
    <div class="section-title">Disease Detection</div>
    <div class="disease-name">${R.disease}</div>
    <div style="margin-bottom:12px">
      <span class="badge" style="background:#fff5f5;color:#dc2626;border:1px solid #fecaca">${(R.severity||"").toUpperCase()} SEVERITY</span>
      <span style="margin-left:10px;font-size:12px;color:#6b7280">Confidence: <strong style="color:#16a34a">${R.confidence}%</strong></span>
      <span style="margin-left:10px;font-size:12px;color:#6b7280">Yield Loss: <strong style="color:#dc2626">${R.yield_loss}</strong></span>
    </div>
    ${R.urgency?`<div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;margin-top:10px">
      <div style="font-weight:700;color:#dc2626;font-size:13px">${R.urgency.label}</div>
      <div style="font-size:11px;color:#7f1d1d;margin-top:4px">${R.urgency.description}</div>
    </div>`:""}
  </div>

  <div class="section">
    <div class="section-title">Weather Conditions · ${W.location}</div>
    <div class="grid2">
      <div class="tile"><div class="tile-label">Temperature</div><div class="tile-val">${W.temperature}°C</div></div>
      <div class="tile"><div class="tile-label">Humidity</div><div class="tile-val">${W.humidity}%</div></div>
      <div class="tile"><div class="tile-label">Rain Probability</div><div class="tile-val">${W.rain_prob}%</div></div>
      <div class="tile"><div class="tile-label">Wind Speed</div><div class="tile-val">${W.wind_kph} km/h</div></div>
    </div>
    <div style="background:#fff5f5;border:1px solid #fecaca;border-radius:8px;padding:10px 13px;display:flex;align-items:center;gap:10px">
      <div style="font-size:20px;font-weight:900;color:#dc2626">${W.risk_score}</div>
      <div><div style="font-weight:700;font-size:12px;color:#dc2626">${W.risk_label} Weather Risk</div><div style="font-size:11px;color:#6b7280">${W.live?"Live from OpenWeatherMap":"Offline fallback"}</div></div>
    </div>
  </div>

  ${econ?`<div class="section">
    <div class="section-title">Economic Loss Estimate</div>
    <div class="loss-box">
      <div style="font-size:11px;color:#6b7280;margin-bottom:4px">Projected Crop Loss</div>
      <div class="loss-amt">₹${lossAmt.toLocaleString("en-IN")}</div>
      <div style="font-size:11px;color:#7f1d1d;margin-top:4px">${farmData?.crop} · ${farmData?.land} acres · ₹${econ.msp_per_kg}/kg MSP</div>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0fdf4;font-size:12px">
      <span style="color:#6b7280">Treatment Cost</span><span style="font-weight:700;color:#16a34a">~₹${treatCost.toLocaleString("en-IN")}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;border-bottom:1px solid #f0fdf4;font-size:12px">
      <span style="color:#6b7280">Net Saving if Treated</span><span style="font-weight:700;color:#16a34a">₹${netSaving.toLocaleString("en-IN")}</span>
    </div>
    <div style="display:flex;justify-content:space-between;padding:8px 0;font-size:12px">
      <span style="color:#6b7280">Max Insurance Cover</span><span style="font-weight:700;color:#2563eb">₹${econ.insurance_cover.toLocaleString("en-IN")}</span>
    </div>
  </div>`:""}

  <div class="section">
    <div class="section-title">Smart Action Plan</div>
    ${checklistHTML}
  </div>

  ${!isHealthy && R.fungicides?.length > 0 ? `<div class="section">
    <div class="section-title">Recommended Fungicides</div>
    ${fungicidesHTML}
  </div>` : ""}

  ${eligibleSchemes.length>0?`<div class="section">
    <div class="section-title">Government Schemes You Qualify For</div>
    ${schemesHTML}
  </div>`:""}

  <div class="footer">
    KrishiVigil.ai · Smart Crop Protection · Generated on ${dateStr}<br/>
    This report is AI-generated. Consult your local Krishi Vigyan Kendra for expert advice.
  </div>
</body>
</html>`;

    const win = window.open("","_blank");
    win.document.write(html);
    win.document.close();
    win.focus();
    setTimeout(()=>{ win.print(); }, 600);

    // ── SAVE TO DOWNLOADS PANEL + DATABASE ────────────────
    const dlRecord = {
      id:           Date.now(),
      title:        `${farmData?.crop || "Crop"} Report — ${R.disease || "Analysis"}`,
      date:         dateStr,
      time:         timeStr,
      crop:         farmData?.crop || "Unknown",
      land:         farmData?.land || 0,
      disease:      R.disease || "",
      confidence:   R.confidence || 0,
      health_score: R.health_score || 0,
      severity:     R.severity || "",
      image:        selectedImage || null,
      html:         html,
    };
    setDownloads(prev => [dlRecord, ...prev].slice(0, 20));

    // Save full HTML report to database permanently
    const token = localStorage.getItem("kv_token");
    if(token){
      fetch(`${API_BASE}/downloads/save`,{
        method:"POST",
        headers:{"Content-Type":"application/json","Authorization":`Bearer ${token}`},
        body: JSON.stringify({
          title:        dlRecord.title,
          crop:         dlRecord.crop,
          land:         dlRecord.land,
          disease:      dlRecord.disease,
          confidence:   dlRecord.confidence,
          severity:     dlRecord.severity,
          health_score: dlRecord.health_score,
          image_base64: dlRecord.image||"",
          html_content: html,
        })
      }).catch(()=>{});
    }
  };

  // Tour logic
  const advanceTour=()=>{
    const step=TOUR_STEPS[tourStep];
    if(step.action==="login"){setTourActive(false);setTourStep(s=>s+1);return;}
    if(step.action==="home"){setPage("main");setScreen("home");setTourStep(s=>s+1);return;}
    if(step.action==="upload"){setTourActive(false);setScreen("home");handleUpload();setTourStep(s=>s+1);return;}
    if(step.action==="results"){if(!farmData)setFarmData({crop:"Tomato",land:3.5});setScreen("results");setTourStep(s=>s+1);setTourActive(true);return;}
    if(step.action==="schemes"){setScreen("schemes");setTourStep(s=>s+1);return;}
    setTourActive(false);setTourDone(true);
  };
  useEffect(()=>{if(tourStep===3&&screen==="results"&&farmData)setTourActive(true);},[screen,farmData]);

  if(page==="login") return (
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:T.bg,height:"100vh",maxWidth:430,margin:"0 auto",position:"relative",boxShadow:"0 0 60px rgba(0,0,0,0.15)",overflowY:"auto",overflowX:"hidden"}}>
      <LoginPage onLogin={(user)=>{setLoggedInUser(user);setAuthToken(localStorage.getItem("kv_token")||"");setEditName(user?.name||"Farmer");setPage("main");}}/>
      {tourActive&&tourStep<=1&&<TourBubble step={TOUR_STEPS[tourStep]} onNext={advanceTour} onSkip={()=>{setTourActive(false);setTourDone(true);setPage("main");}}/>}
      <style>{CSS}</style>
    </div>
  );

  return(
    <div style={{fontFamily:"'Inter','Segoe UI',sans-serif",background:T.bg,height:"100vh",maxWidth:430,margin:"0 auto",position:"relative",boxShadow:"0 0 60px rgba(0,0,0,0.15)",overflow:"hidden",display:"flex",flexDirection:"column"}}>

      {/* TOP NAV */}
      <div style={{background:T.nav,borderBottom:`1px solid ${T.border}`,padding:"11px 18px",display:"flex",alignItems:"center",justifyContent:"space-between",position:"sticky",top:0,zIndex:50,boxShadow:"0 1px 10px rgba(0,0,0,0.05)",flexShrink:0}}>
        <button onClick={()=>setShowProf(p=>!p)} style={{background:showProf?T.green:`linear-gradient(135deg,${T.deep},${T.green})`,border:"none",borderRadius:"50%",width:40,height:40,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",boxShadow:showProf?"0 0 0 3px rgba(22,163,74,0.35)":"0 2px 8px rgba(22,163,74,0.35)",transition:"all 0.15s",transform:showProf?"scale(0.93)":"scale(1)"}}>
          <G n="user" s={18} c="#fff" w={2}/>
        </button>
        <div style={{textAlign:"center"}}>
          <div style={{display:"flex",alignItems:"center",gap:8}}>
            <KVLogo size={28}/>
            <span style={{fontWeight:800,fontSize:"1.05rem",color:T.deep,letterSpacing:"-0.4px"}}>KrishiVigil<span style={{color:T.green}}>.ai</span></span>
          </div>
          <div style={{fontSize:"0.53rem",color:T.muted,letterSpacing:"1px",marginTop:1}}>SMART CROP PROTECTION</div>
        </div>
        <div style={{display:"flex",gap:8,alignItems:"center"}}>
          <button onClick={()=>cs("Alert Notifications")} style={{background:T.border2,border:`1px solid ${T.border}`,borderRadius:"50%",width:36,height:36,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",position:"relative",transition:"all 0.15s",active:{transform:"scale(0.9)"}}} onMouseDown={e=>e.currentTarget.style.transform="scale(0.88)"} onMouseUp={e=>e.currentTarget.style.transform="scale(1)"} onTouchStart={e=>e.currentTarget.style.transform="scale(0.88)"} onTouchEnd={e=>e.currentTarget.style.transform="scale(1)"}>
            <G n="bell" s={16} c={T.green} w={2}/>
            <span style={{position:"absolute",top:6,right:6,background:T.red,borderRadius:"50%",width:7,height:7,border:"1.5px solid #fff",boxShadow:pulse?"0 0 0 3px rgba(220,38,38,0.2)":"none",transition:"box-shadow 0.4s"}}/>
          </button>
          <button onClick={()=>setShowLang(true)} style={{background:showLang?"#dcfce7":T.border2,border:`1.5px solid ${showLang?T.deep:T.green}`,borderRadius:22,padding:"5px 11px",cursor:"pointer",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",transition:"all 0.15s",transform:showLang?"scale(0.93)":"scale(1)"}}>
            <G n="globe" s={13} c={T.deep} w={2}/>
            <span style={{fontWeight:700,fontSize:"0.7rem",color:T.deep}}>हि/ਪੰ</span>
          </button>
        </div>
      </div>

      <div style={{flex:1,overflowY:"auto"}}>

        {/* PROFILE POPUP */}
        {showProf&&(
          <div style={{position:"absolute",top:62,left:14,background:T.card,borderRadius:18,padding:18,boxShadow:shM,zIndex:100,width:236,border:`1px solid ${T.border}`,animation:"fadeSlideIn 0.18s ease"}}>
            {/* Profile header */}
            <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:14,paddingBottom:12,borderBottom:`1px solid ${T.border2}`}}>
              <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:"50%",width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}><G n="user" s={20} c="#fff" w={1.8}/></div>
              <div>
                <div style={{fontWeight:700,fontSize:"0.88rem",color:T.text}}>{editName}</div>
                <div style={{fontSize:"0.66rem",color:T.muted,display:"flex",alignItems:"center",gap:4,marginTop:2}}>
                  <G n="gps" s={10} c={T.muted} w={2}/>
                  {gpsStatus==="live"?`GPS Live (${userLat.toFixed(2)}, ${userLon.toFixed(2)})`:W.location}
                </div>
              </div>
            </div>

            {/* Info rows */}
            {[["map","Location",W.location],["drop","Weather",W.temperature!=="--"?`${W.temperature}°C, ${W.humidity}% humidity`:"Loading..."],["scan","Total Scans","12 crops scanned"]].map(([icon,label,val])=>(
              <div key={label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"7px 0",borderBottom:`1px solid #f1fdf4`,fontSize:"0.74rem"}}>
                <span style={{color:T.muted,display:"flex",alignItems:"center",gap:6}}><G n={icon} s={12} c={T.muted} w={2}/>{label}</span>
                <span style={{fontWeight:600,color:T.text,fontSize:"0.68rem",textAlign:"right",maxWidth:120}}>{val}</span>
              </div>
            ))}

            <div style={{marginTop:10,fontSize:"0.66rem",color:T.muted,background:T.border2,borderRadius:9,padding:"8px 10px",lineHeight:1.5}}>
              {gpsStatus==="live"?"GPS active — weather is live from your exact field location":"GPS not available — using default location"}
            </div>

            {/* Edit Profile button */}
            <button onClick={()=>{setShowEditProfile(true);setShowProf(false);}}
              style={{marginTop:10,width:"100%",background:"#f0fdf4",border:`1px solid ${T.border}`,borderRadius:10,padding:"9px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:"0.73rem",fontWeight:700,color:T.deep,transition:"all 0.15s"}}>
              <G n="user" s={13} c={T.deep} w={2}/> Edit Profile
            </button>

            {/* Sign Out button */}
            <button onClick={()=>{setShowProf(false);setPage("login");setScreen("home");setApiResult(null);setSelectedImage(null);setSelectedFile(null);setFarmData(null);setWeatherData(null);setLoggedInUser(null);setAuthToken("");localStorage.removeItem("kv_token");localStorage.removeItem("kv_user");}}
              style={{marginTop:7,width:"100%",background:T.redBg,border:`1px solid ${T.redBo}`,borderRadius:10,padding:"9px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,fontSize:"0.73rem",fontWeight:700,color:T.red,transition:"all 0.15s"}}>
              <G n="back" s={13} c={T.red} w={2.5}/> Sign Out
            </button>
          </div>
        )}

        {/* ── EDIT PROFILE MODAL ── */}
        {showEditProfile&&(
          <div style={{position:"absolute",inset:0,background:"rgba(5,46,22,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setShowEditProfile(false)}>
            <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:22,padding:26,width:"100%",maxWidth:320,boxShadow:shM,animation:"popIn 0.2s ease",border:`1px solid ${T.border}`}}>

              {/* Header */}
              <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:18}}>
                <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:14,width:44,height:44,display:"flex",alignItems:"center",justifyContent:"center"}}><G n="user" s={20} c="#fff" w={1.8}/></div>
                <div>
                  <div style={{fontWeight:800,fontSize:"1rem",color:T.deep}}>Edit Profile</div>
                  <div style={{fontSize:"0.68rem",color:T.muted,marginTop:1}}>Update your account details</div>
                </div>
              </div>

              <div style={{height:1,background:T.border2,marginBottom:16}}/>

              {/* Name field */}
              <div style={{marginBottom:13}}>
                <label style={{fontSize:"0.66rem",fontWeight:700,color:T.deep,letterSpacing:"0.5px",display:"block",marginBottom:6}}>FULL NAME</label>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9fafb",borderRadius:11,padding:"11px 13px",border:`1.5px solid ${T.border}`}}>
                  <G n="user" s={13} c={T.muted} w={2}/>
                  <input type="text" value={editName} onChange={e=>setEditName(e.target.value)} placeholder="Your full name"
                    style={{background:"none",border:"none",outline:"none",color:T.text,fontSize:"0.86rem",flex:1,fontFamily:"inherit"}}/>
                </div>
              </div>

              {/* State field */}
              <div style={{marginBottom:20}}>
                <label style={{fontSize:"0.66rem",fontWeight:700,color:T.deep,letterSpacing:"0.5px",display:"block",marginBottom:6}}>STATE</label>
                <div style={{display:"flex",alignItems:"center",gap:8,background:"#f9fafb",borderRadius:11,padding:"11px 13px",border:`1.5px solid ${T.border}`}}>
                  <G n="map" s={13} c={T.muted} w={2}/>
                  <input type="text" value={editState} onChange={e=>setEditState(e.target.value)} placeholder="e.g. Punjab, Haryana..."
                    style={{background:"none",border:"none",outline:"none",color:T.text,fontSize:"0.86rem",flex:1,fontFamily:"inherit"}}/>
                </div>
              </div>

              {/* Save button */}
              <button onClick={()=>setShowEditProfile(false)}
                style={{width:"100%",background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:13,padding:"13px",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 14px rgba(22,163,74,0.35)",marginBottom:8}}>
                <G n="check" s={15} c="#fff" w={2.5}/> Save Changes
              </button>
              <button onClick={()=>setShowEditProfile(false)}
                style={{width:"100%",background:"none",border:`1px solid ${T.border}`,borderRadius:12,padding:"11px",cursor:"pointer",fontWeight:600,fontSize:"0.8rem",fontFamily:"inherit",color:T.muted}}>
                Cancel
              </button>
            </div>
          </div>
        )}

        {/* ════ HOME ════ */}
        {screen==="home"&&(
          <>
            {/* ── WEATHER STRIP — all values from live weather API ── */}
            <div style={{background:`linear-gradient(160deg,#052e16 0%,#14532d 55%,#166534 100%)`,padding:"18px 18px 22px"}}>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
                <div>
                  <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:3}}>
                    <G n="gps" s={13} c={gpsStatus==="live"?"#86efac":"#fcd34d"} w={2}/>
                    <span style={{color:"#fff",fontWeight:700,fontSize:"0.9rem"}}>
                      {W.location}
                    </span>
                  </div>
                  <div style={{color:"#86efac",fontSize:"0.63rem",marginLeft:19}}>
                    {gpsStatus==="detecting"?"Detecting GPS...":gpsStatus==="live"?"GPS Live · "+new Date().toLocaleTimeString("en-IN",{hour:"2-digit",minute:"2-digit"}):"Location detected · Updated now"}
                  </div>
                </div>
                <div style={{textAlign:"right"}}>
                  <div style={{display:"flex",alignItems:"flex-start",gap:3}}>
                    {/* Temperature from live weather API */}
                    <span style={{color:"#fff",fontSize:"2.5rem",fontWeight:900,lineHeight:1}}>
                      {W.temperature!=="--"?Math.round(W.temperature):"--"}
                    </span>
                    <span style={{color:"#86efac",fontSize:"1rem",marginTop:5}}>°C</span>
                  </div>
                  <div style={{display:"flex",alignItems:"center",gap:4,justifyContent:"flex-end",marginTop:2}}>
                    <G n="drop" s={11} c="#86efac" w={2}/>
                    {/* Humidity from live weather API */}
                    <span style={{color:"#86efac",fontSize:"0.63rem"}}>{W.humidity}% humidity</span>
                  </div>
                </div>
              </div>

              {/* 5-day forecast — from live weather API */}
              <div style={{display:"flex",gap:7,overflowX:"auto",marginBottom:14,paddingBottom:2}}>
                {(W.forecast.length > 0 ? W.forecast : [{day:"Today",type:"cloud",hi:"--",lo:"--",rain:"--"}]).map((f,i)=>(
                  <div key={i} style={{background:i===0?"rgba(255,255,255,0.18)":"rgba(255,255,255,0.07)",borderRadius:13,padding:"9px 11px",textAlign:"center",minWidth:62,flexShrink:0,border:i===0?"1px solid rgba(255,255,255,0.28)":"1px solid rgba(255,255,255,0.07)"}}>
                    <div style={{color:i===0?"#86efac":"rgba(255,255,255,0.6)",fontSize:"0.6rem",fontWeight:600,marginBottom:5}}>{f.day}</div>
                    <WeatherIcon type={f.type||"cloud"} s={22}/>
                    <div style={{color:"#fff",fontSize:"0.8rem",fontWeight:700,marginTop:4}}>{f.hi}°</div>
                    <div style={{color:f.type==="rain"?"#93c5fd":f.type==="sun"?"#fcd34d":"rgba(255,255,255,0.5)",fontSize:"0.59rem",marginTop:1}}>{f.rain}</div>
                  </div>
                ))}
              </div>

              {/* Field warnings — from live weather API, NOT hardcoded */}
              <div style={{display:"flex",flexDirection:"column",gap:6}}>
                {(W.warnings.length > 0 ? W.warnings : [{type:"ok",level:"low",text:"Fetching weather warnings..."}]).map((w,i)=>(
                  <div key={i} style={{background:"rgba(0,0,0,0.28)",borderRadius:10,padding:"8px 12px",display:"flex",gap:10,alignItems:"center",border:"1px solid rgba(255,255,255,0.06)"}}>
                    <div style={{background:w.level==="medium"?"rgba(217,119,6,0.22)":w.level==="low"?"rgba(34,197,94,0.18)":"rgba(239,68,68,0.18)",borderRadius:7,padding:5,flexShrink:0}}>
                      <G n={w.type==="wind"?"wind":w.type==="humidity"?"drop":w.type==="ok"?"check":"alert"} s={13} c={w.level==="medium"?"#fcd34d":w.level==="low"?"#86efac":"#fca5a5"} w={2}/>
                    </div>
                    <span style={{color:"#f1f5f9",fontSize:"0.69rem",fontWeight:500,lineHeight:1.4}}>{w.text}</span>
                  </div>
                ))}
              </div>
            </div>

            <div style={{padding:"18px 16px 16px"}}>
              <div style={{marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
                  <G n="scan" s={16} c={T.deep} w={2}/>
                  <span style={{fontWeight:700,fontSize:"0.95rem",color:T.deep}}>Scan Your Crop</span>
                </div>
                <p style={{fontSize:"0.72rem",color:T.muted,margin:0}}>Upload any crop image — AI detects disease in under 3 seconds</p>
              </div>

              <input ref={fileInputRef} type="file" accept="image/*" capture="environment" onChange={handleFileSelected} style={{display:"none"}}/>

              <div
                onDragOver={e=>{e.preventDefault();setDrag(true);}}
                onDragLeave={()=>setDrag(false)}
                onDrop={e=>{e.preventDefault();setDrag(false);const file=e.dataTransfer.files[0];if(file){setSelectedFile(file);const reader=new FileReader();reader.onload=(ev)=>setSelectedImage(ev.target.result);reader.readAsDataURL(file);}}}
                style={{border:`2px dashed ${drag?T.green:selectedImage?"#16a34a":"#86efac"}`,borderRadius:20,padding:"20px",textAlign:"center",background:drag?"#f0fdf4":selectedImage?"#f0fdf4":T.card,transition:"all 0.2s",marginBottom:18,boxShadow:sh}}>
                {analyzing?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"10px 0"}}>
                    <div style={{width:52,height:52,border:`4px solid ${T.border}`,borderTopColor:T.green,borderRadius:"50%",animation:"spin 0.8s linear infinite"}}/>
                    <div style={{fontWeight:700,color:T.deep,fontSize:"0.9rem"}}>Analyzing with AI...</div>
                    <div style={{fontSize:"0.7rem",color:T.muted}}>EfficientNetB3 running inference</div>
                    <div style={{display:"flex",gap:6,marginTop:4}}>
                      {["Preprocessing","Running AI","Weather check","Calculating loss"].map((s,i)=>(
                        <div key={s} style={{background:"#f0fdf4",border:`1px solid ${T.border}`,borderRadius:20,padding:"3px 8px",fontSize:"0.59rem",color:T.green,fontWeight:600,animation:`fadeIn 0.4s ${i*0.35}s both`}}>{s}</div>
                      ))}
                    </div>
                  </div>
                ):selectedImage?(
                  <div style={{display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                    <div style={{position:"relative",display:"inline-block"}}>
                      <img src={selectedImage} alt="Selected crop" style={{width:"100%",maxWidth:260,height:170,objectFit:"cover",borderRadius:14,border:`2px solid ${T.border}`,boxShadow:"0 4px 16px rgba(0,0,0,0.10)"}}/>
                      <button onClick={handleRemoveImage} style={{position:"absolute",top:-10,right:-10,background:T.red,border:"2.5px solid #fff",borderRadius:"50%",width:28,height:28,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",zIndex:10}}>
                        <G n="close" s={13} c="#fff" w={2.5}/>
                      </button>
                    </div>
                    <div style={{fontSize:"0.72rem",color:T.green,fontWeight:600,display:"flex",alignItems:"center",gap:5}}>
                      <G n="check" s={13} c={T.green} w={2.5}/> Image ready — tap Analyze Now
                    </div>
                    <div style={{display:"flex",gap:10,width:"100%"}}>
                      <button onClick={handleUpload} style={{flex:1,background:"#f0fdf4",border:`1.5px solid ${T.border}`,color:T.deep,borderRadius:12,padding:"10px",fontWeight:600,fontSize:"0.78rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                        <G n="camera" s={14} c={T.deep} w={2}/> Change
                      </button>
                      <button onClick={handleAnalyze} style={{flex:2,background:`linear-gradient(135deg,${T.deep},${T.green})`,border:"none",color:"#fff",borderRadius:12,padding:"10px",fontWeight:700,fontSize:"0.88rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 4px 14px rgba(22,163,74,0.38)"}}>
                        <G n="zap" s={15} c="#fff" w={2}/> Analyze Now
                      </button>
                    </div>
                  </div>
                ):(
                  <div onClick={handleUpload} style={{cursor:"pointer"}}>
                    <div style={{display:"inline-flex",background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:"50%",padding:16,marginBottom:12,boxShadow:"0 4px 16px rgba(22,163,74,0.35)"}}>
                      <G n="camera" s={28} c="#fff" w={1.8}/>
                    </div>
                    <div style={{fontWeight:700,color:T.deep,fontSize:"0.95rem",marginBottom:4}}>Tap to upload crop image</div>
                    <div style={{fontSize:"0.7rem",color:T.muted,marginBottom:16}}>Drag & drop · JPG, PNG, WebP · Max 16MB</div>
                    <PrimaryBtn style={{pointerEvents:"none"}}><G n="zap" s={15} c="#fff" w={2}/> Analyze Now</PrimaryBtn>
                  </div>
                )}
              </div>

              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr 1fr",gap:10,marginBottom:18}}>
                <div style={{background:T.redBg,borderRadius:14,padding:"14px 10px",textAlign:"center",border:`1px solid ${T.redBo}`}}>
                  <div style={{display:"inline-flex",background:"rgba(220,38,38,0.08)",borderRadius:10,padding:8,marginBottom:6}}><G n="micro" s={16} c={T.red} w={2}/></div>
                  <div style={{fontWeight:800,color:T.red,fontSize:"0.72rem",lineHeight:1.25}}>AI-Powered</div>
                  <div style={{fontSize:"0.58rem",color:T.muted,marginTop:3,lineHeight:1.3}}>99.6% accuracy</div>
                </div>
                <div style={{background:T.bluBg,borderRadius:14,padding:"14px 10px",textAlign:"center",border:`1px solid ${T.bluBo}`}}>
                  <div style={{display:"inline-flex",background:"rgba(37,99,235,0.08)",borderRadius:10,padding:8,marginBottom:6}}><G n="shield" s={16} c={T.blu} w={2}/></div>
                  <div style={{fontWeight:800,color:T.blu,fontSize:"0.72rem",lineHeight:1.25}}>Govt Schemes</div>
                  <div style={{fontSize:"0.58rem",color:T.muted,marginTop:3,lineHeight:1.3}}>Auto-matched</div>
                </div>
                <div style={{background:"#f0fdf4",borderRadius:14,padding:"14px 10px",textAlign:"center",border:`1px solid ${T.border}`}}>
                  <div style={{display:"inline-flex",background:"rgba(22,163,74,0.08)",borderRadius:10,padding:8,marginBottom:6}}><G n="zap" s={16} c={T.green} w={2}/></div>
                  <div style={{fontWeight:800,color:T.green,fontSize:"1.1rem",lineHeight:1}}>&lt;3s</div>
                  <div style={{fontSize:"0.58rem",color:T.muted,marginTop:3,lineHeight:1.3}}>Scan Time</div>
                </div>
              </div>

              <Card>
                <SLabel icon="info" color={T.deep}>How It Works</SLabel>
                {STEPS.map((s,i)=>(
                  <div key={s.title} style={{display:"flex",gap:12,alignItems:"flex-start",marginBottom:i===STEPS.length-1?0:12}}>
                    <ITile icon={s.icon} size="sm"/>
                    <div style={{paddingTop:2}}>
                      <div style={{fontWeight:600,fontSize:"0.78rem",color:T.text}}>{s.title}</div>
                      <div style={{fontSize:"0.67rem",color:T.muted,marginTop:1}}>{s.desc}</div>
                    </div>
                  </div>
                ))}
              </Card>
            </div>
          </>
        )}

        {/* ════ RESULTS ════ */}
        {screen==="results"&&(
          <div style={{padding:"14px 15px 16px",animation:"fadeSlideUp 0.3s ease"}}>
            <button onClick={goBack} style={{background:"none",border:"none",color:T.green,fontWeight:600,cursor:"pointer",marginBottom:14,fontSize:"0.82rem",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}>
              <G n="back" s={15} c={T.green} w={2}/> Back to Home
            </button>

            {/* Scanned image preview */}
            {selectedImage&&(
              <div style={{background:T.card,borderRadius:16,padding:14,marginBottom:14,border:`1px solid ${T.border}`,display:"flex",alignItems:"center",gap:12,boxShadow:sh}}>
                <img src={selectedImage} alt="Uploaded crop" style={{width:68,height:68,objectFit:"cover",borderRadius:12,border:`2px solid ${T.border}`,flexShrink:0}}/>
                <div>
                  <div style={{fontWeight:700,fontSize:"0.78rem",color:T.deep,marginBottom:3}}>Scanned Image</div>
                  <div style={{fontSize:"0.68rem",color:T.muted,lineHeight:1.5}}>EfficientNetB3 PlantVillage model · 38 classes</div>
                  <div style={{marginTop:5}}>
                    <div style={{background:"#dcfce7",borderRadius:6,padding:"2px 8px",fontSize:"0.62rem",color:T.green,fontWeight:700,display:"inline-block"}}>
                      {R.demo?"Demo Mode — deploy Flask backend for live AI":"Real AI Result"}
                    </div>
                  </div>
                </div>
              </div>
            )}

            {/* Farm data strip */}
            {farmData&&(
              <div style={{background:`linear-gradient(135deg,#f0fdf4,#dcfce7)`,border:`1px solid ${T.border}`,borderRadius:14,padding:"10px 14px",marginBottom:14,display:"flex",alignItems:"center",gap:10}}>
                <G n="leaf" s={14} c={T.green} w={2.5}/>
                <span style={{fontSize:"0.74rem",color:T.deep,fontWeight:600}}>{farmData.crop} · {farmData.land} acres · ₹{getMSP(farmData?.crop||'')/100}/kg MSP · {inferredState}</span>
                <span style={{marginLeft:"auto",fontSize:"0.65rem",color:T.muted,cursor:"pointer"}} onClick={()=>setShowCropPopup(true)}>Edit</span>
              </div>
            )}

            {/* ── HEALTH SCORE — calculated from AI confidence + weather + yield loss ── */}
            <div style={{background:`linear-gradient(160deg,#052e16,#14532d,#166534)`,borderRadius:20,padding:20,marginBottom:14,display:"flex",alignItems:"center",justifyContent:"space-between",boxShadow:"0 4px 24px rgba(21,128,61,0.28)"}}>
              <div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:6}}>
                  <G n="activity" s={12} c="#86efac" w={2}/>
                  <span style={{color:"#86efac",fontSize:"0.64rem",fontWeight:700,textTransform:"uppercase",letterSpacing:"0.9px"}}>Crop Health Score</span>
                </div>
                {/* health_score value comes from AI model + weather API calculation */}
                <div style={{color:"#fff",fontSize:"2.8rem",fontWeight:900,lineHeight:1}}>{R.health_score}<span style={{fontSize:"1.1rem",fontWeight:400,color:"#86efac"}}>/10</span></div>
                <div style={{display:"flex",alignItems:"center",gap:6,marginTop:8}}>
                  <div style={{background:"rgba(239,68,68,0.2)",borderRadius:7,padding:4}}><G n="alert" s={12} c="#fca5a5" w={2}/></div>
                  <span style={{color:"#fca5a5",fontWeight:700,fontSize:"0.77rem"}}>
                    {R.health_score<=3?"Critical — Immediate action needed":R.health_score<=6?"Moderate — Treatment recommended":"Good — Preventive care only"}
                  </span>
                </div>
              </div>
              <div style={{position:"relative",width:78,height:78}}>
                <svg viewBox="0 0 80 80" style={{transform:"rotate(-90deg)",width:78,height:78,position:"absolute",top:0,left:0}}>
                  <circle cx="40" cy="40" r="30" fill="none" stroke="rgba(255,255,255,0.15)" strokeWidth="9"/>
                  <circle cx="40" cy="40" r="30" fill="none" stroke="#fca5a5" strokeWidth="9" strokeDasharray={`${(R.health_score/10)*188.5} 188.5`} strokeLinecap="round"/>
                </svg>
                <div style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:900,fontSize:"1.2rem"}}>{R.health_score}</div>
              </div>
            </div>

            {/* ── URGENCY TIMELINE — from AI confidence + weather ── */}
            {R.urgency && R.urgency.hours !== null && (
              <div style={{background:T.redBg,border:`1px solid ${T.redBo}`,borderRadius:16,padding:16,marginBottom:14}}>
                <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:8}}>
                  <div style={{background:"rgba(220,38,38,0.1)",borderRadius:8,padding:5}}><G n="clock" s={14} c={T.red} w={2}/></div>
                  <span style={{fontWeight:700,color:T.red,fontSize:"0.82rem"}}>Urgency Timeline</span>
                </div>
                {/* label and hours come from AI confidence calculation in predictor.py */}
                <div style={{fontWeight:800,fontSize:"1.1rem",color:"#991b1b",marginBottom:5}}>{R.urgency.label}</div>
                <div style={{fontSize:"0.69rem",color:"#7f1d1d",lineHeight:1.6,marginBottom:12}}>{R.urgency.description}</div>
                <div style={{display:"flex",gap:5}}>
                  {[["Now","#dc2626","Act now"],["24h","#f97316","Urgent"],["48h","#eab308","Caution"],["72h+","#9ca3af","Monitor"]].map(([l,c,sub])=>(
                    <div key={l} style={{flex:1,background:c,borderRadius:9,padding:"7px 4px",textAlign:"center"}}>
                      <div style={{color:"#fff",fontSize:"0.69rem",fontWeight:800}}>{l}</div>
                      <div style={{color:"rgba(255,255,255,0.72)",fontSize:"0.54rem",marginTop:1}}>{sub}</div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* ── DISEASE DETECTION CARD — all values from AI model ── */}
            <Card>
              <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:14}}>
                <SLabel icon="activity" color={T.deep}>Disease Detection</SLabel>
                {/* severity from AI model */}
                <Badge bg={R.severity==="High"?T.redBg:R.severity==="Medium"?T.yelBg:T.bluBg}
                       color={R.severity==="High"?T.red:R.severity==="Medium"?T.yel:T.blu}
                       border={R.severity==="High"?T.redBo:R.severity==="Medium"?T.yelBo:T.bluBo}>
                  {R.severity.toUpperCase()} SEVERITY
                </Badge>
              </div>
              {/* disease name from AI model */}
              <div style={{fontWeight:800,fontSize:"1.3rem",color:T.deep,marginBottom:6}}>{R.disease}</div>
              <div style={{display:"flex",gap:10,marginBottom:14}}>
                {/* confidence from AI model */}
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.71rem",color:T.muted}}><G n="check" s={12} c={T.green} w={2.5}/> Confidence: <strong style={{color:T.green}}>{R.confidence}%</strong></span>
                {/* yield_loss from AI model */}
                <span style={{display:"flex",alignItems:"center",gap:4,fontSize:"0.71rem",color:T.muted}}><G n="trending" s={12} c={T.red} w={2}/> Yield Loss: <strong style={{color:T.red}}>{R.yield_loss}</strong></span>
              </div>
              {/* all_scores aggregated from AI model's 38-class output */}
              {CONF_BARS.map(b=>(
                <div key={b.name} style={{marginBottom:8}}>
                  <div style={{display:"flex",justifyContent:"space-between",fontSize:"0.69rem",marginBottom:3}}>
                    <span style={{color:T.muted}}>{b.name}</span>
                    <span style={{fontWeight:700,color:b.color}}>{b.val}%</span>
                  </div>
                  <div style={{background:"#f1f5f9",borderRadius:6,height:7,overflow:"hidden"}}>
                    <div style={{width:`${b.val}%`,background:`linear-gradient(90deg,${b.color}88,${b.color})`,height:"100%",borderRadius:6,transition:"width 0.9s ease"}}/>
                  </div>
                </div>
              ))}

              {/* ── ACTION CHECKLIST — per disease + crop from predictor.py ── */}
              <div style={{marginTop:16}}>
                <SLabel icon="check" color={T.deep}>Smart Action Plan</SLabel>
                {/* checklist comes from ADVICE_DB in predictor.py, specific to detected disease + user's crop */}
                {(R.checklist||[]).map((c,ci)=>{
                  const ts = tierStyle(c.color);
                  return(
                    <div key={ci} style={{background:ts.bg,borderRadius:12,padding:"11px 13px",marginBottom:8,borderLeft:`3px solid ${ts.c}`,border:`1px solid ${ts.bo}`,borderLeftWidth:3}}>
                      <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:7}}>
                        <G n={c.color==="red"?"zap":c.color==="yellow"?"clock":c.color==="blue"?"shield":"leaf"} s={12} c={ts.c} w={2.5}/>
                        <span style={{fontWeight:700,fontSize:"0.7rem",color:ts.c}}>{c.tier}</span>
                      </div>
                      {(c.items||[]).map((item,ii)=>(
                        <div key={ii} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:4}}>
                          <G n="check" s={12} c={ts.c} w={2.5}/>
                          <span style={{fontSize:"0.69rem",color:T.text,lineHeight:1.4}}>{item}</span>
                        </div>
                      ))}
                    </div>
                  );
                })}
              </div>

              {/* ── FUNGICIDE RECOMMENDATIONS — only shown when plant is NOT healthy ── */}
              {!isHealthy && <div style={{marginTop:14}}>
                <SLabel icon="info" color={T.deep}>Recommended Fungicides</SLabel>
                {/* fungicides from ADVICE_DB in predictor.py, specific to detected disease + crop */}
                {(R.fungicides||[]).map((f,fi)=>{
                  const fc = fungicideColor(f.type);
                  return(
                    <div key={fi} style={{background:fc.bg,borderRadius:12,padding:"11px 13px",marginBottom:8,border:`1px solid ${fc.bo}`,display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <div style={{display:"flex",alignItems:"center",gap:10}}>
                        <div style={{background:`${fc.c}15`,borderRadius:9,padding:7}}><G n="activity" s={14} c={fc.c} w={2}/></div>
                        <div>
                          <div style={{display:"flex",alignItems:"center",gap:6}}>
                            <span style={{fontWeight:700,fontSize:"0.79rem",color:T.text}}>{f.name}</span>
                            <span style={{background:`${fc.c}18`,color:fc.c,borderRadius:8,padding:"1px 7px",fontSize:"0.59rem",fontWeight:600}}>{f.type}</span>
                          </div>
                          <div style={{fontSize:"0.63rem",color:T.muted,marginTop:2}}>Dose: {f.dose} · {f.timing}</div>
                        </div>
                      </div>
                      <div style={{fontSize:"0.59rem",color:T.muted,textAlign:"right"}}>Agri<br/>shops</div>
                    </div>
                  );
                })}
              </div>}
            </Card>

            {/* ── WEATHER RISK CARD — all from live weather API ── */}
            <Card>
              <SLabel icon="drop" color={T.deep}>Weather Risk Intelligence</SLabel>
              <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:9,marginBottom:12}}>
                {[
                  {icon:"thermo",label:"Temperature",val:`${W.temperature}°C`,bg:T.redBg,c:T.red,bo:T.redBo},
                  {icon:"drop",  label:"Humidity",   val:`${W.humidity}%`,   bg:T.bluBg,c:T.blu,bo:T.bluBo},
                  {icon:"drop",  label:"Rain Prob.", val:`${W.rain_prob}%`,  bg:T.redBg,c:T.red,bo:T.redBo},
                  {icon:"wind",  label:"Wind Speed", val:`${W.wind_kph} km/h`,bg:T.yelBg,c:T.yel,bo:T.yelBo},
                ].map(m=>(
                  <div key={m.label} style={{background:m.bg,borderRadius:12,padding:"11px 13px",border:`1px solid ${m.bo}`}}>
                    <div style={{display:"flex",alignItems:"center",gap:6,marginBottom:4,fontSize:"0.63rem",color:m.c}}><G n={m.icon} s={12} c={m.c} w={2}/>{m.label}</div>
                    {/* All weather values from live OpenWeatherMap API */}
                    <div style={{fontWeight:800,fontSize:"1.05rem",color:T.text}}>{m.val}</div>
                  </div>
                ))}
              </div>
              {/* Risk score from weather API + disease algorithm */}
              <div style={{background:"linear-gradient(135deg,#fff5f5,#fff8f8)",borderRadius:13,padding:"13px 15px",display:"flex",alignItems:"center",gap:13,border:`1px solid ${T.redBo}`,marginBottom:14}}>
                <div>
                  <div style={{fontWeight:900,fontSize:"2.4rem",color:T.red,lineHeight:1}}>{W.risk_score}</div>
                  <div style={{fontSize:"0.59rem",color:T.muted}}>out of 100</div>
                </div>
                <div>
                  <div style={{fontWeight:700,color:T.red,fontSize:"0.81rem"}}>{W.risk_label} Risk Score</div>
                  <div style={{fontSize:"0.67rem",color:"#7f1d1d",marginTop:3,lineHeight:1.4}}>
                    {W.location} · {W.live?"Live data from OpenWeatherMap":"Offline fallback data"}
                  </div>
                </div>
              </div>

              <SLabel icon="alert" color={T.yel}>Field Operation Warnings</SLabel>
              {/* Warnings generated from REAL weather values, not hardcoded */}
              {(W.warnings.length>0?W.warnings:[{type:"ok",level:"low",text:"No weather warnings at this time"}]).map((w,i)=>{
                const wc = w.level==="critical"||w.level==="high"?{c:T.red,bg:T.redBg,bo:T.redBo}:w.level==="medium"?{c:T.yel,bg:T.yelBg,bo:T.yelBo}:{c:T.green,bg:"#f0fdf4",bo:T.border};
                return(
                  <div key={i} style={{background:wc.bg,borderRadius:10,padding:"9px 12px",display:"flex",gap:10,alignItems:"center",marginBottom:7,border:`1px solid ${wc.bo}`}}>
                    <div style={{background:`${wc.c}14`,borderRadius:8,padding:5,flexShrink:0}}><G n="alert" s={12} c={wc.c} w={2}/></div>
                    <span style={{fontSize:"0.69rem",color:T.text,lineHeight:1.4}}>{w.text}</span>
                  </div>
                );
              })}
            </Card>

            {/* ── WEATHER TIP FROM BACKEND — disease-specific weather warning ── */}
            {R.weather_tip && Object.keys(R.weather_tip).length > 0 && (
              <Card>
                <SLabel icon="alert" color={T.yel}>🌦 Disease-Weather Alert</SLabel>
                {[
                  R.weather_tip.warning      && {label:"⚠️ Warning",     text:R.weather_tip.warning,      c:T.red,  bg:T.redBg,  bo:T.redBo},
                  R.weather_tip.high_risk_temp && {label:"🌡️ High Risk Conditions", text:R.weather_tip.high_risk_temp, c:T.yel, bg:T.yelBg, bo:T.yelBo},
                  R.weather_tip.safe_temp    && {label:"✅ Safe Conditions",  text:R.weather_tip.safe_temp,    c:T.green,bg:"#f0fdf4",bo:T.border},
                ].filter(Boolean).map((tip,i)=>(
                  <div key={i} style={{background:tip.bg,borderRadius:11,padding:"10px 13px",marginBottom:8,border:`1px solid ${tip.bo}`}}>
                    <div style={{fontWeight:700,fontSize:"0.66rem",color:tip.c,marginBottom:3}}>{tip.label}</div>
                    <div style={{fontSize:"0.7rem",color:T.text,lineHeight:1.5}}>{tip.text}</div>
                  </div>
                ))}
              </Card>
            )}
            {econ && (
              <Card>
                <SLabel icon="rupee" color={T.deep}>Economic Loss Estimate</SLabel>
                <div style={{background:"linear-gradient(135deg,#fff5f5,#fff8f8)",borderRadius:14,padding:"18px 16px",textAlign:"center",marginBottom:14,border:`1px solid ${T.redBo}`}}>
                  <div style={{display:"flex",alignItems:"center",justifyContent:"center",gap:7,marginBottom:4,fontSize:"0.69rem",color:T.muted}}><G n="trending" s={14} c={T.red} w={2}/> Projected Crop Loss</div>
                  {/* Loss = AI confidence × yield_loss_pct × (1 + weather_risk/100) */}
                  <div style={{fontWeight:900,fontSize:"2.4rem",color:T.red,lineHeight:1.1}}>₹{lossAmt.toLocaleString("en-IN")}</div>
                  <div style={{fontSize:"0.66rem",color:"#7f1d1d",marginTop:5}}>
                    {farmData?.crop} · {farmData?.land} acres · ₹{econ.msp_per_kg}/kg MSP · {econ.effective_loss_pct}% effective loss
                  </div>
                  <div style={{marginTop:10}}><Badge bg={riskColor} color="#fff" border={riskColor}>{riskLabel} FINANCIAL RISK</Badge></div>
                </div>
                {[
                  {icon:"zap",   label:"Treatment Cost",      val:`~Rs ${treatCost.toLocaleString("en-IN")}`, c:T.green},
                  {icon:"check", label:"Net Saving if Treated",val:`₹${netSaving.toLocaleString("en-IN")}`,  c:T.green},
                  {icon:"shield",label:"Max Insurance Cover",  val:`₹${econ.insurance_cover.toLocaleString("en-IN")}`,c:T.blu},
                ].map(r=>(
                  <div key={r.label} style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"10px 0",borderBottom:`1px solid #f0fdf4`}}>
                    <span style={{display:"flex",alignItems:"center",gap:8,fontSize:"0.75rem",color:T.muted}}><G n={r.icon} s={13} c={r.c} w={2}/>{r.label}</span>
                    <span style={{fontWeight:700,fontSize:"0.81rem",color:r.c}}>{r.val}</span>
                  </div>
                ))}
              </Card>
            )}

            {/* GOVERNMENT SCHEMES — only show when there is actual loss */}
            {lossAmt > 0 && <Card>
              <SLabel icon="shield" color={T.deep}>Government Schemes</SLabel>
              {SCHEMES.slice(0,5).map(s=>{
                const isElig = s.eligFn(farmData?.crop||"", lossAmt, inferredState);
                const isOpen = expandedScheme===s.id;
                return(
                  <div key={s.id} style={{background:T.card,borderRadius:13,marginBottom:10,border:`1px solid ${isOpen?T.green:isElig?T.border:"#e5e7eb"}`,overflow:"hidden",transition:"border 0.2s,box-shadow 0.2s",boxShadow:isOpen?shM:"none"}}>
                    <div style={{padding:"12px 13px"}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:6}}>
                        <div style={{display:"flex",alignItems:"center",gap:8,flex:1,marginRight:8}}>
                          <ITile icon={s.icon} size="sm"/>
                          <div>
                            <div style={{fontWeight:700,fontSize:"0.77rem",color:T.deep}}>{s.name}</div>
                            <div style={{fontSize:"0.6rem",color:T.muted,marginTop:1}}>{s.ministry}</div>
                          </div>
                        </div>
                        {isElig&&<Badge bg="#dcfce7" color={T.green} border={T.border}>ELIGIBLE</Badge>}
                      </div>
                      <div style={{fontSize:"0.69rem",color:T.textLight,marginBottom:8}}>
                        <strong style={{color:T.deep}}>{s.benefit}</strong>
                      </div>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                        <span style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.62rem",color:T.blu}}><G n="globe" s={10} c={T.blu} w={2}/>{s.link}</span>
                        <button onClick={()=>setExpandedScheme(isOpen?null:s.id)} style={{background:isOpen?"#f0fdf4":isElig?`linear-gradient(135deg,${T.deep},${T.green})`:"#e5e7eb",color:isOpen?T.green:isElig?"#fff":T.muted,border:isOpen?`1px solid ${T.border}`:"none",borderRadius:9,padding:"6px 13px",fontSize:"0.67rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:5,transition:"all 0.2s"}}>
                          <G n={isOpen?"close":"arrow"} s={11} c={isOpen?T.green:isElig?"#fff":T.muted} w={2}/> {isOpen?"Close":"Explore"}
                        </button>
                      </div>
                    </div>
                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${T.border}`,padding:"14px 13px 16px",background:"#fafffe",animation:"fadeSlideDown 0.2s ease"}}>
                        <div style={{marginBottom:12}}>
                          <div style={{fontWeight:700,fontSize:"0.67rem",color:T.deep,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><G n="check" s={11} c={T.green} w={2}/> Eligibility Criteria</div>
                          <div style={{background:T.border2,borderRadius:9,padding:"8px 11px",fontSize:"0.68rem",color:T.textLight,lineHeight:1.5,border:`1px solid ${T.border}`}}>{s.eligCriteria}</div>
                        </div>
                        <div style={{marginBottom:12}}>
                          <div style={{fontWeight:700,fontSize:"0.67rem",color:T.deep,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><G n="info" s={11} c={T.blu} w={2}/> Documents Required</div>
                          {s.documents.map((doc,i)=>(
                            <div key={i} style={{display:"flex",alignItems:"flex-start",gap:7,marginBottom:5}}>
                              <div style={{background:T.bluBg,borderRadius:"50%",width:17,height:17,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                                <span style={{fontSize:"0.55rem",fontWeight:700,color:T.blu}}>{i+1}</span>
                              </div>
                              <span style={{fontSize:"0.67rem",color:T.text,lineHeight:1.4}}>{doc}</span>
                            </div>
                          ))}
                        </div>
                        <div style={{marginBottom:12}}>
                          <div style={{fontWeight:700,fontSize:"0.67rem",color:T.deep,marginBottom:6,display:"flex",alignItems:"center",gap:5}}><G n="activity" s={11} c={T.yel} w={2}/> How To Apply</div>
                          {s.howToApply.map((step,i)=>(
                            <div key={i} style={{display:"flex",gap:8,marginBottom:6,alignItems:"flex-start"}}>
                              <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:"50%",width:18,height:18,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                                <span style={{fontSize:"0.55rem",fontWeight:800,color:"#fff"}}>{i+1}</span>
                              </div>
                              <span style={{fontSize:"0.67rem",color:T.text,lineHeight:1.4}}>{step}</span>
                            </div>
                          ))}
                        </div>
                        {s.deadline&&(
                          <div style={{background:T.yelBg,borderRadius:9,padding:"8px 11px",marginBottom:12,border:`1px solid ${T.yelBo}`,display:"flex",gap:7,alignItems:"center"}}>
                            <G n="clock" s={12} c={T.yel} w={2}/>
                            <div>
                              <div style={{fontSize:"0.58rem",fontWeight:700,color:T.yel}}>DEADLINE</div>
                              <div style={{fontSize:"0.65rem",color:T.text,marginTop:1}}>{s.deadline}</div>
                            </div>
                          </div>
                        )}
                        <button onClick={()=>window.open(s.url,"_blank")} style={{width:"100%",background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:10,padding:"10px",fontWeight:700,fontSize:"0.78rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:7,boxShadow:"0 3px 12px rgba(22,163,74,0.28)"}}>
                          <G n="globe" s={13} c="#fff" w={2}/> Visit Official Website
                        </button>
                      </div>
                    )}
                  </div>
                );
              })}
              <button onClick={()=>go("schemes")} style={{width:"100%",background:"#f0fdf4",border:`1px solid ${T.border}`,borderRadius:11,padding:"10px",fontSize:"0.72rem",fontWeight:600,color:T.deep,cursor:"pointer",fontFamily:"inherit",marginTop:4,display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                <G n="shield" s={13} c={T.deep} w={2}/> View All {SCHEMES.length} Government Schemes
              </button>
            </Card>}
          </div>
        )}

        {/* ════ SCHEMES ════ */}
        {screen==="schemes"&&(
          <div style={{padding:"16px 15px 16px",animation:"fadeSlideUp 0.3s ease"}}>
            <button onClick={goBack} style={{background:"none",border:"none",color:T.green,fontWeight:600,cursor:"pointer",marginBottom:14,fontSize:"0.82rem",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit"}}><G n="back" s={15} c={T.green} w={2}/> Back</button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:4}}>
              <ITile icon="shield" size="lg"/>
              <div>
                <div style={{fontWeight:800,fontSize:"1rem",color:T.deep}}>Government Schemes</div>
                <div style={{fontSize:"0.67rem",color:T.muted}}>{SCHEMES.length} schemes across all states</div>
              </div>
            </div>
            <div style={{fontSize:"0.69rem",color:T.muted,marginBottom:14,lineHeight:1.5,background:T.border2,borderRadius:10,padding:"9px 12px",border:`1px solid ${T.border}`}}>
              <G n="info" s={12} c={T.green} w={2} style={{marginRight:5}}/>
              Tap <strong style={{color:T.deep}}>Explore</strong> on any scheme to see eligibility, documents needed, and how to apply.
            </div>

            {/* Compact filter — All + Central + 3 states + More button */}
            <div style={{display:"flex",gap:6,marginBottom:showMoreFilters?6:14,alignItems:"center",flexWrap:"nowrap",overflowX:"auto",paddingBottom:2}}>
              {["All","Central","Punjab","Haryana","Bihar"].map(f=>(
                <button key={f} onClick={()=>setFilter(f)} style={{background:filter===f?T.green:"#f0fdf4",color:filter===f?"#fff":T.green,border:`1px solid ${filter===f?T.green:T.border}`,borderRadius:20,padding:"5px 12px",fontSize:"0.67rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0}}>{f}</button>
              ))}
              <button onClick={()=>setShowMoreFilters(p=>!p)} style={{background:showMoreFilters?"#1f2937":"#f0fdf4",color:showMoreFilters?"#fff":T.muted,border:`1px solid ${showMoreFilters?"#1f2937":"#e5e7eb"}`,borderRadius:20,padding:"5px 11px",fontSize:"0.67rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap",flexShrink:0,display:"flex",alignItems:"center",gap:3}}>
                More <G n="arrow" s={10} c={showMoreFilters?"#fff":T.muted} w={2} style={{transform:showMoreFilters?"rotate(-90deg)":"rotate(90deg)",transition:"transform 0.2s"}}/>
              </button>
            </div>

            {/* More states — shown when More is tapped */}
            {showMoreFilters&&(
              <div style={{display:"flex",gap:6,marginBottom:14,flexWrap:"wrap",animation:"fadeSlideDown 0.2s ease"}}>
                {["UP","Maharashtra","Gujarat","Rajasthan","MP","Telangana","AP","Karnataka"].map(f=>(
                  <button key={f} onClick={()=>{setFilter(f);setShowMoreFilters(false);}} style={{background:filter===f?T.green:"#f9fafb",color:filter===f?"#fff":T.muted,border:`1px solid ${filter===f?T.green:"#e5e7eb"}`,borderRadius:20,padding:"4px 11px",fontSize:"0.65rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",whiteSpace:"nowrap"}}>{f}</button>
                ))}
              </div>
            )}

            {filtered.map(s=>{
              const isOpen = expandedScheme===s.id;
              return(
                <div key={s.id} style={{background:T.card,borderRadius:16,marginBottom:12,border:`1px solid ${isOpen?T.green:T.border}`,boxShadow:isOpen?shM:sh,overflow:"hidden",transition:"border 0.2s,box-shadow 0.2s"}}>
                  {/* Card header — always visible */}
                  <div style={{padding:16}}>
                    <div style={{display:"flex",alignItems:"flex-start",gap:10,marginBottom:9}}>
                      <ITile icon={s.icon} size="md"/>
                      <div style={{flex:1}}>
                        <div style={{fontWeight:700,fontSize:"0.83rem",color:T.deep}}>{s.name}</div>
                        <div style={{fontSize:"0.61rem",color:T.muted,marginTop:1}}>{s.ministry}</div>
                        <div style={{fontSize:"0.63rem",color:T.green,marginTop:3,fontWeight:600}}>{s.state==="Central"?"🇮🇳 Central":s.state}</div>
                      </div>
                    </div>
                    <div style={{background:"#f0fdf4",borderRadius:10,padding:"9px 12px",marginBottom:10,border:`1px solid ${T.border2}`}}>
                      <div style={{fontWeight:700,fontSize:"0.71rem",color:T.deep}}>Benefit</div>
                      <div style={{fontSize:"0.71rem",color:T.textLight,marginTop:2}}>{s.benefit}</div>
                    </div>
                    <div style={{fontSize:"0.67rem",color:T.muted,marginBottom:10,display:"flex",alignItems:"flex-start",gap:5}}>
                      <G n="check" s={11} c={T.green} w={2.5} style={{marginTop:1,flexShrink:0}}/>
                      <span>{s.eligCriteria}</span>
                    </div>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                      <span style={{display:"flex",alignItems:"center",gap:5,fontSize:"0.64rem",color:T.blu}}><G n="globe" s={11} c={T.blu} w={2}/>{s.link}</span>
                      <button onClick={()=>setExpandedScheme(isOpen?null:s.id)} style={{background:isOpen?"#f0fdf4":`linear-gradient(135deg,${T.deep},${T.green})`,color:isOpen?T.green:"#fff",border:isOpen?`1px solid ${T.border}`:"none",borderRadius:10,padding:"8px 16px",fontSize:"0.71rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:6,transition:"all 0.2s"}}>
                        <G n={isOpen?"close":"arrow"} s={12} c={isOpen?T.green:"#fff"} w={2}/> {isOpen?"Close":"Explore"}
                      </button>
                    </div>
                  </div>

                  {/* Inline expanded details */}
                  {isOpen&&(
                    <div style={{borderTop:`1px solid ${T.border}`,padding:"16px 16px 20px",background:"#fafffe",animation:"fadeSlideDown 0.22s ease"}}>
                      <div style={{marginBottom:14}}>
                        <div style={{fontWeight:700,fontSize:"0.7rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="check" s={12} c={T.green} w={2}/> Eligibility Criteria</div>
                        <div style={{background:T.border2,borderRadius:10,padding:"9px 12px",fontSize:"0.7rem",color:T.textLight,lineHeight:1.6,border:`1px solid ${T.border}`}}>{s.eligCriteria}</div>
                      </div>
                      <div style={{marginBottom:14}}>
                        <div style={{fontWeight:700,fontSize:"0.7rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="info" s={12} c={T.blu} w={2}/> Documents Required</div>
                        {s.documents.map((doc,i)=>(
                          <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                            <div style={{background:T.bluBg,borderRadius:"50%",width:19,height:19,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                              <span style={{fontSize:"0.58rem",fontWeight:700,color:T.blu}}>{i+1}</span>
                            </div>
                            <span style={{fontSize:"0.69rem",color:T.text,lineHeight:1.4}}>{doc}</span>
                          </div>
                        ))}
                      </div>
                      <div style={{marginBottom:14}}>
                        <div style={{fontWeight:700,fontSize:"0.7rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="activity" s={12} c={T.yel} w={2}/> How To Apply</div>
                        {s.howToApply.map((step,i)=>(
                          <div key={i} style={{display:"flex",gap:9,marginBottom:8,alignItems:"flex-start"}}>
                            <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                              <span style={{fontSize:"0.58rem",fontWeight:800,color:"#fff"}}>{i+1}</span>
                            </div>
                            <span style={{fontSize:"0.69rem",color:T.text,lineHeight:1.45}}>{step}</span>
                          </div>
                        ))}
                      </div>
                      {s.deadline&&(
                        <div style={{background:T.yelBg,borderRadius:10,padding:"9px 12px",marginBottom:14,border:`1px solid ${T.yelBo}`,display:"flex",gap:8,alignItems:"center"}}>
                          <G n="clock" s={13} c={T.yel} w={2}/>
                          <div>
                            <div style={{fontSize:"0.61rem",fontWeight:700,color:T.yel}}>DEADLINE</div>
                            <div style={{fontSize:"0.67rem",color:T.text,marginTop:1}}>{s.deadline}</div>
                          </div>
                        </div>
                      )}
                      <button onClick={()=>window.open(s.url,"_blank")} style={{width:"100%",background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:12,padding:"12px",fontWeight:700,fontSize:"0.82rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:8,boxShadow:"0 4px 14px rgba(22,163,74,0.3)"}}>
                        <G n="globe" s={14} c="#fff" w={2}/> Visit Official Website
                      </button>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}

        {/* ════ HISTORY ════ */}
        {screen==="history"&&(
          <div style={{padding:"16px 15px 16px",animation:"fadeSlideUp 0.3s ease"}}>
            {/* Back button */}
            <button onClick={goBack} style={{background:"none",border:"none",color:T.green,fontWeight:600,cursor:"pointer",marginBottom:12,fontSize:"0.82rem",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",padding:0}}>
              <G n="back" s={15} c={T.green} w={2}/> Back
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <ITile icon="clock" size="lg"/>
              <div>
                <div style={{fontWeight:800,fontSize:"1rem",color:T.deep}}>Scan History</div>
                <div style={{fontSize:"0.67rem",color:T.muted}}>{scanHistory.length} scan{scanHistory.length!==1?"s":""} saved</div>
              </div>
              {scanHistory.length>0&&(
                <button onClick={()=>{setScanHistory([]);const token=localStorage.getItem("kv_token");if(token)fetch(`${API_BASE}/scans/all`,{method:"DELETE",headers:{"Authorization":`Bearer ${token}`}}).catch(()=>{});}} style={{marginLeft:"auto",background:"none",border:`1px solid ${T.redBo}`,borderRadius:9,padding:"5px 11px",fontSize:"0.65rem",fontWeight:600,color:T.red,cursor:"pointer",fontFamily:"inherit"}}>
                  Clear All
                </button>
              )}
            </div>

            {scanHistory.length===0?(
              <div style={{textAlign:"center",padding:"48px 20px",background:T.card,borderRadius:18,border:`1px solid ${T.border}`}}>
                <div style={{display:"inline-flex",background:"#f0fdf4",borderRadius:"50%",padding:20,marginBottom:16}}>
                  <G n="clock" s={32} c={T.border} w={1.5}/>
                </div>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:T.muted,marginBottom:6}}>No scans yet</div>
                <div style={{fontSize:"0.72rem",color:T.muted,lineHeight:1.5}}>Upload a crop image and analyze it — your scan results will appear here automatically.</div>
                <button onClick={()=>go("home")} style={{marginTop:16,background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:12,padding:"10px 22px",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
                  Scan a Crop
                </button>
              </div>
            ):(
              scanHistory.map((scan,idx)=>{
                const isOpen = expandedHistory===scan.id;
                const R2 = scan.result || {};
                const sev = R2.severity||"Low";
                const sevColor = sev==="High"?T.red:sev==="Medium"?T.yel:T.green;
                const sevBg = sev==="High"?T.redBg:sev==="Medium"?T.yelBg:"#f0fdf4";
                const sevBo = sev==="High"?T.redBo:sev==="Medium"?T.yelBo:T.border;
                return(
                  <div key={scan.id} style={{background:T.card,borderRadius:16,marginBottom:12,border:`1px solid ${isOpen?T.green:T.border}`,overflow:"hidden",boxShadow:isOpen?shM:sh,transition:"all 0.2s"}}>
                    <div style={{padding:"13px 14px"}}>
                      <div style={{display:"flex",gap:11,alignItems:"center"}}>
                        {scan.image&&(
                          <img src={scan.image} alt="scan" style={{width:56,height:56,objectFit:"cover",borderRadius:10,border:`2px solid ${T.border}`,flexShrink:0}}/>
                        )}
                        <div style={{flex:1,minWidth:0}}>
                          <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:3}}>
                            <span style={{fontWeight:800,fontSize:"0.85rem",color:T.deep,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{R2.disease||"Unknown Disease"}</span>
                          </div>
                          <div style={{fontSize:"0.68rem",color:T.muted,marginBottom:5}}>
                            {scan.crop} · {scan.land} acres · {scan.date} {scan.time}
                          </div>
                          <div style={{display:"flex",gap:6,alignItems:"center"}}>
                            <span style={{background:sevBg,color:sevColor,border:`1px solid ${sevBo}`,borderRadius:20,padding:"2px 8px",fontSize:"0.59rem",fontWeight:700}}>{sev.toUpperCase()}</span>
                            {R2.confidence&&<span style={{fontSize:"0.63rem",color:T.green,fontWeight:600}}>{R2.confidence}% confidence</span>}
                            {R2.health_score&&<span style={{fontSize:"0.63rem",color:T.muted}}>Health: <strong style={{color:T.deep}}>{R2.health_score}/10</strong></span>}
                          </div>
                        </div>
                        <button onClick={()=>setExpandedHistory(isOpen?null:scan.id)} style={{background:isOpen?"#f0fdf4":`linear-gradient(135deg,${T.deep},${T.green})`,color:isOpen?T.green:"#fff",border:isOpen?`1px solid ${T.border}`:"none",borderRadius:9,padding:"7px 12px",fontSize:"0.67rem",fontWeight:700,cursor:"pointer",fontFamily:"inherit",flexShrink:0,display:"flex",alignItems:"center",gap:4}}>
                          <G n={isOpen?"close":"eye"} s={11} c={isOpen?T.green:"#fff"} w={2}/>{isOpen?"Hide":"View"}
                        </button>
                      </div>
                    </div>

                    {isOpen&&(
                      <div style={{borderTop:`1px solid ${T.border}`,padding:"14px 14px 16px",background:"#fafffe",animation:"fadeSlideDown 0.2s ease"}}>
                        <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:8,marginBottom:12}}>
                          {[
                            {label:"Disease",val:R2.disease||"--",c:T.deep},
                            {label:"Confidence",val:R2.confidence?`${R2.confidence}%`:"--",c:T.green},
                            {label:"Yield Loss",val:R2.yield_loss||"--",c:T.red},
                            {label:"Health Score",val:R2.health_score?`${R2.health_score}/10`:"--",c:T.deep},
                          ].map(item=>(
                            <div key={item.label} style={{background:T.border2,borderRadius:9,padding:"9px 11px",border:`1px solid ${T.border}`}}>
                              <div style={{fontSize:"0.59rem",color:T.muted,marginBottom:2}}>{item.label}</div>
                              <div style={{fontWeight:700,fontSize:"0.78rem",color:item.c}}>{item.val}</div>
                            </div>
                          ))}
                        </div>

                        {scan.weather&&(
                          <div style={{background:T.bluBg,borderRadius:10,padding:"9px 12px",marginBottom:12,border:`1px solid ${T.bluBo}`,fontSize:"0.68rem",color:T.textLight}}>
                            <G n="drop" s={11} c={T.blu} w={2} style={{marginRight:5}}/>
                            <strong>{scan.weather.location}</strong> · {scan.weather.temperature}°C · {scan.weather.humidity}% humidity
                          </div>
                        )}

                        {R2.checklist&&R2.checklist.length>0&&(
                          <div style={{marginBottom:10}}>
                            <div style={{fontWeight:700,fontSize:"0.67rem",color:T.deep,marginBottom:6}}>Top Action</div>
                            <div style={{background:T.redBg,borderRadius:9,padding:"8px 11px",border:`1px solid ${T.redBo}`,fontSize:"0.68rem",color:T.text}}>
                              {R2.checklist[0]?.items?.[0]||"See full results"}
                            </div>
                          </div>
                        )}

                        <div style={{display:"flex",gap:8}}>
                          <button onClick={()=>{
                            setApiResult(scan.result);
                            setWeatherData(scan.weather);
                            setFarmData({crop:scan.crop,land:scan.land});
                            setSelectedImage(scan.image);
                            go("results");
                          }} style={{flex:1,background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:10,padding:"9px",fontWeight:700,fontSize:"0.75rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                            <G n="activity" s={12} c="#fff" w={2}/> View Full Report
                          </button>
                          <button onClick={()=>{setScanHistory(prev=>prev.filter(s=>s.id!==scan.id));const token=localStorage.getItem("kv_token");if(token)fetch(`${API_BASE}/scans/${scan.id}`,{method:"DELETE",headers:{"Authorization":`Bearer ${token}`}}).catch(()=>{});}} style={{background:"none",border:`1px solid ${T.redBo}`,borderRadius:10,padding:"9px 13px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,fontSize:"0.7rem",color:T.red,fontWeight:600}}>
                            <G n="close" s={11} c={T.red} w={2}/> Delete
                          </button>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })
            )}
          </div>
        )}

        {/* ════ DOWNLOADS ════ */}
        {screen==="downloads"&&(
          <div style={{padding:"16px 15px 16px",animation:"fadeSlideUp 0.3s ease"}}>
            {/* Back button */}
            <button onClick={goBack} style={{background:"none",border:"none",color:T.green,fontWeight:600,cursor:"pointer",marginBottom:12,fontSize:"0.82rem",display:"flex",alignItems:"center",gap:5,fontFamily:"inherit",padding:0}}>
              <G n="back" s={15} c={T.green} w={2}/> Back
            </button>
            <div style={{display:"flex",alignItems:"center",gap:10,marginBottom:16}}>
              <ITile icon="download" size="lg"/>
              <div>
                <div style={{fontWeight:800,fontSize:"1rem",color:T.deep}}>Downloaded Reports</div>
                <div style={{fontSize:"0.67rem",color:T.muted}}>{downloads.length} report{downloads.length!==1?"s":""} saved</div>
              </div>
              {downloads.length>0&&(
                <button onClick={()=>{setDownloads([]);const token=localStorage.getItem("kv_token");if(token)fetch(`${API_BASE}/downloads/all`,{method:"DELETE",headers:{"Authorization":`Bearer ${token}`}}).catch(()=>{});}} style={{marginLeft:"auto",background:"none",border:`1px solid ${T.redBo}`,borderRadius:9,padding:"5px 11px",fontSize:"0.65rem",fontWeight:600,color:T.red,cursor:"pointer",fontFamily:"inherit"}}>
                  Clear All
                </button>
              )}
            </div>

            {downloads.length===0?(
              <div style={{textAlign:"center",padding:"48px 20px",background:T.card,borderRadius:18,border:`1px solid ${T.border}`}}>
                <div style={{display:"inline-flex",background:"#f0fdf4",borderRadius:"50%",padding:20,marginBottom:16}}>
                  <G n="download" s={32} c={T.border} w={1.5}/>
                </div>
                <div style={{fontWeight:700,fontSize:"0.9rem",color:T.muted,marginBottom:6}}>No reports yet</div>
                <div style={{fontSize:"0.72rem",color:T.muted,lineHeight:1.5,marginBottom:16}}>Scan a crop and tap "Download Full Report" — your reports will be saved here automatically.</div>
                <button onClick={()=>go("home")} style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:12,padding:"10px 22px",fontWeight:700,fontSize:"0.8rem",cursor:"pointer",fontFamily:"inherit"}}>
                  Scan a Crop
                </button>
              </div>
            ):(
              downloads.map((dl)=>(
                <div key={dl.id} style={{background:T.card,borderRadius:16,marginBottom:12,border:`1px solid ${T.border}`,boxShadow:sh,overflow:"hidden"}}>
                  <div style={{padding:"13px 14px"}}>
                    <div style={{display:"flex",gap:11,alignItems:"center"}}>
                      {/* Thumbnail */}
                      {dl.image?(
                        <img src={dl.image} alt="report" style={{width:52,height:52,objectFit:"cover",borderRadius:10,border:`2px solid ${T.border}`,flexShrink:0}}/>
                      ):(
                        <div style={{width:52,height:52,borderRadius:10,background:"#f0fdf4",border:`2px solid ${T.border}`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0}}>
                          <G n="download" s={22} c={T.border} w={1.5}/>
                        </div>
                      )}
                      <div style={{flex:1,minWidth:0}}>
                        {/* Title */}
                        <div style={{fontWeight:800,fontSize:"0.82rem",color:T.deep,marginBottom:3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{dl.title}</div>
                        {/* Date + time */}
                        <div style={{fontSize:"0.66rem",color:T.muted,marginBottom:6}}>{dl.date} · {dl.time}</div>
                        {/* Badges */}
                        <div style={{display:"flex",gap:5,flexWrap:"wrap"}}>
                          {dl.severity&&(
                            <span style={{background:dl.severity==="High"?T.redBg:dl.severity==="Medium"?T.yelBg:"#f0fdf4",color:dl.severity==="High"?T.red:dl.severity==="Medium"?T.yel:T.green,border:`1px solid ${dl.severity==="High"?T.redBo:dl.severity==="Medium"?T.yelBo:T.border}`,borderRadius:20,padding:"2px 8px",fontSize:"0.58rem",fontWeight:700}}>
                              {dl.severity.toUpperCase()}
                            </span>
                          )}
                          {dl.confidence>0&&<span style={{fontSize:"0.62rem",color:T.green,fontWeight:600}}>{dl.confidence}% conf.</span>}
                          {dl.health_score>0&&<span style={{fontSize:"0.62rem",color:T.muted}}>Health: <strong style={{color:T.deep}}>{dl.health_score}/10</strong></span>}
                        </div>
                      </div>
                    </div>

                    {/* Action buttons */}
                    <div style={{display:"flex",gap:8,marginTop:12}}>
                      {/* Re-open PDF */}
                      <button onClick={()=>{const win=window.open("","_blank");win.document.write(dl.html);win.document.close();setTimeout(()=>win.print(),600);}}
                        style={{flex:1,background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:10,padding:"9px",fontWeight:700,fontSize:"0.74rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:5}}>
                        <G n="download" s={12} c="#fff" w={2}/> Open PDF
                      </button>
                      {/* Delete */}
                      <button onClick={()=>{setDownloads(prev=>prev.filter(d=>d.id!==dl.id));const token=localStorage.getItem("kv_token");if(token)fetch(`${API_BASE}/downloads/${dl.id}`,{method:"DELETE",headers:{"Authorization":`Bearer ${token}`}}).catch(()=>{});}}
                        style={{background:"none",border:`1px solid ${T.redBo}`,borderRadius:10,padding:"9px 13px",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",gap:4,fontSize:"0.7rem",color:T.red,fontWeight:600}}>
                        <G n="close" s={11} c={T.red} w={2}/> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        )}

      </div>

      {/* Sticky download button */}
      {screen==="results"&&(
        <div style={{padding:"0 14px 6px",background:T.bg,borderTop:`1px solid ${T.border2}`,flexShrink:0}}>
          <button onClick={downloadReport}
            onTouchStart={e=>e.currentTarget.style.opacity="0.8"}
            onTouchEnd={e=>e.currentTarget.style.opacity="1"}
            onMouseDown={e=>e.currentTarget.style.opacity="0.8"}
            onMouseUp={e=>e.currentTarget.style.opacity="1"}
            style={{width:"100%",background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:16,padding:"13px",fontWeight:700,fontSize:"0.87rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:9,boxShadow:"0 4px 24px rgba(22,163,74,0.4)",marginTop:6,transition:"opacity 0.15s"}}>
            <G n="download" s={16} c="#fff" w={2}/> Download Full Report
          </button>
        </div>
      )}

      {/* Bottom navigation */}
      <div style={{background:T.nav,borderTop:`1px solid ${T.border}`,display:"flex",flexShrink:0,boxShadow:"0 -2px 16px rgba(0,0,0,0.05)"}}>
        {[["clock","History",()=>go("history"),screen==="history"],["shield","Schemes",()=>go("schemes"),screen==="schemes"],["download","Downloads",()=>go("downloads"),screen==="downloads"]].map(([icon,label,action,active])=>(
          <button key={label} onClick={action}
            onTouchStart={e=>e.currentTarget.style.background=active?"#dcfce7":"#f0fdf4"}
            onTouchEnd={e=>e.currentTarget.style.background=active?"#f0fdf4":"none"}
            onMouseDown={e=>e.currentTarget.style.background=active?"#dcfce7":"#f0fdf4"}
            onMouseUp={e=>e.currentTarget.style.background=active?"#f0fdf4":"none"}
            style={{flex:1,padding:"10px 8px 10px",background:active?"#f0fdf4":"none",border:"none",borderTop:active?`2px solid ${T.green}`:"2px solid transparent",cursor:"pointer",display:"flex",flexDirection:"column",alignItems:"center",gap:4,fontFamily:"inherit",transition:"background 0.15s"}}>
            <G n={icon} s={19} c={active?T.green:T.muted} w={active?2.2:1.8}/>
            <span style={{fontSize:"0.59rem",color:active?T.green:T.muted,fontWeight:active?700:500}}>{label}</span>
          </button>
        ))}
      </div>

      {/* Crop popup */}
      {showCropPopup&&<CropPopup onSubmit={handleCropSubmit}/>}

      {/* Scheme Detail Popup */}
      {schemeDetail&&(
        <div style={{position:"absolute",inset:0,background:"rgba(5,46,22,0.55)",zIndex:300,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setSchemeDetail(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,width:"100%",maxWidth:430,borderRadius:"24px 24px 0 0",padding:"22px 20px 32px",maxHeight:"88vh",overflowY:"auto",animation:"slideUp 0.25s ease"}}>
            <div style={{width:44,height:4,background:T.border,borderRadius:4,margin:"0 auto 18px"}}/>
            <div style={{display:"flex",alignItems:"flex-start",gap:12,marginBottom:16}}>
              <ITile icon={schemeDetail.icon} size="lg"/>
              <div style={{flex:1}}>
                <div style={{fontWeight:800,fontSize:"1rem",color:T.deep}}>{schemeDetail.name}</div>
                <div style={{fontSize:"0.65rem",color:T.muted,marginTop:2}}>{schemeDetail.ministry}</div>
                <div style={{fontSize:"0.63rem",color:T.green,fontWeight:600,marginTop:3}}>{schemeDetail.state==="Central"?"🇮🇳 All India Scheme":schemeDetail.state+" State Scheme"}</div>
              </div>
            </div>

            <div style={{background:"linear-gradient(135deg,#f0fdf4,#dcfce7)",borderRadius:13,padding:"13px 14px",marginBottom:14,border:`1px solid ${T.border}`}}>
              <div style={{fontWeight:700,fontSize:"0.71rem",color:T.deep,marginBottom:4}}>Benefit</div>
              <div style={{fontWeight:800,fontSize:"0.92rem",color:T.green}}>{schemeDetail.benefit}</div>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:"0.71rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="check" s={13} c={T.green} w={2}/> Eligibility Criteria</div>
              <div style={{background:T.border2,borderRadius:11,padding:"10px 13px",fontSize:"0.72rem",color:T.textLight,lineHeight:1.6,border:`1px solid ${T.border}`}}>{schemeDetail.eligCriteria}</div>
            </div>

            <div style={{marginBottom:14}}>
              <div style={{fontWeight:700,fontSize:"0.71rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="info" s={13} c={T.blu} w={2}/> Documents Required</div>
              {schemeDetail.documents.map((doc,i)=>(
                <div key={i} style={{display:"flex",alignItems:"flex-start",gap:8,marginBottom:6}}>
                  <div style={{background:T.bluBg,borderRadius:"50%",width:20,height:20,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{fontSize:"0.6rem",fontWeight:700,color:T.blu}}>{i+1}</span>
                  </div>
                  <span style={{fontSize:"0.71rem",color:T.text,lineHeight:1.4}}>{doc}</span>
                </div>
              ))}
            </div>

            <div style={{marginBottom:18}}>
              <div style={{fontWeight:700,fontSize:"0.71rem",color:T.deep,marginBottom:8,display:"flex",alignItems:"center",gap:6}}><G n="activity" s={13} c={T.yel} w={2}/> How To Apply</div>
              {schemeDetail.howToApply.map((step,i)=>(
                <div key={i} style={{display:"flex",gap:10,marginBottom:8,alignItems:"flex-start"}}>
                  <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:"50%",width:22,height:22,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,marginTop:1}}>
                    <span style={{fontSize:"0.6rem",fontWeight:800,color:"#fff"}}>{i+1}</span>
                  </div>
                  <span style={{fontSize:"0.71rem",color:T.text,lineHeight:1.45}}>{step}</span>
                </div>
              ))}
            </div>

            {schemeDetail.deadline&&(
              <div style={{background:T.yelBg,borderRadius:11,padding:"9px 13px",marginBottom:16,border:`1px solid ${T.yelBo}`,display:"flex",gap:8,alignItems:"center"}}>
                <G n="clock" s={14} c={T.yel} w={2}/>
                <div>
                  <div style={{fontSize:"0.63rem",fontWeight:700,color:T.yel}}>DEADLINE / TIMING</div>
                  <div style={{fontSize:"0.69rem",color:T.text,marginTop:1}}>{schemeDetail.deadline}</div>
                </div>
              </div>
            )}

            <button
              onClick={()=>window.open(schemeDetail.url,"_blank")}
              style={{width:"100%",background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:14,padding:"14px",fontWeight:700,fontSize:"0.9rem",cursor:"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:9,boxShadow:"0 4px 20px rgba(22,163,74,0.35)",marginBottom:10}}>
              <G n="globe" s={16} c="#fff" w={2}/> Visit Official Website
            </button>
            <button onClick={()=>setSchemeDetail(null)} style={{width:"100%",background:"none",border:`1px solid ${T.border}`,borderRadius:13,padding:"12px",cursor:"pointer",fontWeight:600,fontSize:"0.82rem",fontFamily:"inherit",color:T.muted}}>Close</button>
          </div>
        </div>
      )}

      {/* Coming soon modal */}
      {csLabel&&(
        <div style={{position:"absolute",inset:0,background:"rgba(5,46,22,0.5)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:24}} onClick={()=>setCSLabel(null)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,borderRadius:22,padding:28,textAlign:"center",maxWidth:300,width:"100%",boxShadow:shM,animation:"popIn 0.2s ease",margin:"0 auto"}}>
            <div style={{display:"inline-flex",background:"#f0fdf4",borderRadius:"50%",padding:18,marginBottom:14}}><G n="star" s={28} c={T.green} w={2}/></div>
            <div style={{fontWeight:800,fontSize:"1.1rem",color:T.text,marginBottom:6}}>Coming Soon!</div>
            <div style={{fontSize:"0.78rem",color:T.text,fontWeight:600,marginBottom:6}}>{csLabel}</div>
            <div style={{fontSize:"0.7rem",color:T.muted,marginBottom:22,lineHeight:1.6}}>This feature is under development and will be available in the next version of KrishiVigil.ai</div>
            <PrimaryBtn onClick={()=>setCSLabel(null)} style={{padding:"12px 36px",fontSize:"0.9rem"}}>Got it</PrimaryBtn>
          </div>
        </div>
      )}

      {/* Language modal */}
      {showLang&&(
        <div style={{position:"absolute",inset:0,background:"rgba(5,46,22,0.45)",zIndex:200,display:"flex",alignItems:"flex-end",justifyContent:"center"}} onClick={()=>setShowLang(false)}>
          <div onClick={e=>e.stopPropagation()} style={{background:T.card,width:"100%",maxWidth:430,borderRadius:"18px 18px 0 0",padding:"16px 16px 22px",animation:"slideUp 0.22s ease"}}>
            <div style={{width:32,height:3,background:T.border,borderRadius:3,margin:"0 auto 12px"}}/>
            <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:4}}>
              <G n="globe" s={15} c={T.green} w={2}/>
              <div style={{fontWeight:700,fontSize:"0.88rem",color:T.text}}>Select Language</div>
              <span style={{marginLeft:"auto",fontSize:"0.6rem",color:T.muted,background:T.border2,borderRadius:8,padding:"2px 7px"}}>Coming soon</span>
            </div>
            <div style={{height:1,background:T.border2,margin:"10px 0"}}/>
            <div style={{display:"grid",gridTemplateColumns:"1fr 1fr",gap:7,marginBottom:12}}>
              {LANGS.map(l=>(
                <button key={l.s} onClick={()=>{setShowLang(false);cs(`${l.s} Language Support`);}} style={{background:"#f0fdf4",border:`1px solid ${T.border}`,borderRadius:10,padding:"8px 10px",cursor:"pointer",textAlign:"left",fontFamily:"inherit"}}>
                  <div style={{fontWeight:700,fontSize:"0.82rem",color:T.deep}}>{l.s}</div>
                  <div style={{fontSize:"0.57rem",color:T.muted,marginTop:1}}>{l.sub}</div>
                </button>
              ))}
            </div>
            <button onClick={()=>setShowLang(false)} style={{width:"100%",background:"#f9fafb",border:`1px solid ${T.border}`,borderRadius:10,padding:"9px",cursor:"pointer",fontWeight:600,fontSize:"0.78rem",fontFamily:"inherit",color:T.muted}}>Cancel</button>
          </div>
        </div>
      )}

      {/* Tour bubble */}
      {tourActive&&!tourDone&&page==="main"&&(
        <TourBubble step={TOUR_STEPS[tourStep]} onNext={advanceTour} onSkip={()=>{setTourActive(false);setTourDone(true);}}/>
      )}

      <style>{CSS}</style>
    </div>
  );
}

