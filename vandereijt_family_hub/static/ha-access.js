/* Family Hub administrators use a separate, private API, not public settings. */
(() => {
  const scriptURL = document.currentScript.src;
  const rootURL = new URL('../', scriptURL);
  const root = document.getElementById('hub-access-users');
  const status = document.getElementById('hub-access-status');
  const save = document.getElementById('hub-access-save');
  const reload = document.getElementById('hub-access-reload');
  if (!root || !status || !save || !reload) return;
  let snapshot = null, busy = false;
  async function request(options = {}) {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), 15000);
    try {
      const response = await fetch(new URL('api/access', rootURL), {
        ...options, cache: 'no-store', credentials: 'same-origin', signal: controller.signal,
        headers: {'Content-Type': 'application/json', 'X-Family-Hub-Request': '1'},
      });
      const value = await response.json();
      if (!response.ok || !value.ok) throw new Error(value.error || 'Beheerrechten laden mislukt');
      return value;
    } finally { clearTimeout(timer); }
  }
  function render(value) {
    snapshot = value;
    root.replaceChildren();
    for (const user of value.users) {
      const label = document.createElement('label');
      label.className = 'hub-access-user';
      const checkbox = document.createElement('input');
      checkbox.type = 'checkbox'; checkbox.value = user.id;
      checkbox.checked = user.hub_admin; checkbox.disabled = user.ha_admin;
      checkbox.dataset.hubAdmin = 'true';
      const text = document.createElement('span');
      const name = document.createElement('strong'); name.textContent = user.name;
      const role = document.createElement('small');
      role.textContent = user.ha_admin ? 'HA-beheerder · vaste toegang' : 'Family Hub-beheerder';
      text.append(name, role); label.append(checkbox, text); root.append(label);
    }
  }
  async function load() {
    if (busy) return;
    busy = true; save.disabled = true; reload.disabled = true;
    status.textContent = 'Gebruikers laden…';
    try { render(await request()); status.textContent = 'Kies wie Family Hub mag beheren.'; }
    catch (error) { snapshot = null; root.replaceChildren(); status.textContent = error.message; }
    finally { busy = false; reload.disabled = false; save.disabled = !snapshot; }
  }
  save.addEventListener('click', async () => {
    if (busy || !snapshot) return;
    const ids = [...root.querySelectorAll('input[data-hub-admin]')]
      .filter(input => input.checked && !input.disabled).map(input => input.value);
    const me = snapshot.users.find(user => user.id === snapshot.current_user_id);
    if (me && !me.ha_admin && !ids.includes(me.id) &&
        !window.confirm('Je verwijdert je eigen Family Hub-beheerrechten. Doorgaan?')) return;
    busy = true; save.disabled = true; reload.disabled = true;
    status.textContent = 'Beheerrechten opslaan…';
    try {
      const value = await request({method: 'POST', body: JSON.stringify({revision: snapshot.revision, admin_user_ids: ids})});
      render(value); status.textContent = 'Beheerrechten opgeslagen. HA-rechten zijn niet gewijzigd.';
      if (!value.current_user_has_access) { snapshot = null; root.replaceChildren(); status.textContent = 'Je eigen beheerrechten zijn verwijderd. Sluit dit venster.'; }
    } catch (error) { status.textContent = error.message; }
    finally { busy = false; reload.disabled = false; save.disabled = !snapshot; }
  });
  reload.addEventListener('click', load);
  document.querySelector('[data-tab="access"]')?.addEventListener('click', load);
})();
