const givingTabs = [
  ['dashboard', 'Dashboard'], ['causes', 'Innsamlinger'],
  ['donations', 'Pr. gave'], ['donors', 'Pr. giver'],
  ['inkind', 'Fysiske gaver'], ['school-payments', 'Skolebetalinger'],
];

export function givingTabLinks(active = 'dashboard') {
  return `<nav class="causes-tab-links" aria-label="Gaver og administrasjon" style="display:flex;gap:8px;align-items:center;min-width:0;overflow-x:auto;">
    ${givingTabs.map(([id, label]) => {
      const selected = active === id;
      const className = `automation-tab${selected ? ' active' : ''}`;
      if (id === 'school-payments' || active === 'school-payments') {
        const section = id === 'school-payments' ? id : 'causes';
        return `<a class="${className}" href="#${section}" data-section="${section}"${id !== 'school-payments' ? ` data-giving-tab="${id}"` : ''}${selected ? ' aria-current="page"' : ''}>${label}</a>`;
      }
      return `<button type="button" class="${className}" data-tab="${id}">${label}</button>`;
    }).join('')}
  </nav>`;
}

export function mountSchoolGivingNavigation(section) {
  if (section.querySelector('[data-school-giving-navigation]')) return;
  const navigation = document.createElement('div');
  navigation.dataset.schoolGivingNavigation = '';
  navigation.className = 'causes-tabs-container';
  navigation.style.marginBottom = '24px';
  navigation.innerHTML = `<div class="automation-tabs" style="border-bottom:2px solid #e2e8f0;background:#fff;border-radius:12px 12px 0 0;padding:0 24px;display:flex;align-items:center;">${givingTabLinks('school-payments')}</div>`;
  section.querySelector('.school-finance').before(navigation);
}
