export const mssqlUser: string = process.env.TRANSCOLDB_USER;
export const mssqlPassword: string = process.env.TRANSCOLDB_PASSWORD;
export const mssqlHost: string = process.env.TRANSCOLDB_HOST;
export const mssqlSchema: string = process.env.TRANSCOLDB_SCHEMA;
export const mssqlPort: number = Number( process.env.TRANSCOLDB_PORT );


export const mssqlConnectionString: string =
    `mssql://${mssqlUser}:${mssqlPassword}@${mssqlHost}:${mssqlPort}/${mssqlSchema}`;



