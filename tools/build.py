#!/usr/bin/env python3
"""Builds the plugins.hubra.club pages from src/pages/ into public/.

The pages around index.json: the Marketplace (/ and /en/) and the guide for
plugin authors (/entwickeln/ and /en/develop/). The look and the assets in
public/assets/ come from hubra.club (hubra-app/hubra.club, tools/build.py
there); copy site.css, theme.js and the fonts again when that site changes.

Each page in src/pages/ starts with a comment block of settings:

    <!--
    path: /entwickeln/           where the page is served
    lang: de                     de or en
    alt: /en/develop/            the same page in the other language
    title: Plugins entwickeln    <title>, " · Hubra Plugins" is added
    description: ...             meta description
    index: no                    optional: keep the page out of search engines
    -->

The rest of the file is the page's <main> content. The build wraps it in the
shared head, header and footer below.

    python3 tools/build.py           write public/**/index.html + sitemap.xml
    python3 tools/build.py --check   fail if public/ is out of date or a link
                                     points at a page or file that doesn't exist

Python 3.9+, standard library only. The output is committed; the publish
workflow copies public/ next to the signed index.json it builds.
"""

from __future__ import annotations

import html
import re
import sys
from dataclasses import dataclass
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
SRC = ROOT / "src" / "pages"
OUT = ROOT / "public"
SITE = "https://plugins.hubra.club"

WEB = "https://hubra.club"
SSO = "https://sso.hubra.club"
GH = "https://github.com/hubra-app"

MARK = (
    '<svg viewBox="0 0 64 64" aria-hidden="true"><rect width="64" height="64" rx="15" fill="#7441e0"/>'
    '<path d="M21 14V50M21 35a11 11 0 0 1 22 0V50" fill="none" stroke="#fff" stroke-width="8" '
    'stroke-linecap="round" stroke-linejoin="round"/><circle cx="32" cy="45" r="4" fill="#fece2b"/></svg>'
)

# Words that appear on every page, per language.
T = {
    "de": {
        "html_lang": "de-CH",
        "og_locale": "de_CH",
        "home": "/",
        "skip": "Zum Inhalt springen",
        "home_label": "Hubra Plugins, Marktplatz",
        "nav_label": "Hauptnavigation",
        "nav": [("/", "Marktplatz"), ("/entwickeln/", "Plugins entwickeln"), ("/index.json", "index.json")],
        "web": ("hubra.club", WEB + "/module/"),
        "start": ("Plugin entwickeln", "/entwickeln/"),
        "menu": "Menü",
        "theme": "Farbschema wechseln",
        "other_lang": ("EN", "en", "English"),
        "foot": [
            ("Plugins", [("/", "Marktplatz"), ("/entwickeln/", "Plugins entwickeln"), ("/index.json", "index.json (signiert)")]),
            ("Hubra", [(WEB + "/", "hubra.club"), (WEB + "/module/", "Module für Vereine"), (WEB + "/sicherheit/", "Sicherheit")]),
            ("Quellcode", [(GH + "/hubra-plugins", "Marktplatz-Repository"), (GH + "/hubra-plugins-template", "Plugin-Vorlage"), (GH + "/hubra", "Hubra"), (GH + "/hubra-plugins/security/policy", "Sicherheitslücke melden")]),
            ("Rechtliches", [(WEB + "/impressum/", "Impressum"), (WEB + "/datenschutz/", "Datenschutz"), ("mailto:hi@hubra.club", "hi@hubra.club")]),
        ],
        "tagline": "Plugins liefern Module für die Hubra-Plattform aus. Jedes Plugin signiert.",
        "toc": "Inhalt",
        "copy": "© 2026 Hubra",
    },
    "en": {
        "html_lang": "en",
        "og_locale": "en_GB",
        "home": "/en/",
        "skip": "Skip to content",
        "home_label": "Hubra Plugins, marketplace",
        "nav_label": "Main navigation",
        "nav": [("/en/", "Marketplace"), ("/en/develop/", "Build a plugin"), ("/index.json", "index.json")],
        "web": ("hubra.club", WEB + "/en/modules/"),
        "start": ("Build a plugin", "/en/develop/"),
        "menu": "Menu",
        "theme": "Change colour scheme",
        "other_lang": ("DE", "de-CH", "Deutsch"),
        "foot": [
            ("Plugins", [("/en/", "Marketplace"), ("/en/develop/", "Build a plugin"), ("/index.json", "index.json (signed)")]),
            ("Hubra", [(WEB + "/en/", "hubra.club"), (WEB + "/en/modules/", "Modules for clubs"), (WEB + "/en/security/", "Security")]),
            ("Source", [(GH + "/hubra-plugins", "Marketplace repository"), (GH + "/hubra-plugins-template", "Plugin template"), (GH + "/hubra", "Hubra"), (GH + "/hubra-plugins/security/policy", "Report a vulnerability")]),
            ("Legal", [(WEB + "/en/imprint/", "Imprint"), (WEB + "/en/privacy/", "Privacy"), ("mailto:hi@hubra.club", "hi@hubra.club")]),
        ],
        "tagline": "Plugins ship modules for the Hubra platform. Every plugin signed.",
        "toc": "Contents",
        "copy": "© 2026 Hubra",
    },
}

