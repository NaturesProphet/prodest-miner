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
import { processaViagensNaoIdentificadas } from './services/IdentificaViagensTerminadasNaoIdentificadas/subRotinaViagens.service';
import { avisaNoTopico } from './services/rabbitmq/avisaNoTopico.service';


async function main () {

    let SqlConnection: ConnectionPool = await iniciaConexaoSql();

    const redisConnection = IniciaConexaoRedis();
    await sendPontosToRedis( SqlConnection, redisConnection );
    const consumerChannel: Channel = await getConsumerChannel();
    const publishChannel: Channel = await getPublishChannel();



    //--------------------------------------------
    /**
     * Sub-rotina que verifica quais foram as ultimas viagens
     * terminadas que não tiveram seus pontos finais identificados.
     * após a identificação, elas são entregues a fila.
     */
    setInterval( async () => {
        await processaViagensNaoIdentificadas( SqlConnection, publishChannel );
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
                                        avisaNoTopico( publishChannel, historia.viagemId );
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
