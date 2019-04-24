import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function getPontoCerto ( pool: ConnectionPool, itinerarioId: number, pontos: any[] ): Promise<any> {

    try {
        let query = `SELECT ponto_id FROM itinerario_ponto `
            + `WHERE itinerario_id = ${itinerarioId} AND `
            + `ponto_id IN ( ${pontos} )`;

        let result = await pool.request().query( query );

        if ( result.recordset != undefined && result.recordset.length > 0 ) {
            return result.recordset[ 0 ].ponto_id;
        }
    } catch ( err ) {
        let msg = `[ getSequenciaPontos ] Erro ao consultar sequencia de pontos no banco estático\n${err.message}`;
        console.log( msg );
    }
}