ICON_THEME = (
    '<svg class="i-auto" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="8.5"/><path d="M12 3.5v17a8.5 8.5 0 0 0 0-17z" fill="currentColor" stroke="none"/></svg>'
    '<svg class="i-light" viewBox="0 0 24 24" aria-hidden="true"><circle cx="12" cy="12" r="4"/><path d="M12 2.5v2M12 19.5v2M4.6 4.6 6 6M18 18l1.4 1.4M2.5 12h2M19.5 12h2M4.6 19.4 6 18M18 6l1.4-1.4"/></svg>'
    '<svg class="i-dark" viewBox="0 0 24 24" aria-hidden="true"><path d="M20 14.5A8.5 8.5 0 0 1 9.5 4a8.5 8.5 0 1 0 10.5 10.5z"/></svg>'
)
ICON_MENU = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg>'


@dataclass
class Page:
    src: Path
    path: str
    lang: str
    alt: str | None
    title: str
    description: str
    index: bool
    body: str

    @property
    def out(self) -> Path:
        if self.path.endswith(".html"):
            return OUT / self.path.lstrip("/")
        return OUT / self.path.lstrip("/") / "index.html"


def read_page(src: Path) -> Page:
    text = src.read_text(encoding="utf-8")
    m = re.match(r"<!--\n(.*?)\n-->\n", text, re.S)
    if not m:
        sys.exit(f"{src}: missing the settings comment at the top")
    meta = {}
    for line in m.group(1).splitlines():
        key, _, value = line.partition(":")
        meta[key.strip()] = value.strip()
    return Page(
        src=src,
        path=meta["path"],
        lang=meta["lang"],
        alt=meta.get("alt") or None,
        title=meta["title"],
        description=meta["description"],
        index=meta.get("index", "yes") != "no",
        body=text[m.end():].strip("\n"),
    )


def link(href: str, label: str, **attrs: str) -> str:
    extra = "".join(f' {k.rstrip("_").replace("_", "-")}="{v}"' for k, v in attrs.items())
    return f'<a href="{href}"{extra}>{label}</a>'


def expand(body: str, t: dict) -> str:
    """<!-- toc --> becomes a table of contents built from the page's
    <h2 id="..."> headings."""
    if "<!-- toc -->" in body:
        items = "\n".join(
            f'      <li><a href="#{i}">{re.sub(r"<[^>]+>", "", h)}</a></li>'
            for i, h in re.findall(r'<h2 id="([^"]+)">(.*?)</h2>', body)
        )
        body = body.replace(
            "<!-- toc -->",
            f'<nav class="toc" aria-label="{t["toc"]}">\n    <h2>{t["toc"]}</h2>\n    <ol>\n{items}\n    </ol>\n  </nav>',
        )
    return body


