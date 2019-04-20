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

            let q1 = msgToRabbit.veiculo.ROTULO;
            let q2 = msgToRabbit.veiculo.DATAHORA;
            let q3 = new Date( veiculo.DATAHORA ).toISOString();
            let q4 = msgToRabbit.veiculo.VELOCIDADE;
            let q5 = msgToRabbit.veiculo.IGNICAO;
            let q6 = msgToRabbit.pontosProximos[ 0 ];

            let statement = `INSERT INTO VeiculoXPontos ` +
                `(veiculo, datahoraMillis, datahora, velocidade, ignicao, ponto_id_geocontrol) VALUES ` +
                `( '${q1}', ${q2}, '${q3}', ${q4}, '${q5}', ${q6} )`;
            try {
                await sql.query( statement );
            } catch ( err ) {
                let msg = `Erro ao salvar um historico no banco estático\n${err.message}`;
                console.log( msg );
            }


        }
        consumerChannel.ack( msg );
    } );
}

main();


