"""Offline helper contracts: no real credentials, network, or system mutations."""
import argparse
import contextlib
import io
import json
import os
from pathlib import Path
import shutil
import subprocess
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
GITEA = ROOT / "skills/coding/gitea-repo/scripts/gitea_api.py"
GROK = ROOT / "skills/automation/grok-bot-team-steward"
api = {"__name__": "gitea_test_module"}
exec(compile(GITEA.read_text(encoding="utf-8"), str(GITEA), "exec"), api)


class GiteaTests(unittest.TestCase):
    def test_ssh_never_infers_plaintext_or_reuses_transport_port(self):
        for remote, expected in [
            ("git@10.0.0.2:team/repo.git", ("https://10.0.0.2", "team", "repo")),
            ("ssh://git@10.0.0.2:2222/team/repo.git", ("https://10.0.0.2", "team", "repo")),
            ("ssh://git@[::1]:2222/team/repo.git", ("https://[::1]", "team", "repo")),
        ]:
            with self.subTest(remote=remote):
                self.assertEqual(api["parse_remote_url"](remote), expected)

    def test_label_lookup_uses_later_pages(self):
        calls = []
        labels = [{"name": f"label-{i}", "id": 1000 + i} for i in range(1, 66)]

        def request(host, token, method, path, query):
            self.assertEqual(method, "GET")
            calls.append(query["page"])
            start = (query["page"] - 1) * query["limit"]
            return labels[start:start + query["limit"]], {}

        with patch.dict(api, api_request=request):
            self.assertEqual(api["resolve_label_ids"]("https://invalid.test", "fake", "owner", "repo", ["label-65", "7"]), [1065, 7])
        self.assertEqual(calls, [1, 2, 3])

    def test_smaller_server_cap_and_more_than_200_pages(self):
        for count, cap in [(65, 30), (205, 1)]:
            with self.subTest(count=count, cap=cap):
                def request(host, token, method, path, query):
                    start = (query["page"] - 1) * cap
                    return list(range(start, min(start + cap, count))), {}
                with patch.dict(api, api_request=request):
                    actual = api["paginate"]("https://invalid.test", "fake", "/labels", {}, True, 50)
                self.assertEqual(actual, list(range(count)))

    def test_repeated_page_and_wrong_response_fail_instead_of_claiming_complete(self):
        for payload in [[{"id": 1}], {"error": "unavailable"}]:
            with self.subTest(payload=payload), patch.dict(api, api_request=lambda *a: (payload, {})):
                with self.assertRaises(api["GiteaError"]):
                    api["paginate"]("https://invalid.test", "fake", "/labels", {}, True, 50)

    def test_missing_context_stops_before_auth_or_network(self):
        args = argparse.Namespace(host=None, repo=None, token=None, remote=None)
        with patch.dict(os.environ, {}, clear=True), patch.dict(api, discover_remote=lambda _: None, credential_token=lambda _: self.fail("auth called"), api_request=lambda *a: self.fail("network called")), contextlib.redirect_stderr(io.StringIO()):
            with self.assertRaises(SystemExit) as error:
                api["resolve_context"](args)
        self.assertEqual(error.exception.code, 1)

    def test_403_user_probe_falls_back_to_reading_repo(self):
        calls = []

        def request(host, token, method, path):
            calls.append((method, path))
            if path == "/user":
                raise api["GiteaError"](403, "missing read:user")
            return {"full_name": "o/r"}, {}

        output = io.StringIO()
        with patch.dict(api, api_request=request), contextlib.redirect_stdout(output):
            api["cmd_whoami"](("https://invalid.test", "o", "r", "fake"), argparse.Namespace(json=True))
        self.assertEqual(calls, [("GET", "/user"), ("GET", "/repos/o/r")])
        self.assertEqual(json.loads(output.getvalue())["repo"], "o/r")


