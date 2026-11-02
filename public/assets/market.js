// plugins.hubra.club. Theme switch, phone menu and table of contents as on
// hubra.club, plus the Marketplace list from /index.json (same origin).
// The pages work without it: the plugins are also written into the HTML.
;(function () {
  var root = document.documentElement

  // Theme switch: auto → light → dark. The choice goes into the same
  // hubra_theme cookie the apps use, so the site and the app match.
  var themeBtn = document.querySelector('.theme-btn')
  if (themeBtn) {
    var order = ['auto', 'light', 'dark']
    var show = function (mode) {
      themeBtn.setAttribute('data-mode', mode)
      if (mode === 'auto') root.removeAttribute('data-theme')
      else root.setAttribute('data-theme', mode)
    }
    show(root.getAttribute('data-theme-choice') || 'auto')
    themeBtn.hidden = false
    themeBtn.addEventListener('click', function () {
      var next = order[(order.indexOf(themeBtn.getAttribute('data-mode')) + 1) % order.length]
      show(next)
      var host = location.hostname
      var domain = /(^|\.)hubra\.club$/.test(host) ? '; domain=.hubra.club' : ''
      document.cookie = 'hubra_theme=' + next + '; path=/; max-age=31536000; samesite=lax' + domain + (location.protocol === 'https:' ? '; secure' : '')
      try {
        localStorage.setItem('hubra_theme', next)
      } catch (e) {}
    })
  }

  // Phone menu.
  var menuBtn = document.querySelector('.menu-btn')
  var nav = document.getElementById('nav')
  if (menuBtn && nav) {
    menuBtn.hidden = false
    var setOpen = function (open) {
      nav.classList.toggle('open', open)
      menuBtn.setAttribute('aria-expanded', String(open))
    }
    menuBtn.addEventListener('click', function () {
      setOpen(!nav.classList.contains('open'))
    })
    nav.addEventListener('click', function (e) {
      if (e.target.closest('a')) setOpen(false)
    })
    document.addEventListener('keydown', function (e) {
      if (e.key === 'Escape') setOpen(false)
    })
  }

  // Marketplace: the plugins from the signed index this site serves. The
  // signature is checked by every Hubra that installs from it, not here;
  // this only shows what the index offers.
  var grid = document.querySelector('[data-market]')
  if (grid && window.fetch) {
    var en = (root.getAttribute('lang') || 'de').slice(0, 2) === 'en'
    // German names and texts for the official plugins; plugin.yaml is English.
    var DE = {
      'bank-import': ['Bankimport', 'Kontoauszüge als camt.053, camt.054, MT940 oder CSV einlesen. Zahlungen werden Rechnungen zugeordnet, alles andere nach euren Regeln verbucht, mit Probelauf.'],
      budgets: ['Budgets', 'Ein Jahresbudget pro Kategorie, laufend verglichen mit den Buchungen. Genehmigen, sperren und ins nächste Jahr übernehmen.'],
      discord: ['Discord', 'Der Hubra-Bot auf eurem Server: Ankündigungen, Rollen, Gruppenkanäle, Discord-Events, Abstimmungen per Knopf und Erinnerungen per Direktnachricht.'],
      guides: ['Anleitungen', 'Eine Anleitung pro Gerät oder Werkzeug, als Text oder Link zu Handbuch und Video, direkt beim Inventar.'],
      'imap-inbox': ['Gemeinsames Postfach', 'Vereinspostfächer bei Infomaniak, Hostpoint oder Gmail direkt in Hubra lesen, jedes Postfach sichtbar für eine Gruppe. Passwörter verschlüsselt gespeichert.'],
      keys: ['Schlüssel', 'Schlüssel, Badges und Karten: wer welchen hat, mit Übergabeprotokoll. Mitglieder sehen ihre Schlüssel im Konto.'],
    }
    var TAGS_DE = { finance: 'Finanzen', inventory: 'Inventar', communication: 'Kommunikation', mail: 'Mail', switzerland: 'Schweiz', example: 'Beispiel' }
    var L = en
      ? { all: 'All', version: 'Version', released: 'Released', hubra: 'Works with', needs: 'Needs', versions: 'Versions', changes: 'What changed in', source: 'Source', download: 'Download', none: 'No plugin matches.', count: function (n) { return n + (n === 1 ? ' plugin' : ' plugins') }, updated: 'Index updated', key: 'signed with key', withdrawn: 'Withdrawn:' }
      : { all: 'Alle', version: 'Version', released: 'Veröffentlicht', hubra: 'Läuft mit', needs: 'Braucht', versions: 'Versionen', changes: 'Neu in', source: 'Quellcode', download: 'Herunterladen', none: 'Kein Plugin passt.', count: function (n) { return n + ' Plugin' + (n === 1 ? '' : 's') }, updated: 'Index aktualisiert', key: 'signiert mit Schlüssel', withdrawn: 'Zurückgezogen:' }
    var el = function (tag, cls, text) {
      var n = document.createElement(tag)
      if (cls) n.className = cls
      if (text != null) n.textContent = text
      return n
    }
    var safeUrl = function (u) {
      return /^https:\/\//.test(String(u || '')) ? String(u) : null
    }
    var date = function (s) {
      var d = new Date(String(s || ''))
      if (isNaN(d)) return String(s || '')
      return d.toLocaleDateString(en ? 'en-GB' : 'de-CH', { day: 'numeric', month: 'long', year: 'numeric' })
    }
    var tagName = function (t) {
      return en ? t : TAGS_DE[t] || t
    }
    var bar = document.querySelector('[data-market-bar]')
    var search = bar && bar.querySelector('input')
    var chips = bar && bar.querySelector('.chips')
    var status = document.querySelector('[data-market-status]')
    var trust = document.querySelector('[data-market-trust]')
    var cards = []
    var tag = ''

    var filter = function () {
      var q = (search ? search.value : '').trim().toLowerCase()
      var shown = 0
      cards.forEach(function (c) {
        var on = (!tag || c.tags.indexOf(tag) >= 0) && (!q || c.text.indexOf(q) >= 0)
        c.node.hidden = !on
        if (on) shown++
      })
      var empty = grid.querySelector('.market-empty')
      if (empty) empty.hidden = shown > 0
      if (status) status.textContent = L.count(shown)
    }

    var card = function (p) {
      var id = String(p.id || '')
      var de = !en && DE[id]
      var name = de ? de[0] : String(p.name || id)
      var desc = de ? de[1] : String(p.description || '')
      var tags = Array.isArray(p.tags) ? p.tags.map(String) : []
      var n = el('article', 'feat plugin-card')
      n.id = id
      var top = el('div', 'top-row')
      var tg = el('div', 'tags')
      ;(tags.length ? tags : ['plugin']).forEach(function (t) {
        tg.appendChild(el('span', 'tag', tagName(t)))
      })
      top.appendChild(tg)
      top.appendChild(el('span', 'ver', 'v' + String(p.version || '')))
      n.appendChild(top)
      n.appendChild(el('h3', null, name))
      n.appendChild(el('p', null, desc))
      if (p.yanked) n.appendChild(el('p', 'yanked', L.withdrawn + ' ' + String(p.yanked)))
      var dl = el('dl')
      var row = function (k, v) {
        if (!v) return
        dl.appendChild(el('dt', null, k))
        dl.appendChild(el('dd', null, v))
      }
      row(L.released, p.date ? date(p.date) : '')
      row(L.hubra, p.hubra ? 'Hubra ' + String(p.hubra) : '')
      row(L.needs, Array.isArray(p.requires) && p.requires.length ? p.requires.join(', ') : '')
      row(L.versions, Array.isArray(p.versions) ? p.versions.map(function (v) {
        return String(v.version)
      }).join(', ') : '')
      n.appendChild(dl)
      if (p.changes) {
        var det = el('details')
        det.appendChild(el('summary', null, L.changes + ' ' + String(p.version || '')))
        det.appendChild(el('div', 'changes', String(p.changes)))
        n.appendChild(det)
      }
      var links = el('p', 'links')
      var src = safeUrl(p.source) || safeUrl(p.homepage)
      if (src) {
        var a = el('a', null, L.source)
        a.href = src
        links.appendChild(a)
      }
      var zip = safeUrl(p.url)
      if (zip) {
        var z = el('a', null, L.download + ' (.zip)')
        z.href = zip
        links.appendChild(z)
      }
      if (links.children.length) n.appendChild(links)
      cards.push({ node: n, tags: tags, text: (id + ' ' + name + ' ' + desc + ' ' + tags.map(tagName).join(' ') + ' ' + tags.join(' ')).toLowerCase() })
      return n
    }

    fetch('/index.json', { credentials: 'omit', cache: 'no-cache' })
      .then(function (r) {
        return r.ok ? r.json() : null
      })
      .then(function (d) {
        if (!d || !Array.isArray(d.plugins)) return
        var list = d.plugins.slice().sort(function (a, b) {
          var na = (!en && DE[a.id] ? DE[a.id][0] : a.name) || ''
          var nb = (!en && DE[b.id] ? DE[b.id][0] : b.name) || ''
          return String(na).localeCompare(String(nb), en ? 'en' : 'de')
        })
        var frag = document.createDocumentFragment()
        list.forEach(function (p) {
          if (p && p.id) frag.appendChild(card(p))
        })
        var empty = el('p', 'market-empty', L.none)
        empty.hidden = true
        frag.appendChild(empty)
        grid.textContent = ''
        grid.appendChild(frag)

        if (chips) {
          var all = {}
          cards.forEach(function (c) {
            c.tags.forEach(function (t) {
              all[t] = true
            })
          })
          var make = function (value, label) {
            var b = el('button', 'chip', label)
            b.type = 'button'
            b.setAttribute('aria-pressed', String(value === tag))
            b.addEventListener('click', function () {
              tag = value
              Array.prototype.forEach.call(chips.children, function (x) {
                x.setAttribute('aria-pressed', String(x === b))
              })
              filter()
            })
            chips.appendChild(b)
          }
          chips.textContent = ''
          make('', L.all)
          Object.keys(all).sort().forEach(function (t) {
            make(t, tagName(t))
          })
        }
        if (bar) bar.hidden = false
        if (search) search.addEventListener('input', filter)
        if (trust && d.generated) {
          trust.textContent = L.updated + ' ' + date(d.generated) + (d.key_id ? ', ' + L.key + ' ' + String(d.key_id) : '') + '.'
        }
        filter()
        if (location.hash) {
          var target = document.getElementById(location.hash.slice(1))
          if (target) target.scrollIntoView()
        }
      })
      .catch(function () {})
  }

  // Guide: mark the section being read in the table of contents.
  var tocLinks = Array.prototype.slice.call(document.querySelectorAll('.toc a'))
  if (tocLinks.length && 'IntersectionObserver' in window) {
    var byId = {}
    tocLinks.forEach(function (a) {
      byId[a.getAttribute('href').slice(1)] = a
    })
    var io = new IntersectionObserver(
      function (entries) {
        entries.forEach(function (entry) {
          if (!entry.isIntersecting) return
          tocLinks.forEach(function (a) {
            a.classList.remove('on')
          })
          var a = byId[entry.target.id]
          if (a) a.classList.add('on')
        })
      },
      { rootMargin: '-80px 0px -70% 0px' }
    )
    Object.keys(byId).forEach(function (id) {
      var el = document.getElementById(id)
      if (el) io.observe(el)
    })
  }
})()
