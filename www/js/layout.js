function loadBottomBar() {
  const currentPage = window.location.pathname.split('/').pop();
  const pages = [
    { href: 'index.html', label: 'Home', icon: '🏠' },
    { href: 'bible.html', label: 'Bible', icon: '📖' },
    { href: 'studyhub.html', label: 'StudyHub', icon: '📚' }, // MOVED UP
    { href: 'settings.html', label: 'Settings', icon: '⚙️' } // MOVED LAST
  ];

  const bottomBar = `
    <div id="bottom-bar" class="bottom-bar">
      ${pages.map(p => `
        <a href="${p.href}" class="nav-btn ${currentPage === p.href? 'active' : ''}">
          <span>${p.icon}</span>
          <span>${p.label}</span>
        </a>
      `).join('')}
    </div>
  `;
  document.body.insertAdjacentHTML('beforeend', bottomBar);
}
document.addEventListener('DOMContentLoaded', loadBottomBar);