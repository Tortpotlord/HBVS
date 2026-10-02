console.log("HBVS READER UI v7.8.261 CLEAN");
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
  h=h+"<img src=\"assets/IGoToTheFather.png?v=78261\" style=\"width:68px;height:68px\" />";
  h=h+"<div style=\"font-weight:900\">Holy Bible Vector Space</div>";
  h=h+"<div style=\"font-style:italic\">the sign of the Son of man</div>";
  h=h+"<div style=\"font-weight:800;color:#800020\">"+r+"</div>";
  h=h+"</div><hr>";
  return h;
}
function wireViews(){
  var tabs=document.querySelectorAll("#viewTabs button");
  for(var i=0;i<tabs.length;i++){
    tabs[i].addEventListener("click",function(e){
      var v=e.target.getAttribute("data-view");
      localStorage.setItem("bible_view",v);
      var lab=document.getElementById("viewLabel");
      if(lab) lab.innerText=v;
      for(var j=0;j<tabs.length;j++) tabs[j].classList.remove("active");
      e.target.classList.add("active");
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
  console.log("HBVS READER BUTTONS ACTIVE v7.8.261");
});