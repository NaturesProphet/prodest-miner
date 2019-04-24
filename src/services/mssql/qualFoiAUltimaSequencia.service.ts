import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function qualFoiAUltimaSequencia
    ( pool: ConnectionPool, itinerarioId: number ): Promise<number> {
    let query: string = '';
    try {
        query = `SELECT max(sequencia) AS ordem`
            + `FROM veiculo_ponto_viagem_historico_bruto `
            + `where itinerario_id = ${itinerarioId}`;

        let result = await pool.request().query( query );

        if ( result.recordset != undefined ) {
            return result.recordset[ 0 ].ordem;
        }
    } catch ( err ) {
        let msg = `[ qualFoiAUltimaSequencia ] Erro ao consultar sequencias no banco estático\n`
            + `Erro: ${err.message}`
            + `Query: ${query}`
            + `------------------\n`;
        console.log( msg );
    }
}
