# Native MySQL attempt verification fixture — BLOCKED, not passed

Prepared 18 November 2026 against PR133 head 4773344db58b1c34b8304ef0509bd8aaf6ba2325.
This is local engineering preparation. No native SQL assertion has executed.

## Actual investigation

Downloaded Oracle's MySQL server-core 8.4.13 Debian package from its official
repository and verified its SHA256 against its Packages.gz entry. Extracted it
in scratch without installing services or running package scripts. Extracted
libaio locally and installed mysql2 3.24.6 with npm --ignore-scripts, --no-audit,
--no-fund. Exact sources/hashes are in provenance.json. No repository dependency,
application configuration or provider setting changed.

Initialized a new disposable database with an empty local test root account,
no runtime credential access or grants. Initialization succeeded. Normal server
startup with --skip-networking and --mysqlx=0 failed: UNIX socket Operation not
permitted. A raw Python AF_UNIX socket creation WITHOUT our seccomp filter also
returned EPERM, establishing an execution-environment restriction rather than a
claim that the custom filter caused it. The client consequently failed before
connecting (result.tap). No DDL/test query executed. An offline bootstrap attempt
also tried to set up a socket and failed; it is not counted as SQL verification.
The initialized scratch data directory was removed after startup had exited.
No active test server remains. Downloaded binaries remain for reproducibility.

## Prepared test cases

mysql.test.mjs imports the actual published conditional-update adapter and uses
mysql2's real execute method. All records are synthetic. It accepts only a scratch
Unix socket path ending /test.sock. It creates a fresh synthetic_attempts database
and a minimal table with the actual relevant Airo column types and unique key;
it does not test the complete 24-column migration or prove production schema.

Nine checks are prepared: TCP denial; native result/affected-row shape; 24
simultaneous claims with one winner; claim persistence after connection destruction;
lost application acknowledgment after commit; open-transaction rollback (negative
proof for the forbidden executor type); server-killed uncommitted transaction;
failed finalization retaining a hold; terminal sent/failed state protection.
Native SQL, driver concurrency and connection-loss outcomes remain UNEXECUTED.
Node syntax check and Python py_compile pass; these are structural checks only.

## Reproduction in an authorized disposable local environment

Use a newly initialized private data directory, current user permissions, no
external database DSN, --no-defaults, --skip-networking, --mysqlx=0,
--secure-file-priv=NULL and a private absolute scratch socket. Never reuse a
production, hosted, staging or existing database. Start the server under
unix-only.py and run the fixture under the same guard:

    python3 unix-only.py LOCAL_LIB_DIR /absolute/node --no-warnings mysql.test.mjs /absolute/node_modules/mysql2/promise.js /workspace/scratch/TASK/test.sock

The guard clears inherited environment/descriptors, permits AF_UNIX only, denies
other socket families and io_uring_setup. The test explicitly checks TCP returns
EPERM. Keep transport/email mocked; no website submission is involved. Shut down
and remove only the newly created disposable database afterward. A harness should
manage that lifecycle before CI use. Do not treat this manual recipe as CI wiring.

## Handoff and remaining boundary

Engineering can resume native tests when the local executor permits private Unix
sockets (or a separately approved isolated local container is available). Do not
weaken sandbox controls or substitute a hosted database. No decision from Dalbir
is required for continued source work. Next independent source task: implement a
dedicated committed MySQL executor with transaction ownership so the adapter's
commit-before-transport requirement is enforced by code, not only documentation;
then test its commit/rollback/connection-loss paths with injected connections.
Independent review, Airo client/bootstrap integration, installed lockfile/build
proof and separately authorized runtime verification remain outstanding. The
74 prior local mock tests and PostgreSQL 9/9 evidence are unchanged, not rerun or
promoted to hosted acceptance. Working website/email, #115 and advertising remain
unchanged. No estimated release date is proven by this fixture.
