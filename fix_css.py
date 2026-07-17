import os

css_path = 'src/index.css'

with open(css_path, 'r', encoding='utf-8') as f:
    content = f.read()

# 1. Remove Table override
table_css = """  /* ----------------------------------------------------------
     11. Tables — horizontal scroll wrapper
     ---------------------------------------------------------- */
  table {
    display: block;
    overflow-x: auto;
    -webkit-overflow-scrolling: touch;
    white-space: nowrap;
    width: 100%;
  }

  thead {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  tbody {
    display: table;
    width: 100%;
    table-layout: fixed;
  }

  th, td {
    padding: 0.5rem 0.625rem !important;
    font-size: 0.8125rem !important;
  }"""
content = content.replace(table_css, "")

# 2. Remove Sidebar override
sidebar_css = """  /* ----------------------------------------------------------
     Extra: Sidebar — collapse or hide on mobile
     ---------------------------------------------------------- */
  aside,
  [class*="sidebar"],
  nav[class*="w-64"],
  nav[class*="w-72"],
  div[class*="w-64"]:has(nav) {
    position: fixed !important;
    z-index: 50 !important;
    top: 0 !important;
    left: 0 !important;
    bottom: 0 !important;
    width: 80vw !important;
    max-width: 280px !important;
    transform: translateX(-100%) !important;
    transition: transform 0.3s ease !important;
  }

  aside.open,
  [class*="sidebar"].open {
    transform: translateX(0) !important;
  }"""
content = content.replace(sidebar_css, "")

# 3. Remove padding override from inputs
padding_css = "    padding: 0.5rem 0.75rem !important;"
content = content.replace(padding_css, "    /* padding removed to fix search bar overlap */")

with open(css_path, 'w', encoding='utf-8') as f:
    f.write(content)

print("index.css patched successfully.")
