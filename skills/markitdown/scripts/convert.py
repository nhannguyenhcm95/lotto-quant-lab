#!/usr/bin/env python3
"""
Convert documents and media files to Markdown using Microsoft MarkItDown.
Usage:
    python convert.py <input_file_or_dir> [-o <output_file>]
"""

import sys
import os
import argparse
from pathlib import Path

def convert_path(input_path: str, output_path: str = None):
    try:
        from markitdown import MarkItDown
    except ImportError:
        print("Error: 'markitdown' is not installed. Run: pip install markitdown[all]")
        sys.exit(1)

    md = MarkItDown()
    in_p = Path(input_path)

    if in_p.is_file():
        print(f"Converting: {in_p.name}...")
        try:
            result = md.convert(str(in_p))
            content = result.text_content

            if output_path:
                out_p = Path(output_path)
            else:
                out_p = in_p.with_suffix(".md")

            out_p.write_text(content, encoding="utf-8")
            print(f"✓ Saved to {out_p}")
        except Exception as e:
            print(f"Failed to convert {in_p}: {e}")
    elif in_p.is_dir():
        print(f"Processing directory: {in_p}")
        for f in in_p.rglob("*"):
            if f.is_file() and not f.name.endswith(".md"):
                try:
                    res = md.convert(str(f))
                    out_f = f.with_suffix(".md")
                    out_f.write_text(res.text_content, encoding="utf-8")
                    print(f"✓ Converted: {f.name} -> {out_f.name}")
                except Exception as e:
                    # Skip unparseable files
                    pass
    else:
        print(f"Invalid path: {input_path}")

def main():
    parser = argparse.ArgumentParser(description="Convert files to Markdown via MarkItDown.")
    parser.add_argument("input", help="File or folder path to convert")
    parser.add_argument("-o", "--output", help="Optional output Markdown file path")
    args = parser.parse_args()

    convert_path(args.input, args.output)

if __name__ == "__main__":
    main()
