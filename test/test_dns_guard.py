"""Offline DNS regressions. No external DNS, controller, proxy, or OS mutations."""
import contextlib
import copy
import importlib.util
import io
import json
import os
from pathlib import Path
import random
import struct
import subprocess
import sys
import tempfile
import unittest
from unittest.mock import patch

ROOT = Path(__file__).resolve().parents[1]
SCRIPT = ROOT / 'skills/system/clash-client-profile/scripts/dns_guard.py'
spec = importlib.util.spec_from_file_location('dns_guard', SCRIPT)
g = importlib.util.module_from_spec(spec)
spec.loader.exec_module(g)


def raw_policy():
    return {'schema_version': 1, 'group': '🔰 节点选择', 'resolvers': ['https://1.1.1.1/dns-query'],
            'bootstrap': {'mode': 'deny'}, 'ipv6': 'tunnel', 'targets': ['anthropic.com', 'claude.ai']}


def config():
    return {'mode': 'rule', 'ipv6': True, 'proxies': [{'name': 'secret-node', 'type': 'ss', 'server': '8.8.8.8', 'password': 'PRIVATE'}],
            'proxy-groups': [{'name': '🔰 节点选择', 'type': 'select', 'proxies': ['secret-node']}],
            'dns': {'enable': True, 'listen': '127.0.0.1:1053', 'nameserver': ['system'], 'fake-ip-filter': ['*.local']},
            'tun': {'enable': True, 'auto-route': True, 'stack': 'mixed', 'mtu': 1500}}


def effective():
    c = config()
    plan = g.build_plan(c, g.policy_request(raw_policy()))
    for key, value in plan['candidate_fragment'].items():
        if isinstance(value, dict):
            c.setdefault(key, {}).update(value)
        else:
            c[key] = value
    return c


def packet(txid, name='example.com', qtype=1, rcode=0, answer=True):
    question = g.dns_query(name, qtype, txid)[12:]
    body = (b'\xc0\x0c' + struct.pack('!HHIH', qtype, 1, 60, 4 if qtype == 1 else 16)
            + (b'\x01\x02\x03\x04' if qtype == 1 else b'\x20\x01' + bytes(14))) if answer else b''
    return struct.pack('!6H', txid, 0x8180 | rcode, 1, int(answer), 0, 0) + question + body


