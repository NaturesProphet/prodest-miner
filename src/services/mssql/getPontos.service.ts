import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool, IResult } from 'mssql';


export async function getPontos ( pool: ConnectionPool ): Promise<any> {

    let result: IResult<any> = null;
    while ( result == null ) {
        try {
            const queryPontos: string = 'SELECT id, codigo, azimute, latitude, longitude FROM ponto';

            let result: IResult<any> = await pool.request().query( queryPontos );

            if ( result.recordset != undefined ) {
                return result.recordset;
            }
        } catch ( err ) {
            let msg = `[ getPontos ] Erro ao tentar recuperar a lista de pontos no banco estático\n${err.message}`;
            console.log( msg );
            result = null;
        }
    }
}
