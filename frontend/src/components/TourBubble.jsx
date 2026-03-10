import { T } from '../theme/theme';
import { G, KVLogo } from '../icons/icons';
import { TOUR_STEPS } from '../constants/appData';
import { PrimaryBtn } from './UIComponents';

/* ════ TOUR BUBBLE ════ */
export const TourBubble=({step,onNext,onSkip})=>(
  <div style={{position:"absolute",inset:0,background:"rgba(0,0,0,0.45)",zIndex:500,display:"flex",alignItems:"center",justifyContent:"center",padding:24}}>
    <div style={{background:"#fff",borderRadius:24,padding:"26px 24px",maxWidth:320,width:"100%",boxShadow:"0 20px 60px rgba(0,0,0,0.25)",animation:"popIn 0.25s ease",border:`2px solid ${T.border}`}}>
      <div style={{display:"flex",gap:5,marginBottom:18,justifyContent:"center"}}>
        {TOUR_STEPS.map((_,i)=>(
          // @ts-ignore
          <div key={i} style={{width:i===TOUR_STEPS.indexOf(step)?20:7,height:7,borderRadius:4,background:i===TOUR_STEPS.indexOf(step)?T.green:T.border,transition:"all 0.3s"}}/>
        ))}
      </div>
      <div style={{display:"inline-flex",background:"#f0fdf4",borderRadius:16,padding:14,marginBottom:14}}><KVLogo size={42}/></div>
      <div style={{fontWeight:800,fontSize:"1rem",color:T.deep,marginBottom:8}}>{step.title}</div>
      <div style={{fontSize:"0.77rem",color:T.muted,lineHeight:1.6,marginBottom:20}}>{step.desc}</div>
      <PrimaryBtn onClick={onNext} style={{width:"100%",padding:"13px",fontSize:"0.9rem",marginBottom:10}}>{step.btn}</PrimaryBtn>
      {onSkip&&(<button onClick={onSkip} style={{width:"100%",background:"none",border:"none",color:T.muted,cursor:"pointer",fontSize:"0.72rem",fontFamily:"inherit",padding:"4px"}}>Skip demo — explore freely</button>)}
    </div>
  </div>
);

export const CSS=`
  @keyframes spin          { to{transform:rotate(360deg)} }
  @keyframes kvGlow        { 0%,100%{opacity:0.6;transform:scale(1)} 50%{opacity:1;transform:scale(1.12)} }
  @keyframes floatDot      { from{transform:translateY(0)} to{transform:translateY(-9px)} }
  @keyframes fadeSlideDown { from{opacity:0;transform:translateY(-20px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideUp   { from{opacity:0;transform:translateY(18px)} to{opacity:1;transform:translateY(0)} }
  @keyframes fadeSlideIn   { from{opacity:0;transform:translateY(-8px)} to{opacity:1;transform:translateY(0)} }
  @keyframes slideUp       { from{transform:translateY(100%)} to{transform:translateY(0)} }
  @keyframes popIn         { from{opacity:0;transform:scale(0.88)} to{opacity:1;transform:scale(1)} }
  @keyframes fadeIn        { from{opacity:0} to{opacity:1} }
  @keyframes shakeX        { 0%,100%{transform:translateX(0)} 20%,60%{transform:translateX(-7px)} 40%,80%{transform:translateX(7px)} }
  ::-webkit-scrollbar{width:0;height:0}
  input::placeholder{color:rgba(150,150,150,0.6)}
  input[type=number]::-webkit-inner-spin-button,input[type=number]::-webkit-outer-spin-button{-webkit-appearance:none}
`;