class PolicyTests(unittest.TestCase):
    def test_unicode_group_fragment_roundtrip(self):
        r = g.policy_request(raw_policy())
        candidate = g.build_plan(config(), r)['candidate_fragment']
        uri = candidate['dns']['nameserver'][0]
        self.assertNotIn(' ', uri)
        self.assertEqual(g.resolver_url(uri, True)[1], r['group'])

    def test_plaintext_system_and_unpinned_endpoint_rejected(self):
        for val in ('system', 'dhcp://en0', '1.1.1.1', 'udp://1.1.1.1', 'http://1.1.1.1/dns-query',
                    'https://dns.google/dns-query', 'https://u:secret@1.1.1.1/dns-query',
                    'https://1.1.1.1/dns-query?token=secret', 'https://127.0.0.1/dns-query',
                    'tls://1.1.1.1/path', 'https://1.1.1.1/dns-query#DIRECT',
                    'https://1.1.1.1/dns-query#group&skip-cert-verify=true'):
            with self.subTest(value=val), self.assertRaises(ValueError):
                g.resolver_url(val, True)

    def test_encrypted_public_ip_endpoints(self):
        for val in ('https://1.1.1.1/dns-query', 'tls://9.9.9.9', 'https://[2606:4700:4700::1111]/dns-query'):
            self.assertEqual(g.resolver_url(val), (val, None))

    def test_reserved_and_delimited_groups_rejected(self):
        for val in ('DIRECT', 'RULES', 'GLOBAL', 'REJECT', 'wrong#group', 'a&b', 'a=b', 'a,b', 'a\nb', ' a'):
            with self.assertRaises(ValueError):
                g.group_name(val)

    def test_policy_typos_and_schema_bool_rejected(self):
        for extra in ({'resolver': 'typo'}, {'schema_version': True}, {'ipv6': 'auto'}):
            p = raw_policy()
            p.update(extra)
            with self.assertRaises(ValueError):
                g.policy_request(p)

    def test_bootstrap_exception_requires_explicit_true(self):
        for approval in (False, 'true', 1, None):
            p = raw_policy()
            p['bootstrap'] = {'mode': 'encrypted-direct', 'resolvers': ['tls://9.9.9.9'], 'acknowledge_direct_bootstrap': approval}
            with self.assertRaises(ValueError):
                g.policy_request(p)

    def test_hostname_node_blocks_deny_bootstrap(self):
        c = config()
        c['proxies'][0]['server'] = 'node.example.com'
        plan = g.build_plan(c, g.policy_request(raw_policy()))
        self.assertEqual(plan['status'], 'BLOCKED')
        self.assertIsNone(plan['candidate_fragment'])

    def test_unrelated_hostname_node_also_blocks_global_change(self):
        c = config()
        c['proxies'].append({'name': 'other', 'type': 'ss', 'server': 'node.example.com'})
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_approved_encrypted_bootstrap_is_labeled_exception(self):
        p, c = raw_policy(), config()
        p['bootstrap'] = {'mode': 'encrypted-direct', 'resolvers': ['tls://9.9.9.9'], 'acknowledge_direct_bootstrap': True}
        c['proxies'][0]['server'] = 'node.example.com'
        plan = g.build_plan(c, g.policy_request(p))
        self.assertEqual(plan['status'], 'REVIEW_REQUIRED')
        self.assertEqual(plan['privacy_profile'], 'encrypted-bootstrap-exception')
        self.assertEqual(plan['candidate_fragment']['dns']['proxy-server-nameserver'], ['tls://9.9.9.9'])

    def test_no_direct_option_even_if_not_selected(self):
        c = config()
        c['proxy-groups'][0]['proxies'].append('DIRECT')
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_nested_direct_option(self):
        c = config()
        c['proxy-groups'][0]['proxies'] = ['nested']
        c['proxy-groups'].append({'name': 'nested', 'type': 'fallback', 'proxies': ['secret-node', 'DIRECT']})
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_missing_group_prevents_interface_fallback(self):
        c = config()
        c['proxy-groups'][0]['name'] = 'different'
        issues = g.check_graph(c, g.policy_request(raw_policy()))
        self.assertIn('GROUP_MISSING_OR_NOT_A_GROUP', [x['code'] for x in issues])

    def test_group_cycles(self):
        c = config()
        c['proxy-groups'][0]['proxies'] = ['🔰 节点选择']
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_dynamic_provider_scope_unverified(self):
        for key, value in (('use', ['provider']), ('include-all', True)):
            c = config()
            c['proxy-groups'][0][key] = value
            self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_duplicate_names(self):
        c = config()
        c['proxies'].append(dict(c['proxies'][0]))
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_no_automatic_system_or_tuning_changes_and_no_secrets(self):
        c = config()
        before = copy.deepcopy(c)
        plan = g.build_plan(c, g.policy_request(raw_policy()))
        self.assertEqual(c, before)
        text = json.dumps(plan)
        self.assertNotIn('PRIVATE', text)
        self.assertNotIn('secret-node', text)
        self.assertNotIn('listen', plan['candidate_fragment']['dns'])
        self.assertNotIn('mtu', plan['candidate_fragment']['tun'])
        self.assertNotIn('stack', plan['candidate_fragment']['tun'])

    def test_stale_policy_map_replacement_explicit(self):
        c = config()
        c['dns']['nameserver-policy'] = {'private.corp': ['system']}
        p = raw_policy()
        p['replace_existing_dns_policies'] = True
        plan = g.build_plan(c, g.policy_request(p))
        self.assertIn('dns.nameserver-policy', plan['merge_contract']['replace_maps'])
        self.assertEqual(plan['candidate_fragment']['dns']['nameserver-policy'], {})
        self.assertNotIn('private.corp', json.dumps(plan))

    def test_existing_dns_policy_removal_requires_approval(self):
        c = config()
        c['dns']['nameserver-policy'] = {'corp.private': 'system'}
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_audit_catches_recursive_merge_retaining_private_dns(self):
        c = effective()
        c['dns']['nameserver-policy'] = {'private.corp': 'system'}
        issues = g.check_config(c, g.policy_request(raw_policy()))
        self.assertIn('DNS_POLICY_BYPASSES_APPROVED_GROUP', [x['code'] for x in issues])
        self.assertNotIn('private.corp', json.dumps(issues))

    def test_resolver_path_pinning_not_just_respect_rules(self):
        c = effective()
        c['dns']['nameserver'] = ['https://1.1.1.1/dns-query']
        codes = [x['code'] for x in g.check_config(c, g.policy_request(raw_policy()))]
        self.assertIn('RESOLVER_NOT_APPROVED_OR_NOT_PINNED', codes)

    def test_fallback_system_dns_not_allowed(self):
        c = effective()
        c['dns']['fallback'] = ['system']
        self.assertTrue(any(x['severity'] == 'error' for x in g.check_config(c, g.policy_request(raw_policy()))))

    def test_fakeip_excluded_route_blocks_candidate(self):
        c = config()
        c['tun']['route-exclude-address'] = ['198.18.0.0/15']
        self.assertEqual(g.build_plan(c, g.policy_request(raw_policy()))['status'], 'BLOCKED')

    def test_block_ipv6_cannot_keep_ipv6_only_selected_node(self):
        p, c = raw_policy(), config()
        p['ipv6'] = 'block'
        c['proxies'][0]['server'] = '2606:4700:4700::1111'
        self.assertEqual(g.build_plan(c, g.policy_request(p))['status'], 'BLOCKED')

    def test_aaaa_false_never_proves_native_ipv6_block(self):
        p = raw_policy()
        p['ipv6'] = 'block'
        plan = g.build_plan(config(), g.policy_request(p))
        self.assertFalse(plan['candidate_fragment']['ipv6'])
        self.assertIn('native_ipv6', plan['pending_device_checks'])
        self.assertEqual(plan['runtime_verdict'], 'UNVERIFIED')


