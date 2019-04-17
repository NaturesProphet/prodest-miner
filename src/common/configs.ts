export const rabbitHost: string = process.env.MINER_RABBIT_HOST;
export const rabbitPort: number = Number( process.env.MINER_RABBIT_PORT );
export const rabbitUser: string = process.env.MINER_RABBIT_USER;
export const rabbitPassword: string = process.env.MINER_RABBIT_PASSWORD;
export const rabbitTopicName: string = process.env.MINER_RABBIT_TOPIC_NAME;
export const rabbitConsumeQueueName: string = process.env.MINER_RABBIT_CONSUMER_QUEUE_NAME;
export const rabbitRoutingKey: string = process.env.MINER_RABBIT_ROUTING_KEY;


export const env: string = process.env.NODE_ENV;