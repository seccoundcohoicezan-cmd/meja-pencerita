/** Kartu karakter 1080 × 1920 (dipakai halaman GM, portal pemain, dan link kartu lama). */
// @ts-nocheck -- kode canvas lama yang sudah teruji; tipe data kartu dijelaskan di CardData.
import { ABILS } from './skills';
import { clamp, num, fmtMod } from './util';

export interface CardData {
  v: number; g: string; gn: string; acc: string; tn: string; tp: string; nama: string; kelas: string; senjata: string; dadu: string;
  bonus: string; nyawa: number; dasar: string; sk: { n: string; e: string }; sp: { n: string; b: number; e: string };
  sf: [string, string] | null; gf: [string, string][]; kep: string; ab?: number[] | null; pb?: number; pp?: number | null; kc?: string;
  sks?: [string, string, number, number][] | null;
}
export function loadImg(src: string): Promise<HTMLImageElement> {
  return new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = () => rej(new Error('gambar tidak bisa dibaca')); i.src = src; });
}
export function wrapText(x,text,maxW){const out=[];String(text||'').split('\n').forEach(par=>{const words=par.split(/\s+/).filter(Boolean);let line='';
  words.forEach(w=>{const t=line?line+' '+w:w;if(x.measureText(t).width>maxW&&line){out.push(line);line=w}else line=t});if(line)out.push(line)});return out}
