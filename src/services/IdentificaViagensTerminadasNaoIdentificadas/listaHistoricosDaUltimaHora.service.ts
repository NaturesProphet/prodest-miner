import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';

export async function listaHistoricosDaUltimaHora
  ( pool: ConnectionPool, intervaloDeTempo: string[] ): Promise<any> {

  let maisTarde: string = intervaloDeTempo[ 1 ];
  let maisCedo: string = intervaloDeTempo[ 0 ];

  let Query = `SELECT DISTINCT viagem_id FROM historico_real WHERE `
    + `horarionoponto BETWEEN '${maisTarde}' AND '${maisCedo}' `;

  try {
    let result = await pool.request().query( Query );
    if ( result.recordset.length > 0 ) {
      let ids = new Array();
      result.recordset.forEach( element => {
        ids.push( element.viagem_id )
      } );
      return ids;
    } else {
      console.log( `[ listaHistoricosDaUltimaHora ] A busca não achou nada.`
        + `\nQuery: ${Query}\n\nResult:${result}\n` );
      return [];
    }
  } catch ( err ) {
    let msg = `[ listaHistoricosDaUltimaHora ] Erro ao buscar as viagens da ultima hora.\n`
      + `Erro: ${err.message}\n`
      + `Query: ${Query}\n--------------------------\n`;
    console.log( msg );
  }
}
