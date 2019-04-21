import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from "mssql";
import { SqlConfig } from '../../common/mssql.config';

export async function iniciaConexaoSql (): Promise<ConnectionPool> {
    let pool: ConnectionPool = new ConnectionPool( SqlConfig );
    while ( !pool.connected ) {
        try {
            await pool.connect();
            return pool;
        } catch ( err ) {
            console.log( `Falhou ao tentar inicializar a conexão com o banco estático. ${err.message}` );
        }
    }
}
