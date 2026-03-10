import { T } from '../theme/theme';

/* ════ TIER COLOR HELPER ════ */
export const tierStyle = (color) => {
  if (color === "red")    return {bg:T.redBg, bo:T.redBo, c:T.red};
  if (color === "yellow") return {bg:T.yelBg, bo:T.yelBo, c:T.yel};
  if (color === "blue")   return {bg:T.bluBg, bo:T.bluBo, c:T.blu};
  return {bg:"#f0fdf4", bo:T.border, c:T.green};
};

export const fungicideColor = (type) => {
  if (type === "Systemic")    return {c:T.blu,  bg:T.bluBg,  bo:T.bluBo};
  if (type === "Bio")         return {c:T.green,bg:"#f0fdf4", bo:T.border};
  if (type === "Insecticide") return {c:"#7c3aed",bg:"#f5f3ff",bo:"#ddd6fe"};
  if (type === "Bactericide") return {c:"#0891b2",bg:"#ecfeff",bo:"#a5f3fc"};
  if (type === "Acaricide")   return {c:"#d97706",bg:T.yelBg,  bo:T.yelBo};
  return                             {c:T.red,  bg:T.redBg,  bo:T.redBo};
};

