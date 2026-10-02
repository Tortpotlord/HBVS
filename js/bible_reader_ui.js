console.log("HBVS READER UI v7.8.277 AFTER+ CORRECTED verbose");
function getAppHeaderText(){
  var el=document.getElementById("readerTitle");
  var r=el?el.innerText:"";
  return "Holy Bible Vector Space\nthe sign of the Son of man\n"+r+"\n\n";
}
function getAppHeaderHtml(){
  var el=document.getElementById("readerTitle");
  var r=el?el.innerText:"";
  var h="";
  h=h+"<div style=\"text-align:center;font-family:serif\">";
  h=h+"<img src=\"assets/IGoToTheFather.png?v=78277\" style=\"width:68px;height:68px\" />";
  h=h+"<div style=\"font-weight:900\">Holy Bible Vector Space</div>";
  h=h+"<div style=\"font-style:italic\">the sign of the Son of man</div>";
  h=h+"<div style=\"font-weight:800;color:#800020\">"+r+"</div>";
  h=h+"</div><hr>";
  return h;
}

// === NEW v7.8.277: 3-Cards footer with AFTER + CORRECTED ===
window.renderMathFooter = function(rawPCE, mathPlain, mathStart, mathEnd, mode, preCount, selCount, code, chap, verse){
  if(!window.HBVS ||!window.HBVS.getCorrectedLocation){
    return `${code}${chap}:${verse}:${mathStart}-${mathEnd}[m=0,i=0,n=0,j=0,pre=${preCount||0},sel=${selCount||0}]`;
  }
  var corr = window.HBVS.getCorrectedLocation(rawPCE, mathPlain, mathStart, mathEnd, mode, preCount, selCount);
  // AFTER WRAPPERS
  var after = `${code}${chap}:${verse}:${corr.mathStart}-${corr.mathEnd}[m=${corr.m},i=${corr.i},n=${corr.n},j=${corr.j},pre=${corr.pre},sel=${corr.sel}]`;
  // CORRECTED using Start+2*m-i / End+2*n-j
  var corrected = `${code}${chap}:${verse}:${corr.correctedStart}-${corr.correctedEnd}[m=${corr.m},i=${corr.i},n=${corr.n},j=${corr.j},pre=${corr.pre},sel=${corr.sel}]`;
  return {after, corrected, corr};
};

window.build3CardsHTML = function(rawPCE, code, chap, verse){
  var modes = [{id:'akjv',mode:'AKJV',label:'AKJV1611 PCE CIRCA 1900'},{id:'superscript',mode:'SUPER',label:'SUPERSCRIPT KJV'},{id:'mathp',mode:'P',label:'MATHKJVP'},{id:'maths',mode:'S',label:'MATHKJVS'},{id:'matht',mode:'T',label:'MATHKJVT'}];
  var html = getAppHeaderHtml();
  html += `<div style="display:grid;gap:12px">`;
  modes.forEach(function(m){
    var rendered = window.HBVS? window.HBVS.renderVerse({TEXT:rawPCE}, m.mode) : {text:rawPCE};
    var txt = rendered.text||rawPCE;
    var plain = txt.replace(/<[^>]*>/g,' ').replace(/\s+/g,' ').trim();
    var wc = plain.split(/\s+/).filter(Boolean).length;
    var pre = 0; // whole verse
    var sel = wc;
    var footer = "";
    if(m.mode==='AKJV' || m.mode==='SUPER'){
      footer = `${code}${chap}:${verse}:1-${wc}[m=0,i=0,n=0,j=0,pre=0,sel=${wc}]`;
      html+=`<div class="card"><b>${m.label}</b><div>${txt}</div><div style="font-size:11px;color:#800020;margin-top:6px">${plain}(${footer})</div></div>`;
    } else {
      // Math modes - show AFTER + CORRECTED
      var mathStart = 1, mathEnd = wc;
      var f = window.renderMathFooter(rawPCE, plain, mathStart, mathEnd, m.mode, pre, sel, code, chap, verse);
      html+=`<div class="card" style="border:1px solid #800020;padding:8px;border-radius:8px"><b>${m.label}</b><div>${txt}</div>
        <div style="font-size:11px;margin-top:6px"><div style="color:#666">AFTER WRAPPERS: ${plain}(${f.after})</div>
        <div style="color:#800020;font-weight:800">CORRECTED: ${plain}(${f.corrected})</div></div></div>`;
      // Example Gen1:2: AFTER 17-20[m=1,i=0,n=2,j=0,pre=16,sel=2] -> CORRECTED 19-22[m=1,i=0,n=2,j=0,pre=16,sel=2]
      // Example Gen31:1: AFTER 1-27[m=0,i=0,n=2,j=0,pre=0,sel=27] -> CORRECTED 1-29[m=0,i=0,n=2,j=0,pre=0,sel=27]
    }
  });
  html+=`</div>`;
  return html;
};

