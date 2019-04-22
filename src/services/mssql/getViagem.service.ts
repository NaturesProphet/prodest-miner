import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { ViagemQueryObject } from '../../DTOs/viagemQuery.interface';
import { reduzMargemHorario, esticaMargemHorario } from '../../services/tempo/margensHorario.service';

/**
 * Esta função pesquisa as viagens compatíveis com os parâmetros informados até achar a viagem correta.
 * @param pool Conexão com o banco de dados estático
 * @param dados Parâmetros para a query de buscar viagens
 * @param controleRecursao numero de níveis de recursão. Utilize 0 ao iniciar.
 * @returns Objeto representando uma viagem correta
 */
export async function getViagem ( pool: ConnectionPool, dados: ViagemQueryObject, controleRecursao: number ): Promise<any> {

    // isso JAMAIS vai acontecer! Nunca! mas sei lá... se pá..
    if ( controleRecursao > 10 ) {
        throw new Error( `\n[ ERRO GRAVE NA FUNÇÃO getViagem ] A recursividade chegou a um nível inesperado` );
    }

    try {
        let queryViagem = `SELECT viagem.id, viagem.itinerario_id, horadasaida, horadachegada FROM viagem `
            + `where veiculo = '${dados.veiculo}' and horadachegada < '${dados.horaChegada}' `
            + `and horadasaida BETWEEN '${dados.horaSaida}' and '${dados.horaAgora}' `;

        let result = await pool.request().query( queryViagem );
        if ( result.recordset.length == 0 && controleRecursao < 2 ) {
            let margemAmpliada = esticaMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ] )
            dados.horaSaida = margemAmpliada[ 0 ];
            dados.horaChegada = margemAmpliada[ 1 ];
            // recursão!
            return await getViagem( pool, dados, ++controleRecursao );
        } else if ( result.recordset.length == 0 && controleRecursao >= 2 ) {
            // freia a recursão
            return null
        }
        else if ( result.recordset.length == 1 ) {
            return result.recordset[ 0 ];
        } else {
            let margemReduzida = reduzMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ] )
            dados.horaSaida = margemReduzida[ 0 ];
            dados.horaChegada = margemReduzida[ 1 ];
            // recursão!
            return await getViagem( pool, dados, ++controleRecursao );
        }
    } catch ( err ) {
        let msg = `[ getViagem ] Erro ao consultar viagens no banco estático\n${err.message}`;
        console.log( msg );
    }
}

