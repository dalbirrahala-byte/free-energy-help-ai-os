import type { OwnedConnection } from './committed-mysql-store.ts';

type Target = Readonly<{ host: string; port: number; database: string }>;
export type AiroDatabaseSettings = Target & Readonly<{ user: string; password: string }>;
type ConnectionOptions = AiroDatabaseSettings & {
  ssl: { rejectUnauthorized: true; verifyIdentity: true };
};

/**
 * Source candidate. The caller must supply independently approved target
 * metadata and a connector equivalent to mysql2 createConnection.
 * This module never imports the Airo configuration or shared pool.
 */
export function createOwnedMysqlOpener(
  approvedTarget: Target,
  readSettings: () => AiroDatabaseSettings,
  connect: (options: ConnectionOptions) => Promise<OwnedConnection>,
): () => Promise<OwnedConnection> {
  const { host, port, database } = approvedTarget;
  return async () => {
    const settings = readSettings();
    if (
      !host.trim() || !database.trim() || !Number.isInteger(port) || port < 1 || port > 65535 ||
      settings.host !== host || settings.port !== port || settings.database !== database ||
      typeof settings.user !== 'string' || !settings.user.trim() ||
      typeof settings.password !== 'string' || !settings.password.length
    ) {
      throw new Error('CRM database settings unavailable or outside approved target');
    }
    return connect({
      host,
      port,
      database,
      user: settings.user,
      password: settings.password,
      ssl: { rejectUnauthorized: true, verifyIdentity: true },
    });
  };
}
