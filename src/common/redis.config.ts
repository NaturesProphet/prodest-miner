export const redisHost: string = process.env.MINER_REDIS_HOST;
export const redisPort: number = Number( process.env.MINER_REDIS_PORT );
export const redisDicionario: string = process.env.MINER_REDIS_DICIONARIO;
export const redisRaio: number = Number( process.env.MINER_REDIS_RAIO );
export const redisCacheTime: number = Number( process.env.MINER_REDIS_CACHE_TIME ) || 600; // 10 minutos default