import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function listaViagensPrevistasSemHistorico
  ( pool: ConnectionPool, viagensPrevistas: number[], historicosFeitos: number[] ): Promise<any> {
  if ( viagensPrevistas.length > 0 && historicosFeitos.length > 0 ) {

    let Query = `SELECT id FROM viagem WHERE `
      + `id IN ( ${viagensPrevistas} ) `
      + `AND id NOT IN ( ${historicosFeitos} ) `;

    try {
      let result = await pool.request().query( Query );
      if ( result.recordset.length > 0 ) {
        let ids = new Array();
        result.recordset.forEach( element => {
          ids.push( element.id )
        } );
        return ids;
      } else {
        console.log( `[ listaViagensPrevistasSemHistorico ] A busca não achou nada.`
          + `\nQuery: ${Query}\n\nResult:${result}\n` );
        return [];
      }
    } catch ( err ) {
      let msg = `[ listaViagensPrevistasSemHistorico ] Erro ao buscar as viagens não processadas.\n`
        + `Erro: ${err.message}\n`
        + `Query: ${Query}\n--------------------------\n`;
      console.log( msg );
    }
  } else {
    console.log( `[ listaViagensPrevistasSemHistorico ] Listas de IDs vazios informadas\n`
      + `lista viagens previstas: ${viagensPrevistas.length} viagens\n`
      + `lista de historicos feitos: ${historicosFeitos.length} históricos` );
  }
}
