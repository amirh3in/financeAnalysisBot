import 'reflect-metadata'
import closeWithGrace from 'close-with-grace'
import * as dotenv from 'dotenv'
import Fastify from 'fastify'
import { initSwagger } from './swagger'
import app from './app'
import ajvErrors from 'ajv-errors'
import sendLog from './logger'

dotenv.config()

const fastify = Fastify({
  logger: true,
  ajv: {
    customOptions: {
      allErrors: true,
    },
    plugins: [ajvErrors],
  }
})

// error handler
fastify.setErrorHandler((err, req, rep) => {
  if (err.validation) {
    const validationErrors = err.validation.map((error: any) => {
      // Remove the 'body' prefix from the error message
      return error?.message.replace(/^body\s*/, '');
    });
    rep.status(406).send({
      statusCode: 406,
      error: 'validation error',
      message: validationErrors,
    });
  } else if (err?.message?.indexOf("Rate limit exceeded") != -1) {
    rep.status(429).send({
      statusCode: 429,
      error: 'Rate limit exceeded',
      message: "تعداد دفعات درخواست غیرمجاز!",
    });
  }
  else {
    req.log.error(err);
    rep.status(500).send({
      statusCode: 500,
      error: 'Internal Server Error',
      message: err.message,
    });
  }
})

void fastify.register(app)
void initSwagger(fastify)

const closeListeners = closeWithGrace({ delay: 5000 }, async (opts: any) => {
  if (opts.err) {
    console.log("eerorrrr happened in graceeeeeeeeeeeeeeeee")
    await sendLog("exeption: ", opts.err.message)
    fastify.log.error(opts.err)
  }
  await fastify.close()
})

fastify.addHook('onClose', (_instance, done) => {
  closeListeners.uninstall()
  done()
})

void fastify.listen({
  port: Number(process.env.PORT ?? 3000),
  host: process.env.SERVER_HOSTNAME ?? '0.0.0.0',
}).then(() => { })

void fastify.ready((err) => {
  if (err) {
    fastify.log.error(err)
    process.exit(1)
  }

  fastify.log.info('All routes loaded! Check your console for the route details.')
  console.log(fastify.printRoutes())
  fastify.log.info(`Server listening on port ${Number(process.env.PORT ?? 3000)}`)



})

export { fastify as app }
