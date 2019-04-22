import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as conf from '../../common/rabbit.config';
import * as amqp from 'amqplib';



export async function getConsumerChannel (): Promise<amqp.Channel> {
    let conn: amqp.Connection;
    let channel: amqp.Channel;
    while ( channel == undefined ) {

        try {
            conn = await amqp.connect( conf.amqpOptions );
        } catch ( err ) {
            console.log( `[ getConsumerChannel ] Falha ao tentar se conectar ao rabbitMQ. ${err.message}` );
        }
        if ( conn ) {
            try {
                channel = await conn.createChannel();
            } catch ( err ) {
                console.log( `[ getConsumerChannel ] Falha ao declarar um canal no rabbitMQ. ${err.message}` );
                channel = undefined;
            }

            try {
                await channel.assertExchange( conf.rabbitTopicName, 'topic', { durable: false } );
            } catch ( err ) {
                console.log( `[ getConsumerChannel ] Falha ao declarar um topico no rabbitMQ. ${err.message}` );
                channel = undefined;
            }

            try {
                await channel.assertQueue( conf.rabbitConsumerQueueName, { messageTtl: conf.rabbitConsumerTTL, durable: false } );
            } catch ( err ) {
                console.log( `[ getConsumerChannel ] Falha ao declarar a fila de consumo no rabbitMQ. ${err.message}` );
                channel = undefined;
            }

            try {
                await channel.bindQueue( conf.rabbitConsumerQueueName, conf.rabbitTopicName, conf.rabbitConsumerRoutingKey );
            } catch ( err ) {
                console.log( `[ getConsumerChannel ] Falha ao configurar a chave de roteamento. ${err.message}` );
                channel = undefined;
            }
        }
    }
    return channel;
}