export function heart(x,cx,cy,r,fill){x.save();x.beginPath();x.moveTo(cx,cy+r*.9);x.bezierCurveTo(cx-r*1.6,cy-r*.1,cx-r*.9,cy-r*1.3,cx,cy-r*.45);x.bezierCurveTo(cx+r*.9,cy-r*1.3,cx+r*1.6,cy-r*.1,cx,cy+r*.9);x.closePath();x.fillStyle=fill;x.fill();x.restore()}
export function rrect(x,X,Y,w,h,r){x.beginPath();x.moveTo(X+r,Y);x.arcTo(X+w,Y,X+w,Y+h,r);x.arcTo(X+w,Y+h,X,Y+h,r);x.arcTo(X,Y+h,X,Y,r);x.arcTo(X,Y,X+w,Y,r);x.closePath()}
export function fitFont(x,text,maxW,start,min,tpl){let f=start;x.font=tpl(f);while(x.measureText(text).width>maxW&&f>min){f-=2;x.font=tpl(f)}return f}
export async function drawCard(cd,photo){const CW2=1080,CH=1920,M=56,acc=cd.acc||'#d9a441';const hasAb=!!(cd.ab&&cd.sks);const PH=hasAb?700:980;
  const c=document.createElement('canvas');c.width=CW2;c.height=CH;const x=c.getContext('2d');
  const SERIF='Georgia, "Times New Roman", serif',SANS='"Segoe UI", Arial, sans-serif';
  x.fillStyle='#14100c';x.fillRect(0,0,CW2,CH);
  /* foto / inisial */
  if(photo){try{const img=await loadImg(photo);const sc=Math.max(CW2/img.width,PH/img.height);const w=img.width*sc,h=img.height*sc;x.save();x.beginPath();x.rect(0,0,CW2,PH);x.clip();x.drawImage(img,(CW2-w)/2,Math.min(0,(PH-h)*.3),w,h);x.restore()}catch(e){photo=null}}
  if(!photo){const g=x.createRadialGradient(CW2/2,PH*.45,40,CW2/2,PH*.45,760);g.addColorStop(0,acc+'55');g.addColorStop(1,'#14100c');x.fillStyle=g;x.fillRect(0,0,CW2,PH);
    x.fillStyle=acc+'aa';x.font=`bold ${hasAb?320:420}px ${SERIF}`;x.textAlign='center';x.textBaseline='middle';x.fillText((cd.nama||'?').trim().charAt(0).toUpperCase(),CW2/2,PH*.42);x.textAlign='left';x.textBaseline='alphabetic'}
  const gr=x.createLinearGradient(0,PH-460,0,PH+10);gr.addColorStop(0,'rgba(20,16,12,0)');gr.addColorStop(.7,'rgba(20,16,12,.85)');gr.addColorStop(1,'rgba(20,16,12,1)');x.fillStyle=gr;x.fillRect(0,PH-460,CW2,470);
  const tg=x.createLinearGradient(0,0,0,220);tg.addColorStop(0,'rgba(0,0,0,.55)');tg.addColorStop(1,'rgba(0,0,0,0)');x.fillStyle=tg;x.fillRect(0,0,CW2,220);
  x.font=`bold 30px ${SANS}`;const gl=(cd.gn||'').toUpperCase();const gw=x.measureText(gl).width+44;rrect(x,M,M,gw,58,29);x.fillStyle=acc;x.fill();x.fillStyle='#14100c';x.fillText(gl,M+22,M+40);
  x.font=`600 26px ${SANS}`;x.fillStyle='rgba(255,255,255,.85)';x.textAlign='right';x.fillText('KARTU KARAKTER',CW2-M,M+38);x.textAlign='left';
  /* nama & kelas */
  const nf=fitFont(x,cd.nama||'',CW2-2*M,hasAb?96:104,52,f=>`bold ${f}px ${SERIF}`);
  x.fillStyle='#fff';x.shadowColor='rgba(0,0,0,.6)';x.shadowBlur=18;x.fillText(cd.nama||'',M,PH-(hasAb?96:120));x.shadowBlur=0;
  const kl=[cd.kelas,cd.kc&&cd.kc!==cd.kelas?`(${cd.kc})`:''].filter(Boolean).join(' ');
  fitFont(x,kl,CW2-2*M,hasAb?38:42,24,f=>`italic ${f}px ${SERIF}`);x.fillStyle=acc;x.fillText(kl,M,PH-(hasAb?44:58));
  /* kotak statistik */
  const bw=(CW2-2*M-2*22)/3,by=PH+10,bh=hasAb?108:132;
  const boxes=[['DADU KELAS',cd.dadu||'—'],['BONUS',cd.bonus!==''&&cd.bonus!=null?'+'+cd.bonus:'—'],[String(cd.tn||'Nyawa').toUpperCase(),null]];
  boxes.forEach(([l,v],i)=>{const bx=M+i*(bw+22);rrect(x,bx,by,bw,bh,18);x.fillStyle='rgba(255,255,255,.06)';x.fill();x.strokeStyle=acc+'88';x.lineWidth=2;x.stroke();
    x.fillStyle='rgba(255,255,255,.6)';x.font=`bold ${hasAb?20:22}px ${SANS}`;x.fillText(l,bx+22,by+(hasAb?36:42));
    if(v!==null){fitFont(x,v,bw-44,hasAb?46:52,26,f=>`bold ${f}px ${SANS}`);x.fillStyle='#fff';x.fillText(v,bx+22,by+(hasAb?88:102))}
    else{const n=clamp(cd.nyawa||3,1,8),r=n>5?(hasAb?14:16):(hasAb?19:22),gap=r*2.7;for(let k=0;k<n;k++)heart(x,bx+22+r+k*gap,by+(hasAb?74:88),r,'#d8433a')}});
  let top=by+bh+44;
  if(hasAb){
    /* 6 ability */
    const ay=by+bh+18,ag=14,aw=(CW2-2*M-5*ag)/6,ah=100;
    ABILS.forEach((a,i)=>{const ax=M+i*(aw+ag),v=num(cd.ab[i]);rrect(x,ax,ay,aw,ah,14);x.fillStyle=v>=2?acc+'33':'rgba(255,255,255,.05)';x.fill();x.strokeStyle=v>=2?acc:acc+'55';x.lineWidth=2;x.stroke();
      x.textAlign='center';x.fillStyle='rgba(255,255,255,.62)';x.font=`bold 21px ${SANS}`;x.fillText(a,ax+aw/2,ay+32);
      x.fillStyle=v>0?'#fff':v<0?'#e7a197':'rgba(255,255,255,.75)';x.font=`bold 44px ${SANS}`;x.fillText(fmtMod(v),ax+aw/2,ay+82);x.textAlign='left'});
    /* 18 skill: 3 kolom × 6 baris */
    const sy=ay+ah+46;x.fillStyle=acc;x.font=`bold 23px ${SANS}`;x.fillText('SKILL',M,sy);
    const sub=`PROFICIENCY +${cd.pb} · PERCEPTION PASIF ${cd.pp}`;x.font=`600 21px ${SANS}`;x.fillStyle='rgba(255,255,255,.6)';x.textAlign='right';x.fillText(sub,CW2-M,sy);x.textAlign='left';
    const cg=26,cw=(CW2-2*M-2*cg)/3,rh=40,gy=sy+16;
    rrect(x,M-12,gy,CW2-2*M+24,rh*6+16,14);x.fillStyle='rgba(255,255,255,.035)';x.fill();
    cd.sks.forEach(([n,ab,m,pr],i)=>{const col=Math.floor(i/6),row=i%6,sx=M+col*(cw+cg),yy=gy+14+row*rh+rh*.68;
      x.beginPath();x.arc(sx+9,yy-8,8,0,Math.PI*2);if(pr){x.fillStyle=acc;x.fill()}else{x.strokeStyle='rgba(255,255,255,.35)';x.lineWidth=2;x.stroke()}
      const mt=fmtMod(m);x.font=`bold 24px ${SANS}`;const mw=x.measureText(mt).width;
      const nf2=fitFont(x,n,cw-30-mw-12,24,17,f=>`${pr?'bold ':''}${f}px ${SANS}`);x.fillStyle=pr?'#fff':'rgba(255,255,255,.62)';x.fillText(n,sx+26,yy);
      x.font=`bold 24px ${SANS}`;x.fillStyle=pr?acc:'rgba(255,255,255,.7)';x.textAlign='right';x.fillText(mt,sx+cw,yy);x.textAlign='left'});
    top=gy+rh*6+16+48}
  /* ringkasan teks */
  const secs=[];const add=(t,b)=>{if(b&&String(b).trim())secs.push([t,String(b).trim()])};
  add('SENJATA',cd.senjata);add('KEMAMPUAN DASAR',cd.dasar);
  add('SKILL KHUSUS · 3X PER CERITA',[cd.sk.n,cd.sk.e].filter(Boolean).join(' — '));
  add(`SKILL PENGORBANAN · BAYAR ${cd.sp.b} ${String(cd.tn||'Nyawa').toUpperCase()}`,[cd.sp.n,cd.sp.e].filter(Boolean).join(' — '));
  if(cd.sf)add('SIFAT',hasAb?`Baik: ${cd.sf[0]} · Buruk: ${cd.sf[1]}`:`Baik: ${cd.sf[0]}\nBuruk: ${cd.sf[1]}`);
  if(cd.gf&&cd.gf.length)add('LATAR',cd.gf.map(([a,b])=>`${a}: ${b}`).join(hasAb?' · ':'\n'));
  add('KEPRIBADIAN',cd.kep);
  const bottom=CH-100,maxW=CW2-2*M,MINF=hasAb?20:18;
  const layout=(f,cap)=>{let h=0;const L=[];x.font=`${f}px ${SERIF}`;secs.forEach(([t,b],i)=>{let lines=wrapText(x,b,maxW);const lim=cap?cap[i]:Infinity;
      if(lines.length>lim){lines=lines.slice(0,Math.max(1,lim));let l=lines[lines.length-1]+'…';while(x.measureText(l).width>maxW&&l.length>2)l=l.slice(0,-2)+'…';lines[lines.length-1]=l}
      L.push([t,lines]);h+=f*.9+lines.length*f*1.28+f*.6});return{h,L}};
  let f=hasAb?32:36,lay=layout(f);while(lay.h>bottom-top&&f>MINF){f-=1;lay=layout(f)}
  if(lay.h>bottom-top){/* masih kepanjangan: potong bagian terpanjang satu baris demi satu baris */
    const cap=lay.L.map(([,l])=>l.length);let guard=400;while(lay.h>bottom-top&&guard--){let mi=0;cap.forEach((v,i)=>{if(v>cap[mi])mi=i});if(cap[mi]<=1)break;cap[mi]--;lay=layout(f,cap)}}
  let y=top;lay.L.forEach(([t,lines])=>{x.fillStyle=acc;x.font=`bold ${Math.round(f*.72)}px ${SANS}`;x.fillText(t,M,y);y+=f*.9;
    x.fillStyle='#efe6d6';x.font=`${f}px ${SERIF}`;lines.forEach(l=>{if(y<bottom+f){x.fillText(l,M,y+f*.3)}y+=f*1.28});y+=f*.6});
  x.strokeStyle=acc+'66';x.lineWidth=2;x.beginPath();x.moveTo(M,CH-78);x.lineTo(CW2-M,CH-78);x.stroke();
  x.font=`600 24px ${SANS}`;x.fillStyle='rgba(255,255,255,.55)';x.fillText('MASTERYDND',M,CH-40);x.textAlign='right';x.fillText(`${cd.tp||'Pahlawan'} · ${cd.gn||''}`,CW2-M,CH-40);x.textAlign='left';
  return c}

export function dlCanvas(c: HTMLCanvasElement, name: string): void {
  const a = document.createElement('a'); a.href = c.toDataURL('image/png'); a.download = name; document.body.appendChild(a); a.click(); setTimeout(() => a.remove(), 300);
}
