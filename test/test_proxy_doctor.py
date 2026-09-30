"""Offline tests: mocks never contact a controller, proxy, or third-party service."""
import contextlib
import importlib.util
import io
import json
from pathlib import Path
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]

def load(name, path):
    spec = importlib.util.spec_from_file_location(name, ROOT / path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module

d = load("doctor", "skills/system/clash-client-profile/scripts/proxy_doctor.py")
r = load("renderer", "skills/system/clash-client-profile/scripts/render_rules.py")
a = load("audit", "skills/system/system-health-audit/scripts/system_audit.py")

class DoctorTests(unittest.TestCase):
    def test_loopback_endpoints(self):
        for endpoint in ("http://127.0.0.1:7890", "socks5h://[::1]:1080", "https://127.0.0.1:7890"):
            self.assertEqual(d.local_endpoint(endpoint), endpoint)

    def test_unsafe_endpoints(self):
        for endpoint in ("http://example.com:80", "http://127.0.0.1", "http://user:SECRET@127.0.0.1:80",
                         "http://127.0.0.1:80/path", "socks5://127.0.0.1:1080", "http://[::1]:0",
                         "http://127.0.0.1:80?token=SECRET", "http://127.0.0.1:80\n"):
            with self.subTest(endpoint=endpoint), self.assertRaises(ValueError):
                d.local_endpoint(endpoint)

    def test_environment_secrets_redacted(self):
        data = d.environment_summary({"HTTPS_PROXY": "http://user:SECRET@host:80",
                                      "NO_PROXY": "private.example,api.anthropic.com", "UNRELATED_SECRET": "SECRET"})
        text = json.dumps(data)
        self.assertNotIn("SECRET", text)
        self.assertNotIn("private.example", text)
        self.assertTrue(data["HTTPS_PROXY"]["credentials_present"])

    def test_suffix_boundary(self):
        self.assertTrue(d.target_host("API.Anthropic.COM."))
        self.assertFalse(d.target_host("anthropic.com.evil.example"))
        self.assertFalse(d.target_host("notanthropic.com"))
        self.assertFalse(d.target_host(None))

    def test_direct_chain(self):
        data = {"connections": [{"metadata": {"host": "api.anthropic.com", "processPath": "SECRET"},
                                  "chains": ["DIRECT", "private group"], "rule": "Match"}]}
        result = d.analyze_connections(data)
        self.assertEqual(result["status"], "FAIL")
        self.assertNotIn("private group", json.dumps(result))
        self.assertNotIn("SECRET", json.dumps(result))

    def test_non_direct_not_full_verification(self):
        result = d.analyze_connections({"connections": [{"metadata": {"host": "claude.ai"}, "chains": ["US node"]}]})
        self.assertEqual(result["status"], "UNVERIFIED")
        self.assertEqual(result["observations"][0]["status"], "OBSERVED")

    def test_reject_not_ip_leak(self):
        result = d.analyze_connections({"connections": [{"metadata": {"host": "claude.ai"}, "chains": ["REJECT"]}]})
        self.assertEqual(result["observations"][0]["status"], "BLOCKED")
        self.assertEqual(result["status"], "UNVERIFIED")

    def test_missing_and_malformed_connections(self):
        for data in (None, [], {}, {"connections": "bad"}, {"connections": []},
                     {"connections": [None, {"metadata": []}, {"metadata": {"host": "claude.ai"}, "chains": []}]}):
            with self.subTest(data=data):
                self.assertEqual(d.analyze_connections(data)["status"], "UNVERIFIED")

    def test_curl_no_family_flag_or_direct_fallback(self):
        args = d.curl_command("curl", "http://127.0.0.1:7890", 6)
        self.assertEqual(args[1], "-q")
        self.assertIn("https://api6.ipify.org", args)
        self.assertNotIn("-6", args)
        self.assertNotIn("--insecure", args)
        self.assertNotIn("--location", args)
        self.assertEqual(args[args.index("--noproxy") + 1], "")

    def test_probe_failure_not_retried(self):
        with patch.object(d.shutil, "which", return_value="curl"), patch.object(d.subprocess, "run") as run:
            run.return_value.returncode = 7
            result = d.probe("http://127.0.0.1:7890", 4)
            self.assertEqual(result["status"], "UNVERIFIED")
            self.assertEqual(run.call_count, 1)

    def test_default_makes_no_requests(self):
        with patch.object(d, "probe", side_effect=AssertionError("network")), patch.object(d, "read_controller", side_effect=AssertionError("network")), contextlib.redirect_stdout(io.StringIO()) as out:
            self.assertEqual(d.main([]), 0)
        self.assertFalse(json.loads(out.getvalue())["network_requested"])

    def test_network_requires_consent(self):
        with contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            d.main(["--proxy", "http://127.0.0.1:7890"])
        self.assertEqual(error.exception.code, 2)

    def test_strict_inconclusive_exit(self):
        with contextlib.redirect_stdout(io.StringIO()):
            self.assertEqual(d.main(["--strict"]), 3)

    def test_offline_direct_exit(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)/"connections.json"
            p.write_text(json.dumps({"connections": [{"metadata": {"host": "claude.ai"}, "chains": ["DIRECT"]}]}))
            with contextlib.redirect_stdout(io.StringIO()):
                self.assertEqual(d.main(["--connections", str(p)]), 1)

    def test_oversized_snapshot(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)/"connections.json"
            p.write_bytes(b" " * (d.LIMIT + 1))
            with contextlib.redirect_stdout(io.StringIO()) as out:
                self.assertEqual(d.main(["--connections", str(p)]), 0)
            self.assertEqual(json.loads(out.getvalue())["connections"]["status"], "UNVERIFIED")

    def test_domain_validation(self):
        self.assertEqual(d.domain("API.Anthropic.COM."), "api.anthropic.com")
        for value in ("https://claude.ai", "*.claude.ai", "127.0.0.1", "a..com", "-a.com"):
            with self.assertRaises(Exception):
                d.domain(value)

    def test_redirect_refused(self):
        with self.assertRaises(d.urllib.error.HTTPError):
            d.NoRedirect().redirect_request(d.urllib.request.Request("http://127.0.0.1:9090"), None, 302, "found", {}, "https://example.com")

class RulesTests(unittest.TestCase):
    def test_unicode_group_and_no_keyword_or_process_guess(self):
        text = r.render("🔰 节点选择")
        self.assertIn("DOMAIN-SUFFIX,anthropic.com,🔰 节点选择", text)
        self.assertNotIn("DOMAIN-KEYWORD", text)
        self.assertNotIn("PROCESS-", text)
        self.assertNotIn("IP-CIDR", text)

    def test_reject_invalid_groups(self):
        for group in ("", " ", "DIRECT", "REJECT", "group,else", "group\nelse", "group\x01"):
            with self.assertRaises(ValueError):
                r.render(group)

    def test_yaml_strings_are_escaped(self):
        text = r.render('group "quoted"')
        self.assertIn('\\"quoted\\"', text)

class AuditTests(unittest.TestCase):
    def test_readonly_and_no_path_output(self):
        with tempfile.TemporaryDirectory() as tmp:
            result = a.audit(Path(tmp))
            self.assertEqual(result["actions"]["settings_changed"], 0)
            self.assertNotIn(tmp, json.dumps(result))
            self.assertGreater(result["filesystem"]["total_bytes"], 0)

    def test_bad_directory(self):
        with tempfile.TemporaryDirectory() as tmp:
            with self.assertRaises(ValueError):
                a.audit(Path(tmp)/"missing")

if __name__ == "__main__":
    unittest.main()
