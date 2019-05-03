import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as rabbitConf from './common/rabbit.config';
import { Channel } from 'amqplib';
import { ConnectionPool } from 'mssql';
import { ViagemQueryObject } from './DTOs/viagemQuery.interface';
import { getViagem } from './services/mssql/getViagem.service';
import { getSequenciaPontos } from './services/mssql/getSequenciaPontos.service';
import { PontoXOrdem } from './DTOs/PontoXOrdem.interface';
import { VeiculoXPonto } from './DTOs/VeiculoXPonto.interface';
import { salvaHistoria } from './services/mssql/salvaHistoria.service';
import { iniciaConexaoSql } from './services/mssql/iniciaConexao.service';
import { IniciaConexaoRedis } from './services/redis/iniciaConexao.service';
import { sendPontosToRedis } from './services/redis/sendPontosToRedis.service';
import { getPontosProximos } from './services/redis/getPontosProximos.service';
import { getConsumerChannel } from './services/rabbitmq/getConsumerChannel.service';
import { isPontoInicial, isPontoFinal } from './services/tempo/pontos.service';
import { geraMargemHorario } from './services/tempo/margensHorario.service';
import { getPublishChannel } from './services/rabbitmq/getPublishChannel.service';
import { AviseQueEsseOnibusJaPassouAqui } from './services/redis/onibusPassando.service';
import { onibusJaPassou } from './services/redis/onibusJaPassou.service';
import { getPontoCerto } from './services/mssql/getPontoCerto.service';
import { processaViagensTerminadas } from './services/processaViagensTerminadas/main';


