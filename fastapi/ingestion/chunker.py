from dataclasses import dataclass

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

    for unit in units:
        if not unit.text.strip():
            continue

        unit_tokens = count_tokens(unit.text)

        if unit_tokens > max_tokens:
            raise ValueError(
                "Oversized text unit: "
                f"page={unit.page_number}, "
                f"block={unit.source_block_index}, "
                f"unit={unit.unit_index}, "
                f"tokens={unit_tokens}, "
                f"maximum={max_tokens}. "
                "Split this unit before packing."
            )

        candidate = combined_text([*current_units, unit])

        if current_units and count_tokens(candidate) > max_tokens:
            flush()

        current_units.append(unit)

        if count_tokens(combined_text(current_units)) >= target_tokens:
            flush()

    flush()
    return chunks