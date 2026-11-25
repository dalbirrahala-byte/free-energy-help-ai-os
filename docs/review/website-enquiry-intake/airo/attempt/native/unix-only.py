import ctypes, errno, os, sys
lib=ctypes.CDLL('libseccomp.so.2',use_errno=True)
lib.seccomp_init.argtypes=[ctypes.c_uint32];lib.seccomp_init.restype=ctypes.c_void_p
lib.seccomp_syscall_resolve_name.argtypes=[ctypes.c_char_p];lib.seccomp_syscall_resolve_name.restype=ctypes.c_int
class Arg(ctypes.Structure):
 _fields_=[('arg',ctypes.c_uint),('op',ctypes.c_uint),('a',ctypes.c_uint64),('b',ctypes.c_uint64)]
lib.seccomp_rule_add_array.argtypes=[ctypes.c_void_p,ctypes.c_uint32,ctypes.c_int,ctypes.c_uint,ctypes.POINTER(Arg)]
lib.seccomp_load.argtypes=[ctypes.c_void_p]
ctx=lib.seccomp_init(0x7fff0000);assert ctx
for name in ['socket','socketpair']:
 nr=lib.seccomp_syscall_resolve_name(name.encode());assert nr>=0
 arg=Arg(0,1,1,0) # argument 0 != AF_UNIX
 assert lib.seccomp_rule_add_array(ctx,0x50000|errno.EPERM,nr,1,ctypes.byref(arg))==0
nr=lib.seccomp_syscall_resolve_name(b'io_uring_setup');assert nr>=0
assert lib.seccomp_rule_add_array(ctx,0x50000|errno.EPERM,nr,0,None)==0
assert lib.seccomp_load(ctx)==0
os.closerange(3,1048576)
# First argument is the task-local library directory, never inherited configuration.
os.execve(sys.argv[2],sys.argv[2:],{'LD_LIBRARY_PATH':sys.argv[1]})
