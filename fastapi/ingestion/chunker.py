from dataclasses import dataclass, replace
import re
from collections.abc import Callable

import tiktoken

from ingestion.pdf_parser import TextUnit


@dataclass
class Chunk:
    chunk_index: int
    text: str
    token_count: int
    page_start: int
    page_end: int
    source_units: list[dict[str, int]]


def split_oversized_unit(
    unit: TextUnit,
    max_tokens: int,
    count_tokens: Callable[[str], int],
) -> list[TextUnit]:
    """Split at sentences, then whitespace, then Unicode character boundaries."""
    if count_tokens(unit.text) <= max_tokens:
        return [unit]

    def split_long_word(text: str) -> list[str]:
        if count_tokens(text) <= max_tokens:
            return [text]
        if len(text) <= 1:
            raise ValueError(
                "max_tokens is too small to hold one Unicode character"
            )
        # Splitting Python strings avoids decoding partial UTF-8 token bytes.
        middle = len(text) // 2
        return split_long_word(text[:middle]) + split_long_word(text[middle:])

    pieces = []
    # A lightweight heuristic; abbreviations may also create boundaries.
    for sentence in re.split(r"(?<=[.!?])(?=\s)", unit.text):
        if count_tokens(sentence) <= max_tokens:
            pieces.append(sentence)
        else:
            for word in re.findall(r"\S+\s*|\s+", sentence):
                pieces.extend(split_long_word(word))

    parts = []
    current = ""
    for piece in pieces:
        candidate = current + piece
        if current and count_tokens(candidate) > max_tokens:
            parts.append(current)
            current = piece
        else:
            current = candidate
    if current:
        parts.append(current)

    # Keep the original source IDs on every fragment. Only the first fragment
    # of an oversized heading starts a section.
    return [
        replace(
            unit,
            text=part,
            layout_hint=(
                "heading_continuation"
                if index > 0 and unit.layout_hint == "heading_candidate"
                else unit.layout_hint
            ),
        )
        for index, part in enumerate(parts)
    ]


def chunk_units(
    units: list[TextUnit],
    target_tokens: int = 512,
    max_tokens: int = 768,
    encoding_name: str = "cl100k_base",
) -> list[Chunk]:
    if not 0 < target_tokens <= max_tokens:
        raise ValueError(
            "Require 0 < target_tokens <= max_tokens"
        )

    tokenizer = tiktoken.get_encoding(encoding_name)

    def count_tokens(text: str) -> int:
        # Treat special-looking strings in PDFs as ordinary text.
        return len(tokenizer.encode_ordinary(text))

    chunks = []
    current_units = []

    def combined_text(items: list[TextUnit]) -> str:
        return "\n\n".join(unit.text for unit in items)

    def flush():
        if not current_units:
            return

        text = combined_text(current_units)
        pages = [unit.page_number for unit in current_units]

        chunks.append(
            Chunk(
                chunk_index=len(chunks),
                text=text,
                token_count=count_tokens(text),
                page_start=min(pages),
                page_end=max(pages),
                source_units=[
                    {
                        "page_number": unit.page_number,
                        "block_index": unit.source_block_index,
                        "unit_index": unit.unit_index,
                    }
                    for unit in current_units
                ],
            )
        )

        current_units.clear()

    prepared_units = (
        fragment
        for source_unit in units
        if source_unit.text.strip()
        for fragment in split_oversized_unit(
            source_unit, max_tokens, count_tokens
        )
    )

    for unit in prepared_units:
        if not unit.text.strip():
            continue

        # Each candidate heading starts a new provisional section.
        if unit.layout_hint == "heading_candidate":
            flush()

        candidate = combined_text([*current_units, unit])

        if current_units and count_tokens(candidate) > max_tokens:
            flush()

        current_units.append(unit)

        # Keep a heading open for the following body unit when it fits.
        if (
            unit.layout_hint != "heading_candidate"
            and count_tokens(combined_text(current_units)) >= target_tokens
        ):
            flush()

    flush()
    return chunks
