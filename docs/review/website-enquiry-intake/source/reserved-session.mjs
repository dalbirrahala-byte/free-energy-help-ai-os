// Supply a new, private postgres.js client per operation. The verifier must
// check this reserved session against the approved destination and writer ACL.
export function createReservedOpener(createDedicatedClient, verifySession) {
  return async function openFresh() {
    const client = createDedicatedClient();
    let session;
    let closed = false;

    async function end() {
      if (closed) return;
      closed = true;
      try {
        session?.release();
      } finally {
        await client.end({timeout: 1});
      }
    }

    try {
      session = await client.reserve();
      if (await verifySession(session) !== true) {
        throw new Error('Receiver session verification failed');
      }
      return {
        async query(statement, values = []) {
          if (closed) throw new Error('Receiver session closed');
          const parameters = values.map(value => {
            if (typeof value !== 'string') throw new Error('Expected text parameter');
            return session.typed(value, 25);
          });
          const rows = await session.unsafe(statement, parameters);
          return {command: rows.command, rows};
        },
        end
      };
    } catch (error) {
      await end();
      throw error;
    }
  };
}
