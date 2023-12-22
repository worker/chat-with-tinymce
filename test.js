import { createClient } from 'redis';

const client = createClient({
    password: 'qoBkPF1Tb3W3Cz4rWvswWZTxeNYbGT4h',
    socket: {
        host: 'redis-18757.c321.us-east-1-2.ec2.cloud.redislabs.com',
        port: 18757
    }
});

client.on('error', err => console.log('Redis Client Error', err));
await client.connect();

// await client.set('weisemail', 'weionstream@gmail.com');
const value = await client.get('weisemail');

console.log(`Wei's Email is ${value}`)

await client.hSet('user-session:123', {
    name: 'Wei',
    surname: 'He',
    company: 'MLH',
    email: 'weionstream@gmail.com'
})
