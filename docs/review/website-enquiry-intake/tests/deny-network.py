import ctypes, errno, os, sys
lib=ctypes.CDLL('libseccomp.so.2',use_errno=True)
lib.seccomp_init.argtypes=[ctypes.c_uint32];lib.seccomp_init.restype=ctypes.c_void_p
lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
lib.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint]
lib.seccomp_load.argtypes=[ctypes.c_void_p]
ctx=lib.seccomp_init(0x7fff0000);assert ctx
for name in ['socket','connect','socketpair','sendto','sendmsg','sendmmsg','io_uring_setup']:
 nr=lib.seccomp_syscall_resolve_name(name.encode());assert nr>=0
 assert lib.seccomp_rule_add(ctx,0x50000|errno.EPERM,nr,0)==0
assert lib.seccomp_load(ctx)==0
os.closerange(3,1048576)
os.execve(sys.argv[1],sys.argv[1:],{})
