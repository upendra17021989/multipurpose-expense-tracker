"""Check a deployed assistant. Configuration and JWT come only from environment."""
import argparse
import json
import os
import sys
from urllib.error import HTTPError, URLError
from urllib.parse import urlparse
from urllib.request import Request


def check(condition, message):
    if not condition:
        raise RuntimeError(message)


def request(base, path, token=None, payload=None):
    headers = {"Accept": "application/json"}
    if token:
        headers["Authorization"] = "Bearer " + token
    data = None if payload is None else json.dumps(payload).encode()
    if data is not None:
        headers["Content-Type"] = "application/json"
    # Refuse redirects: never forward a JWT to another destination.
    from urllib.request import build_opener, HTTPRedirectHandler

    class NoRedirect(HTTPRedirectHandler):
        def redirect_request(self, req, fp, code, msg, headers, newurl):
            return None

    try:
        with build_opener(NoRedirect).open(Request(base + path, data=data, headers=headers), timeout=90) as response:
            body = response.read(1024 * 1024 + 1)
            check(len(body) <= 1024 * 1024, "API response exceeded size limit")
            return response.status, json.loads(body)
    except HTTPError as error:
        # Do not print response bodies: they may contain personal data.
        return error.code, None
    except (URLError, ValueError):
        raise RuntimeError("API request failed; check connectivity and JSON responses") from None


def run(base, token, expected, question, source_id):
    parsed = urlparse(base)
    check(parsed.scheme in ("http", "https") and parsed.hostname
          and not parsed.username and not parsed.password and not parsed.query and not parsed.fragment,
          "RAG_SMOKE_BASE_URL must be an API URL without credentials, query or fragment")
    check(parsed.scheme == "https" or parsed.hostname in ("localhost", "127.0.0.1", "::1"),
          "Remote API URLs must use HTTPS")
    check(bool(token.strip()), "Set RAG_SMOKE_TOKEN locally to an authenticated test-user JWT")
    base = base.rstrip("/")
    status, _ = request(base, "/chat/status")
    check(status in (401, 403), "Anonymous chat status access was not denied")
    status, _ = request(base, "/chat", payload={"mode": "HELP", "message": question})
    check(status in (401, 403), "Anonymous chat request was not denied")
    status, config = request(base, "/chat/status", token)
    check(status == 200 and isinstance(config, dict), "Authenticated chat status failed")
    check(config.get("enabled") is True, "Assistant is disabled")
    check(config.get("aiConfigured") is (expected != "HELP_SEARCH"),
          "AI configuration does not match the selected expected mode")
    for attempt in range(2):
        status, result = request(base, "/chat", token, {"mode": "HELP", "message": question})
        check(status == 200 and isinstance(result, dict), "Authenticated help request failed")
        check(result.get("mode") == expected, "Help response did not match expected mode " + expected)
        check(isinstance(result.get("answer"), str) and result["answer"].strip(), "Answer was empty")
        sources = result.get("sources")
        check(isinstance(sources, list) and 1 <= len(sources) <= 3, "Missing or excessive source citations")
        check(all(isinstance(source, dict) and isinstance(source.get("url"), str)
                  and source["url"].startswith("/") and not source["url"].startswith("//")
                  and source.get("title") for source in sources), "Invalid source references")
        check(any(source.get("id") == source_id for source in sources), "Expected reviewed source was absent")
        print("PASS help request " + str(attempt + 1) + " (" + expected + ")")
    print("PASS authentication and source checks. Review answer grounding and database cache separately.")


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--expected-mode", choices=("AI", "HELP_SEARCH", "SEARCH_FALLBACK"), default="AI")
    parser.add_argument("--question", default="How do I import expenses?")
    parser.add_argument("--source-id", default="expense-import")
    args = parser.parse_args()
    try:
        run(os.environ.get("RAG_SMOKE_BASE_URL", ""), os.environ.get("RAG_SMOKE_TOKEN", ""),
            args.expected_mode, args.question, args.source_id)
    except RuntimeError as error:
        print("FAIL " + str(error), file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    sys.exit(main())
