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
import { onibusPassando } from './services/redis/onibusPassando.service';
import { onibusJaPassou } from './services/redis/onibusJaPassou.service';
import { getPontoCerto } from 'services/mssql/getPontoCerto.service';


async function main () {

    let SqlConnection: ConnectionPool = await iniciaConexaoSql();

    const redisConnection = IniciaConexaoRedis();
    await sendPontosToRedis( SqlConnection, redisConnection );
    const consumerChannel: Channel = await getConsumerChannel();
    const publishChannel: Channel = await getPublishChannel();

    console.log( '\n-----------------------------------------------------------' );
    console.log( `[ ${new Date().toString()} ]\nO Miner iniciou com sucesso!` );
    console.log( '-----------------------------------------------------------\n\n' );
    await consumerChannel.consume( rabbitConf.rabbitConsumerQueueName, async ( msg ) => {
        let veiculo = JSON.parse( msg.content.toString() );
        debug( 1, `Veiculo recebido: ${veiculo}` );
        if ( veiculo != undefined && veiculo.IGNICAO ) {
            debug( 2, `Veiculo Ligado: ${veiculo}` );


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

                    await onibusPassando( `${veiculo.ROTULO}:${PontosProximos[ 0 ]}`, redisConnection );

                    veiculo.DATAHORA = veiculo.DATAHORA - 10800000; // converte para hora local, utc-3

                    let veiculoDaVez: string = veiculo.ROTULO;
                    let margemDeHorarios = geraMargemHorario( new Date( veiculo.DATAHORA ).toISOString() );
                    let dadosViagem: ViagemQueryObject = {
                        veiculo: veiculoDaVez,
                        horaAgora: new Date( veiculo.DATAHORA ).toISOString(),
                        horaSaida: margemDeHorarios[ 0 ],
                        horaChegada: margemDeHorarios[ 1 ]
                    }
                    debug( 4, `Veiculo da vez: ${veiculoDaVez}` );

                    let viagemDaVez = await getViagem( SqlConnection, dadosViagem, null );

                    if ( viagemDaVez != null ) {

                        let pontoCorreto = await
                            getPontoCerto( SqlConnection, viagemDaVez.itinerario_id, PontosProximos );

                        if ( pontoCorreto != undefined ) {

                            debug( 5, `Viagem da vez: ${viagemDaVez}` );
                            let viagemId = viagemDaVez.id;
                            let itinerarioId = viagemDaVez.itinerario_id
                            let pontoId = pontoCorreto;
                            let sequenciaPontos = await getSequenciaPontos( SqlConnection, itinerarioId );
                            let inicial: 1 | 0 = 0;
                            let final: 1 | 0 = 0;
                            let ordem: number;

                            if ( sequenciaPontos.length > 0 ) {
                                let pontoEordemAtual: PontoXOrdem;
                                sequenciaPontos.forEach( element => {
                                    if ( element.ponto_id == pontoId ) {
                                        pontoEordemAtual = {
                                            ponto: element.ponto_id,
                                            ordem: element.ordem
                                        }
                                        debug( 6, `Ponto e ordem atual: ${pontoEordemAtual}` );
                                    }
                                } );

                                if ( pontoEordemAtual != undefined ) {
                                    ordem = pontoEordemAtual.ordem;
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
                                    debug( 7, `Historia: ${historia}` );
                                    await salvaHistoria( SqlConnection, historia );
                                    if ( historia.pontoFinal == 1 ) {
                                        publishChannel.publish(
                                            rabbitConf.rabbitTopicName,
                                            rabbitConf.rabbitPublishRoutingKey,
                                            new Buffer( JSON.stringify( { viagem: historia.viagemId } ) ),
                                            { persistent: false }
                                        );
                                    }
                                }
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
