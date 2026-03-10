// ═══════════════════════════════════════════════════════════
// COMPREHENSIVE GOVERNMENT SCHEMES DATABASE
// Real Indian agricultural schemes with full details
// Eligibility is computed dynamically based on crop+loss+state
// ═══════════════════════════════════════════════════════════

export const SCHEMES = [
  // ── CENTRAL SCHEMES ──────────────────────────────────────
  {
    id:"pmfby", name:"PM Fasal Bima Yojana", icon:"shield", state:"Central",
    ministry:"Ministry of Agriculture & Farmers Welfare",
    benefit:"Up to ₹2,00,000 crop insurance coverage",
    eligCriteria:"Any farmer with land record, crop loss > 25%",
    eligFn:(crop,loss,state)=> loss > 25000,
    documents:["Aadhaar Card","Land record (Khasra/Patwari copy)","Bank passbook","Crop sowing certificate","Loss assessment report"],
    howToApply:["Visit nearest Common Service Centre (CSC) or bank","Fill PMFBY application form","Attach all documents listed","Premium: Rabi 1.5%, Kharif 2%, Horticulture 5%","Claim filed within 72 hours of loss event"],
    link:"pmfby.gov.in", url:"https://pmfby.gov.in",
    deadline:"Within season — check state notification",
  },
  {
    id:"pmkisan", name:"PM Kisan Samman Nidhi", icon:"leaf", state:"Central",
    ministry:"Ministry of Agriculture & Farmers Welfare",
    benefit:"₹6,000 per year (₹2,000 every 4 months) direct cash",
    eligCriteria:"All land-holding farmers with cultivable land",
    eligFn:(crop,loss,state)=> true,
    documents:["Aadhaar Card","Bank account linked to Aadhaar","Land ownership documents","Mobile number"],
    howToApply:["Visit pmkisan.gov.in or nearest CSC","Self-registration or through village patwari","Link Aadhaar to bank account first","Check status on PM Kisan portal after 2 weeks"],
    link:"pmkisan.gov.in", url:"https://pmkisan.gov.in",
    deadline:"Ongoing — register anytime",
  },
  {
    id:"kcc", name:"Kisan Credit Card (KCC)", icon:"activity", state:"Central",
    ministry:"Ministry of Finance / NABARD",
    benefit:"Credit up to ₹3,00,000 at 4% interest per year",
    eligCriteria:"Farmer with land, crop loan need, or livestock",
    eligFn:(crop,loss,state)=> true,
    documents:["Aadhaar Card","Land documents","Photograph","Bank account","Income proof if applicable"],
    howToApply:["Apply at nearest bank branch (SBI, PNB, Co-op bank)","Fill KCC application form","Submit land records as collateral","Card issued within 2 weeks","Renew annually — valid for 5 years"],
    link:"nabard.org/kcc", url:"https://www.nabard.org/content1.aspx?id=571",
    deadline:"Ongoing — apply anytime at bank",
  },
  {
    id:"pmksy", name:"PMKSY — Drip Irrigation Subsidy", icon:"drop", state:"Central",
    ministry:"Ministry of Jal Shakti",
    benefit:"55% subsidy (75% for small/marginal farmers) on drip/sprinkler",
    eligCriteria:"Farmer planning irrigation upgrade, land holding > 0.5 acre",
    eligFn:(crop,loss,state)=> true,
    documents:["Aadhaar Card","Land records","Bank account","Quotation from approved vendor","Farmer registration ID"],
    howToApply:["Register on PMKSY portal or visit nearest agriculture office","Get quotation from PMKSY-approved vendor","Apply with documents to district agriculture office","Subsidy released after installation verification"],
    link:"pmksy.gov.in", url:"https://pmksy.gov.in",
    deadline:"Season-wise applications — check state portal",
  },
  {
    id:"shc", name:"Soil Health Card Scheme", icon:"sprout", state:"Central",
    ministry:"Department of Agriculture & Farmers Welfare",
    benefit:"Free soil testing + personalised fertiliser recommendation card",
    eligCriteria:"Any farmer — especially if disease detected in crop",
    eligFn:(crop,loss,state)=> true,
    documents:["Aadhaar Card","Land records or farmer ID","Mobile number for card delivery"],
    howToApply:["Contact nearest Krishi Vigyan Kendra (KVK)","Collect soil sample as per guidelines (15cm depth)","Submit to district soil testing laboratory","Receive Soil Health Card in 2-3 weeks","Follow nutrient recommendations on card"],
    link:"soilhealth.dac.gov.in", url:"https://soilhealth.dac.gov.in",
    deadline:"Ongoing — every 2 years per plot",
  },
  {
    id:"pkvy", name:"Paramparagat Krishi Vikas Yojana", icon:"leaf", state:"Central",
    ministry:"Ministry of Agriculture & Farmers Welfare",
    benefit:"₹50,000 per hectare for 3 years for organic farming transition",
    eligCriteria:"Farmer willing to switch to organic farming practices",
    eligFn:(crop,loss,state)=> true,
    documents:["Aadhaar Card","Land records","Farmer group registration (cluster of 50 farmers)","Bank account"],
    howToApply:["Form cluster of at least 50 farmers in your village","Register with district agriculture officer","Training provided by ICAR/KVK","Funds released in 3 instalments over 3 years"],
    link:"pgsindia.net", url:"https://pgsindia-ncof.gov.in/pkvy/index.aspx",
    deadline:"Check state agriculture department notification",
  },
  {
    id:"agriinfra", name:"Agriculture Infrastructure Fund", icon:"activity", state:"Central",
    ministry:"Ministry of Agriculture & Farmers Welfare",
    benefit:"Loan up to ₹2 crore at 3% interest subsidy for farm infrastructure",
    eligCriteria:"Farmer building storage, cold chain, or processing unit",
    eligFn:(crop,loss,state)=> false,
    documents:["Project report","Land documents","Aadhaar","Bank account","Business registration if applicable"],
    howToApply:["Apply on agriinfra.dac.gov.in portal","Submit project DPR (Detailed Project Report)","Bank evaluates and sanctions loan","3% interest subvention for 7 years","Credit guarantee available under CGTMSE"],
    link:"agriinfra.dac.gov.in", url:"https://agriinfra.dac.gov.in",
    deadline:"Ongoing — rolling applications",
  },
  // ── PUNJAB ───────────────────────────────────────────────
  {
    id:"pb_karjmafi", name:"Punjab Karz Mafi Scheme", icon:"map", state:"Punjab",
    ministry:"Punjab State Government — Agriculture Dept",
    benefit:"Debt relief up to ₹2,00,000 for small/marginal farmers",
    eligCriteria:"Punjab farmer, land < 5 acres, crop loan from bank",
    eligFn:(crop,loss,state)=> state&&state.toLowerCase().includes("punjab"),
    documents:["Aadhaar Card","Punjab domicile certificate","Land records (Fard)","Bank loan documents","Crop failure certificate from patwari"],
    howToApply:["Visit nearest Punjab Agriculture office","Fill Karz Mafi application form","Attach bank loan documents and land records","Verification by patwari within 30 days","Amount credited to bank account directly"],
    link:"punjab.gov.in", url:"https://punjab.gov.in",
    deadline:"Check Punjab government circular for current year",
  },
  {
    id:"pb_fsa", name:"Punjab Fasal Bima Sahayata", icon:"shield", state:"Punjab",
    ministry:"Punjab State Agriculture Department",
    benefit:"Ex-gratia up to ₹12,000 per acre for crop loss > 50%",
    eligCriteria:"Punjab farmer, crop loss > 50% verified by girdawari",
    eligFn:(crop,loss,state)=> state&&state.toLowerCase().includes("punjab") && loss > 50000,
    documents:["Aadhaar Card","Fard (land record)","Crop sowing report","Girdawari report from patwari","Bank account"],
    howToApply:["Report crop loss to patwari within 72 hours","Patwari conducts girdawari (field verification)","Application submitted through patwari","Amount released by BDPO office","Check status on Punjab agriculture portal"],
    link:"agripb.gov.in", url:"https://www.agripb.gov.in",
    deadline:"Report within 72 hours of crop loss",
  },
  // ── HARYANA ──────────────────────────────────────────────
  {
    id:"hr_bhavantar", name:"Haryana Bhavantar Bharpai Yojana", icon:"rupee", state:"Haryana",
    ministry:"Haryana Agriculture Department",
    benefit:"Price difference compensation when market < MSP",
    eligCriteria:"Haryana farmer selling crops below MSP — 20 notified crops",
    eligFn:(crop,loss,state)=> state&&state.toLowerCase().includes("haryana"),
    documents:["Meri Fasal Mera Byora registration","Aadhaar Card","Bank account","Pariwar Pehchaan Patra (PPP)","Crop sale receipt"],
    howToApply:["Register on Meri Fasal Mera Byora portal first","List crop and area at time of sowing","Sell at APMC mandi or e-NAM platform","Compensation auto-credited within 15 days","Check status on fasal.haryana.gov.in"],
    link:"fasal.haryana.gov.in", url:"https://fasal.haryana.gov.in",
    deadline:"Register before sowing season",
  },
  {
    id:"hr_mukhyamantri", name:"Haryana Mukhyamantri Bagwani Bima Yojana", icon:"shield", state:"Haryana",
    ministry:"Haryana Horticulture Department",
    benefit:"₹30,000-40,000 per acre insurance for horticulture crops",
    eligCriteria:"Haryana farmer growing fruits/vegetables/spices",
    eligFn:(crop,loss,state)=>{
      const hortCrops = ["tomato","potato","onion","chilli","brinjal","cauliflower","cabbage","apple","grape","mango","banana","strawberry"];
      return state&&state.toLowerCase().includes("haryana") && hortCrops.some(c=>crop.toLowerCase().includes(c));
    },
    documents:["Aadhaar Card","PPP ID","Land records","Crop registration on portal","Bank account"],
    howToApply:["Register on hortharyana.gov.in portal","Pay nominal premium of ₹750-1000/acre","Crop damage assessed by district officer","Claim processed within 45 days of application"],
    link:"hortharyana.gov.in", url:"https://hortharyana.gov.in",
    deadline:"Register before crop season begins",
  },
  // ── UTTAR PRADESH / BIHAR ─────────────────────────────────
  {
    id:"up_krishak", name:"UP Krishak Durghatna Kalyan Yojana", icon:"shield", state:"UP",
    ministry:"UP Agriculture Department",
    benefit:"₹5,00,000 insurance for farmer accidents, ₹2,500 for crop loss",
    eligCriteria:"UP farmer aged 18-70 with land records",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("uttar") || state.toLowerCase().includes("up")),
    documents:["Aadhaar Card","Land records (Khatauni)","Bank account","UP Kisan registration ID"],
    howToApply:["Register on upagriculture.com portal","District agriculture officer enrollment","Premium paid by UP state government","Crop loss claim through tehsil office"],
    link:"upagriculture.com", url:"https://upagriculture.com",
    deadline:"Register annually before Kharif/Rabi season",
  },
  {
    id:"bihar_fsa", name:"Bihar Rajya Fasal Sahayata Yojana", icon:"shield", state:"Bihar",
    ministry:"Bihar Co-operative Department",
    benefit:"₹7,500/hectare (loss 20-30%) or ₹10,000/hectare (loss > 30%)",
    eligCriteria:"Bihar farmer with crop loss > 20%, registered on portal",
    eligFn:(crop,loss,state)=> state&&state.toLowerCase().includes("bihar") && loss > 20000,
    documents:["Aadhaar Card","Bihar land records (LPC)","Bank account (DBT enabled)","Self-declaration of crop loss","Mobile number linked to Aadhaar"],
    howToApply:["Register on pacsonline.bih.nic.in before crop season","Declare crop and area at sowing time","Report loss online within 7 days of event","Verification by agriculture officer","Amount directly credited to bank account"],
    link:"pacsonline.bih.nic.in", url:"https://pacsonline.bih.nic.in/bfsa",
    deadline:"Register before sowing — report loss within 7 days",
  },
  // ── MAHARASHTRA / GUJARAT ─────────────────────────────────
  {
    id:"mh_namo", name:"Maharashtra Namo Shetkari Yojana", icon:"leaf", state:"Maharashtra",
    ministry:"Maharashtra State Government",
    benefit:"₹6,000/year additional income support (₹500/month) directly",
    eligCriteria:"Maharashtra farmer registered on MahaDBT portal",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("maharashtra") || state.toLowerCase().includes("maha")),
    documents:["Aadhaar Card","Maharashtra 7/12 extract (Satbara)","Bank account","Mobile number","MahaDBT registration"],
    howToApply:["Register on mahadbt.maharashtra.gov.in","Submit Satbara and bank details","Verification by Talathi (village revenue officer)","₹2,000 per instalment, 3 instalments per year","Check status on MahaDBT portal"],
    link:"mahadbt.maharashtra.gov.in", url:"https://mahadbt.maharashtra.gov.in",
    deadline:"Ongoing — register on MahaDBT anytime",
  },
  {
    id:"gj_ikhedut", name:"Gujarat iKhedut Portal Schemes", icon:"sprout", state:"Gujarat",
    ministry:"Gujarat Agriculture Department",
    benefit:"Multiple subsidies — drip irrigation, seeds, equipment up to 50%",
    eligCriteria:"Gujarat farmer with registered land",
    eligFn:(crop,loss,state)=> state&&state.toLowerCase().includes("gujarat"),
    documents:["Aadhaar Card","8-A land record","Bank account","Gujarat farmer ID","Quotation from approved supplier"],
    howToApply:["Register on ikhedut.gujarat.gov.in portal","Select applicable scheme from 50+ options","Upload documents online","District agriculture officer verification","Subsidy DBT to bank account"],
    link:"ikhedut.gujarat.gov.in", url:"https://ikhedut.gujarat.gov.in",
    deadline:"Scheme-wise deadlines — check iKhedut portal",
  },
  // ── RAJASTHAN / MP ────────────────────────────────────────
  {
    id:"rj_tarbandi", name:"Rajasthan Tarbandi Yojana", icon:"shield", state:"Rajasthan",
    ministry:"Rajasthan Agriculture Department",
    benefit:"50% subsidy (max ₹40,000) for fencing to protect crop from animals",
    eligCriteria:"Rajasthan farmer, land > 0.5 hectare",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("rajasthan") || state.toLowerCase().includes("raj")),
    documents:["Aadhaar Card","Rajasthan Jamabandi (land record)","Bank account","Jan Aadhaar card","Quotation from wire/fencing supplier"],
    howToApply:["Apply on rajkisan.gov.in portal","Offline at nearest agriculture office","Submit land documents and quotation","Work order issued after approval","Subsidy after completion and inspection"],
    link:"rajkisan.gov.in", url:"https://rajkisan.gov.in",
    deadline:"Check annual notification on Raj Kisan portal",
  },
  {
    id:"mp_bhavantar", name:"MP Bhavantar Bhugtan Yojana", icon:"rupee", state:"MP",
    ministry:"MP Agriculture Department",
    benefit:"Price support when market price < MSP for notified crops",
    eligCriteria:"MP farmer selling to registered mandi, crop in notified list",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("madhya pradesh") || state.toLowerCase().includes("mp") || state.toLowerCase().includes("madhya")),
    documents:["Aadhaar Card","MP land records","Mandi receipts","Bank account (DBT enabled)","MP Kisan registration"],
    howToApply:["Register on mpfasal.b40.in portal","Register crop at e-Uparjan centre","Sell at APMC mandi","Difference between MSP and market price auto-credited","Check status on portal"],
    link:"mpfasal.b40.in", url:"http://mpfasal.nic.in",
    deadline:"Register before selling season",
  },
  // ── AP / TELANGANA / KARNATAKA ────────────────────────────
  {
    id:"ts_rythu", name:"Telangana Rythu Bandhu Scheme", icon:"leaf", state:"Telangana",
    ministry:"Telangana Agriculture Department",
    benefit:"₹10,000 per acre per season (₹5,000 Kharif + ₹5,000 Rabi) direct",
    eligCriteria:"Telangana farmer with land records (Pahani/Pattadar Passbook)",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("telangana") || state.toLowerCase().includes("ts")),
    documents:["Aadhaar Card","Pattadar Passbook","Bank account","Mobile number","Land Pahani document"],
    howToApply:["Automatic — based on Dharani land records","No application needed if Pattadar Passbook updated","Ensure Aadhaar linked to Pattadar Passbook","Amount credited before each season","Check on ts.meeseva.gov.in"],
    link:"ts.meeseva.gov.in", url:"https://ts.meeseva.gov.in",
    deadline:"Automatic disbursement — ensure records updated",
  },
  {
    id:"ap_ryutu", name:"AP YSR Rythu Bharosa", icon:"leaf", state:"AP",
    ministry:"AP Agriculture Department",
    benefit:"₹13,500 per year (₹12,500 farmers + ₹1,000 farm labourers) direct",
    eligCriteria:"AP farmer with land record, annual income < ₹5 lakh",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("andhra") || state.toLowerCase().includes("ap")),
    documents:["Aadhaar Card","Adangal/Pahani record","Bank account","Income certificate","Mobile number"],
    howToApply:["Register at village secretariat or e-Seva centre","Link Aadhaar to bank account","Verification by VRO (Village Revenue Officer)","3 instalments per year credited directly","Check on apfarms.ap.gov.in"],
    link:"apfarms.ap.gov.in", url:"https://apfarms.ap.gov.in",
    deadline:"Register at village secretariat — ongoing",
  },
  {
    id:"ka_raita", name:"Karnataka Raita Siri Scheme", icon:"shield", state:"Karnataka",
    ministry:"Karnataka Agriculture Department",
    benefit:"₹5,000 per hectare for crop loss due to natural calamity",
    eligCriteria:"Karnataka farmer, crop loss due to drought/flood/disease verified",
    eligFn:(crop,loss,state)=> state&&(state.toLowerCase().includes("karnataka") || state.toLowerCase().includes("ka")),
    documents:["Aadhaar Card","RTC (Record of Rights, Tenancy and Crops)","Bank account","Crop loss verification by Amildar/Tahsildar","Mobile number"],
    howToApply:["Report loss to nearest Amildar office within 15 days","Inspection by agriculture officer","Fill form online at sevasindhu.karnataka.gov.in","Verification takes 30-45 days","Amount credited to Aadhaar-linked bank account"],
    link:"sevasindhu.karnataka.gov.in", url:"https://sevasindhu.karnataka.gov.in",
    deadline:"Report loss within 15 days of occurrence",
  },
];

