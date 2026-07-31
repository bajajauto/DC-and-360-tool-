#!/usr/bin/env python3
"""
============================================================================
EMBED FONTS INTO THE 360 REPORT TEMPLATE
============================================================================
Turns the template into a TRULY self-contained file: the fonts are baked in
as base64 @font-face rules, so rendering never depends on the network or on
which fonts the server has installed. Run this once whenever the font files
or the template change.

WHY THIS EXISTS
---------------
The template previously loaded Montserrat from Google Fonts (a network fetch)
and relied on Impact being a system font. On a render server with no internet
or no Impact installed, both fall back and the report looks wrong. Embedding
removes that dependency entirely.

WHAT YOU NEED
-------------
Font files placed in ./fonts/ with these EXACT names (weights matter):

  Body (Montserrat, SIL Open Font License - free to embed):
    fonts/Montserrat-Regular.ttf       (weight 400)
    fonts/Montserrat-SemiBold.ttf      (weight 600)
    fonts/Montserrat-Bold.ttf          (weight 700)
    fonts/Montserrat-Italic.ttf        (weight 400 italic)
    fonts/Montserrat-SemiBoldItalic.ttf(weight 600 italic)
    fonts/Montserrat-BoldItalic.ttf    (weight 700 italic)

  Titles (Anton, SIL Open Font License - the Impact-style condensed face):
    fonts/Anton-Regular.ttf

  Download both free from Google Fonts:
    https://fonts.google.com/specimen/Montserrat
    https://fonts.google.com/specimen/Anton

  (.woff2 also works and is smaller; if you have .woff2, change EXT/format
   in FONT_FILES below to "woff2" / "woff2".)

USAGE
-----
    python embed_fonts.py 360_Degree_Report_Template.html 360_Degree_Report_Template_EMBEDDED.html

The output HTML is what you ship / render. Nothing else about the template
changes - same tokens, same layout.
============================================================================
"""
import sys, os, base64, re

FONT_DIR = "fonts"

# family, weight, style, filename, format
FONT_FILES = [
    ("Montserrat", 400, "normal", "Montserrat-Regular.ttf",        "truetype"),
    ("Montserrat", 600, "normal", "Montserrat-SemiBold.ttf",       "truetype"),
    ("Montserrat", 700, "normal", "Montserrat-Bold.ttf",           "truetype"),
    ("Montserrat", 400, "italic", "Montserrat-Italic.ttf",         "truetype"),
    ("Montserrat", 600, "italic", "Montserrat-SemiBoldItalic.ttf", "truetype"),
    ("Montserrat", 700, "italic", "Montserrat-BoldItalic.ttf",     "truetype"),
    ("ReportTitle", 400, "normal", "Impact.ttf",                   "truetype"),
]

def face_block(family, weight, style, path, fmt):
    with open(path, "rb") as f:
        b64 = base64.b64encode(f.read()).decode("ascii")
    mime = {"truetype": "font/ttf", "woff2": "font/woff2", "woff": "font/woff"}[fmt]
    return (
        "  @font-face{\n"
        f"    font-family:'{family}';\n"
        f"    font-style:{style};\n"
        f"    font-weight:{weight};\n"
        "    font-display:block;\n"
        f"    src:url(data:{mime};base64,{b64}) format('{fmt}');\n"
        "  }\n"
    )

def main():
    if len(sys.argv) != 3:
        print(__doc__)
        print("ERROR: need input and output paths.")
        sys.exit(1)
    src, dst = sys.argv[1], sys.argv[2]

    # Build all @font-face blocks
    faces = []
    missing = []
    for family, weight, style, fname, fmt in FONT_FILES:
        path = os.path.join(FONT_DIR, fname)
        if not os.path.exists(path):
            missing.append(path)
            continue
        faces.append(face_block(family, weight, style, path, fmt))
    if missing:
        print("Missing font files (place them in ./fonts/):")
        for m in missing:
            print("   ", m)
        print("\nDownload Montserrat and Anton from Google Fonts (links in this script's header).")
        sys.exit(1)

    style_block = "<style id=\"embedded-fonts\">\n" + "".join(faces) + "</style>\n"

    html = open(src, encoding="utf-8").read()

    # 1. Remove the Google Fonts <link> tags (network dependency).
    html = re.sub(r'\s*<link[^>]*fonts\.(googleapis|gstatic)\.com[^>]*>', '', html)

    # 2. Insert the @font-face <style> right after <head>.
    html = re.sub(r'(<head[^>]*>)', r'\1\n' + style_block, html, count=1)

    # 3. Point the CSS variables at the embedded families.
    #    Body -> 'Montserrat' (kept name, now embedded).
    #    Titles -> 'ReportTitle' (Anton), replacing the Impact system stack.
    html = html.replace(
        '--title-serif: "Impact", "Haettenschweiler", "Arial Narrow Bold", sans-serif;',
        "--title-serif: 'ReportTitle', 'Impact', 'Arial Narrow', sans-serif;"
    )
    html = html.replace(
        '--body: "Montserrat", "Segoe UI", Arial, sans-serif;',
        "--body: 'Montserrat', 'Segoe UI', Arial, sans-serif;"
    )

    open(dst, "w", encoding="utf-8").write(html)
    kb = os.path.getsize(dst) // 1024
    print(f"Wrote {dst} ({kb} KB) with {len(faces)} fonts embedded.")
    print("This file renders identically anywhere - no network, no system fonts needed.")

if __name__ == "__main__":
    main()
