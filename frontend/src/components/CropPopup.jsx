import { useState } from 'react';
import { T, shM } from '../theme/theme';
import { G } from '../icons/icons';
import { getMSP } from '../constants/msp';
import { PrimaryBtn } from './UIComponents';

/* ════ CROP POPUP ════ */
export const CropPopup=({onSubmit})=>{

  const [crop,setCrop]=useState("");
  const [land,setLand]=useState("");
  const [focused,setFocused]=useState(null);
  const [err,setErr]=useState(false);
  const crops=["Tomato","Potato","Wheat","Rice","Maize","Onion","Soybean","Cotton","Mustard","Chilli","Brinjal","Cauliflower"];
  const submit=()=>{
    if(!crop.trim()||!land){setErr(true);setTimeout(()=>setErr(false),600);return;}
    onSubmit({crop:crop.trim(),land:parseFloat(land)});
  };
  return(
    <div style={{position:"absolute",inset:0,background:"rgba(5,46,22,0.55)",zIndex:400,display:"flex",alignItems:"center",justifyContent:"center",padding:20,backdropFilter:"blur(4px)"}}>
      <div style={{background:"#fff",borderRadius:24,padding:28,width:"100%",maxWidth:360,boxShadow:shM,animation:"popIn 0.25s ease",border:`1px solid ${T.border}`}}>
        <div style={{display:"flex",alignItems:"center",gap:12,marginBottom:6}}>
          <div style={{background:`linear-gradient(135deg,${T.deep},${T.green})`,borderRadius:14,width:46,height:46,display:"flex",alignItems:"center",justifyContent:"center",boxShadow:"0 4px 12px rgba(22,163,74,0.35)"}}><G n="wheat" s={22} c="#fff" w={2}/></div>
          <div>
            <div style={{fontWeight:800,fontSize:"1.05rem",color:T.deep}}>Your Farm Details</div>
            <div style={{fontSize:"0.7rem",color:T.muted,marginTop:2}}>Used by AI for accurate crop-specific analysis</div>
          </div>
        </div>
        <div style={{height:1,background:T.border2,margin:"16px 0"}}/>
        <div style={{marginBottom:14}}>
          <label style={{fontSize:"0.66rem",fontWeight:700,color:T.deep,letterSpacing:"0.5px",display:"block",marginBottom:7}}>CROP NAME</label>
          <div style={{display:"flex",alignItems:"center",gap:8,background:focused==="c"?"#f0fdf4":"#f9fafb",borderRadius:12,padding:"11px 14px",border:`1.5px solid ${focused==="c"?T.green:T.border}`,transition:"all 0.2s",animation:err&&!crop?"shakeX 0.4s ease":undefined}}>
            <G n="leaf" s={14} c={focused==="c"?T.green:T.muted} w={2}/>
            <input type="text" placeholder="e.g. Tomato, Wheat, Rice..." value={crop} onChange={e=>setCrop(e.target.value)} onFocus={()=>setFocused("c")} onBlur={()=>setFocused(null)}
              style={{background:"none",border:"none",outline:"none",color:T.text,fontSize:"0.88rem",flex:1,fontFamily:"inherit"}}/>
          </div>
          <div style={{display:"flex",gap:5,flexWrap:"wrap",marginTop:8}}>
            {crops.slice(0,6).map(c=>(
              <button key={c} onClick={()=>setCrop(c)} style={{background:crop===c?T.green:T.border2,color:crop===c?"#fff":T.deep,border:`1px solid ${crop===c?T.green:T.border}`,borderRadius:20,padding:"4px 10px",fontSize:"0.65rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{c}</button>
            ))}
          </div>
          {crop&&(
            <div style={{marginTop:8,background:"#f0fdf4",borderRadius:10,padding:"8px 12px",display:"flex",alignItems:"center",gap:7,border:`1px solid ${T.border}`}}>
              <G n="rupee" s={12} c={T.green} w={2.5}/>
              <span style={{fontSize:"0.7rem",color:T.deep,fontWeight:600}}>MSP: ₹{(getMSP(crop)/100).toFixed(2)}/kg <span style={{color:T.muted,fontWeight:400}}>({crop})</span></span>
            </div>
          )}
        </div>
        <div style={{marginBottom:22}}>
          <label style={{fontSize:"0.66rem",fontWeight:700,color:T.deep,letterSpacing:"0.5px",display:"block",marginBottom:7}}>LAND SIZE (ACRES)</label>
          <div style={{display:"flex",alignItems:"center",gap:8,background:focused==="l"?"#f0fdf4":"#f9fafb",borderRadius:12,padding:"11px 14px",border:`1.5px solid ${focused==="l"?T.green:T.border}`,transition:"all 0.2s",animation:err&&!land?"shakeX 0.4s ease":undefined}}>
            <G n="map" s={14} c={focused==="l"?T.green:T.muted} w={2}/>
            <input type="number" placeholder="e.g. 2.5" value={land} onChange={e=>setLand(e.target.value)} onFocus={()=>setFocused("l")} onBlur={()=>setFocused(null)} min="0.1" step="0.1"
              style={{background:"none",border:"none",outline:"none",color:T.text,fontSize:"0.88rem",flex:1,fontFamily:"inherit"}}/>
            <span style={{fontSize:"0.72rem",color:T.muted,fontWeight:500}}>acres</span>
          </div>
          <div style={{display:"flex",gap:5,marginTop:8}}>
            {["0.5","1","2","3","5","10"].map(v=>(
              <button key={v} onClick={()=>setLand(v)} style={{background:land===v?T.green:T.border2,color:land===v?"#fff":T.deep,border:`1px solid ${land===v?T.green:T.border}`,borderRadius:20,padding:"4px 9px",fontSize:"0.65rem",fontWeight:600,cursor:"pointer",fontFamily:"inherit",transition:"all 0.15s"}}>{v}</button>
            ))}
          </div>
        </div>
        <PrimaryBtn onClick={submit} style={{width:"100%",fontSize:"0.9rem",padding:"14px"}}>
          <G n="arrow" s={16} c="#fff" w={2}/> Proceed to Analysis
        </PrimaryBtn>
      </div>
    </div>
  );
};

