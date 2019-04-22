import { Options } from "amqplib";

const rabbitHost: string = process.env.MINER_RABBIT_HOST;
const rabbitPort: number = Number( process.env.MINER_RABBIT_PORT );
const rabbitUser: string = process.env.MINER_RABBIT_USER;
const rabbitPassword: string = process.env.MINER_RABBIT_PASSWORD;
export const rabbitTopicName: string = process.env.MINER_RABBIT_TOPIC_NAME;
export const rabbitConsumerQueueName: string = process.env.MINER_RABBIT_CONSUMER_QUEUE_NAME;
export const rabbitPublishQueueName: string = process.env.MINER_RABBIT_PUBLISH_QUEUE_NAME;
export const rabbitConsumerRoutingKey: string = process.env.MINER_RABBIT_CONSUMER_ROUTING_KEY;
export const rabbitPublishRoutingKey: string = process.env.MINER_RABBIT_PUBLISH_ROUTING_KEY;


export const amqpOptions: Options.Connect = {
    hostname: rabbitHost,
    locale: 'pt-br',
    port: rabbitPort,
    username: rabbitUser,
    password: rabbitPassword
};
