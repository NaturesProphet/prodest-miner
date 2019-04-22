import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { VeiculoXPonto } from '../../DTOs/VeiculoXPonto.interface';


export async function salvaHistoria ( pool: ConnectionPool, dados: VeiculoXPonto ): Promise<any> {

    try {
        let insertQuery = `INSERT INTO veiculo_ponto_viagem_historico_bruto `
            + `(veiculo, datahoraMillis, datahora, velocidade, ignicao, ponto_id, `
            + `itinerario_id, viagem_id, pontoInicial, pontoFinal, sequencia) `
            + `VALUES ( '${dados.rotulo}', ${dados.datahoraMillis}, '${dados.datahoraLegivel}', `
            + `${dados.velocidade}, '${dados.ignicao}', ${dados.pontoId}, `
            + `${dados.itinerarioId}, ${dados.viagemId}, ${dados.pontoInicial}, `
            + `+${dados.pontoFinal}, ${dados.sequencia} )`;

        let result = await pool.request().query( insertQuery );
        if ( result.rowsAffected.length == 1 ) {
            return;
        } else {
            console.log( `[ salvaHistorico ] executou insert sem erros mas não gravou nada!. ${result}` )
        }
    } catch ( err ) {
        let msg = `[ salvaHistorico ] Erro ao consultar viagens no banco estático\n${err.message} `;
        console.log( msg );
    }
}
