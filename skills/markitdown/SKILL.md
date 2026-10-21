---
name: markitdown
description: Convert any document (PDF, Word DOCX, PowerPoint PPTX, Excel XLSX, HTML, Images with OCR, Audio, CSV, JSON, XML, ZIP archives, YouTube URLs) into clean, structured Markdown for LLMs and analysis using Microsoft's MarkItDown utility.
---

# Microsoft MarkItDown Skill

Use this skill when you need to convert documents and media files into structured, token-efficient Markdown suitable for AI processing and analysis.

## Overview

[MarkItDown](https://github.com/microsoft/markitdown) is Microsoft's official utility that preserves document hierarchy (headings, tables, lists, links, metadata) while converting diverse file formats into clean Markdown.

### Supported Formats

| Format | Extensions / Sources | Notes |
| :--- | :--- | :--- |
| **PDF** | `.pdf` | Preserves layout, tables, and text structure |
| **Word** | `.docx`, `.doc` | Converts headings, bullet lists, formatting, tables |
| **PowerPoint** | `.pptx`, `.ppt` | Extracts slide text, speaker notes, tables |
| **Excel** | `.xlsx`, `.xls`, `.csv` | Generates formatted Markdown tables |
| **Images** | `.jpg`, `.png`, `.webp`, `.tiff` | Extracts EXIF metadata; supports OCR / Vision |
| **Audio** | `.mp3`, `.wav` | Metadata extraction and speech transcription |
| **Web & Text** | `.html`, `.xml`, `.json`, `.txt` | Clean semantic extraction |
| **Archives** | `.zip` | Recursively converts files inside archive |
| **Web Video** | YouTube URLs | Fetches and converts video transcripts |

---

## Installation & Setup

### 1. Python Package
Install with all optional dependencies:
```bash
pip install "markitdown[all]"
```

Or install specific format dependencies:
```bash
pip install "markitdown[pdf,docx,pptx,xlsx]"
```

### 2. Verify Installation
```bash
markitdown --help
```

---

## Usage

### 1. Command-Line (CLI)

Convert a single file to Markdown:
```bash
markitdown input.pdf > output.md
# or specify output file directly:
markitdown input.docx -o output.md
```

Convert via stdin / pipe:
```bash
cat report.pdf | markitdown > report.md
```

Enable plugins (such as OCR):
```bash
markitdown --use-plugins scanned.pdf -o scanned.md
```

---

### 2. Python API

Basic conversion:
```python
from markitdown import MarkItDown

md = MarkItDown()
result = md.convert("financial_report.xlsx")
print(result.text_content)
```

Conversion with Vision / OCR model (OpenAI / Azure / Gemini compatible):
```python
from markitdown import MarkItDown
from openai import OpenAI

client = OpenAI()
md = MarkItDown(llm_client=client, llm_model="gpt-4o")
result = md.convert("whiteboard_notes.png")
print(result.text_content)
```

Convert from stream / bytes:
```python
from markitdown import MarkItDown
import io

md = MarkItDown()
with open("document.pdf", "rb") as f:
    result = md.convert_stream(f, file_extension=".pdf")
    print(result.text_content)
```

---

### 3. Model Context Protocol (MCP) Integration

MarkItDown includes an MCP server (`packages/markitdown-mcp`) allowing AI assistants (Claude, Antigravity, Cursor) to directly convert files on demand.

Add to your MCP configuration (`mcp_config.json`):
```json
{
  "mcpServers": {
    "markitdown": {
      "command": "uvx",
      "args": ["markitdown-mcp"]
    }
  }
}
```

Or using `npx` / Python directly:
```bash
uvx markitdown-mcp
```

---

## Best Practices & Security

1. **Token Efficiency:** MarkItDown produces much fewer tokens than raw PDF/Office XML extraction, making it optimal before feeding documents to LLMs.
2. **Security Considerations:** MarkItDown accesses files with current process privileges. Always validate input paths and sanitize untrusted sources.
3. **Large Datasets:** For directories with multiple files, run batch conversion scripts (see `scripts/convert.py`).
