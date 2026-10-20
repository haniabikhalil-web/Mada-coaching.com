// Shared Mada AI sign-in, kept in this browser so a candidate signs in once across the call page, the report page
// and "My reports". Same key and 50-minute lifetime as the call page (the access token lasts an hour). Cleared on any 401.
(function () {
  var STORE = 'mada_ai_session';
  var KEEP_MS = 50 * 60 * 1000;
  window.MadaSession = {
    load: function () {
      try { var j = JSON.parse(localStorage.getItem(STORE) || 'null'); return j && j.token && j.email && j.until > Date.now() ? j : null; } catch (e) { return null; }
    },
    save: function (token, email) {
      try { localStorage.setItem(STORE, JSON.stringify({ token: token, email: email, until: Date.now() + KEEP_MS })); } catch (e) {}
    },
    clear: function () { try { localStorage.removeItem(STORE); } catch (e) {} }
  };
})();
