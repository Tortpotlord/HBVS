const ALL_BIBLES = ["AKJV1611 PCE circa 1900", "ASV", "DRA", "GNV", "LXX", "WEB"];
const ALL_MATHS = ["AKJV1611", "SuperscriptKJV", "MathKJVP", "MathKJVS", "MathKJVT"];

function initShared() {
  document.getElementById('splash').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  populateDropdowns();
  initMenu();
}

function populateDropdowns() {
  document.getElementById('bible-select').innerHTML = ALL_BIBLES.map(b => `<option>${b}</option>`).join('');
  document.getElementById('math-select').innerHTML = ALL_MATHS.map(m => `<option>${m}</option>`).join('');
  
  document.getElementById('bible-select').onchange = (e) => {
    document.getElementById('subtitle1').innerText = e.target.value;
  }
  document.getElementById('math-select').onchange = (e) => {
    document.getElementById('subtitle2').innerText = e.target.value + " Math";
  }
}

function initMenu() {
  const sideMenu = document.getElementById('side-menu');
  const overlay = document.getElementById('overlay');
  document.getElementById('btn-hamburger').onclick = () => { sideMenu.classList.add('open'); overlay.classList.remove('hidden'); }
  overlay.onclick = () => { sideMenu.classList.remove('open'); overlay.classList.add('hidden'); }
  document.getElementById('btn-search').onclick = () => alert('Search coming');
  document.getElementById('btn-refresh').onclick = () => location.reload();
}