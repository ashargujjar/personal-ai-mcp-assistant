from dataclasses import asdict, dataclass
from pathlib import Path
import re
import unicodedata
import pymupdf


@dataclass
class TextBlock:
    page_number: int
    block_index: int
    text: str
    normalized_text: str
    bbox: tuple[float, float, float, float]

@dataclass
class ParsedPDF:
    page_count: int
    blocks: list[TextBlock]
    pages_without_text: list[int]

@dataclass
class TextUnit:
    page_number: int
    source_block_index: int
    unit_index: int
    text: str
    layout_hint: str

def normalize_text(text: str) -> str:
    # Standardize canonically equivalent Unicode characters.
    text = unicodedata.normalize("NFC", text)

    # Standardize line endings.
    text = text.replace("\r\n", "\n").replace("\r", "\n")

    # Convert non-breaking spaces to ordinary spaces.
    text = text.replace("\u00a0", " ")

    # Remove trailing horizontal whitespace, preserving indentation.
    lines = [line.rstrip(" \t") for line in text.split("\n")]
    text = "\n".join(lines)

    # Keep at most one empty line between text lines.
    text = re.sub(r"\n{3,}", "\n\n", text)

    return text.strip("\n")

def extract_pdf(pdf_path: str | Path) -> ParsedPDF:
    blocks = []
    pages_without_text = []

    with pymupdf.open(pdf_path) as document:
        if document.needs_pass:
            raise ValueError("This PDF requires a password")

        for page_number, page in enumerate(document, start=1):
            raw_blocks = page.get_text("blocks", sort=True)
            page_blocks = []

            for raw_block in raw_blocks:
                block_type = raw_block[6]

                # PyMuPDF uses block type 0 for text.
                if block_type != 0:
                    continue

                text = raw_block[4]

                if not text.strip():
                    continue

                page_blocks.append(
                    TextBlock(
                        page_number=page_number,
                        block_index=len(page_blocks),
                        text=text,
                        normalized_text=normalize_text(text),
                        bbox=tuple(
                            float(value) for value in raw_block[:4]
                        ),
                    )
                )

            if not page_blocks:
                pages_without_text.append(page_number)

            blocks.extend(page_blocks)

        result = ParsedPDF(
            page_count=len(document),
            blocks=blocks,
            pages_without_text=pages_without_text,
        )

    return result

LIST_MARKER = re.compile(
    r"^\s*(?:[-*•▪◦]|\d+[.)]|[A-Za-z][.)])\s+"
)


def build_text_units(blocks: list[TextBlock]) -> list[TextUnit]:
    units = []

    for block in blocks:
        # Blank lines provide an initial boundary within a block.
        groups = re.split(
            r"\n[ \t]*\n",
            block.normalized_text,
        )

        unit_index = 0

        for group in groups:
            lines = [
                line.rstrip(" \t")
                for line in group.split("\n")
                if line.strip()
            ]

            if not lines:
                continue

            has_list_marker = any(
                LIST_MARKER.match(line)
                for line in lines
            )

            # A clue that spacing may carry layout information.
            # This does not prove that the content is a table.
            has_alignment = any(
                "\t" in line
                or re.search(r"\S {3,}\S", line)
                for line in lines
            )

            # Preserve unresolved line-ending hyphenation for now.
            has_line_end_hyphen = any(
                line.rstrip().endswith(("-", "\u00ad"))
                for line in lines[:-1]
            )

            if has_list_marker:
                text = "\n".join(lines)
                layout_hint = "list_candidate"
            elif has_alignment or has_line_end_hyphen:
                text = "\n".join(lines)
                layout_hint = "preserve_lines"
            else:
                text = " ".join(
                    line.strip() for line in lines
                )
                layout_hint = "prose_candidate"

            units.append(
                TextUnit(
                    page_number=block.page_number,
                    source_block_index=block.block_index,
                    unit_index=unit_index,
                    text=text,
                    layout_hint=layout_hint,
                )
            )

            unit_index += 1

    return units

if __name__ == "__main__":
    import argparse
    import json
    from ingestion.chunker import chunk_units

    parser = argparse.ArgumentParser(
        description="Extract PDF text blocks with page references"
    )
    parser.add_argument("pdf_path")
    parser.add_argument("--output", required=True)
    args = parser.parse_args()

    parsed = extract_pdf(args.pdf_path)
    units = build_text_units(parsed.blocks)
    chunks = chunk_units(
    units,
    target_tokens=512,
    max_tokens=768,
     )
    payload = asdict(parsed)
    payload["units"] = [asdict(unit) for unit in units]

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Pages: {parsed.page_count}")
    print(f"Text blocks: {len(parsed.blocks)}")
    print(f"Pages without text: {parsed.pages_without_text}")
    print(f"Saved extraction to: {output_path}")
    print(f"Text units: {len(units)}")