@unittest.skipUnless(shutil.which("bash") and os.name != "nt", "POSIX shell fixtures")
class ShellTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(prefix="wta-helpers-")
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)

    def snapshot(self):
        target = self.root / "grok-bot-team-2026-09-27"
        shutil.copytree(GROK / "templates/snapshot", target)
        shutil.rmtree(target / "bots/_SLUG")
        bot = target / "bots/coder"
        bot.mkdir()
        for name in ["PROFILE.md", "MEMORY.md", "routines.md", "skills.md", "GAPS.md"]:
            (bot / name).write_text("Actual fixture content\n")
        (target / "meta/COMPLETED.md").write_text("# COMPLETED\n- completed_at: 2026-09-27T10:00:00Z\n")
        (target / "meta/IN_PROGRESS.md").unlink(missing_ok=True)
        return target

    def validate(self, target):
        return subprocess.run(["bash", str(GROK / "scripts/validate-snapshot.sh"), str(target)], capture_output=True, text=True)

    def test_completed_real_bot_passes_structure(self):
        result = self.validate(self.snapshot())
        self.assertEqual(result.returncode, 0, result.stdout + result.stderr)
        self.assertIn("content, roster coverage and redaction still require review", result.stdout)

    def test_template_only_cannot_pass(self):
        target = self.root / "grok-bot-team-2026-09-27"
        shutil.copytree(GROK / "templates/snapshot", target)
        (target / "meta/COMPLETED.md").unlink()
        result = self.validate(target)
        self.assertNotEqual(result.returncode, 0)
        self.assertIn("no real bot", result.stdout)
        self.assertIn("COMPLETED", result.stdout)

    def test_empty_completion_marker_and_in_progress_are_rejected(self):
        target = self.snapshot()
        (target / "meta/COMPLETED.md").write_text("# COMPLETED\n- completed_at:\n")
        self.assertNotEqual(self.validate(target).returncode, 0)
        (target / "meta/COMPLETED.md").write_text("- completed_at: 2026-09-27Tplaceholder\n")
        self.assertNotEqual(self.validate(target).returncode, 0)
        (target / "meta/COMPLETED.md").write_text("- completed_at: 2026-09-27T10:00:00Z\n")
        (target / "meta/IN_PROGRESS.md").write_text("pending")
        self.assertNotEqual(self.validate(target).returncode, 0)

    def test_missing_required_bot_file_is_rejected(self):
        target = self.snapshot()
        (target / "bots/coder/MEMORY.md").unlink()
        self.assertNotEqual(self.validate(target).returncode, 0)

    def test_snapshot_names_do_not_overwrite(self):
        command = ["bash", str(GROK / "scripts/snapshot-name.sh"), str(self.root)]
        names = []
        for _ in range(3):
            result = subprocess.run(command, capture_output=True, text=True, check=True)
            path = Path(result.stdout.strip())
            self.assertEqual(path.parent, self.root)
            self.assertFalse(path.exists())
            path.mkdir()
            names.append(path.name)
        self.assertEqual(len(set(names)), 3)

    def test_inventory_requests_cursor_pagination_and_propagates_failure(self):
        fakebin = self.root / "bin"
        fakebin.mkdir()
        log = self.root / "calls.jsonl"
        fake = fakebin / "gh"
        fake.write_text("""#!/usr/bin/env python3
import json,os,sys
args=sys.argv[1:]
with open(os.environ['WTA_MOCK_LOG'],'a') as f: f.write(json.dumps(args)+'\\n')
if args[:3]==['api','user','--jq']: print('fixture-owner')
elif args[:2]==['api','graphql']:
 if os.environ.get('WTA_MOCK_FAIL'): sys.exit(1)
 count=205 if '--paginate' in args else 100
 for i in range(count): print('repo-'+str(i)+'\\tPUBLIC')
else: sys.exit(2)
""")
        fake.chmod(0o755)
        env = {**os.environ, "PATH": f"{fakebin}:{os.environ['PATH']}", "WTA_MOCK_LOG": str(log)}
        command = ["bash", str(ROOT / "skills/coding/github-repo-steward/scripts/inventory.sh")]
        result = subprocess.run(command, env=env, capture_output=True, text=True)
        self.assertEqual(result.returncode, 0, result.stderr)
        self.assertEqual(sum(line.startswith("repo-") for line in result.stdout.splitlines()), 205)
        calls = [json.loads(line) for line in log.read_text().splitlines()]
        graphql = calls[1]
        query = next(value for value in graphql if value.startswith("query="))
        self.assertIn("$endCursor", query)
        self.assertIn("pageInfo { hasNextPage endCursor }", query)
        self.assertIn("login=fixture-owner", graphql)
        failed = subprocess.run(command, env={**env, "WTA_MOCK_FAIL": "1"}, capture_output=True, text=True)
        self.assertNotEqual(failed.returncode, 0)
        missing = subprocess.run(command + ["--user"], env=env, capture_output=True, text=True)
        self.assertEqual(missing.returncode, 2)


if __name__ == "__main__":
    unittest.main()
