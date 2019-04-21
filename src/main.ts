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
import { IniciaRedisConnection } from './services/redis/iniciaConexao.service';
import { sendPontosToRedis } from './services/redis/sendPontosToRedis.service';
import { getPontosProximos } from './services/redis/getPontosProximos.service';
import { getConsumerChannel } from './services/rabbitmq/getConsumerChannel.service';
//import { getPublishChannel } from './services/rabbitmq/getPublishChannel.service';


async function main () {

    let SqlConnection: ConnectionPool = await iniciaConexaoSql();

    const redisConnection = IniciaRedisConnection();
    await sendPontosToRedis( SqlConnection, redisConnection );
    const consumerChannel: Channel = await getConsumerChannel();
    //const publishChannel: Channel = await getPublishChannel();


    console.log( 'Job iniciado! Os dados já estão sendo processados.\n' )
    await consumerChannel.consume( rabbitConf.rabbitConsumeQueueName, async ( msg ) => {
        let veiculo = JSON.parse( msg.content.toString() );
        if ( veiculo != undefined && veiculo.IGNICAO ) {

            let LongLat = {
                longitude: veiculo.LONGITUDE,
                latitude: veiculo.LATITUDE
            };

            let PontosProximos: any[] = await getPontosProximos( redisConnection, LongLat );
            if ( PontosProximos != undefined && PontosProximos.length != 0 ) {
                veiculo.DATAHORA = veiculo.DATAHORA - 10800000; // converte para hora local, utc-3

                let veiculoDaVez: string = veiculo.ROTULO;
                let hrchegada: Date = new Date( veiculo.DATAHORA );
                hrchegada.setUTCHours( hrchegada.getUTCHours() + 2 );
                let chegada = hrchegada.toISOString();
                let hrsaida: Date = new Date( veiculo.DATAHORA );
                hrsaida.setUTCHours( hrsaida.getUTCHours() - 2 );
                let saida = hrsaida.toISOString();

                let dadosViagem: ViagemQueryObject = {
                    rota: veiculoDaVez,
                    horaChegada: chegada,
                    horaSaida: saida,
                    horaAgora: new Date( veiculo.DATAHORA ).toISOString()
                }

                let viagemDaVez = await getViagem( SqlConnection, dadosViagem );

                if ( viagemDaVez.length > 0 ) {
                    let viagemId = viagemDaVez[ 0 ].id;
                    let itinerarioId = viagemDaVez[ 0 ].itinerario_id
                    let pontoId = PontosProximos[ 0 ];
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
                            }
                        } );

                        if ( pontoEordemAtual != undefined ) {
                            ordem = pontoEordemAtual.ordem;
                            if ( pontoId == sequenciaPontos[ 0 ].ponto_id ) {
                                inicial = 1;
                            }
                            if ( pontoId == sequenciaPontos[ sequenciaPontos.length - 1 ].ponto_id ) {
                                final = 1;
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
                            await salvaHistoria( SqlConnection, historia );
                            // publishChannel.sendToQueue(
                            //     rabbitConf.rabbitPublishQueueName,
                            //     new Buffer( JSON.stringify( historia ) ),
                            //     { persistent: false }
                            // );
                        }
                    }
                }
            }

        }
        consumerChannel.ack( msg );
    } );
}

main();