def render(page: Page, pages_by_path: dict[str, Page]) -> str:
    t = T[page.lang]
    esc = html.escape
    full_title = page.title if page.title.startswith("Hubra") else f"{page.title} · Hubra Plugins"
    alt_lang = "en" if page.lang == "de" else "de"
    head = [
        "<!doctype html>",
        f'<html lang="{t["html_lang"]}">',
        "<head>",
        '<meta charset="utf-8">',
        '<meta name="viewport" content="width=device-width, initial-scale=1">',
        f"<title>{esc(full_title)}</title>",
        f'<meta name="description" content="{esc(page.description)}">',
    ]
    if page.index:
        head.append(f'<link rel="canonical" href="{SITE}{page.path}">')
    else:
        head.append('<meta name="robots" content="noindex">')
    if page.alt:
        de, en = (page.path, page.alt) if page.lang == "de" else (page.alt, page.path)
        head += [
            f'<link rel="alternate" hreflang="de-CH" href="{SITE}{de}">',
            f'<link rel="alternate" hreflang="en" href="{SITE}{en}">',
            f'<link rel="alternate" hreflang="x-default" href="{SITE}{de}">',
        ]
    head += [
        '<meta name="theme-color" content="#7441e0">',
        '<meta name="color-scheme" content="light dark">',
        '<link rel="icon" href="/assets/favicon.svg" type="image/svg+xml">',
        '<link rel="icon" href="/favicon.ico" sizes="32x32">',
        '<link rel="apple-touch-icon" href="/assets/apple-touch-icon.png">',
        '<meta property="og:type" content="website">',
        '<meta property="og:site_name" content="Hubra Plugins">',
        f'<meta property="og:title" content="{esc(full_title)}">',
        f'<meta property="og:description" content="{esc(page.description)}">',
        f'<meta property="og:url" content="{SITE}{page.path}">',
        f'<meta property="og:image" content="{WEB}/assets/{"og.png" if page.lang == "de" else "og-en.png"}">',
        f'<meta property="og:locale" content="{t["og_locale"]}">',
        '<meta name="twitter:card" content="summary_large_image">',
        '<link rel="preload" href="/assets/fonts/bricolage-grotesque-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="preload" href="/assets/fonts/hanken-grotesk-latin-wght-normal.woff2" as="font" type="font/woff2" crossorigin>',
        '<link rel="stylesheet" href="/assets/site.css">',
        '<script src="/assets/theme.js"></script>',
        '<link rel="stylesheet" href="/assets/market.css">',
        '<script src="/assets/market.js" defer></script>',
        "</head>",
    ]

    other_label, other_hreflang, other_name = t["other_lang"]
    other_href = page.alt or T[alt_lang]["home"]
    nav = "\n".join(
        f"      {link(h, l, aria_current='page') if h == page.path else link(h, l)}" for h, l in t["nav"]
    )
    header = f"""<body>
<a class="skip" href="#main">{t["skip"]}</a>

<header class="top" id="top">
  <div class="wrap">
    <a class="brand" href="{t["home"]}" aria-label="{t["home_label"]}">
      {MARK}
      <span class="wordmark">hubra</span>
      <span class="brand-sub">plugins</span>
    </a>
    <nav class="nav" id="nav" aria-label="{t["nav_label"]}">
{nav}
      <span class="nav-extra">
        {link(t["web"][1], t["web"][0])}
        {link(other_href, other_name, hreflang=other_hreflang, lang=other_hreflang)}
      </span>
    </nav>
    <div class="top-actions">
      <button class="icon-btn theme-btn" type="button" aria-label="{t["theme"]}" title="{t["theme"]}" hidden>{ICON_THEME}</button>
      <a class="lang" href="{other_href}" hreflang="{other_hreflang}" lang="{other_hreflang}" title="{other_name}">{other_label}</a>
      <a class="signin" href="{t["web"][1]}">{t["web"][0]}</a>
      <a class="btn btn-p btn-sm" href="{t["start"][1]}">{t["start"][0]}</a>
      <button class="icon-btn menu-btn" type="button" aria-label="{t["menu"]}" aria-expanded="false" aria-controls="nav" hidden>{ICON_MENU}</button>
    </div>
  </div>
</header>
"""

    cols = []
    for heading, links in t["foot"]:
        items = "\n".join(f"          <li>{link(h, l)}</li>" for h, l in links)
        cols.append(f"""      <div>
        <h2>{heading}</h2>
        <ul>
{items}
        </ul>
      </div>""")
    footer = f"""
<footer class="foot">
  <div class="wrap">
    <div class="foot-brand">
      <a class="brand" href="{t["home"]}" aria-label="{t["home_label"]}">
        {MARK}
        <span class="wordmark">hubra</span>
        <span class="brand-sub">plugins</span>
      </a>
      <p>{t["tagline"]}</p>
    </div>
    <div class="foot-cols">
{chr(10).join(cols)}
    </div>
    <div class="foot-base">
      <span>{t["copy"]}</span>
      {link(other_href, other_name, hreflang=other_hreflang, lang=other_hreflang)}
    </div>
  </div>
</footer>
</body>
</html>
"""
    return "\n".join(head) + "\n" + header + "\n" + expand(page.body, t) + "\n" + footer


