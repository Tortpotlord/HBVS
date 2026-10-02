function loadBottomBar() {
  if(document.getElementById('bottom-bar')) return;
  const currentPage = (window.location.pathname.split('/').pop()||'index.html').split('?')[0].toLowerCase();
  const VERSION='v=78261';
  const pages = [
    { href: 'index.html', label: 'Home', icon: 'Home' },
    { href: 'bible.html', label: 'Bible', icon: 'Bible' },
    { href: 'studyhub.html', label: 'StudyHub', icon: 'Study' },
    { href: 'settings.html', label: 'Settings', icon: 'Set' }
  ];

  function navTo(href){
    var url = href.indexOf('?') > -1? href + '&' + VERSION : href + '?' + VERSION;
    if(window.location.origin && window.location.origin.indexOf('http') === 0){
      url = window.location.origin + '/' + url.replace(/^\//,'');
    }
    window.location.href = url;
  }
  window.hbvsNavTo = navTo;

  var html = '';
  html += '<div id="bottom-bar" class="bottom-bar" style="position:fixed;bottom:0;left:0;right:0;z-index:1000;display:flex;justify-content:space-around;background:#fff;border-top:2px solid #ccc;padding:6px 0 8px 0;">';
  for(var i=0;i<pages.length;i++){
    var p=pages[i];
    var isActive = currentPage === p.href.toLowerCase();
    var fw = isActive? '800' : '600';
    var col = isActive? '#800020' : '#111';
    var actClass = isActive? ' active' : '';
    html += '<button onclick="hbvsNavTo(\''+p.href+'\')" class="nav-btn'+actClass+'" style="background:none;border:none;cursor:pointer;display:flex;flex-direction:column;align-items:center;font-size:12px;font-weight:'+fw+';color:'+col+';">';
    html += '<span style="font-size:12px;">'+p.icon+'</span><span>'+p.label+'</span></button>';
  }
  html += '</div>';
  document.body.insertAdjacentHTML('beforeend', html);
  document.body.style.paddingBottom='70px';
}
document.addEventListener('DOMContentLoaded', loadBottomBar);

document.addEventListener('click', function(e){
  var a=e.target.closest('a.nav-btn');
  if(a && a.getAttribute('href')){
    e.preventDefault();
    var href=a.getAttribute('href');
    if(window.hbvsNavTo) window.hbvsNavTo(href);
    else window.location.href=href;
  }
});