// Helper: get state from weather location string
export const getStateFromLocation = (location="") => {
  const l = location.toLowerCase();
  if(l.includes("punjab") || l.includes("ludhiana") || l.includes("amritsar") || l.includes("jalandhar")) return "Punjab";
  if(l.includes("haryana") || l.includes("gurugram") || l.includes("hisar") || l.includes("rohtak")) return "Haryana";
  if(l.includes("uttar pradesh") || l.includes("lucknow") || l.includes("kanpur") || l.includes("agra")) return "UP";
  if(l.includes("bihar") || l.includes("patna") || l.includes("gaya")) return "Bihar";
  if(l.includes("maharashtra") || l.includes("mumbai") || l.includes("pune") || l.includes("nagpur")) return "Maharashtra";
  if(l.includes("gujarat") || l.includes("ahmedabad") || l.includes("surat") || l.includes("vadodara")) return "Gujarat";
  if(l.includes("rajasthan") || l.includes("jaipur") || l.includes("jodhpur") || l.includes("udaipur")) return "Rajasthan";
  if(l.includes("madhya pradesh") || l.includes("bhopal") || l.includes("indore") || l.includes("gwalior")) return "MP";
  if(l.includes("telangana") || l.includes("hyderabad") || l.includes("warangal")) return "Telangana";
  if(l.includes("andhra") || l.includes("vijayawada") || l.includes("vishakhapatnam")) return "AP";
  if(l.includes("karnataka") || l.includes("bangalore") || l.includes("mysore") || l.includes("hubli")) return "Karnataka";
  return "Central";
};

// Filter chips for schemes page
export const SCHEME_FILTERS = ["All", "Central", "Punjab / Haryana", "UP / Bihar", "Maharashtra / Gujarat", "Rajasthan / MP", "AP / Telangana / Karnataka"];