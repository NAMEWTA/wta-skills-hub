#!/usr/bin/env python3
"""Linux test launcher: fail the child on an attempted network syscall.

Not shipped in the installed skill; no root privileges, packet capture,
credential access, or external service. Returns 77 when libseccomp is absent.
"""
import ctypes
import ctypes.util
import os
import sys

name = ctypes.util.find_library("seccomp")
if not name:
    sys.exit(77)
lib = ctypes.CDLL(name)
lib.seccomp_init.argtypes = [ctypes.c_uint32]
lib.seccomp_init.restype = ctypes.c_void_p
lib.seccomp_syscall_resolve_name.argtypes = [ctypes.c_char_p]
lib.seccomp_syscall_resolve_name.restype = ctypes.c_int
lib.seccomp_rule_add.argtypes = [ctypes.c_void_p, ctypes.c_uint32, ctypes.c_int, ctypes.c_uint]
lib.seccomp_rule_add.restype = ctypes.c_int
lib.seccomp_load.argtypes = [ctypes.c_void_p]
lib.seccomp_load.restype = ctypes.c_int
lib.seccomp_release.argtypes = [ctypes.c_void_p]
ctx = lib.seccomp_init(0x7FFF0000)  # SCMP_ACT_ALLOW
if not ctx:
    raise RuntimeError("seccomp_init failed")
try:
    # Trap even localhost/Unix socket connection attempts. The read-only
    # workflow has no legitimate need for socket creation or communication.
    for syscall in (b"socket", b"connect", b"sendto", b"sendmsg"):
        number = lib.seccomp_syscall_resolve_name(syscall)
        if number < 0 or lib.seccomp_rule_add(ctx, 0x00030000, number, 0) != 0:
            raise RuntimeError("seccomp rule failed")
    if lib.seccomp_load(ctx) != 0:
        raise RuntimeError("seccomp_load failed")
finally:
    lib.seccomp_release(ctx)
if len(sys.argv) < 2:
    raise SystemExit("Usage: no-network.py executable args...")
os.execv(sys.argv[1], sys.argv[1:])
