export const LANGS=[
  {s:"हिंदी",sub:"Hindi · UP, MP, Rajasthan"},{s:"ਪੰਜਾਬੀ",sub:"Punjabi · Punjab, Haryana"},
  {s:"मैथिली",sub:"Maithili · Bihar"},{s:"मराठी",sub:"Marathi · Maharashtra"},
  {s:"తెలుగు",sub:"Telugu · Andhra, Telangana"},{s:"ಕನ್ನಡ",sub:"Kannada · Karnataka"},
  {s:"தமிழ்",sub:"Tamil · Tamil Nadu"},{s:"বাংলা",sub:"Bengali · West Bengal"},
];

export const STEPS=[
  {icon:"camera",title:"Upload Any Crop Image",desc:"Leaf, fruit, stem — any visible symptom works"},
  {icon:"zap",title:"AI Analysis in <3s",desc:"EfficientNetB3 PlantVillage model runs inference instantly"},
  {icon:"drop",title:"Live Weather Check",desc:"GPS-based field risk assessment from OpenWeatherMap"},
  {icon:"rupee",title:"Exact ₹Loss Estimate",desc:"Calculated with your crop, land & state MSP"},
  {icon:"shield",title:"Government Schemes",desc:"Auto-matched schemes you qualify for"},
];

export const TOUR_STEPS = [
  { title: "Welcome to KrishiVigil.ai", desc: "AI-powered crop protection. One image = complete farm report.", btn: "Start Tour" },
  { title: "Step 1 — Login", desc: "Sign in with any credentials to continue.", btn: "Go to Login", action: "login" },
  { title: "Step 2 — Live Weather", desc: "GPS detects your location. Live weather loads from OpenWeatherMap API.", btn: "See Home", action: "home" },
  { title: "Step 3 — Upload Image", desc: "Tap the upload zone to select your crop leaf image.", btn: "Try Upload", action: "upload" },
  { title: "Step 4 — AI Results", desc: "See live AI output: disease, health score, urgency, advice — all dynamic.", btn: "See Results", action: "results" },
  { title: "Step 5 — Schemes", desc: "Government schemes matched to your crop loss automatically.", btn: "See Schemes", action: "schemes" },
  { title: "All Done!", desc: "KrishiVigil.ai — One image. Complete crop protection.", btn: "Explore Freely" },
];