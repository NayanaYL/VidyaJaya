import { createClient } from 'redis'; // Imports the tool for connecting to Redis (our fast in-memory database)
import { env } from './env.js'; // Imports our configuration (settings)

let redisClient = null; // A variable to hold our connection instance

/**
 * getRedisClient: This is how we get a connection to Redis. 
 * If it's already connected, it gives us the SAME one.
 * It's much faster than our main SQL database (good for timers and leaderboards).
 */
export const getRedisClient = async () => {
  if (redisClient) return redisClient; // Already have a connection? Give it back

  try {
    // 1. Create a new client and tell it which URL to connect to
    redisClient = createClient({
      url: env.redisUrl, // Points to our Redis server (local or in the cloud)
    });

    // 2. Add an error listener (to log if the connection fails)
    redisClient.on('error', (err) => console.error('Redis Client Error', err));

    // 3. Connect to the server
    await redisClient.connect();
    
    // Success! Return the client
    return redisClient;
  } catch (err) {
    // If Redis is NOT running, log it and return nothing
    console.error('Redis connection failed:', err.message);
    return null;
  }
};
