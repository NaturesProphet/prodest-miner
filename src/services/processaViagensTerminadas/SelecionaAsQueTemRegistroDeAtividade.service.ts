import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
  dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function SelecionaAsQueTemRegistroDeAtividade
  ( pool: ConnectionPool, viagensPrevistas: number[] ): Promise<any> {
  if ( viagensPrevistas.length > 0 ) {

    let Query = `SELECT DISTINCT viagem_id FROM veiculo_ponto_viagem_historico_bruto WHERE `
      + `viagem_id IN ( ${viagensPrevistas} ) `;

    try {
      let result = await pool.request().query( Query );
      if ( result.recordset.length > 0 ) {
        let ids = new Array();
        result.recordset.forEach( element => {
          ids.push( element.viagem_id )
        } );
        return ids;
      } else {
        console.log( `[ lSelecionaAsQueTemRegistroDeAtividade ] A busca não achou nada.`
          + `\nQuery: ${Query}\n\nResult:${result}\n` );
        return [];
      }
    } catch ( err ) {
      let msg = `[ SelecionaAsQueTemRegistroDeAtividade ] Erro ao buscar as viagens não processadas.\n`
        + `Erro: ${err.message}\n`
        + `Query: ${Query}\n--------------------------\n`;
      console.log( msg );
    }
  } else {
    console.log( `[ SelecionaAsQueTemRegistroDeAtividade ] Listas de IDs vazios informadas\n`
      + `lista viagens previstas: ${viagensPrevistas.length} viagens\n` );
  }
}