def sitemap(pages: list[Page]) -> str:
    lines = [
        '<?xml version="1.0" encoding="UTF-8"?>',
        '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9" xmlns:xhtml="http://www.w3.org/1999/xhtml">',
    ]
    for p in sorted(pages, key=lambda p: p.path):
        if not p.index or p.path.endswith(".html"):
            continue
        lines.append("  <url>")
        lines.append(f"    <loc>{SITE}{p.path}</loc>")
        if p.alt:
            de, en = (p.path, p.alt) if p.lang == "de" else (p.alt, p.path)
            lines.append(f'    <xhtml:link rel="alternate" hreflang="de-CH" href="{SITE}{de}"/>')
            lines.append(f'    <xhtml:link rel="alternate" hreflang="en" href="{SITE}{en}"/>')
        lines.append("  </url>")
    lines.append("</urlset>")
    return "\n".join(lines) + "\n"


# Written next to public/ by the publish workflow, not by this build.
GENERATED = {"/index.json", "/README.md"}


def check_links(outputs: dict[Path, str]) -> list[str]:
    """Every root-relative href/src must point at a file in public/ (or one
    being built, or one the workflow adds), and every #fragment on a page
    must exist on that page."""
    problems = []
    ids: dict[Path, set[str]] = {}
    for path, text in outputs.items():
        ids[path] = set(re.findall(r'\sid="([^"]+)"', text))
    for path, text in outputs.items():
        for ref in re.findall(r'\s(?:href|src)="(/[^"]*)"', text):
            target, _, frag = ref.partition("#")
            if target in GENERATED:
                continue
            file = OUT / target.lstrip("/")
            if target.endswith("/") or target == "":
                file = file / "index.html"
            if file not in outputs and not file.exists():
                problems.append(f"{path.relative_to(ROOT)}: {ref} does not exist")
                continue
            if frag and file in ids and frag not in ids[file]:
                problems.append(f"{path.relative_to(ROOT)}: {ref} has no id '{frag}'")
    return problems


def main() -> int:
    check = "--check" in sys.argv[1:]
    pages = [read_page(p) for p in sorted(SRC.rglob("*.html"))]
    by_path = {p.path: p for p in pages}
    for p in pages:
        if p.alt and p.alt not in by_path:
            sys.exit(f"{p.src}: alt page {p.alt} does not exist")
        if p.alt and by_path[p.alt].alt != p.path:
            sys.exit(f"{p.src}: {p.alt} does not point back with alt: {p.path}")

    outputs: dict[Path, str] = {p.out: render(p, by_path) for p in pages}
    outputs[OUT / "sitemap.xml"] = sitemap(pages)

    problems = check_links(outputs)
    if check:
        for path, text in outputs.items():
            if not path.exists() or path.read_text(encoding="utf-8") != text:
                problems.append(f"{path.relative_to(ROOT)} is out of date: run python3 tools/build.py")
    else:
        for path, text in outputs.items():
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_text(text, encoding="utf-8")
        print(f"built {len(pages)} pages")
    for problem in problems:
        print(problem, file=sys.stderr)
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
