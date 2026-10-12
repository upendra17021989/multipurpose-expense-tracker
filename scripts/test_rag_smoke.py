import unittest
from unittest.mock import patch
import rag_smoke


class RagSmokeTest(unittest.TestCase):
    def responses(self, mode="AI"):
        result = {"mode": mode, "answer": "Reviewed answer", "sources": [
            {"id": "expense-import", "title": "Import expenses", "url": "/expenses"}]}
        return [(401, None), (403, None), (200, {"enabled": True, "aiConfigured": mode != "HELP_SEARCH"}),
                (200, result), (200, result)]

    def test_ai_and_fallback_modes(self):
        for mode in ("AI", "HELP_SEARCH", "SEARCH_FALLBACK"):
            with self.subTest(mode=mode), patch.object(rag_smoke, "request", side_effect=self.responses(mode)):
                rag_smoke.run("https://staging.example/api", "test-token", mode, "import expenses", "expense-import")

    def test_unexpected_fallback_fails_ai_verification(self):
        responses = self.responses()
        responses[3][1]["mode"] = "SEARCH_FALLBACK"
        with patch.object(rag_smoke, "request", side_effect=responses), self.assertRaises(RuntimeError):
            rag_smoke.run("https://staging.example/api", "test-token", "AI", "import expenses", "expense-import")

    def test_anonymous_access_fails(self):
        with patch.object(rag_smoke, "request", return_value=(200, {})), self.assertRaises(RuntimeError):
            rag_smoke.run("https://staging.example/api", "test-token", "AI", "import expenses", "expense-import")

    def test_missing_source_fails(self):
        responses = self.responses()
        responses[3][1]["sources"] = []
        with patch.object(rag_smoke, "request", side_effect=responses), self.assertRaises(RuntimeError):
            rag_smoke.run("https://staging.example/api", "test-token", "AI", "import expenses", "expense-import")

    def test_missing_config_and_unsafe_urls_fail_before_network(self):
        for base, token in [("", ""), ("http://remote.example/api", "token"),
                            ("https://user:pass@example.com/api", "token"), ("https://example.com/api", "")]:
            with self.subTest(base=base), patch.object(rag_smoke, "request") as request, self.assertRaises(RuntimeError):
                rag_smoke.run(base, token, "AI", "import expenses", "expense-import")
            request.assert_not_called()


if __name__ == "__main__":
    unittest.main()
