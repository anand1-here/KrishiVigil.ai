import { useState } from 'react';
import { T } from '../theme/theme';
import { G, KVLogo } from '../icons/icons';

/* ════ LOGIN ════ */
export const LoginPage=({onLogin})=>{
  const [mobile,setMobile]=useState("");
  const [pass,setPass]=useState("");
  const [showPw,setShowPw]=useState(false);
  const [loading,setLoading]=useState(false);
  const [focused,setFocused]=useState(null);
  const [shake,setShake]=useState(false);
  const [isRegister,setIsRegister]=useState(false);
  const [regName,setRegName]=useState("");
  const [errMsg,setErrMsg]=useState("");
  const [successMsg,setSuccessMsg]=useState("");

  const API = "http://localhost:5000";

  const submit=async()=>{
    if(!mobile||!pass){setShake(true);setTimeout(()=>setShake(false),500);return;}
    if(isRegister&&!regName.trim()){setShake(true);setTimeout(()=>setShake(false),500);return;}
    setLoading(true); setErrMsg(""); setSuccessMsg("");
    try{
      const endpoint = isRegister ? `${API}/auth/register` : `${API}/auth/login`;
      const body = isRegister
        ? {name:regName.trim(), mobile_or_email:mobile.trim().toLowerCase(), password:pass}
        : {mobile_or_email:mobile.trim().toLowerCase(), password:pass};
      const res  = await fetch(endpoint,{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(body)});
      const data = await res.json();
      if(!res.ok){ setErrMsg(data.error||"Something went wrong"); setLoading(false); return; }
      // save token + user info to localStorage
      localStorage.setItem("kv_token", data.token);
      localStorage.setItem("kv_user",  JSON.stringify(data.user));
      setSuccessMsg(isRegister?"Account created! Signing you in...":"Welcome back!");
      setTimeout(()=>{ setLoading(false); onLogin(data.user); }, 800);
    }catch(e){
      setErrMsg("Cannot connect to server. Make sure backend is running.");
      setLoading(false);
    }
  };
  return(
    <div style={{minHeight:"100%",display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",background:"linear-gradient(170deg,#f0fdf4 0%,#dcfce7 35%,#bbf7d0 65%,#86efac 100%)",padding:"32px 24px",position:"relative",overflow:"hidden"}}>
      <div style={{position:"absolute",top:-100,right:-80,width:300,height:300,borderRadius:"50%",background:"rgba(34,197,94,0.07)",filter:"blur(55px)",pointerEvents:"none"}}/>
      <div style={{position:"absolute",bottom:-60,left:-60,width:240,height:240,borderRadius:"50%",background:"rgba(22,163,74,0.09)",filter:"blur(45px)",pointerEvents:"none"}}/>
      <div style={{textAlign:"center",marginBottom:38,animation:"fadeSlideDown 0.7s ease both"}}>
        <KVLogo size={84}/>
        <div style={{marginTop:18,marginBottom:3}}>
          <span style={{fontWeight:900,fontSize:"1.95rem",color:"#14532d",letterSpacing:"-0.6px"}}>KrishiVigil<span style={{color:"#16a34a"}}>.ai</span></span>
        </div>
        <div style={{color:"#15803d",fontSize:"0.7rem",letterSpacing:"3.5px",fontWeight:700,textTransform:"uppercase"}}>Smart Crop Protection</div>
        <div style={{width:44,height:2,background:"linear-gradient(90deg,transparent,#16a34a,transparent)",margin:"11px auto 0",borderRadius:2}}/>
      </div>
      <div style={{background:"#ffffff",borderRadius:26,padding:"30px 26px",width:"100%",maxWidth:364,border:"1px solid #bbf7d0",boxShadow:"0 12px 48px rgba(20,83,45,0.14)",animation:"fadeSlideUp 0.7s 0.15s ease both"}}>
        <div style={{color:"#14532d",fontWeight:800,fontSize:"1.15rem",marginBottom:3}}>{isRegister?"Create Account":"Welcome back"}</div>
        <div style={{color:"#6b7280",fontSize:"0.75rem",marginBottom:24}}>{isRegister?"Sign up to protect your crops":"Sign in to protect your crops"}</div>

        {/* Error message */}
        {errMsg&&(
          <div style={{background:"#fff5f5",border:"1px solid #fecaca",borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:"0.73rem",color:"#dc2626",fontWeight:600}}>
            ⚠️ {errMsg}
          </div>
        )}
        {/* Success message */}
        {successMsg&&(
          <div style={{background:"#f0fdf4",border:"1px solid #bbf7d0",borderRadius:10,padding:"10px 13px",marginBottom:14,fontSize:"0.73rem",color:"#16a34a",fontWeight:600}}>
            ✅ {successMsg}
          </div>
        )}

        {/* Name field — only for register */}
        {isRegister&&(
          <div style={{marginBottom:14}}>
            <label style={{color:"#374151",fontSize:"0.67rem",fontWeight:700,letterSpacing:"0.6px",display:"block",marginBottom:7}}>FULL NAME</label>
            <div style={{display:"flex",alignItems:"center",gap:10,background:focused==="n"?"#f0fdf4":"#f9fafb",borderRadius:13,padding:"13px 15px",border:`1.5px solid ${focused==="n"?"#16a34a":"#d1fae5"}`,transition:"all 0.2s",animation:shake&&!regName?"shakeX 0.4s ease":undefined}}>
              <G n="user" s={15} c={focused==="n"?"#16a34a":"#9ca3af"} w={2}/>
              <input type="text" placeholder="Your full name" value={regName} onChange={e=>setRegName(e.target.value)} onFocus={()=>setFocused("n")} onBlur={()=>setFocused(null)}
                style={{background:"none",border:"none",outline:"none",color:"#1f2937",fontSize:"0.86rem",flex:1,fontFamily:"inherit"}}/>
            </div>
          </div>
        )}

        <div style={{marginBottom:14}}>
          <label style={{color:"#374151",fontSize:"0.67rem",fontWeight:700,letterSpacing:"0.6px",display:"block",marginBottom:7}}>MOBILE NUMBER / EMAIL</label>
          <div style={{display:"flex",alignItems:"center",gap:10,background:focused==="m"?"#f0fdf4":"#f9fafb",borderRadius:13,padding:"13px 15px",border:`1.5px solid ${focused==="m"?"#16a34a":"#d1fae5"}`,transition:"all 0.2s",animation:shake&&!mobile?"shakeX 0.4s ease":undefined}}>
            <G n="phone" s={15} c={focused==="m"?"#16a34a":"#9ca3af"} w={2}/>
            <input type="text" placeholder="+91 98765 43210 or email" value={mobile} onChange={e=>setMobile(e.target.value)} onFocus={()=>setFocused("m")} onBlur={()=>setFocused(null)}
              style={{background:"none",border:"none",outline:"none",color:"#1f2937",fontSize:"0.86rem",flex:1,fontFamily:"inherit"}}/>
          </div>
        </div>
        <div style={{marginBottom:24}}>
          <label style={{color:"#374151",fontSize:"0.67rem",fontWeight:700,letterSpacing:"0.6px",display:"block",marginBottom:7}}>PASSWORD</label>
          <div style={{display:"flex",alignItems:"center",gap:10,background:focused==="p"?"#f0fdf4":"#f9fafb",borderRadius:13,padding:"13px 15px",border:`1.5px solid ${focused==="p"?"#16a34a":"#d1fae5"}`,transition:"all 0.2s"}}>
            <G n="lock" s={15} c={focused==="p"?"#16a34a":"#9ca3af"} w={2}/>
            <input type={showPw?"text":"password"} placeholder={isRegister?"Min 6 characters":"Enter your password"} value={pass} onChange={e=>setPass(e.target.value)} onFocus={()=>setFocused("p")} onBlur={()=>setFocused(null)} onKeyDown={e=>e.key==="Enter"&&submit()}
              style={{background:"none",border:"none",outline:"none",color:"#1f2937",fontSize:"0.86rem",flex:1,fontFamily:"inherit"}}/>
            <button onClick={()=>setShowPw(p=>!p)} style={{background:"none",border:"none",cursor:"pointer",padding:0,display:"flex"}}>
              <G n={showPw?"eyeoff":"eye"} s={14} c="#9ca3af" w={2}/>
            </button>
          </div>
          {!isRegister&&<div style={{textAlign:"right",marginTop:7}}><span style={{color:"#16a34a",fontSize:"0.69rem",cursor:"pointer",fontWeight:600}}>Forgot password?</span></div>}
        </div>
        <button onClick={submit} disabled={loading} style={{width:"100%",background:loading?"rgba(22,163,74,0.45)":`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",border:"none",borderRadius:14,padding:"15px",fontWeight:700,fontSize:"0.93rem",cursor:loading?"not-allowed":"pointer",fontFamily:"inherit",display:"flex",alignItems:"center",justifyContent:"center",gap:10,boxShadow:loading?"none":"0 6px 22px rgba(22,163,74,0.45)",transition:"all 0.2s"}}>
          {loading?(<><div style={{width:18,height:18,border:"2.5px solid rgba(255,255,255,0.3)",borderTopColor:"#fff",borderRadius:"50%",animation:"spin 0.7s linear infinite"}}/>{isRegister?"Creating account...":"Signing in..."}</>):(<>{isRegister?"Create Account":"Sign In"}<G n="arrow" s={16} c="#fff" w={2.5}/></>)}
        </button>
        <div style={{display:"flex",alignItems:"center",gap:10,margin:"18px 0"}}>
          <div style={{flex:1,height:1,background:"#e5e7eb"}}/><span style={{color:"#9ca3af",fontSize:"0.66rem",fontWeight:500}}>OR</span><div style={{flex:1,height:1,background:"#e5e7eb"}}/>
        </div>
        <button onClick={()=>{setIsRegister(r=>!r);setErrMsg("");setSuccessMsg("");}} style={{width:"100%",background:"#f9fafb",color:"#374151",border:"1.5px solid #d1fae5",borderRadius:14,padding:"13px",fontWeight:600,fontSize:"0.85rem",cursor:"pointer",fontFamily:"inherit",transition:"all 0.2s"}}>
          {isRegister?"Already have an account? Sign In":"Create new account"}
        </button>
      </div>
      <div style={{marginTop:22,color:"#374151",fontSize:"0.64rem",textAlign:"center",fontWeight:500,animation:"fadeSlideUp 0.7s 0.4s ease both"}}>Trusted by 10,000+ farmers across India</div>
    </div>
  );
};

