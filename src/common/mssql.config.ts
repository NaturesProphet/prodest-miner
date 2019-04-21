const mssqlUser: string = process.env.MINER_TRANSCOLDB_USER;
const mssqlPassword: string = process.env.MINER_TRANSCOLDB_PASSWORD;
const mssqlHost: string = process.env.MINER_TRANSCOLDB_HOST;
const mssqlSchema: string = process.env.MINER_TRANSCOLDB_SCHEMA;
const mssqlPort: number = Number( process.env.MINER_TRANSCOLDB_PORT );

export const SqlConfig = {
    user: mssqlUser,
    password: mssqlPassword,
    server: mssqlHost,
    database: mssqlSchema,
    port: mssqlPort
}
