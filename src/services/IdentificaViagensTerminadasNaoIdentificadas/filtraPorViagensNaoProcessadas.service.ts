import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function filtraPorViagensNaoProcessadas
    ( pool: ConnectionPool, viagensFinalizadas: number[], viagensDetectadas: number[] ): Promise<any> {



    let Query = `SELECT distinct viagem_id `
        + `FROM veiculo_ponto_viagem_historico_bruto `
        + `WHERE viagem_id NOT IN (${viagensFinalizadas}) `
        + `AND viagem_id IN (${viagensDetectadas})`

    try {
        let result = await pool.request().query( Query );
        if ( result.recordset.length > 0 ) {
            let ids = new Array();
            result.recordset.forEach( element => {
                ids.push( element.viagem_id )
            } );
            return ids;
        } else return [];
    } catch ( err ) {
        let msg = `[ filtraPorViagensNaoProcessadas ] Erro ao selecionar as viagens `
            + `realizadas não processadas.\n`
            + `Erro: ${err.message}\n`
            + `Query: ${Query}\n--------------------------\n`;
        console.log( msg );
    }
}
