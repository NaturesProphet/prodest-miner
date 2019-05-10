import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import { ConnectionPool } from 'mssql';
import { PontoXOrdem } from 'DTOs/PontoXOrdem.interface';
import { TodosOsPontosSaoIguais } from 'services/utils/verificaPontosIguais.service';
import { qualFoiAUltimaSequencia } from './qualFoiAUltimaSequencia.service';
import { quadranteDoVeiculo, quadranteDoPonto } from 'services/utils/quadrantes.service';
import { getAzimute } from 'services/redis/getAzimute.service';

/**
 * Essa função escolhe, entre uma lista de pontos próximos, aquele que se encaixa 
 * no itinerário que o onibus está realizando, no sentido (curso) em que está andando.
 * @param pool Conexão ao SQL-Server
 * @param itinerarioId ID (banco estatico) do itinerario
 * @param curso numero trigonométrico representando o sentido que o onibus está andando
 * @param pontos Lista com os pontos próximos ao veículo
 */
export async function getPontoCerto ( pool: ConnectionPool, itinerarioId: number,
    viagemId: number, curso: number, pontos: any[], redisConnection ): Promise<PontoXOrdem> {

    // seleciona os pontos possíveis do itinerario entre a lista informada
    let query = '';
    try {
        query = `SELECT ponto_id, ordem FROM itinerario_ponto `
            + `WHERE itinerario_id = ${itinerarioId} AND `
            + `ponto_id IN ( ${pontos} )`;

        let result = await pool.request().query( query );


        // se algo foi encontrado, processa, senão, devolve null.
        if ( result.recordset != undefined && result.recordset.length > 0 ) {

            //se apenas um ponto foi encontrado, já é o ponto válido.
            if ( result.recordset.length == 1 ) {
                let pontoOrdem: PontoXOrdem = {
                    ponto: result.recordset[ 0 ].ponto_id,
                    ordem: result.recordset[ 0 ].ordem
                }
                return pontoOrdem;
            }

            // se mais de um ponto possível foi encontrado, analisa o caso
            else if ( result.recordset.length > 1 ) {

                /**
                 * Caso: Todos os pontos válidos são o mesmo ponto
                 * Descrição: Este caso acontece quando um itinerario
                 * passa no mesmo ponto de ônibus mais de uma vez durante
                 * as suas viagens.
                 * !detalhe: Neste caso, apenas um ID de ponto apareceu na lista, sem msituras.
                 */
                if ( TodosOsPontosSaoIguais( result.recordset ) ) {

                    /**
                     * Se todos os pontos são o mesmo, então preciso saber em qual sequencia
                     * do plano o veículo está passando no ponto. para descobrir, eu apenas
                     * verifico qual foi a ultima sequencia detectada dessa viagem, e então
                     * posso deduzir em qual sequencia o veiculo está passando nesse ponto.
                     */
                    let ultimaOrdem: number = await qualFoiAUltimaSequencia( pool, viagemId );

                    if ( ultimaOrdem != undefined ) {
                        if ( ultimaOrdem < result.recordset[ 0 ].ordem ) {
                            let pontoOrdem: PontoXOrdem = {
                                ponto: result.recordset[ 0 ].ponto_id,
                                ordem: result.recordset[ 0 ].ordem
                            }
                            return pontoOrdem;
                        } else {
                            let pontoOrdem: PontoXOrdem = {
                                ponto: result.recordset[ 0 ].ponto_id,
                                ordem: result.recordset[ 1 ].ordem
                            }
                            return pontoOrdem;
                        }
                    }
                }

                /**
                    * Neste caso a seguir, temos 2 pontos válidos, sendo que os dois são diferentes.
                    * isso acontece em avenidas com um ponto de frente pra outro, sendo
                    * os dois pontos integrantes do itinerario.
                */
                else if ( result.recordset.length == 2 ) {


                    let quadranteDoCarro = quadranteDoVeiculo( curso );
                    let azimutePonto1 = await getAzimute( result.recordset[ 0 ].ponto_id, redisConnection );
                    let azimutePonto2 = await getAzimute( result.recordset[ 1 ].ponto_id, redisConnection );
                    let quadrantePonto1 = quadranteDoPonto( azimutePonto1 );
                    let quadrantePonto2 = quadranteDoPonto( azimutePonto2 );

                    if ( quadranteDoCarro == quadrantePonto1 ) {
                        let pontoOrdem: PontoXOrdem = {
                            ponto: result.recordset[ 0 ].ponto_id,
                            ordem: result.recordset[ 0 ].ordem
                        }
                        return pontoOrdem;
                    } else if ( quadranteDoCarro == quadrantePonto2 ) {
                        let pontoOrdem: PontoXOrdem = {
                            ponto: result.recordset[ 1 ].ponto_id,
                            ordem: result.recordset[ 1 ].ordem
                        }
                        return pontoOrdem;
                    } else {
                        // let msg = `Caso de quadrantes imcompativeis detectado.\n`
                        //     + `Itinerario: ${itinerarioId}\n`
                        //     + `curso do veiculo: ${curso}\n`
                        //     + `pontos proximos: ${JSON.stringify( result.recordset )}\n`
                        //     + `quadrante do veiculo: ${quadranteDoCarro}\n`
                        //     + `quadrante do ponto 1: ${quadrantePonto1}\n`
                        //     + `quadrante do ponto 2: ${quadrantePonto2}\n`;
                        // console.log( msg );
                        return null;
                    }
                }


                /**
                 * Nesse caso, temos dois pares de pontos iguais.
                 * Quando isso acontece (4 pontos sendo 2 iguais), é pq o itinerario
                 * passa nos dois pontos, duas vezes em cada um, em sequencias diferentes.
                 */
                else if (
                    result.recordset.length == 4 &&
                    result.recordset[ 0 ].ponto_id == result.recordset[ 1 ].ponto_id &&
                    result.recordset[ 2 ].ponto_id == result.recordset[ 3 ].ponto_id
                ) {
                    return null;
                }
            } else {
                console.log( "Cabe um WTF aqui" );
                console.log( result.recordset );
                return null;
            }
        }
        else {
            return null;
        }
    } catch ( err ) {
        let msg = `[ getPontoCerto ] Erro ao consultar sequencia de pontos no banco estático\n`
            + `Erro: ${err.message} \nQuery: ${query} \n`;
        console.log( msg );
    }
}
