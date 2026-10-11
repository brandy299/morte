// Pult: interactive exercise. Plain script, no library, no network. The data comes from the page (#daten).
// Every text is set with textContent, never as html.
(function () {
  "use strict";
  var D = JSON.parse(document.getElementById("daten").textContent);
  var app = document.getElementById("app");
  var live = document.getElementById("ansage");
  var N = D.schritte.length;
  var state = D.schritte.map(function () { return { val: null, done: false, richtig: 0, von: 0 }; });
  var cur = 0;

  function el(tag, cls, text) {
    var e = document.createElement(tag);
    if (cls) e.className = cls;
    if (text !== undefined) e.textContent = text;
    return e;
  }
  function norm(s) { return s.normalize("NFC").toLowerCase().replace(/\s+/g, " ").replace(/[.!?]+$/, "").trim(); }
  function say(t) { live.textContent = ""; setTimeout(function () { live.textContent = t; }, 30); }
  function mark(node, ok, label) {
    node.classList.add(ok ? "ok" : "bad");
    var m = el("span", "marke", ok ? "✓ " + label : "✗ " + label);
    node.appendChild(m);
  }

  // ---- step builders: each returns { check: function() or null, restore: function() } ----
  function buildInfo(s, box) {
    if (s.text) box.appendChild(el("p", "text", s.text));
    if (s.punkte.length) { var ul = el("ul", "punkte"); s.punkte.forEach(function (p) { ul.appendChild(el("li", "", p)); }); box.appendChild(ul); }
    return null;
  }

  function buildAuswahl(s, box, st) {
    box.appendChild(el("p", "hinweis", s.mehrere ? "Mehrere Antworten sind richtig." : "Eine Antwort ist richtig."));
    var fs = el("div", "optionen"); fs.setAttribute("role", s.mehrere ? "group" : "radiogroup"); fs.setAttribute("aria-label", s.frage);
    var rows = s.optionen.map(function (o, i) {
      var label = el("label", "option");
      var inp = el("input"); inp.type = s.mehrere ? "checkbox" : "radio"; inp.name = "w"; inp.value = i;
      inp.checked = !!(st.val && st.val[i]);
      label.appendChild(inp); label.appendChild(el("span", "", o.text));
      fs.appendChild(label);
      return { label: label, inp: inp, o: o };
    });
    box.appendChild(fs);
    function show() {
      rows.forEach(function (r) {
        r.inp.disabled = true;
        var got = r.inp.checked;
        if (r.o.richtig && got) mark(r.label, true, "richtig");
        else if (!r.o.richtig && got) mark(r.label, false, "falsch");
        else if (r.o.richtig && !got) { r.label.classList.add("fehlt"); r.label.appendChild(el("span", "marke", "← das fehlte")); }
        if (r.o.erklaerung && (got || r.o.richtig)) r.label.appendChild(el("span", "erkl", r.o.erklaerung));
      });
    }
    return {
      check: function () {
        st.val = rows.map(function (r) { return r.inp.checked; });
        if (!st.val.some(Boolean)) return { fertig: false, msg: "Wähle zuerst eine Antwort." };
        var ok = rows.every(function (r) { return r.inp.checked === r.o.richtig; });
        st.richtig = ok ? 1 : 0; st.von = 1; show();
        return { fertig: true, msg: ok ? "Richtig." : "Nicht ganz." };
      },
      show: show
    };
  }

  function buildLuecke(s, box, st) {
    var p = el("p", "text luecken");
    var inputs = [];
    s.teile.forEach(function (t) {
      if (t.text !== undefined) { p.appendChild(document.createTextNode(t.text)); return; }
      var inp = el("input", "luecke"); inp.type = "text"; inp.autocomplete = "off"; inp.setAttribute("autocapitalize", "off"); inp.spellcheck = false;
      inp.setAttribute("aria-label", "Lücke " + (inputs.length + 1));
      inp.size = Math.max(6, Math.max.apply(null, t.luecke.map(function (a) { return a.length; })) + 2);
      inp.value = st.val ? st.val[inputs.length] : "";
      inputs.push({ inp: inp, t: t }); p.appendChild(inp);
    });
    box.appendChild(p);
    if (s.hilfe) {
      var words = [].concat.apply([], inputs.map(function (x) { return [x.t.luecke[0]]; })).sort(function (a, b) { return a.localeCompare(b, "de"); });
      box.appendChild(el("p", "hinweis", "Wörter zur Auswahl: " + words.join(" · ")));
    }
    function show() {
      inputs.forEach(function (x) {
        x.inp.disabled = true;
        var ok = x.t.luecke.some(function (a) { return norm(a) === norm(x.inp.value); });
        x.inp.classList.add(ok ? "ok" : "bad");
        if (!ok) { var r = el("span", "korrekt", "→ " + x.t.luecke[0]); x.inp.after(r); }
      });
      if (s.erklaerung) box.appendChild(el("p", "erkl", s.erklaerung));
    }
    return {
      check: function () {
        st.val = inputs.map(function (x) { return x.inp.value; });
        if (st.val.every(function (v) { return !v.trim(); })) return { fertig: false, msg: "Fülle zuerst mindestens eine Lücke aus." };
        st.von = inputs.length;
        st.richtig = inputs.filter(function (x) { return x.t.luecke.some(function (a) { return norm(a) === norm(x.inp.value); }); }).length;
        show();
        return { fertig: true, msg: st.richtig === st.von ? "Richtig." : st.richtig + " von " + st.von + " Lücken stimmen." };
      },
      show: show
    };
  }

  function buildZuordnung(s, box, st) {
    var list = el("div", "paare");
    var rows = s.paare.map(function (p, i) {
      var row = el("div", "paar");
      var id = "z" + i;
      var lab = el("label", "links", p.links); lab.htmlFor = id;
      var sel = el("select"); sel.id = id;
      var o0 = el("option", "", "– wählen –"); o0.value = ""; sel.appendChild(o0);
      s.rechts.forEach(function (r) { var o = el("option", "", r); o.value = r; sel.appendChild(o); });
      sel.value = st.val ? st.val[i] : "";
      row.appendChild(lab); row.appendChild(sel); list.appendChild(row);
      return { row: row, sel: sel, p: p };
    });
    box.appendChild(list);
    function show() {
      rows.forEach(function (r) {
        r.sel.disabled = true;
        var ok = norm(r.sel.value) === norm(r.p.rechts);
        mark(r.row, ok, ok ? "richtig" : "falsch");
        if (!ok) r.row.appendChild(el("span", "korrekt", "→ " + r.p.rechts));
      });
    }
    return {
      check: function () {
        st.val = rows.map(function (r) { return r.sel.value; });
        if (st.val.every(function (v) { return !v; })) return { fertig: false, msg: "Ordne zuerst mindestens eine Antwort zu." };
        st.von = rows.length;
        st.richtig = rows.filter(function (r) { return norm(r.sel.value) === norm(r.p.rechts); }).length;
        show();
        return { fertig: true, msg: st.richtig === st.von ? "Alles richtig zugeordnet." : st.richtig + " von " + st.von + " richtig zugeordnet." };
      },
      show: show
    };
  }

  function buildOffen(s, box, st) {
    if (s.hinweis) box.appendChild(el("p", "hinweis", s.hinweis));
    var ta = el("textarea"); ta.rows = 6; ta.setAttribute("aria-label", "Deine Antwort");
    ta.value = st.val || "";
    var count = el("p", "zaehler");
    function upd() {
      st.val = ta.value;
      var n = ta.value.trim() ? ta.value.trim().split(/\s+/).length : 0;
      count.textContent = n + (n === 1 ? " Wort" : " Wörter") + (s.woerter ? " (Ziel: mindestens " + s.woerter + ")" : "");
    }
    ta.addEventListener("input", upd); upd();
    box.appendChild(ta); box.appendChild(count);
    if (s.musterloesung) {
      var b = el("button", "sek", "Musterlösung zeigen"); b.type = "button";
      var m = el("p", "erkl"); m.hidden = true; m.textContent = s.musterloesung;
      b.addEventListener("click", function () { m.hidden = !m.hidden; b.textContent = m.hidden ? "Musterlösung zeigen" : "Musterlösung verbergen"; });
      box.appendChild(b); box.appendChild(m);
    }
    return null;
  }

  function buildCheckliste(s, box, st) {
    var ul = el("div", "optionen");
    var inputs = s.punkte.map(function (p, i) {
      var label = el("label", "option"); var inp = el("input"); inp.type = "checkbox"; inp.checked = !!(st.val && st.val[i]);
      label.appendChild(inp); label.appendChild(el("span", "", p)); ul.appendChild(label); return inp;
    });
    var count = el("p", "zaehler");
    function upd() { st.val = inputs.map(function (i) { return i.checked; }); count.textContent = st.val.filter(Boolean).length + " von " + inputs.length + " abgehakt"; }
    inputs.forEach(function (i) { i.addEventListener("change", upd); }); upd();
    box.appendChild(ul); box.appendChild(count);
    return null;
  }

  var BUILD = { info: buildInfo, auswahl: buildAuswahl, lueckentext: buildLuecke, zuordnung: buildZuordnung, offen: buildOffen, checkliste: buildCheckliste };
  var PHASE = { info: "Zum Lesen", auswahl: "Prüfe dich", lueckentext: "Prüfe dich", zuordnung: "Prüfe dich", offen: "Deine Aufgabe", checkliste: "Selbsteinschätzung" };

  function titelVon(s) { return s.titel || s.frage || s.aufgabe || "Lücken ausfüllen"; }

  function bar(i) {
    var wrap = el("div", "fortschritt");
    var track = el("div", "spur"); track.setAttribute("role", "progressbar"); track.setAttribute("aria-valuemin", "0"); track.setAttribute("aria-valuemax", String(N)); track.setAttribute("aria-valuenow", String(i)); track.setAttribute("aria-label", "Fortschritt");
    var fill = el("div", "fuell"); fill.style.width = Math.round((i / N) * 100) + "%"; track.appendChild(fill);
    wrap.appendChild(track); wrap.appendChild(el("span", "zahl", i < N ? "Schritt " + (i + 1) + " von " + N : "Fertig"));
    return wrap;
  }

  function render(i) {
    cur = i; app.textContent = "";
    if (i >= N) return renderEnde();
    var s = D.schritte[i], st = state[i];
    app.appendChild(bar(i));
    var card = el("section", "karte");
    card.appendChild(el("p", "phase", PHASE[s.art]));
    var h = el("h2", "", titelVon(s));
    h.tabIndex = -1; card.appendChild(h);
    var box = el("div", "inhalt");
    var api = BUILD[s.art](s, box, st) || null;
    card.appendChild(box);
    var meldung = el("p", "meldung"); meldung.setAttribute("role", "status");
    var nav = el("div", "nav");
    var back = el("button", "sek", "Zurück"); back.type = "button"; back.disabled = i === 0; back.addEventListener("click", function () { render(i - 1); });
    nav.appendChild(back);
    var next = el("button", "prim", i === N - 1 ? "Fertig" : "Weiter"); next.type = "button";
    if (api) {
      var pr = el("button", "prim", "Prüfen"); pr.type = "button";
      if (st.done) { api.show(); pr.hidden = true; }
      else next.hidden = true;
      pr.addEventListener("click", function () {
        var r = api.check();
        meldung.textContent = r.msg; say(r.msg);
        if (r.fertig) { st.done = true; pr.hidden = true; next.hidden = false; meldung.className = "meldung " + (st.richtig === st.von ? "ok" : "bad"); next.focus(); }
        else meldung.className = "meldung";
      });
      nav.appendChild(pr);
      if (st.done) { meldung.textContent = st.richtig === st.von ? "Richtig." : st.richtig + " von " + st.von + " richtig."; meldung.className = "meldung " + (st.richtig === st.von ? "ok" : "bad"); }
    }
    next.addEventListener("click", function () { render(i + 1); });
    nav.appendChild(next);
    card.appendChild(meldung); card.appendChild(nav);
    app.appendChild(card);
    h.focus({ preventScroll: false });
  }

  function renderEnde() {
    app.appendChild(bar(N));
    var card = el("section", "karte");
    var h = el("h2", "", "Geschafft"); h.tabIndex = -1; card.appendChild(h);
    var von = 0, ok = 0; state.forEach(function (s) { von += s.von; ok += s.richtig; });
    if (von) card.appendChild(el("p", "ergebnis", "Du hast " + ok + " von " + von + " richtig."));
    var ul = el("ul", "punkte");
    D.schritte.forEach(function (s, i) {
      if (!state[i].von) return;
      var li = el("li"); var b = el("button", "link", titelVon(s)); b.type = "button"; b.addEventListener("click", function () { render(i); });
      li.appendChild(b); li.appendChild(document.createTextNode(": " + state[i].richtig + " von " + state[i].von)); ul.appendChild(li);
    });
    if (ul.children.length) card.appendChild(ul);
    var again = el("button", "prim", "Noch einmal von vorn"); again.type = "button";
    again.addEventListener("click", function () { state = D.schritte.map(function () { return { val: null, done: false, richtig: 0, von: 0 }; }); render(0); });
    var nav = el("div", "nav"); nav.appendChild(again); card.appendChild(nav);
    app.appendChild(card); h.focus();
    say(von ? "Geschafft. " + ok + " von " + von + " richtig." : "Geschafft.");
  }

  render(0);
})();
