import{mkdirSync as a,readFileSync as b,readdirSync as c,writeFileSync as d}from'node:fs';
import{join as j}from'node:path';
export function run(P:Uint8Array,q:Uint8Array){
const n=P.length,S=new Int32Array(256),C=new Int32Array(64),M=new Int32Array(256),O=new Uint8Array(65536);
let s=0,e=0,l=0,i=0,p=0,t=0;
const T=(v:number)=>({o:O.slice(0,l),e:v});
for(;;){
if(t==1e6)return T(10);
if(p<0||p>=n)return T(9);
const o=P[p];
if(!(o<8||o>15&&o<35||o>47&&o<53||o==64||o==65||o>79&&o<84))return T(5);
const g=o==1?1:o==2?4:o>47&&o<52?2:0;
if(p+g>=n)return T(9);
t++;
const x=p+1+g;p=x;
const R=g==2?((P[x-2]|P[x-1]<<8)<<16)>>16:0;
switch(o){
case 0:return T(0);
case 1:case 2:if(s>255)return T(3);S[s++]=o==1?(P[x-1]<<24)>>24:P[x-4]|P[x-3]<<8|P[x-2]<<16|P[x-1]<<24;break;
case 3:if(s<1)return T(2);s--;break;
case 4:case 6:if(s<o/2-1)return T(2);if(s>255)return T(3);S[s]=S[s-o/2+1];s++;break;
case 5:{if(s<2)return T(2);const v=S[s-1];S[s-1]=S[s-2];S[s-2]=v;break}
case 7:{if(s<3)return T(2);const v=S[s-3];S[s-3]=S[s-2];S[s-2]=S[s-1];S[s-1]=v;break}
case 23:if(s<1)return T(2);S[s-1]=-S[s-1];break;
case 27:if(s<1)return T(2);S[s-1]=~S[s-1];break;
case 48:p=x+R;break;
case 49:case 50:if(s<1)return T(2);if((o==49)==(S[--s]==0))p=x+R;break;
case 51:if(e>63)return T(7);C[e++]=x;p=P[x-2]|P[x-1]<<8;break;
case 52:if(e<1)return T(8);p=C[--e];break;
case 64:{if(s<1)return T(2);const v=S[s-1];if(v<0||v>255)return T(6);S[s-1]=M[v];break}
case 65:{if(s<2)return T(2);const v=S[s-1];if(v<0||v>255)return T(6);M[v]=S[s-2];s-=2;break}
case 80:{if(s<1)return T(2);const w=''+S[s-1];if(l+w.length>65536)return T(11);s--;for(let k=0;k<w.length;)O[l++]=w.charCodeAt(k++);break}
case 81:if(s<1)return T(2);if(l==65536)return T(11);O[l++]=S[--s]&255;break;
case 82:if(s>255)return T(3);S[s++]=i<q.length?q[i++]:-1;break;
case 83:if(s<1)return T(2);return T(S[--s]&255);
default:{
if(s<2)return T(2);
const B=S[s-1],A=S[s-2];let r;
if(o>18&&o<23&&!B)return T(4);
r=o==16?A+B:o==17?A-B:o==18?Math.imul(A,B):o==19?A/B|0:o==20?(B==-1?0:A%B):o==21?(A>>>0)/(B>>>0)|0:o==22?(A>>>0)%(B>>>0)|0:o==24?A&B:o==25?A|B:o==26?A^B:o==28?A<<(B&31):o==29?A>>(B&31):o==30?A>>>(B&31)|0:o==32?(A==B?1:0):o==33?(A<B?1:0):(A>>>0)<(B>>>0)?1:0;
s--;S[s-1]=r}
}}}
const I=process.env.MAKEFUN_INPUT_DIR??'/input',D=process.env.MAKEFUN_OUTPUT_DIR??'/output';
if(process.argv[1]?.endsWith('main.ts'))for(const z of c(I).sort()){const r=run(b(j(I,z,'program.bin')),b(j(I,z,'input.bin')));a(j(D,z),{recursive:true});d(j(D,z,'stdout.bin'),r.o);d(j(D,z,'exit.txt'),r.e+'\n')}