function wireViews(){
  var tabs=document.querySelectorAll("#viewTabs button");
  for(var i=0;i<tabs.length;i++){
    tabs[i].addEventListener("click",function(e){
      var v=e.target.getAttribute("data-view");
      if(window.setMainView) window.setMainView(v);
    });
  }
}
function goPrev(){ var b=document.getElementById("btn-prev-chap"); if(b) b.click(); }
function goNext(){ var b=document.getElementById("btn-next-chap"); if(b) b.click(); }
function goAll(){ var b=document.getElementById("btn-all-chap"); if(b) b.click(); }
function doRefresh(){ if(window.showReader) window.showReader(); }
function doAudio(){
  if(!("speechSynthesis" in window)) return;
  if(speechSynthesis.speaking){ speechSynthesis.cancel(); var a=document.getElementById("r-audio"); if(a) a.innerText="Audio_Playback"; return; }
  var rc=document.getElementById("readerContent");
  var txt=rc?rc.innerText.slice(0,4000):"";
  if(!txt) return;
  var ut=new SpeechSynthesisUtterance(txt);
  ut.onend=function(){ var a2=document.getElementById("r-audio"); if(a2) a2.innerText="Audio_Playback"; };
  var a3=document.getElementById("r-audio"); if(a3) a3.innerText="Stop";
  speechSynthesis.speak(ut);
}
function openM(){
  var m=document.getElementById("copyModal");
  if(m){
    m.style.display="flex";
    var c=document.getElementById("chkIncludeHeader");
    var mc=document.getElementById("chkModalHeader");
    if(c&&mc) mc.checked=c.checked;
  }
}
function closeM(){ var m=document.getElementById("copyModal"); if(m) m.style.display="none"; }
function doCopy(){
  var rc=document.getElementById("readerContent");
  var t=rc?rc.innerText:"";
  var chk=document.getElementById("chkModalHeader");
  var inc=chk?chk.checked:false;
  if(inc) t=getAppHeaderText()+t;
  navigator.clipboard.writeText(t);
  closeM();
}
function doShare(){
  var rc=document.getElementById("readerContent");
  var t=rc?rc.innerText:"";
  var chk=document.getElementById("chkModalHeader");
  var inc=chk?chk.checked:false;
  if(inc) t=getAppHeaderText()+t;
  if(navigator.share) navigator.share({title:"HBVS",text:t});
  else navigator.clipboard.writeText(t);
  closeM();
}
function doPrint(){
  var chk=document.getElementById("chkModalHeader");
  var inc=chk?chk.checked:false;
  var hdr=inc?getAppHeaderHtml():"";
  var rc=document.getElementById("readerContent");
  var body=rc?rc.innerHTML:"";
  var w=window.open("","_blank");
  w.document.write("<html><head><title>HBVS</title></head><body>"+hdr+"<div>"+body+"</div></body></html>");
  w.document.close();
  setTimeout(function(){ w.print(); },400);
  closeM();
}
document.addEventListener("DOMContentLoaded",function(){
  var rp=document.getElementById("r-prev"); if(rp) rp.addEventListener("click",goPrev);
  var rn=document.getElementById("r-next"); if(rn) rn.addEventListener("click",goNext);
  var ra=document.getElementById("r-all"); if(ra) ra.addEventListener("click",goAll);
  var rr=document.getElementById("r-refresh"); if(rr) rr.addEventListener("click",doRefresh);
  var ra2=document.getElementById("r-audio"); if(ra2) ra2.addEventListener("click",doAudio);
  var rc=document.getElementById("r-copy"); if(rc) rc.addEventListener("click",openM);
  var rs=document.getElementById("r-share"); if(rs) rs.addEventListener("click",openM);
  var rpr=document.getElementById("r-print"); if(rpr) rpr.addEventListener("click",openM);
  var mc=document.getElementById("m-cancel"); if(mc) mc.addEventListener("click",closeM);
  var mcp=document.getElementById("m-copy"); if(mcp) mcp.addEventListener("click",doCopy);
  var msh=document.getElementById("m-share"); if(msh) msh.addEventListener("click",doShare);
  var mpr=document.getElementById("m-print"); if(mpr) mpr.addEventListener("click",doPrint);
  var bvt=document.getElementById("btn-view-toggle"); if(bvt) bvt.addEventListener("click",function(){ if(window.toggleView) window.toggleView(); var l=document.getElementById("cardLabel"); if(l) l.innerText=window.viewMode||"Card"; });
  var bvtm=document.getElementById("btn-view-toggle-main"); if(bvtm) bvtm.addEventListener("click",function(){ if(window.toggleView) window.toggleView(); var l=document.getElementById("cardLabel"); if(l) l.innerText=window.viewMode||"Card"; });
  var bs=document.getElementById("btn-search"); if(bs) bs.addEventListener("click",function(e){ e.preventDefault(); if(window.SEARCH_GLASS&&window.SEARCH_GLASS.open) window.SEARCH_GLASS.open(); });
  wireViews();
  console.log("HBVS READER BUTTONS ACTIVE v7.8.277 AFTER+CORRECTED");
});