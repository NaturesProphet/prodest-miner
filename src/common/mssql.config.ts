export const mssqlUser: string = process.env.MINER_TRANSCOLDB_USER;
export const mssqlPassword: string = process.env.MINER_TRANSCOLDB_PASSWORD;
export const mssqlHost: string = process.env.MINER_TRANSCOLDB_HOST;
export const mssqlSchema: string = process.env.MINER_TRANSCOLDB_SCHEMA;
export const mssqlPort: number = Number( process.env.MINER_TRANSCOLDB_PORT );


export const mssqlConnectionString: string =
    `mssql://${mssqlUser}:${mssqlPassword}@${mssqlHost}:${mssqlPort}/${mssqlSchema}`;



