import { join } from 'node:path'
import type { FastifyPluginAsync } from 'fastify'

import type { AutoloadPluginOptions } from '@fastify/autoload'
import AutoLoad from '@fastify/autoload'

export type AppOptions = {
  // Place your custom options for app below here.
} & Partial<AutoloadPluginOptions>

const app: FastifyPluginAsync<AppOptions> = async (
  fastify,
  opts,
): Promise<void> => {
  // Place here your custom code!

  // Do not touch the following lines

  // This loads all plugins defined in plugins
  // those should be support plugins that are reused
  // through your application
  void fastify.register(AutoLoad, {
    dir: join(__dirname, 'plugins'),
    options: opts,
  })

  // This loads all plugins defined in routes
  // define your routes in one of these
  void fastify.register(AutoLoad, {
    dir: join(__dirname, process.env.API_DIRECTORY ?? "routes"),
    options: opts,
  })
}

export default app
export { app }