async function main () {

    let SqlConnection: ConnectionPool = await iniciaConexaoSql();

    const redisConnection = IniciaConexaoRedis();
    await sendPontosToRedis( SqlConnection, redisConnection );
    const consumerChannel: Channel = await getConsumerChannel();
    const publishChannel: Channel = await getPublishChannel();



    //--------------------------------------------
    /**
     * Sub-rotina que vasculha os dados no historico bruto
     * em busca das viagens que aconteceram na ultima hora,
     * e então entrega no tópico os ids dessas viagens para
     * serem processadas do outro lado pelo consumidor.
     * (safe)
     */
    const intervalo: number = 3600000;
    setInterval( async () => {
        processaViagensTerminadas( SqlConnection, publishChannel );
    }, intervalo );
    //----------------------------------------------



    console.log( '\n-----------------------------------------------------------' );
    console.log( `[ ${new Date().toString()} ]\nO Miner iniciou com sucesso!` );
    console.log( '-----------------------------------------------------------\n\n' );



    //abre um consumidor do topico (safe)
    await consumerChannel.consume( rabbitConf.rabbitConsumerQueueName, async ( msg ) => {
        // transforma o buffer recebido em um objeto veiculo (safe)
        let veiculo = JSON.parse( msg.content.toString() );

        /** Elimina os veiculos desligados do processamento, 
         * passando apenas veiculos válidos e ligados. (safe) */
        if ( veiculo != undefined && veiculo.IGNICAO ) {


            // encapsula os dados de localização, para poder usar na query do redis (safe)
            let LongLat = {
                longitude: veiculo.LONGITUDE,
                latitude: veiculo.LATITUDE
            };

            /** Busca no redis quais são os pontos próximos
             * à coordenada atual onde o veículo está passando. (safe) */
            let PontosProximos: any[] = await getPontosProximos( redisConnection, LongLat );


            /**
             * Filtra o processamento, deixando o fluxo seguir apenas se o veículo
             * estiver nas proximidades de algum ponto. Caso contrário, seria
             * um processamento inútil e desperdicio de processador.
             * (safe)
             */
            if ( PontosProximos != undefined && PontosProximos.length != 0 ) {


                /**Aqui eu verfifico se este veículo já passou por essas bandas.
                 * não é 100% safe, pois o filtro verifica somente o primeiro ponto da
                 * lista de pontos próximos. De qualquer forma, nao causa danos à busca e já
                 * ajuda bastante na redução de processamento, eliminando a possibilidade
                 * de processar o mesmo onibus em um mesmo ponto devido a frequentes
                 * situações de transito intenso no local.
                 */
                if ( !await onibusJaPassou( `${veiculo.ROTULO}:${PontosProximos[ 0 ]}`, redisConnection ) ) {


                    /** Caso o veículo esteja passando por essas bandas pela primeira vez
                     * em um intervalo de 10 minutos, eu aviso no cache, assim, o filtro acima poderá
                     * filtrar veiculos já processados neste local caso transmitam novamente dentro
                     * desta area no período de 10 minutos (acontece muito).
                     * não é 100% safe pois o parâmetro é apenas o primeiro ponto da lista
                     * dos pontos próximos.
                     */
                    await AviseQueEsseOnibusJaPassouAqui( `${veiculo.ROTULO}:${PontosProximos[ 0 ]}`, redisConnection );

                    // o datahora chega em UTC. é necessário converter para UTC-3 (local) (safe)
                    veiculo.DATAHORA = veiculo.DATAHORA - 10800000;

                    let veiculoDaVez: string = veiculo.ROTULO;

                    /**
                     * Aqui eu tento identificar qual viagem o veículo está fazendo.
                     * Para essa tarefa, eu gero uma margem de horarios de 2 horas
                     * em torno do horario atual, e uso 'querys recursivas e elásticas'
                     * para identificar com precisão a viagem que está sendo feita
                     * pelo veículo. Esse diâmetro de 2 horas é dinâmico, ele pode
                     * aumentar ou diminuir algumas vezes até a viagem correta ser
                     * encontrada.
                     * verifique essas incríveis funções la em services. (safe)
                     */
                    let margemDeHorarios = geraMargemHorario( new Date( veiculo.DATAHORA ).toISOString() );

                    // definindo parâmetros para a query inicial da busca de viagens
                    let dadosViagem: ViagemQueryObject = {
                        veiculo: veiculoDaVez,
                        horaAgora: new Date( veiculo.DATAHORA ).toISOString(),
                        horaSaida: margemDeHorarios[ 0 ],
                        horaChegada: margemDeHorarios[ 1 ]
                    }

                    /**
                     * inicio a busca da viagem correta. o null significa o começo da recursão
                     * (safe)
                     */
                    let viagemDaVez = await getViagem( SqlConnection, dadosViagem, null );

                    // continua o fluxo se a viagem correta foi encontrada. (safe)
                    if ( viagemDaVez != null ) {

                        /**
                         * ESTE É O PONTO CRÍTICO DO PROJETO!
                         * Leia o README para detalhes.
                         * Aqui eu verifico, entre os pontos próximos, qual deles está no 
                         * traçado desta viagem.
                         * (CRÍTICO)
                         */
                        let pontoValido: PontoXOrdem = await
                            getPontoCerto( SqlConnection, viagemDaVez.itinerario_id, PontosProximos );


                        // caso o ponto seja válido para a viagem, segue o fluxo. (safe)
                        if ( pontoValido != undefined ) {

                            /**
                             * Verifica se esse veículo já passou por este ponto válido
                             * nos ultimos 10 minutos. (safe)
                             */
                            if ( !await onibusJaPassou( `${veiculo.ROTULO}:${pontoValido.ponto}`, redisConnection ) ) {

                                /**
                                 * Aviso ao cache (agora com precisão real) que este veículo
                                 * já passou por esse ponto. (safe)
                                 */
                                await AviseQueEsseOnibusJaPassouAqui( `${veiculo.ROTULO}:${pontoValido.ponto}`, redisConnection );

                                // inicio a construção da estutura da história real.
                                let viagemId = viagemDaVez.id;
                                let itinerarioId = viagemDaVez.itinerario_id
                                let pontoId = pontoValido.ponto

                                // lê a sequencia de pontos previstos. (safe)
                                let sequenciaPontos = await getSequenciaPontos( SqlConnection, itinerarioId );

                                let inicial: 1 | 0 = 0;
                                let final: 1 | 0 = 0;
                                let ordem: number;

                                //segue o fluxo caso a sequência for encontrada (safe)
                                if ( sequenciaPontos.length > 0 ) {

                                    /**
                                     * Aqui eu verifico se o onibus está em algum
                                     * dos pontos iniciais ou finais da viagem.
                                     * (safe, mas bastante sensível e dependente do getPontoCerto())
                                     */
                                    ordem = pontoValido.ordem;

                                    if ( pontoId == sequenciaPontos[ 0 ].ponto_id ) {
                                        if ( isPontoInicial( veiculo.DATAHORA, viagemDaVez.horadasaida ) ) {
                                            inicial = 1;
                                        }
                                    }

                                    if ( pontoId == sequenciaPontos[ sequenciaPontos.length - 1 ].ponto_id ) {
                                        if ( isPontoFinal( veiculo.DATAHORA, viagemDaVez.horadachegada ) ) {
                                            final = 1;
                                        }
                                    }

                                    // estrutura da história completada.
                                    let historia: VeiculoXPonto = {
                                        rotulo: veiculoDaVez,
                                        datahoraMillis: veiculo.DATAHORA,
                                        datahoraLegivel: new Date( veiculo.DATAHORA ).toISOString(),
                                        velocidade: veiculo.VELOCIDADE,
                                        ignicao: veiculo.IGNICAO,
                                        pontoId: pontoId,
                                        itinerarioId: itinerarioId,
                                        viagemId: viagemId,
                                        pontoInicial: inicial,
                                        pontoFinal: final,
                                        sequencia: ordem
                                    }

                                    // salva a história. (safe)
                                    salvaHistoria( SqlConnection, historia );

                                }
                            }
                        }
                    }
                }
            }
        }
        //avisa ao topico que a mensagem foi processada com sucesso e a remove da fila.
        consumerChannel.ack( msg );
    } );
}

main();
