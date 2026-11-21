"""Deny all new connections; optional socket creation denial for test workers."""
import ctypes,ctypes.util,os,sys
def restrict(sockets=True):
    lib=ctypes.CDLL(ctypes.util.find_library('seccomp'))
    lib.seccomp_init.argtypes=[ctypes.c_uint32];lib.seccomp_init.restype=ctypes.c_void_p
    lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
    lib.seccomp_rule_add.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint]
    lib.seccomp_load.argtypes=[ctypes.c_void_p]
    ctx=lib.seccomp_init(0x7fff0000)
    for name in (['socket','socketpair'] if sockets else [])+['connect','io_uring_setup']:
        num=lib.seccomp_syscall_resolve_name(name.encode());assert num>=0
        assert lib.seccomp_rule_add(ctx,0x00050001,num,0)==0
    assert lib.seccomp_load(ctx)==0
if __name__=='__main__':
    restrict(sockets=False)
    os.closerange(3,65536)
    os.execve(sys.argv[1],sys.argv[1:],{'PATH':'/usr/bin:/bin','LANG':'C.UTF-8'})
