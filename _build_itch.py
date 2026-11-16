#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""Build the itch.io upload zip: index.html + music/ only.

Usage:
    python _build_itch.py [output.zip]

The zip root must contain index.html directly (no wrapping folder) or itch.io
will refuse to run it in the browser. Only the game shell and its audio folder
go in: the SEO landing pages, tests and images stay out of the build.
"""
import os
import sys
import zipfile

ROOT = os.path.dirname(os.path.abspath(__file__))
DEFAULT_OUT = r"C:\Users\Johnmilton\WorkBuddy\2026-11-15-16-20-35\itch-listing\upload\my-life-itch.zip"


def collect():
    files = ["index.html"]
    music_dir = os.path.join(ROOT, "music")
    if os.path.isdir(music_dir):
        for name in sorted(os.listdir(music_dir)):
            if name.lower().endswith((".mp3", ".ogg", ".m4a")):
                files.append("music/" + name)
    return files


def main():
    out = sys.argv[1] if len(sys.argv) > 1 else DEFAULT_OUT
    files = collect()
    missing = [f for f in files if not os.path.exists(os.path.join(ROOT, f))]
    if missing:
        print("MISSING:", missing)
        return 1
    os.makedirs(os.path.dirname(out), exist_ok=True)
    if os.path.exists(out):
        os.remove(out)
    with zipfile.ZipFile(out, "w", zipfile.ZIP_DEFLATED) as z:
        for f in files:
            z.write(os.path.join(ROOT, f), f)
    size = os.path.getsize(out) / 1e6
    names = zipfile.ZipFile(out).namelist()
    html_ok = names[0] == "index.html"
    print("built:", out)
    print("size: %.1f MB   files: %d   index.html at root: %s" % (size, len(names), html_ok))
    return 0 if html_ok else 2


if __name__ == "__main__":
    raise SystemExit(main())
