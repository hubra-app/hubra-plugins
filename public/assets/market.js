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
      ? { all: 'All', version: 'Version', released: 'Released', hubra: 'Works with', needs: 'Needs', versions: 'Versions', changes: 'What changed in', source: 'Source', download: 'Download', none: 'No plugin matches.', count: function (n) { return n + (n === 1 ? ' plugin' : ' plugins') }, updated: 'Index updated', key: 'signed with key', withdrawn: 'Withdrawn:', addons: 'Add-ons', addonOf: function (n) { return 'Add-on to ' + n }, needsPlugin: 'Needs the plugin' }
      : { all: 'Alle', version: 'Version', released: 'Veröffentlicht', hubra: 'Läuft mit', needs: 'Braucht', versions: 'Versionen', changes: 'Neu in', source: 'Quellcode', download: 'Herunterladen', none: 'Kein Plugin passt.', count: function (n) { return n + ' Plugin' + (n === 1 ? '' : 's') }, updated: 'Index aktualisiert', key: 'signiert mit Schlüssel', withdrawn: 'Zurückgezogen:', addons: 'Add-ons', addonOf: function (n) { return 'Add-on zu ' + n }, needsPlugin: 'Braucht das Plugin' }
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

    var matches = function (c, q) {
      return (!tag || c.tags.indexOf(tag) >= 0) && (!q || c.text.indexOf(q) >= 0)
    }
    // A card shows when it or one of its add-ons matches; an add-on shows
    // when it matches or its parent does.
    var filter = function () {
      var q = (search ? search.value : '').trim().toLowerCase()
      var shown = 0
      cards.forEach(function (c) {
        var on = matches(c, q)
        var any = false
        c.addons.forEach(function (a) {
          var aOn = on || matches(a, q)
          a.node.hidden = !aOn
          if (aOn) {
            any = true
            shown++
          }
        })
        c.node.hidden = !on && !any
        if (c.box) c.box.hidden = !any
        if (on) shown++
      })
      var empty = grid.querySelector('.market-empty')
      if (empty) empty.hidden = shown > 0
      if (status) status.textContent = L.count(shown)
    }

    // The plugin each one is an add-on of: the index says so (parent), or,
    // in an index built before that, the first plugin under depends:, else
    // the plugin providing the first module under requires:.
    var parents = function (list) {
      var ids = {}
      var provides = {}
      list.forEach(function (p) {
        ids[p.id] = true
        ;(Array.isArray(p.modules) ? p.modules : []).forEach(function (m) {
          if (!(m in provides)) provides[m] = p.id
        })
      })
      var out = {}
      list.forEach(function (p) {
        var parent = ''
        if (typeof p.parent === 'string') parent = p.parent
        else {
          var deps = p.depends && typeof p.depends === 'object' ? Object.keys(p.depends) : []
          parent = deps.filter(function (d) { return d !== p.id })[0] || ''
          if (!parent) {
            ;(Array.isArray(p.requires) ? p.requires : []).some(function (m) {
              if (provides[m] && provides[m] !== p.id) parent = provides[m]
              return Boolean(parent)
            })
          }
        }
        out[p.id] = parent && ids[parent] && parent !== p.id ? parent : ''
      })
      // No nesting under a plugin that is itself nested, and no loops.
      Object.keys(out).forEach(function (id) {
        if (out[id] && out[out[id]]) out[id] = ''
      })
      return out
    }
    var displayName = function (p) {
      return (!en && DE[p.id] ? DE[p.id][0] : p.name) || p.id || ''
    }

    // Release notes are Markdown with hard-wrapped lines. Show them as
    // flowing paragraphs and list items (lines that continue an item are
    // joined), with **bold** and `code`; built with DOM nodes, never HTML.
    var inline = function (parent, text) {
      text.split(/(\*\*[^*]+\*\*|`[^`]+`)/).forEach(function (part) {
        if (!part) return
        if (/^\*\*.+\*\*$/.test(part)) parent.appendChild(el('strong', null, part.slice(2, -2)))
        else if (/^`.+`$/.test(part)) parent.appendChild(el('code', null, part.slice(1, -1)))
        else parent.appendChild(document.createTextNode(part))
      })
    }
    var notes = function (md) {
      var box = el('div', 'changes')
      var list = null
      var cur = null
      var flush = function () {
        cur = null
      }
      md.replace(/\r/g, '').split('\n').forEach(function (raw) {
        var line = raw.trim()
        if (!line) {
          flush()
          list = null
          return
        }
        if (/^#{1,6}\s/.test(line)) {
          flush()
          list = null
          var h = line.replace(/^#+\s*/, '')
          // The version heading repeats the summary; keep other headings.
          if (h !== (md.match(/^#+\s*(\S+)/) || [])[1]) box.appendChild(el('p', 'notes-h', h))
          return
        }
        var item = line.match(/^[-*]\s+(.*)$/)
        if (item) {
          if (!list) {
            list = el('ul')
            box.appendChild(list)
          }
          cur = el('li')
          list.appendChild(cur)
          cur._text = item[1]
        } else if (cur) {
          cur._text += ' ' + line
        } else {
          list = null
          cur = el('p')
          box.appendChild(cur)
          cur._text = line
        }
      })
      Array.prototype.forEach.call(box.querySelectorAll('li, p:not(.notes-h)'), function (n) {
        inline(n, n._text || '')
      })
      return box
    }

    var card = function (p, opts) {
      opts = opts || {}
      var id = String(p.id || '')
      var de = !en && DE[id]
      var name = de ? de[0] : String(p.name || id)
      var desc = de ? de[1] : String(p.description || '')
      var tags = Array.isArray(p.tags) ? p.tags.map(String) : []
      var n = el(opts.addon ? 'section' : 'article', opts.addon ? 'addon' : 'feat plugin-card')
      n.id = id
      var top = el('div', 'top-row')
      var tg = el('div', 'tags')
      ;(tags.length ? tags : ['plugin']).forEach(function (t) {
        tg.appendChild(el('span', 'tag', tagName(t)))
      })
      top.appendChild(tg)
      top.appendChild(el('span', 'ver', 'v' + String(p.version || '')))
      n.appendChild(top)
      n.appendChild(el(opts.addon ? 'h4' : 'h3', null, name))
      if (opts.addon) n.appendChild(el('p', 'addon-of', L.addonOf(opts.parentName)))
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
      row(L.needsPlugin, p.depends && typeof p.depends === 'object' ? Object.keys(p.depends).map(function (d) {
        var r = String(p.depends[d] || '')
        return (opts.names && opts.names[d] ? opts.names[d] : d) + (r ? ' ' + r : '')
      }).join(', ') : '')
      row(L.versions, Array.isArray(p.versions) ? p.versions.map(function (v) {
        return String(v.version)
      }).join(', ') : '')
      n.appendChild(dl)
      if (p.changes) {
        var det = el('details')
        det.appendChild(el('summary', null, L.changes + ' ' + String(p.version || '')))
        det.appendChild(notes(String(p.changes)))
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
      var entry = { node: n, tags: tags, text: (id + ' ' + name + ' ' + desc + ' ' + tags.map(tagName).join(' ') + ' ' + tags.join(' ')).toLowerCase(), addons: [] }
      if (!opts.addon) cards.push(entry)
      if (opts.addons && opts.addons.length) {
        var box = el('div', 'addons')
        box.appendChild(el('p', 'addons-h', L.addons + ' (' + opts.addons.length + ')'))
        opts.addons.forEach(function (a) {
          var sub = card(a, { addon: true, parentName: name, names: opts.names })
          box.appendChild(sub.node)
          entry.addons.push(sub)
        })
        entry.box = box
        n.insertBefore(box, links.parentNode === n ? links : null)
      }
      return opts.addon ? entry : n
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
        list = list.filter(function (p) {
          return p && p.id
        })
        var parentOf = parents(list)
        var names = {}
        list.forEach(function (p) {
          names[p.id] = displayName(p)
        })
        var frag = document.createDocumentFragment()
        list.forEach(function (p) {
          if (parentOf[p.id]) return
          var addons = list.filter(function (a) {
            return parentOf[a.id] === p.id
          })
          frag.appendChild(card(p, { addons: addons, names: names }))
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