class InputTests(unittest.TestCase):
    def test_duplicate_json_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'input.json'
            path.write_text('{"dns":{},"dns":{}}', encoding='utf-8')
            with self.assertRaises(ValueError):
                g.load_document(path)

    def test_json_bom_supported(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)/'input.json'
            p.write_bytes(b'\xef\xbb\xbf{}')
            self.assertEqual(g.load_document(p), {})

    def test_oversized_input_rejected(self):
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)/'input.json'
            p.write_bytes(b' ' * (g.LIMIT + 1))
            with self.assertRaises(ValueError):
                g.load_document(p)

    def test_plan_has_no_network_or_file_mutation(self):
        with tempfile.TemporaryDirectory() as tmp:
            p, c = Path(tmp)/'p.json', Path(tmp)/'c.json'
            p.write_text(json.dumps(raw_policy()), encoding='utf-8')
            c.write_text(json.dumps(config()), encoding='utf-8')
            before = c.read_bytes()
            with patch.object(g.subprocess, 'run', side_effect=AssertionError('network')), contextlib.redirect_stdout(io.StringIO()) as out:
                self.assertEqual(g.main(['plan', '--config', str(c), '--request', str(p)]), 0)
            self.assertEqual(json.loads(out.getvalue())['runtime_verdict'], 'UNVERIFIED')
            self.assertEqual(c.read_bytes(), before)

    def test_standalone_isolated_mode_json(self):
        with tempfile.TemporaryDirectory() as tmp:
            script, p, c = Path(tmp)/'dns_guard.py', Path(tmp)/'p.json', Path(tmp)/'c.json'
            script.write_bytes(SCRIPT.read_bytes())
            p.write_text(json.dumps(raw_policy()), encoding='utf-8')
            c.write_text(json.dumps(config()), encoding='utf-8')
            result = subprocess.run([sys.executable, '-I', '-B', str(script), 'plan', '--config', str(c), '--request', str(p)], capture_output=True, timeout=5)
            self.assertEqual(result.returncode, 0, result.stderr)
            self.assertEqual(json.loads(result.stdout)['status'], 'REVIEW_REQUIRED')

    def test_native_yaml_missing_dependency_is_clear(self):
        # Use an isolated interpreter import blocker, not a network installation.
        with tempfile.TemporaryDirectory() as tmp:
            p = Path(tmp)/'c.yaml'
            p.write_text('dns:\n  enable: true\n', encoding='utf-8')
            with patch.dict(sys.modules, {'yaml': None}), self.assertRaisesRegex(ValueError, 'PyYAML'):
                g.load_document(p)


