from collections import Counter
from dataclasses import asdict, dataclass, field
from pathlib import Path
import re
import unicodedata
import pymupdf


@dataclass
class TextSpan:
    text: str
    font_name: str
    font_size: float
    is_bold: bool


@dataclass
class TextLine:
    text: str
    bbox: tuple[float, float, float, float]
    spans: list[TextSpan]
    is_heading_candidate: bool = False


@dataclass
class TextBlock:
    page_number: int
    block_index: int
    text: str
    normalized_text: str
    bbox: tuple[float, float, float, float]
    lines: list[TextLine]

@dataclass
class ParsedPDF:
    page_count: int
    blocks: list[TextBlock]
    pages_without_text: list[int]
    metadata: dict[str, str] = field(default_factory=dict)

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
            # Keep line/span metadata, excluding image bytes from extraction.
            page_data = page.get_text(
                "dict",
                sort=True,
                flags=pymupdf.TEXTFLAGS_DICT & ~pymupdf.TEXT_PRESERVE_IMAGES,
            )
            page_blocks = []

            for raw_block in page_data["blocks"]:
                block_type = raw_block["type"]

                # PyMuPDF uses block type 0 for text.
                if block_type != 0:
                    continue

                lines = []
                for raw_line in raw_block["lines"]:
                    # A line may contain multiple fonts or bold only some words.
                    spans = [
                        TextSpan(
                            text=span["text"],
                            font_name=span["font"],
                            font_size=float(span["size"]),
                            is_bold=bool(span["flags"] & pymupdf.TEXT_FONT_BOLD),
                        )
                        for span in raw_line["spans"]
                    ]
                    lines.append(
                        TextLine(
                            text="".join(span.text for span in spans),
                            bbox=tuple(float(value) for value in raw_line["bbox"]),
                            spans=spans,
                        )
                    )

                text = "\n".join(line.text for line in lines)

                if not text.strip():
                    continue

                page_blocks.append(
                    TextBlock(
                        page_number=page_number,
                        block_index=len(page_blocks),
                        text=text,
                        normalized_text=normalize_text(text),
                        bbox=tuple(
                            float(value) for value in raw_block["bbox"]
                        ),
                        lines=lines,
                    )
                )

            if not page_blocks:
                pages_without_text.append(page_number)

            blocks.extend(page_blocks)

        result = ParsedPDF(
            page_count=len(document),
            blocks=blocks,
            pages_without_text=pages_without_text,
            metadata=dict(document.metadata or {}),
        )

    return result

LIST_MARKER = re.compile(
    r"^\s*(?:[-*•▪◦]|\d+[.)]|[A-Za-z][.)])\s+"
)


def estimate_body_font_size(blocks: list[TextBlock]) -> float | None:
    characters_by_size = Counter()

    for block in blocks:
        for line in block.lines:
            for span in line.spans:
                character_count = sum(
                    1 for character in span.text
                    if not character.isspace()
                )

                if character_count == 0 or span.font_size <= 0:
                    continue

                # Group tiny differences such as 10.999 and 11.001.
                font_size = round(span.font_size, 1)
                characters_by_size[font_size] += character_count

    if not characters_by_size:
        return None

    return characters_by_size.most_common(1)[0][0]


def mark_heading_candidates(
    blocks: list[TextBlock],
    body_font_size: float | None,
) -> None:
    for block in blocks:
        for line in block.lines:
            line.is_heading_candidate = False

            if body_font_size is None:
                continue

            text = line.text.strip()

            # Initial heuristic: headings are usually relatively short.
            if not text or len(text) > 120 or len(text.split()) > 16:
                continue

            characters_by_size = Counter()

            for span in line.spans:
                character_count = sum(
                    1 for character in span.text
                    if not character.isspace()
                )

                if character_count == 0 or span.font_size <= 0:
                    continue

                font_size = round(span.font_size, 1)
                characters_by_size[font_size] += character_count

            if not characters_by_size:
                continue

            main_font_size = characters_by_size.most_common(1)[0][0]

            line.is_heading_candidate = (
                main_font_size >= body_font_size * 1.2
            )


def build_text_units(blocks: list[TextBlock]) -> list[TextUnit]:
    units = []

    for block in blocks:
        # Preserve heading boundaries before joining ordinary text lines.
        groups = []
        body_lines = []

        def flush_body():
            if body_lines:
                groups.extend(
                    (group, False)
                    for group in re.split(
                        r"\n[ \t]*\n", normalize_text("\n".join(body_lines))
                    )
                )
                body_lines.clear()

        for line in block.lines:
            if line.is_heading_candidate and line.text.strip():
                flush_body()
                groups.append((normalize_text(line.text), True))
            else:
                body_lines.append(line.text)
        flush_body()

        unit_index = 0

        for group, is_heading in groups:
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

            if is_heading:
                text = " ".join(line.strip() for line in lines)
                layout_hint = "heading_candidate"
            elif has_list_marker:
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

    parser = argparse.ArgumentParser(
        description="Extract PDF text blocks with page references"
    )
    parser.add_argument("pdf_path")
    parser.add_argument("--output", required=True)
    parser.add_argument(
        "--extract-only",
        action="store_true",
        help="Inspect text and font metadata without running the chunker",
    )
    args = parser.parse_args()

    parsed = extract_pdf(args.pdf_path)
    body_font_size = estimate_body_font_size(parsed.blocks)
    mark_heading_candidates(parsed.blocks, body_font_size)
    units = build_text_units(parsed.blocks)
    if not args.extract_only:
        from ingestion.chunker import chunk_units

        chunks = chunk_units(units, target_tokens=512, max_tokens=768)
    payload = asdict(parsed)
    payload["estimated_body_font_size"] = body_font_size
    payload["units"] = [asdict(unit) for unit in units]
    if not args.extract_only:
        payload["chunks"] = [asdict(chunk) for chunk in chunks]

    output_path = Path(args.output)
    output_path.parent.mkdir(parents=True, exist_ok=True)
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )

    print(f"Pages: {parsed.page_count}")
    print(f"Text blocks: {len(parsed.blocks)}")
    print(f"Estimated body font size: {body_font_size}")
    print(f"Pages without text: {parsed.pages_without_text}")
    print(f"Saved extraction to: {output_path}")
    print(f"Text units: {len(units)}")
    print(f"Heading candidates: {sum(unit.layout_hint == 'heading_candidate' for unit in units)}")
    if not args.extract_only:
        print(f"Chunks: {len(chunks)}")
