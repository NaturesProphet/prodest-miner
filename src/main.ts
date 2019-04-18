import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as redis from './services/redis.service';
import * as rabbitConf from './common/rabbit.config';
import *as rabbit from './services/rabbit.service';
import { Channel } from 'amqplib';

async function main () {

    const redisConnection = redis.getConnection();
    await redis.sendPontosToRedis( redisConnection );
    const consumerChannel: Channel = await rabbit.getConsumerChannel();
    const publishChannel: Channel = await rabbit.getPublishChannel();

    await consumerChannel.consume( rabbitConf.rabbitConsumeQueueName, async ( msg ) => {
        let veiculo = JSON.parse( msg.content.toString() );
        let LongLat = {
            longitude: veiculo.LONGITUDE,
            latitude: veiculo.LATITUDE
        };
        let PontosProximos: any[] = await redis.getPontosProximos( redisConnection, LongLat );
        if ( PontosProximos != undefined && PontosProximos.length != 0 ) {
            let msgToRabbit = {
                veiculo: veiculo,
                pontosProximos: PontosProximos
            }
            publishChannel.sendToQueue( rabbitConf.rabbitPublishQueueName, new Buffer( JSON.stringify( msgToRabbit ) ), { persistent: false } );
        }
        consumerChannel.ack( msg );
    } );
}

main();


