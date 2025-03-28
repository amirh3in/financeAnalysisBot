import { FastifyInstance, FastifyPluginAsync } from 'fastify'
import fp from 'fastify-plugin'
import { Server, ServerOptions } from 'socket.io'
import { createSocketConnection } from './socket'

export type FastifySocketioOptions = Partial<ServerOptions> & {
    preClose?: (done: Function) => void
}

const fastifySocketIO: FastifyPluginAsync<FastifySocketioOptions> = fp(
    async function (fastify, opts: FastifySocketioOptions) {
        function defaultPreClose(done: Function) {
            (fastify as any).io.local.disconnectSockets(true)
            done()
        }
        fastify.decorate('io', new Server(fastify.server, opts))
        fastify.addHook('preClose', (done) => {
            if (opts.preClose) {
                return opts.preClose(done)
            }
            return defaultPreClose(done)
        })
        fastify.addHook('onClose', (fastify: FastifyInstance, done) => {
            (fastify as any).io.close()
            done()
        })

        createSocketConnection(fastify.io, fastify)
    },
    { fastify: '>=4.x.x', name: 'fastify-socket.io' },
)

export default fastifySocketIO

// interface ClientToServerEvents {
//     on: (arg: string) => void;
// }

// declare module 'fastify' {
//     interface FastifyInstance {
//         io: Server<ClientToServerEvents>
//     }
// }
