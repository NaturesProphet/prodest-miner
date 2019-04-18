/*
*                                                                   *
*   Funções para consultar o banco de dados estatico sql-server     *
*                                                                   *
*/
import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as sql from 'mssql';
import { mssqlConnectionString } from '../common/mssql.config';


/**
 * Esta função busca os pontos no banco estático
 */
export async function getPontos (): Promise<any> {
    try {
        await sql.connect( mssqlConnectionString );

        const queryPontos: string = 'SELECT id_geocontrol, codigo, latitude, longitude FROM ponto';

        console.log( 'Carregando os dados de pontos' );

        let result = await sql.query( queryPontos );
        sql.close()
        if ( result.recordset != undefined ) {
            console.log( `${result.recordset.length} pontos carregados.\n` );
            return result.recordset;
        }

    } catch ( err ) {
        let msg = `Erro ao consultar o banco estático\n${err.message}`;
        console.log( msg );
        process.exit( 1 );
    }
}
