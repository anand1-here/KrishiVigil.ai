import { T, sh } from '../theme/theme';
import { G } from '../icons/icons';

export const Card=({children,style={}})=>(
  <div style={{background:T.card,borderRadius:18,padding:18,marginBottom:14,border:`1px solid ${T.border}`,boxShadow:sh,...style}}>{children}</div>
);
export const SLabel=({icon,children,color=T.deep})=>(
  <div style={{display:"flex",alignItems:"center",gap:7,marginBottom:12}}>
    <G n={icon} s={13} c={color} w={2.2}/>
    <span style={{fontWeight:700,fontSize:"0.68rem",color,textTransform:"uppercase",letterSpacing:"0.9px"}}>{children}</span>
  </div>
);
export const Badge=({children,bg,color,border})=>(
  <span style={{background:bg,color,border:`1px solid ${border}`,borderRadius:20,padding:"3px 11px",fontSize:"0.63rem",fontWeight:700,display:"inline-block",letterSpacing:"0.3px"}}>{children}</span>
);
export const ITile=({icon,size="sm",color="#fff"})=>{
  const sz=size==="sm"?30:size==="md"?38:46;
  const br=size==="sm"?10:size==="md"?12:14;
  return(<div style={{width:sz,height:sz,borderRadius:br,background:`linear-gradient(135deg,${T.deep},${T.green})`,display:"flex",alignItems:"center",justifyContent:"center",flexShrink:0,boxShadow:"0 2px 8px rgba(22,163,74,0.3)"}}><G n={icon} s={size==="sm"?14:size==="md"?18:20} c={color} w={2}/></div>);
};
export const PrimaryBtn=({children,onClick,style={}})=>(
  <button onClick={onClick} style={{display:"inline-flex",alignItems:"center",justifyContent:"center",gap:8,border:"none",cursor:"pointer",fontFamily:"inherit",fontWeight:700,background:`linear-gradient(135deg,${T.deep},${T.green})`,color:"#fff",borderRadius:13,padding:"12px 24px",fontSize:"0.85rem",boxShadow:"0 4px 14px rgba(22,163,74,0.38)",letterSpacing:"0.2px",...style}}>{children}</button>
);
