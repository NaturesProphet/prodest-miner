import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { ViagemQueryObject } from '../../DTOs/viagemQuery.interface';
import { reduzMargemHorario, esticaMargemHorario } from '../../services/tempo/margensHorario.service';
import { ControleRecursao } from 'DTOs/controleRecursao.interface';
import { debug } from 'services/utils/console.service';

/**
 * Esta função pesquisa as viagens compatíveis com os parâmetros informados até achar a viagem correta.
 * @param pool Conexão com o banco de dados estático
 * @param dados Parâmetros para a query de buscar viagens
 * @param controleRecursao numero de níveis de recursão. Utilize 0 ao iniciar.
 * @returns Objeto representando uma viagem correta
 */
export async function getViagem (
    pool: ConnectionPool,
    dados: ViagemQueryObject,
    controleRecursao: ControleRecursao
): Promise<any> {

    if ( controleRecursao == null ) {
        controleRecursao = {
            aumentosGrandes: 0,
            aumentosPequenos: 0,
            reducoes: 0,
            total: 0
        }
    }

    debug( 10, `Recursões: ${JSON.stringify( controleRecursao )}\n------------------` );


    // isso JAMAIS vai acontecer! Nunca! mas sei lá... se pá..
    if ( controleRecursao.total > 40 ) {
        throw new Error( `\n[ ERRO NA FUNÇÃO getViagem ] A recursividade chegou a um nível inesperado\n${controleRecursao}` );
    }


    try {
        let queryViagem = `SELECT viagem.id, viagem.itinerario_id, horadasaida, horadachegada FROM viagem `
            + `where veiculo = '${dados.veiculo}' and horadachegada < '${dados.horaChegada}' `
            + `and horadasaida BETWEEN '${dados.horaSaida}' and '${dados.horaAgora}' `;

        let result = await pool.request().query( queryViagem );

        // veio só uma viagem (então é a certa)
        if ( result.recordset.length == 1 ) {
            return result.recordset[ 0 ];
        }

        /*  
            nao achou viagens mas ainda não tentou aumentar o range ao máximo (intervalo de 6 horas)
            e não houveram reduções anteriores 
        */
        else if ( result.recordset.length == 0
            && controleRecursao.aumentosGrandes < 4
            && controleRecursao.reducoes == 0 ) {
            let margemAmpliada = esticaMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ], 60 ); //estica 1 hora de cada lado
            dados.horaSaida = margemAmpliada[ 0 ];
            dados.horaChegada = margemAmpliada[ 1 ];
            controleRecursao.aumentosGrandes++;
            controleRecursao.total++;
            return await getViagem( pool, dados, controleRecursao );

        }

        //ja esticou o range ao máximo e nao achou nada
        else if ( result.recordset.length == 0 && controleRecursao.aumentosGrandes >= 2 ) {
            // freia a recursão se o range já estiver em 6 horas
            return null
        }

        //não achou viagens após uma redução de uma faixa onde antes haviam viagens
        else if ( result.recordset.length == 0 && controleRecursao.reducoes > 0 ) {
            let margemAmpliada = esticaMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ], 5 ); //estica 5 minutos de cada lado
            dados.horaSaida = margemAmpliada[ 0 ];
            dados.horaChegada = margemAmpliada[ 1 ];
            controleRecursao.aumentosPequenos++;
            controleRecursao.total++;
            return await getViagem( pool, dados, controleRecursao );
        }

        //achou mais de uma viagem
        else {
            let margemReduzida = reduzMargemHorario( [
                dados.horaChegada,
                dados.horaSaida
            ], 20 )
            dados.horaSaida = margemReduzida[ 0 ];
            dados.horaChegada = margemReduzida[ 1 ];
            controleRecursao.reducoes++;
            controleRecursao.total++;
            return await getViagem( pool, dados, controleRecursao );
        }

    } catch ( err ) {
        let msg = `[ getViagem ] Erro ao consultar viagens no banco estático\n${err.message}`;
        console.log( msg );
    }
}

