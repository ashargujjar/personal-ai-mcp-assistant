import unittest
import sys
from types import SimpleNamespace
from types import ModuleType
from unittest.mock import MagicMock, Mock, patch

from ingestion.metadata import DocumentMetadata, extract_metadata, store_metadata


def parsed(text="", heading="", metadata=None):
    blocks = []
    for value, is_heading in [(heading, True), (text, False)]:
        if value:
            blocks.append(SimpleNamespace(page_number=1, normalized_text=value,
                lines=[SimpleNamespace(text=value, is_heading_candidate=is_heading)]))
    return SimpleNamespace(blocks=blocks, metadata=metadata or {})


class MetadataTests(unittest.TestCase):
    def test_embedded_title_and_paragraph_avoid_llm(self):
        generate = Mock()
        result = extract_metadata(parsed(
            "This report describes the annual revenue and expenses for all company departments. Another sentence. Third sentence.",
            heading="Heading", metadata={"title": "Annual report", "keywords": "revenue; expenses"}),
            "file.pdf", job_id="job", generator=generate)
        self.assertEqual(result.title, "Annual report")
        self.assertEqual(result.keywords, ["revenue", "expenses"])
        self.assertNotIn("Third", result.short_description)
        generate.assert_not_called()

    def test_heading_replaces_placeholder_title(self):
        result = extract_metadata(parsed(heading="Research results", metadata={"title": "Untitled", "subject": "Research summary."}),
                                  "file.pdf", job_id="job", generator=Mock())
        self.assertEqual(result.title, "Research results")

    def test_missing_metadata_uses_generated_values(self):
        generate = Mock(return_value=DocumentMetadata(title="Budget review", short_description="Reviews the budget.", keywords=["budget"]))
        result = extract_metadata(parsed("Budget"), "scan.pdf", job_id="job", generator=generate)
        self.assertEqual(result.title, "Budget review")
        self.assertEqual(result.short_description, "Reviews the budget.")
        generate.assert_called_once()

    def test_model_error_or_invalid_response_retains_filename(self):
        for generate in [Mock(side_effect=TimeoutError), Mock(return_value={"title": ""})]:
            result = extract_metadata(parsed("Notes"), "C:\\uploads\\Meeting notes.pdf", job_id="job", generator=generate)
            self.assertEqual(result.title, "Meeting notes")
            self.assertEqual(result.short_description, "")

    def test_excerpt_is_bounded(self):
        generate = Mock(return_value=DocumentMetadata(title="Report", short_description="Summary."))
        extract_metadata(parsed("word " * 10000), "file.pdf", job_id="job", generator=generate)
        self.assertLessEqual(len(generate.call_args.args[0]), 8000)

    def test_lost_claim_cannot_write(self):
        db_module = ModuleType("ingestion.db")
        connect = MagicMock()
        db_module.connect_db = connect
        psycopg_module = ModuleType("psycopg")
        types_module = ModuleType("psycopg.types")
        json_module = ModuleType("psycopg.types.json")
        json_module.Jsonb = lambda value: value
        modules = {
            "ingestion.db": db_module,
            "psycopg": psycopg_module,
            "psycopg.types": types_module,
            "psycopg.types.json": json_module,
        }
        with patch.dict(sys.modules, modules):
            connection = connect.return_value.__enter__.return_value
            connection.execute.return_value.fetchone.return_value = None
            self.assertFalse(store_metadata("job", "stale", DocumentMetadata(title="Title", short_description=""), 3))
            self.assertEqual(connection.execute.call_count, 1)


if __name__ == "__main__":
    unittest.main()
