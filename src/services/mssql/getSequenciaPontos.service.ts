import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function getSequenciaPontos ( pool: ConnectionPool, itinerarioId: number ): Promise<any> {
  let querySequenciaPontos = '';
  try {
    querySequenciaPontos = `SELECT ponto_id, ordem FROM itinerario_ponto `
      + `WHERE itinerario_id = ${itinerarioId} ORDER BY ordem`;

    let result = await pool.request().query( querySequenciaPontos );

    if ( result.recordset != undefined ) {
      return result.recordset;
    }
  } catch ( err ) {
    let msg = `[ getSequenciaPontos ] Erro ao consultar sequencia de pontos no banco estático\n`
      + `Erro: ${err.message}\nQuery: ${querySequenciaPontos}`;
    console.log( msg );
  }
}
