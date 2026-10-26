// Shared Mada AI sign-in, kept in this browser so a candidate signs in once across the call page, the maths drills, the report page
// and "My reports". The access token lasts an hour; the refresh token Supabase issues with it is kept too, so a returning candidate is
// signed back in quietly and only needs a new email code on a new device, after signing out, or if Supabase rejects the refresh.
(function () {
  var STORE = 'mada_ai_session';
  var EARLY_MS = 5 * 60 * 1000;   // treat the access token as spent 5 minutes before it really is
  var RETRY = 'mada_ai_recover';  // sessionStorage: one recovery attempt per 30 seconds, so a persistent 401 cannot loop
  function read() { try { return JSON.parse(localStorage.getItem(STORE) || 'null'); } catch (e) { return null; } }
  function write(j) { try { localStorage.setItem(STORE, JSON.stringify(j)); } catch (e) {} }
  function valid(j) { return !!(j && j.token && j.email && j.until > Date.now()); }
  function save(token, email, refresh, expiresIn) {
    var life = (expiresIn > 0 ? expiresIn * 1000 : 60 * 60 * 1000) - EARLY_MS;
    write({ token: token, email: email, refresh: refresh || '', until: Date.now() + Math.max(life, 60 * 1000) });
  }
  function clear() { try { localStorage.removeItem(STORE); } catch (e) {} }
  function load() { var j = read(); return valid(j) ? j : null; }

  // Trade the refresh token for a new access token. Resolves the new session, or null when the candidate must sign in again.
  // A network failure keeps the saved session (they may just be offline); a refusal from Supabase clears it.
  function refresh(api, key) {
    var j = read();
    if (!j || !j.refresh || !j.email || !api || !key) return Promise.resolve(null);
    return fetch(api.replace(/\/+$/, '') + '/auth/v1/token?grant_type=refresh_token', {
      method: 'POST', headers: { 'content-type': 'application/json', apikey: key }, body: JSON.stringify({ refresh_token: j.refresh })
    }).then(function (r) {
      if (r.ok) return r.json().then(function (n) {
        if (!n || !n.access_token) { clear(); return null; }
        save(n.access_token, j.email, n.refresh_token || j.refresh, n.expires_in);
        return load();
      });
      var other = load(); // another tab may have rotated the token a moment ago: only a different token counts
      if (other && other.token !== j.token) return other;
      clear(); return null;
    }, function () { return null; });
  }

  window.MadaSession = {
    load: load,
    save: save,
    clear: clear,
    refresh: refresh,
    // On page load: the saved session if it is still good, otherwise a quiet refresh, otherwise null.
    restore: function (api, key) { var s = load(); return s ? Promise.resolve(s) : refresh(api, key); },
    // After a 401 from a function: try one refresh, and report whether the page should reload and carry on.
    recover: function (api, key) {
      try { var last = +sessionStorage.getItem(RETRY) || 0; if (Date.now() - last < 30000) return Promise.resolve(false); sessionStorage.setItem(RETRY, String(Date.now())); } catch (e) {}
      return refresh(api, key).then(function (s) { return !!s; });
    }
  };
})();