class WireTests(unittest.TestCase):
    def test_a_and_aaaa_compressed_answers(self):
        for kind in (1, 28):
            result = g.dns_response(packet(42, qtype=kind), 42, 'example.com', kind)
            self.assertEqual(result['result'], 'ANSWER')
            self.assertEqual(result['answer_counts']['A' if kind == 1 else 'AAAA'], 1)

    def test_nodata_and_nxdomain_distinguished(self):
        self.assertEqual(g.dns_response(packet(42, answer=False), 42, 'example.com', 1)['result'], 'NODATA')
        self.assertEqual(g.dns_response(packet(42, rcode=3, answer=False), 42, 'example.com', 1)['result'], 'NXDOMAIN')

    def test_dns_fail_not_mislabeled_leak(self):
        self.assertEqual(g.dns_response(packet(42, rcode=2, answer=False), 42, 'example.com', 1)['result'], 'DNS_ERROR')

    def test_dns_txid_and_question_mismatch(self):
        for data in (packet(43), packet(42, name='other.example'), packet(42, qtype=28)):
            with self.assertRaises(ValueError):
                g.dns_response(data, 42, 'example.com', 1)

    def test_truncation_pointer_loop_and_trailing_bytes(self):
        for data in (b'', packet(42)[:-1], packet(42) + b'junk',
                     struct.pack('!6H', 42, 0x8180, 1, 0, 0, 0) + b'\xc0\x0c\0\x01\0\x01'):
            with self.assertRaises(ValueError):
                g.dns_response(data, 42, 'example.com', 1)

    def test_probe_needs_network_permission(self):
        with patch.object(g, 'doh_probe', side_effect=AssertionError('network')), contextlib.redirect_stderr(io.StringIO()), self.assertRaises(SystemExit) as error:
            g.main(['probe', '--proxy', 'http://127.0.0.1:7890', '--resolver', 'https://1.1.1.1/dns-query', '--domain', 'example.com'])
        self.assertEqual(error.exception.code, 2)

    def test_local_proxy_only_and_remote_dns_socks(self):
        for p in ('http://remote.example:7890', 'http://user:secret@127.0.0.1:7890', 'socks5://127.0.0.1:1080', 'http://127.0.0.1'):
            with self.assertRaises(ValueError):
                g.proxy_endpoint(p)
        self.assertEqual(g.proxy_endpoint('socks5h://[::1]:1080'), 'socks5h://[::1]:1080')

    def test_http_wire_probe_is_pinned_tls_no_redirect_and_redacted(self):
        with patch.object(g.shutil, 'which', return_value='curl'), patch.object(g.secrets, 'randbelow', return_value=42), patch.object(g.subprocess, 'run') as run:
            run.return_value = subprocess.CompletedProcess([], 0, packet(42) + b'\n200\tapplication/dns-message\n', b'PRIVATE')
            result = g.doh_probe('http://127.0.0.1:7890', 'https://1.1.1.1/dns-query', 'example.com', 1)
        self.assertEqual(result['status'], 'OBSERVED')
        argv = run.call_args.args[0]
        self.assertEqual(argv[1], '-q')
        self.assertNotIn('--location', argv)
        self.assertNotIn('--insecure', argv)
        self.assertNotIn('-6', argv)
        self.assertEqual(argv[argv.index('--noproxy') + 1], '')
        self.assertNotIn('PRIVATE', json.dumps(result))
        self.assertNotIn('1.2.3.4', json.dumps(result))

    def test_failed_probe_never_retries_direct(self):
        with patch.object(g.shutil, 'which', return_value='curl'), patch.object(g.subprocess, 'run') as run:
            run.return_value = subprocess.CompletedProcess([], 7, b'', b'PRIVATE')
            result = g.doh_probe('http://127.0.0.1:7890', 'https://1.1.1.1/dns-query', 'example.com', 1)
            self.assertEqual(run.call_count, 1)
            self.assertEqual(result['status'], 'UNVERIFIED')
            self.assertNotIn('PRIVATE', json.dumps(result))

    def test_html_or_redirect_not_a_dns_success(self):
        for output in (b'<html>\n200\ttext/html\n', b'\n302\tapplication/dns-message\n'):
            with patch.object(g.shutil, 'which', return_value='curl'), patch.object(g.subprocess, 'run') as run:
                run.return_value = subprocess.CompletedProcess([], 0, output, b'')
                self.assertEqual(g.doh_probe('http://127.0.0.1:7890', 'https://1.1.1.1/dns-query', 'example.com', 1)['status'], 'UNVERIFIED')

    def test_success_still_does_not_claim_os_dns_coverage(self):
        with patch.object(g, 'doh_probe', return_value={'status': 'OBSERVED'}), contextlib.redirect_stdout(io.StringIO()) as out:
            code = g.main(['probe', '--network', '--proxy', 'http://127.0.0.1:7890', '--resolver', 'https://1.1.1.1/dns-query', '--domain', 'example.com'])
        self.assertEqual(code, 3)
        self.assertEqual(json.loads(out.getvalue())['runtime_verdict'], 'UNVERIFIED')

    def test_small_random_packets_fail_safely(self):
        rng = random.Random(1)
        for _ in range(250):
            data = bytes(rng.randrange(256) for _ in range(rng.randrange(100)))
            try:
                g.dns_response(data, 42, 'example.com', 1)
            except (ValueError, UnicodeError):
                pass


if __name__ == '__main__':
    unittest.main()
