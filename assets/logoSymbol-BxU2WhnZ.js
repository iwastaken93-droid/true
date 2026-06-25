import{c as k}from"./TauriBootstrapGate-BWXontC_.js";/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const R=[["path",{d:"m6 9 6 6 6-6",key:"qrunsl"}]],$=k("chevron-down",R);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const C=[["path",{d:"m18 15-6-6-6 6",key:"153udz"}]],O=k("chevron-up",C);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const T=[["rect",{width:"18",height:"18",x:"3",y:"3",rx:"2",key:"afitv7"}],["path",{d:"M15 3v18",key:"14nvp0"}],["path",{d:"m8 9 3 3-3 3",key:"12hl5m"}]],N=k("panel-right-close",T);/**
 * @license lucide-react v0.562.0 - ISC
 *
 * This source code is licensed under the ISC license.
 * See the LICENSE file in the root directory of this source tree.
 */const _=[["path",{d:"M3.714 3.048a.498.498 0 0 0-.683.627l2.843 7.627a2 2 0 0 1 0 1.396l-2.842 7.627a.498.498 0 0 0 .682.627l18-8.5a.5.5 0 0 0 0-.904z",key:"117uat"}],["path",{d:"M6 12h16",key:"s4cdu5"}]],x=k("send-horizontal",_),f={idle:{r:124,g:142,b:184},listening:{r:34,g:211,b:238},thinking:{r:139,g:92,b:246},speaking:{r:96,g:165,b:250}},y=(o,t)=>`rgba(${o.r}, ${o.g}, ${o.b}, ${t})`,z=(o,t,s)=>({r:o.r+(t.r-o.r)*s,g:o.g+(t.g-o.g)*s,b:o.b+(t.b-o.b)*s}),w=Math.PI*2,v=96;class A{canvas;ctx;cssSize=0;dpr=1;color=f.idle;energy=.12;phase=0;lastTs=0;reducedMotion=!1;constructor(t){this.canvas=t,this.ctx=t.getContext("2d")}setReducedMotion(t){this.reducedMotion=t}resize(t,s){this.cssSize=t,this.dpr=s,this.canvas.width=Math.round(t*s),this.canvas.height=Math.round(t*s),this.ctx&&this.ctx.setTransform(s,0,0,s,0,0)}render(t,s,b){const e=this.ctx;if(!e||this.cssSize===0)return;const S=this.lastTs?Math.min((b-this.lastTs)/1e3,.05):0;this.lastTs=b,this.reducedMotion||(this.phase+=S);const h=this.phase;let n;switch(s){case"listening":n=.28+Math.min(t,1)*.95;break;case"speaking":n=.5+Math.abs(Math.sin(h*3.4))*.42;break;case"thinking":n=.34+(Math.sin(h*1.9)*.5+.5)*.22;break;default:n=.1}this.reducedMotion&&(n=s==="idle"?.1:.42);const M=n>this.energy?.35:.12;this.energy+=(n-this.energy)*M;const m=f[s];this.color=z(this.color,m,.08);const i=this.cssSize,c=i/2,l=i/2;e.clearRect(0,0,i,i);const a=this.energy,r=i*.255,p=r+i*.03,g=i*.16,u=p+g*(.5+a*.5),d=e.createRadialGradient(c,l,r*.7,c,l,u);d.addColorStop(0,y(this.color,0)),d.addColorStop(.55,y(this.color,.16*Math.min(a+.25,1))),d.addColorStop(1,y(this.color,0)),e.fillStyle=d,e.beginPath(),e.arc(c,l,u,0,w),e.fill(),this.drawRing(e,c,l,p,g,a,h,1,.92,1.6),this.drawRing(e,c,l,p-i*.012,g*.7,a,h,-1.35,.4,1)}drawRing(t,s,b,e,S,h,n,M,m,i){const c=S*h;t.beginPath();for(let a=0;a<=v;a++){const r=a/v*w,p=Math.sin(r*3+n*1.1*M)*.5+Math.sin(r*5-n*1.7*M)*.3+Math.sin(r*2+n*.7*M)*.4,g=e+c*(.42+p*.42),u=s+Math.cos(r)*g,d=b+Math.sin(r)*g;a===0?t.moveTo(u,d):t.lineTo(u,d)}t.closePath();const l=Math.min(.55+h*.45,1);t.lineJoin="round",t.strokeStyle=y(this.color,m*l),t.lineWidth=i,t.shadowColor=y(this.color,.9),t.shadowBlur=(6+h*10)*(this.reducedMotion?.5:1),t.stroke(),t.shadowBlur=0}}const I="/assets/logoSymbol-DeStyA2j.png";export{$ as C,A as O,N as P,x as S,O as a,I as l};
