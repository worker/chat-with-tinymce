import express from 'express';
import { createServer } from 'node:http';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { Server } from 'socket.io';
import { availableParallelism } from 'node:os';
import cluster from 'node:cluster';
import { createAdapter, setupPrimary } from '@socket.io/cluster-adapter';
import { createClient } from 'redis';

const client = createClient({
    password: 'qoBkPF1Tb3W3Cz4rWvswWZTxeNYbGT4h',
    socket: {
        host: 'redis-18757.c321.us-east-1-2.ec2.cloud.redislabs.com',
        port: 18757
    }
});

if (cluster.isPrimary) {
  const numCPUs = availableParallelism();
  for (let i = 0; i < numCPUs; i++) {
    cluster.fork({
      PORT: 3000 + i
    });
  }

  setupPrimary();
} else {
  await client.connect();

  const app = express();
  const server = createServer(app);
  const io = new Server(server, {
    connectionStateRecovery: {},
    adapter: createAdapter()
  });

  const __dirname = dirname(fileURLToPath(import.meta.url));

  app.get('/', (req, res) => {
    res.sendFile(join(__dirname, 'index.html'));
  });

  io.on('connection', async (socket) => {
    socket.on('chat message', async (msg, messageId, callback) => {
      // Set a string data type. Key being the messageId, Value is the message.
      await client.set(`chat:message:${messageId}`, msg);

      // Append new message id to the end of messages list
      await client.rPush('chat:messages', messageId);

      // Notify all clients via websockets that a new message has arrived
      io.emit('chat message', msg, messageId);
      callback();
    });

    if (!socket.recovered) {
      try {
        // Retrieve all saved messages from chat:messages list
        const messageIds = await client.lRange('chat:messages', 0, -1);

        if (messageIds.length > 0) {
          for (const messageId of messageIds) {
            const message = await client.get(`chat:message:${messageId}`);
            socket.emit('chat message', message, messageId);
          }
        }
      } catch (e) {
        // something went wrong
      }
    }
  });

  const port = process.env.PORT;

  server.listen(port, () => {
    console.log(`server running at http://localhost:${port}`);
  });
}
