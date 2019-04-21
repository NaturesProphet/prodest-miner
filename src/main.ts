import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as redis from './services/redis.service';
import * as rabbitConf from './common/rabbit.config';
import * as rabbit from './services/rabbit.service';
import { Channel } from 'amqplib';
import { mssqlConnectionString } from './common/mssql.config';
import * as sql from 'mssql';


async function main () {
    const redisConnection = redis.getConnection();
    await redis.sendPontosToRedis( redisConnection );
    await sql.connect( mssqlConnectionString );
    const consumerChannel: Channel = await rabbit.getConsumerChannel();
    //const publishChannel: Channel = await rabbit.getPublishChannel();
    console.log( 'Job iniciado! Os dados já estão sendo processados.\n' )
    await consumerChannel.consume( rabbitConf.rabbitConsumeQueueName, async ( msg ) => {
        let veiculo = JSON.parse( msg.content.toString() );
        let LongLat = {
            longitude: veiculo.LONGITUDE,
            latitude: veiculo.LATITUDE
        };
        let PontosProximos: any[] = await redis.getPontosProximos( redisConnection, LongLat );
        if ( PontosProximos != undefined && PontosProximos.length != 0 ) {
            veiculo.DATAHORA = veiculo.DATAHORA - 10800000; // converte para hora local, utc-3
            let msgToRabbit = {
                veiculo: veiculo,
                pontosProximos: PontosProximos
            }
            //console.log( msgToRabbit );
            //publishChannel.sendToQueue( rabbitConf.rabbitPublishQueueName, new Buffer( JSON.stringify( msgToRabbit ) ), { persistent: false } );


            let rot: string = msgToRabbit.veiculo.ROTULO;
            let hrchegada: Date = new Date( veiculo.DATAHORA );
            hrchegada.setUTCHours( hrchegada.getUTCHours() + 3 );
            let chegada = hrchegada.toISOString();
            let hrsaida: Date = new Date( veiculo.DATAHORA );
            hrsaida.setUTCHours( hrsaida.getUTCHours() - 3 );
            let saida = hrsaida.toISOString();

            let statement1 = `SELECT viagem.id, viagem.itinerario_id FROM viagem `
                + `INNER JOIN itinerario ON viagem.itinerario_id = itinerario.id `
                + `where veiculo = '${rot}' and horadachegada < '${chegada}' `
                + `and horadasaida BETWEEN '${saida}' and '${new Date( veiculo.DATAHORA ).toISOString()}' `;
            //console.log( statement1 )
            try {

                let result1 = await sql.query( statement1 );
                if ( result1.recordset.length > 0 ) {
                    let viagemId = result1.recordset[ 0 ].id;
                    let itinerarioId = result1.recordset[ 0 ].itinerario_id
                    let pontoId = msgToRabbit.pontosProximos[ 0 ];

                    let statement2 = `SELECT ponto_id, ordem FROM itinerario_ponto `
                        + `WHERE itinerario_id = ${itinerarioId} ORDER BY ordem`;
                    try {
                        let result2 = await sql.query( statement2 );
                        let inicial: boolean = false;
                        let final: boolean = false;
                        let ordem: number;
                        if ( result2.recordset.length > 0 ) {
                            let pontoXOrdem: any;
                            result2.recordset.forEach( element => {
                                if ( element.ponto_id == pontoId ) {
                                    pontoXOrdem = {
                                        ponto: element.ponto_id,
                                        ordem: element.ordem
                                    }
                                }
                            } );

                            if ( pontoXOrdem != undefined ) {
                                if ( pontoId == pontoXOrdem.ponto ) {
                                    inicial = true;
                                }
                                if ( pontoId == pontoXOrdem.ponto ) {
                                    final = true;
                                }
                                let q2 = msgToRabbit.veiculo.DATAHORA;
                                let q3 = new Date( veiculo.DATAHORA ).toISOString();
                                let q4 = msgToRabbit.veiculo.VELOCIDADE;
                                let q5 = msgToRabbit.veiculo.IGNICAO;

                                let statement3 = `INSERT INTO VeiculoXPontos `
                                    + `(veiculo, datahoraMillis, datahora, velocidade, ignicao, ponto_id, `
                                    + `itinerario_id, viagem_id, pontoInicial, pontoFinal) `
                                    + `VALUES ( '${rot}', ${q2}, '${q3}', ${q4}, '${q5}', ${pontoId}, `
                                    + `${itinerarioId}, ${viagemId}, '${inicial}', '${final}' )`;

                                try {
                                    await sql.query( statement3 );
                                } catch ( err ) {
                                    console.log( '-------------------------------------------' )
                                    let msg = `Erro ao salvar um historico no banco estático\n${err.message}`;
                                    console.log( msg );
                                    console.log( `Query3: ${statement3}` );
                                    console.log( '-------------------------------------------' )
                                }
                            }
                        }
                    } catch ( err ) {
                        console.log( '-------------------------------------------' )
                        console.log( `Erro ao buscar pontos do itinerario ${itinerarioId}.` );
                        console.log( err.message );
                        console.log( `Query2: ${statement2} ` )
                        console.log( '-------------------------------------------' )
                    }
                } else {
                    //console.log( `Itinerario e viagem para o veiculo ${ rot } não encontrados` )
                }
            } catch ( err ) {
                let msg = `Erro ao buscar viagens no banco estático\n${err.message}
                                query1: ${ statement1} `;
                console.log( msg );
            }

        }
        consumerChannel.ack( msg );
    } );
}

main();


