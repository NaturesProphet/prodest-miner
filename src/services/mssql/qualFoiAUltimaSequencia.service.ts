import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function qualFoiAUltimaSequencia
    ( pool: ConnectionPool, viagemId: number ): Promise<number> {
    let query: string = '';
    try {
        query = `SELECT max(sequencia) AS ordem `
            + `FROM veiculo_ponto_viagem_historico_bruto `
            + `where viagem_id = ${viagemId}`;

        let result = await pool.request().query( query );

        if ( result.recordset != undefined ) {
            if ( result.recordset.length > 0 && result.recordset[ 0 ].ordem != null ) {
                return result.recordset[ 0 ].ordem;
            } else {
                return 0;
            }
        }
    } catch ( err ) {
        let msg = `[ qualFoiAUltimaSequencia ] Erro ao consultar sequencias no banco estático\n`
            + `Erro: ${err.message}\n`
            + `Query: ${query}`
            + `------------------\n`;
        console.log( msg );
    }
}
