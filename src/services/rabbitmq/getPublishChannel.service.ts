import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as conf from '../../common/rabbit.config';
import * as amqp from 'amqplib';


export async function getPublishChannel (): Promise<amqp.Channel> {
    let conn: amqp.Connection;
    let channel: amqp.Channel;
    while ( channel == undefined ) {
        try {
            conn = await amqp.connect( conf.amqpOptions );
        } catch ( err ) {
            console.log( `[ getPublishChannel ] Falha ao tentar se conectar ao rabbitMQ. ${err.message}` );
        }
        if ( conn ) {
            try {
                channel = await conn.createChannel();
            } catch ( err ) {
                console.log( `[ getPublishChannel ] Falha ao declarar o canal de produção no rabbitMQ. ${err.message}` );
                channel = undefined;
            }

            try {
                await channel.assertQueue( conf.rabbitPublishQueueName, { messageTtl: 30000, durable: false } );
            } catch ( err ) {
                console.log( `[ getPublishChannel ] Falha ao declarar a fila de produção no rabbitMQ. ${err.message}` );
                channel = undefined;
            }
        }
    }
    return channel;
}
