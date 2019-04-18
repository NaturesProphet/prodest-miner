const mssqlUser: string = process.env.TRANSCOLDB_USER;
const mssqlPassword: string = process.env.TRANSCOLDB_PASSWORD;
const mssqlHost: string = process.env.TRANSCOLDB_HOST;
const mssqlSchema: string = process.env.TRANSCOLDB_SCHEMA;
const mssqlPort: number = Number( process.env.TRANSCOLDB_PORT );


export const mssqlConnectionString: string =
    `mssql://${mssqlUser}:${mssqlPassword}@${mssqlHost}:${mssqlPort}/${mssqlSchema}`;



