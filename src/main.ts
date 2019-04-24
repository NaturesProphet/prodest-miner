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
import { debug } from './services/utils/console.service';
import { AviseQueEsseOnibusJaPassouAqui } from './services/redis/onibusPassando.service';
import { onibusJaPassou } from './services/redis/onibusJaPassou.service';
import { getPontoCerto } from './services/mssql/getPontoCerto.service';
import { listaViagensDaHora } from './services/IdentificaViagensTerminadasNaoIdentificadas/listaViagensDaHora.service';
import { filtraPorViagensRealizadas } from './services/IdentificaViagensTerminadasNaoIdentificadas/filtraPorViagensRealizadas.service';
import { filtraPorViagensNaoProcessadas } from './services/IdentificaViagensTerminadasNaoIdentificadas/filtraPorViagensNaoProcessadas.service';


async function main () {

    let SqlConnection: ConnectionPool = await iniciaConexaoSql();

    const redisConnection = IniciaConexaoRedis();
    await sendPontosToRedis( SqlConnection, redisConnection );
    const consumerChannel: Channel = await getConsumerChannel();
    const publishChannel: Channel = await getPublishChannel();
    let bufferDeViagensJaProcessadas: number[] = new Array();


    //--------------------------------------------
    /**
     * Sub-rotina que verifica quais foram as ultimas viagens
     * terminadas que não tiveram seus pontos finais identificados.
     * após a identificação, elas são entregues a fila.
     */
    setInterval( async () => {
        let now = new Date();
        let announce = `\n\n***************************************************\n`
            + `[ ${now} ]\nSub-algoritmo de identificação de viagens sem ponto final `
            + `iniciado...`;
        console.log( announce );

        let ultimasViagensPrevistas = await listaViagensDaHora( SqlConnection );

        if ( ultimasViagensPrevistas ) {
            console.log( `${ultimasViagensPrevistas.length} viagens estavam previstas essa hora.` )

            let viagensRecentesRealizadas = await filtraPorViagensRealizadas
                ( SqlConnection, ultimasViagensPrevistas );


            if ( viagensRecentesRealizadas ) {
                console.log( `${viagensRecentesRealizadas.length} viagens realizadas` )

                let viagensNaoProcessadas = await filtraPorViagensNaoProcessadas
                    ( SqlConnection, bufferDeViagensJaProcessadas, viagensRecentesRealizadas );

                if ( viagensNaoProcessadas ) {
                    console.log( `Viagens já processadas: ${bufferDeViagensJaProcessadas.length}` )
                    console.log( `${viagensNaoProcessadas.length} não processadas` )
                    viagensNaoProcessadas.forEach( viagem => {
                        publishChannel.publish(
                            rabbitConf.rabbitTopicName,
                            rabbitConf.rabbitPublishRoutingKey,
                            new Buffer( JSON.stringify( { viagem: viagem } ) ),
                            { persistent: false }
                        );
                    } );
                    console.log( `${viagensNaoProcessadas.length} viagens descobertas e entregues.` )
                    bufferDeViagensJaProcessadas = new Array(); // limpa o buffer
                } else {
                    console.log( 'Não achou viagens não processadas.\n' +
                        `Tamanho atual do Buffer: ${bufferDeViagensJaProcessadas.length}\n`
                        + 'O miner foi ligado agora ?' );
                }
            } else {
                console.log( 'Não encontrou viagens na tabela do miner. ' +
                    'O miner foi ligado agora?' )
            }
        } else {
            console.log( `Não achou as viagens previstas.. ` +
                `o banco está carregado com as viagens de hoje?` );
        }
        console.log( `Sub algoritmo concluído para este horario.\n--------------` )
    }, 3600000 );
    //----------------------------------------------





    console.log( '\n-----------------------------------------------------------' );
    console.log( `[ ${new Date().toString()} ]\nO Miner iniciou com sucesso!` );
    console.log( '-----------------------------------------------------------\n\n' );
    await consumerChannel.consume( rabbitConf.rabbitConsumerQueueName, async ( msg ) => {
        let veiculo = JSON.parse( msg.content.toString() );
        debug( 1, `Veiculo recebido: ${JSON.stringify( veiculo )}` );
        if ( veiculo != undefined && veiculo.IGNICAO ) {
            debug( 2, `Veiculo Ligado: ${JSON.stringify( veiculo )}` );


            let LongLat = {
                longitude: veiculo.LONGITUDE,
                latitude: veiculo.LATITUDE
            };

            let PontosProximos: any[] = await getPontosProximos( redisConnection, LongLat );

            debug( 2, `Pontos Próximos de ${veiculo.ROTULO}: ${PontosProximos.length}` );

            if ( PontosProximos != undefined && PontosProximos.length != 0 ) {

                debug( 3, `Pontos válidos detectados` );

                if ( !await onibusJaPassou( `${veiculo.ROTULO}:${PontosProximos[ 0 ]}`, redisConnection ) ) {
                    debug( 4, `Onibus ${veiculo.ROTULO} passando agora no ponto ${PontosProximos[ 0 ]}` );

                    await AviseQueEsseOnibusJaPassouAqui( `${veiculo.ROTULO}:${PontosProximos[ 0 ]}`, redisConnection );

                    veiculo.DATAHORA = veiculo.DATAHORA - 10800000; // converte para hora local, utc-3

                    let veiculoDaVez: string = veiculo.ROTULO;
                    let margemDeHorarios = geraMargemHorario( new Date( veiculo.DATAHORA ).toISOString() );
                    let dadosViagem: ViagemQueryObject = {
                        veiculo: veiculoDaVez,
                        horaAgora: new Date( veiculo.DATAHORA ).toISOString(),
                        horaSaida: margemDeHorarios[ 0 ],
                        horaChegada: margemDeHorarios[ 1 ]
                    }
                    debug( 4, `Veiculo da vez: ${JSON.stringify( veiculoDaVez )}` );

                    let viagemDaVez = await getViagem( SqlConnection, dadosViagem, null );

                    if ( viagemDaVez != null ) {

                        let pontoValido: PontoXOrdem = await
                            getPontoCerto( SqlConnection, viagemDaVez.itinerario_id, PontosProximos );

                        if ( pontoValido != undefined ) {
                            if ( !await onibusJaPassou( `${veiculo.ROTULO}:${pontoValido.ponto}`, redisConnection ) ) {

                                debug( 5, `Viagem da vez: ${JSON.stringify( viagemDaVez )}` );
                                await AviseQueEsseOnibusJaPassouAqui( `${veiculo.ROTULO}:${pontoValido.ponto}`, redisConnection );


                                let viagemId = viagemDaVez.id;
                                let itinerarioId = viagemDaVez.itinerario_id
                                let pontoId = pontoValido.ponto
                                let sequenciaPontos = await getSequenciaPontos( SqlConnection, itinerarioId );
                                let inicial: 1 | 0 = 0;
                                let final: 1 | 0 = 0;
                                let ordem: number;

                                if ( sequenciaPontos.length > 0 ) {

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

                                    debug( 7, `Historia: ${JSON.stringify( historia )}` );
                                    await salvaHistoria( SqlConnection, historia );

                                    if ( historia.pontoFinal == 1 ) {
                                        bufferDeViagensJaProcessadas.push( historia.viagemId );
                                        publishChannel.publish(
                                            rabbitConf.rabbitTopicName,
                                            rabbitConf.rabbitPublishRoutingKey,
                                            new Buffer( JSON.stringify( { viagem: historia.viagemId } ) ),
                                            { persistent: false }
                                        );
                                    }
                                }
                            } else {
                                debug( 5, `Onibus ${veiculo.ROTULO} já passou no ponto ${pontoValido.ponto} `
                                    + `e portanto não será processado novamente.` );
                            }
                        }
                    }
                } else {
                    debug( 4, `Onibus ${veiculo.ROTULO} já passou no ponto ${PontosProximos[ 0 ]} `
                        + `e portanto não será processado novamente.` );
                }
            }
        }
        consumerChannel.ack( msg );
    } );
}

main();
