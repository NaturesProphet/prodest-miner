import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { ViagemQueryObject } from '../../DTOs/viagemQuery.interface';


export async function getViagem ( pool: ConnectionPool, dados: ViagemQueryObject ): Promise<any> {

    try {
        let queryViagem = `SELECT viagem.id, viagem.itinerario_id FROM viagem `
            + `where veiculo = '${dados.veiculo}' and horadachegada < '${dados.horaChegada}' `
            + `and horadasaida BETWEEN '${dados.horaSaida}' and '${dados.horaAgora}' `;

        let result = await pool.request().query( queryViagem );
        if ( result.recordset.length == 0 ) {
            return null;
        } else if ( result.recordset.length == 1 ) {
            return result.recordset[ 0 ];
        } else {
            let margemReduzida = reduzMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ] )
            dados.horaSaida = margemReduzida[ 0 ];
            dados.horaChegada = margemReduzida[ 1 ];
            // recursão!
            return await getViagem( pool, dados );
        }
    } catch ( err ) {
        let msg = `[ getViagem ] Erro ao consultar viagens no banco estático\n${err.message}`;
        console.log( msg );
    }
}

export function geraMargemHorario ( horaAgora: string ): string[] {

    let saidaDate = new Date( horaAgora );
    let chegadaDate = new Date( horaAgora );

    saidaDate.setUTCHours( saidaDate.getUTCHours() - 2 ); // estica a margem de saida 2 horas pra baixo
    chegadaDate.setUTCHours( chegadaDate.getUTCHours() + 2 ); //estica a margem de chegada 2 horas pra cima

    let margem = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margem;

}

function reduzMargemHorario ( margem: string[] ): string[] {

    let saidaDate = new Date( margem[ 0 ] );
    let chegadaDate = new Date( margem[ 1 ] );

    saidaDate.setUTCMinutes( saidaDate.getUTCMinutes() - 30 );
    chegadaDate.setUTCMinutes( chegadaDate.getUTCMinutes() - 30 );

    let margemReduzida = [ saidaDate.toISOString(), chegadaDate.toISOString() ];
    return margemReduzida;

}
