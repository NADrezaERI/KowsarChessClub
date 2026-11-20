const tg=window.Telegram?.WebApp;if(tg){tg.ready();tg.expand()}
const fen=new URLSearchParams(location.search).get("fen");
const statusEl=document.getElementById("status"),boardEl=document.getElementById("board"),send=document.getElementById("send");
if(typeof Chess==="undefined"||!fen){statusEl.textContent="خطا در بارگذاری کتابخانه یا موقعیت معما.";throw Error("Missing Chess.js or FEN")}
const game=new Chess(fen),flipped=game.turn()==="b";
const glyph={w:{k:"♔",q:"♕",r:"♖",b:"♗",n:"♘",p:"♙"},b:{k:"♚",q:"♛",r:"♜",b:"♝",n:"♞",p:"♟"}};
let selected=null,targets=[],chosen=null;
const ranks=document.getElementById("ranks"),files=document.getElementById("files");
function nameAt(r,c){return (flipped?"hgfedcba":"abcdefgh")[c]+(flipped?String(r+1):String(8-r))}
function render(){
 boardEl.innerHTML="";ranks.innerHTML="";files.innerHTML="";
 for(let r=0;r<8;r++){let e=document.createElement("span");e.textContent=flipped?r+1:8-r;ranks.append(e)}
 for(let c=0;c<8;c++){let e=document.createElement("span");e.textContent=(flipped?"hgfedcba":"abcdefgh")[c];files.append(e)}
 for(let r=0;r<8;r++)for(let c=0;c<8;c++){
  const sq=nameAt(r,c),p=game.get(sq),el=document.createElement("div");el.className="sq "+((r+c)%2?"dark":"light");el.dataset.square=sq;
  if(sq===selected)el.classList.add("selected");if(targets.includes(sq))el.classList.add("target");
  if(p){const s=document.createElement("span");s.className="piece "+(p.color==="w"?"white":"black");s.textContent=glyph[p.color][p.type];el.append(s)}
  el.addEventListener("pointerdown",()=>select(sq));
  el.addEventListener("pointerup",e=>{const dest=document.elementFromPoint(e.clientX,e.clientY)?.closest(".sq");if(dest&&selected)moveTo(dest.dataset.square)});
  el.addEventListener("click",()=>{if(selected&&targets.includes(sq))moveTo(sq);else select(sq)});
  boardEl.append(el)
 }
}
function select(sq){if(chosen)return;const p=game.get(sq);if(!p||p.color!==game.turn())return;selected=sq;targets=game.moves({square:sq,verbose:true}).map(m=>m.to);render()}
function moveTo(to){if(!selected)return;const options=game.moves({square:selected,verbose:true}).filter(m=>m.to===to);if(!options.length){selected=null;targets=[];render();statusEl.textContent="حرکت قانونی نیست.";return}
 const promotion=options.some(m=>m.flags.includes("p"))?"q":undefined;const m=game.move({from:selected,to,promotion});if(!m)return;
 chosen={move:m.from+m.to+(m.promotion||"")};selected=null;targets=[];render();statusEl.textContent="حرکت انتخاب شد؛ برای بررسی ثبت کن.";send.disabled=false}
send.addEventListener("click",()=>{if(!chosen)return;if(tg){send.disabled=true;tg.sendData(JSON.stringify(chosen))}else statusEl.textContent="صفحه را از داخل تلگرام باز کن."});
render();
