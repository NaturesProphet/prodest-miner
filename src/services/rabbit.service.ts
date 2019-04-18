import * as dotenv from 'dotenv';
if ( process.env.NODE_ENV != 'production' ) {
    dotenv.config();
}
import * as conf from '../common/rabbit.config';
import * as amqp from 'amqplib';

const amqpOptions: amqp.Options.Connect = {
    hostname: conf.rabbitHost,
    locale: 'pt-br',
    port: conf.rabbitPort,
    username: conf.rabbitUser,
    password: conf.rabbitPassword
};



export async function getConsumerChannel (): Promise<amqp.Channel> {
    let conn: amqp.Connection;
    let channel: amqp.Channel;

    try {
        conn = await amqp.connect( amqpOptions );
    } catch ( err ) {
        console.log( `[ ERRO ] Falha ao tentar se conectar ao rabbitMQ. ${err.message}` );
        process.exit( 1 );
    }

    try {
        channel = await conn.createChannel();
    } catch ( err ) {
        console.log( `[ ERRO ] Falha ao declarar um canal no rabbitMQ. ${err.message}` );
        process.exit( 1 );
    }

    try {
        await channel.assertExchange( conf.rabbitTopicName, 'topic', { durable: false } );
    } catch ( err ) {
        console.log( `[ ERRO ] Falha ao declarar um topico no rabbitMQ. ${err.message}` );
        process.exit( 1 );
    }

    try {
        await channel.assertQueue( conf.rabbitConsumeQueueName, { messageTtl: 30000, durable: false } );
    } catch ( err ) {
        console.log( `[ ERRO ] Falha ao declarar a fila de consumo no rabbitMQ. ${err.message}` );
        process.exit( 1 );
    }

    try {
        await channel.bindQueue( conf.rabbitConsumeQueueName, conf.rabbitTopicName, conf.rabbitRoutingKey );
    } catch ( err ) {
        console.log( `[ ERRO ] Falha ao configurar a chave de roteamento. ${err.message}` );
        process.exit( 1 );
    }
    return channel;
}
