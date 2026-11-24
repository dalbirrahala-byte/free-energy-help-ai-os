import ctypes as c
import errno
import os
import socket
import sys

class Comparison(c.Structure):
    _fields_ = [('arg', c.c_uint), ('op', c.c_int),
                ('value', c.c_uint64), ('mask', c.c_uint64)]

lib = c.CDLL('libseccomp.so.2')
lib.seccomp_init.argtypes = [c.c_uint32]
lib.seccomp_init.restype = c.c_void_p
lib.seccomp_rule_add_array.argtypes = [c.c_void_p, c.c_uint32, c.c_int, c.c_uint, c.POINTER(Comparison)]
lib.seccomp_load.argtypes = [c.c_void_p]
ctx = lib.seccomp_init(0x7fff0000)
deny = 0x50000 | errno.EPERM
only_unix = Comparison(0, 1, socket.AF_UNIX, 0)
assert ctx
for name in (b'socket', b'socketpair'):
    syscall = lib.seccomp_syscall_resolve_name(name)
    assert syscall >= 0
    assert lib.seccomp_rule_add_array(ctx, deny, syscall, 1, c.byref(only_unix)) == 0
assert lib.seccomp_rule_add_array(ctx, deny, lib.seccomp_syscall_resolve_name(b'io_uring_setup'), 0, None) == 0
assert lib.seccomp_load(ctx) == 0
os.execve(sys.argv[1], sys.argv[1:], {})
