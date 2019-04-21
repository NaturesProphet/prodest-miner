import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { ViagemQueryObject } from 'DTOs/viagemQuery.interface';


export async function getViagem ( pool: ConnectionPool, dados: ViagemQueryObject ): Promise<any> {

    try {
        let queryViagem = `SELECT viagem.id, viagem.itinerario_id FROM viagem `
            + `INNER JOIN itinerario ON viagem.itinerario_id = itinerario.id `
            + `where veiculo = '${dados.rota}' and horadachegada < '${dados.horaChegada}' `
            + `and horadasaida BETWEEN '${dados.horaSaida}' and '${dados.horaAgora}' `;

        let result = await pool.request().query( queryViagem );

        if ( result.recordset != undefined ) {
            return result.recordset;
        }
    } catch ( err ) {
        let msg = `[ getViagem ] Erro ao consultar viagens no banco estático\n${err.message}`;
        console.log( msg );
    }
}
