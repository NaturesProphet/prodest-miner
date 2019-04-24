import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';


export async function listaViagensDaHora ( pool: ConnectionPool ): Promise<any> {

    let maisTarde: Date = new Date();
    let maisCedo = new Date();

    maisCedo.setUTCHours( maisCedo.getUTCHours() - 3 ); //configura hora local
    maisCedo.setUTCMinutes( maisCedo.getUTCMinutes() - 30 ) // margem de atrasos de meia hora

    maisTarde.setUTCHours( maisTarde.getUTCHours() + 3 ); //configura hora local
    maisTarde.setUTCMinutes( maisTarde.getUTCMinutes() - 90 ); //1 hora a menos q o maior

    let Query = `SELECT id FROM viagem where `
        + `horadachegada BETWEEN `
        + `'${maisCedo.toISOString()}' and '${maisTarde.toISOString()}' `;

    try {
        let result = await pool.request().query( Query );
        if ( result.recordset.length > 0 ) {
            let ids = new Array();
            result.recordset.forEach( element => {
                ids.push( element.id )
            } );
            return ids;
        } else return [];
    } catch ( err ) {
        let msg = `[ listaViagensDaHora ] Erro ao buscar as viagens da ultima hora.\n`
            + `Erro: ${err.message}\n`
            + `Query: ${Query}\n--------------------------\n`;
        console.log( msg );
    }
}
