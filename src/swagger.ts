import { writeFileSync, copyFileSync, mkdirSync } from 'node:fs'
import { join, dirname } from 'node:path'
import type { FastifyInstance } from 'fastify'
import type { SwaggerDefinition } from 'swagger-jsdoc'
import swaggerJsdoc from 'swagger-jsdoc'
import * as dotenv from 'dotenv'

import fastifySwagger from '@fastify/swagger'
import fastifySwaggerUi from '@fastify/swagger-ui'

dotenv.config()
// Swagger definition
// https://github.com/swagger-api/swagger-spec/blob/master/versions/2.0.md
const swaggerDefinition: SwaggerDefinition = {
  openapi: '3.0.0',
  info: {
    title: 'TeamSync Api',
    version: '0.0.1',
    description: 'TeamSync Web Api Documentation',
  },
  host: `0.0.0.0:${process.env.PORT ?? 3000}`,
}
const apiDirectory = join(__dirname, process.env.API_DIRECTORY ?? "routes")

const options: swaggerJsdoc.Options = {
  swaggerDefinition,
  // Path to the API docs
  apis: [`${apiDirectory}/**/*.js`, `${apiDirectory}/**/*.ts`],
}

export async function initSwagger(app: FastifyInstance) {
  const swaggerFilePath = join(__dirname, '..', 'generated', 'swagger.json')

  console.log(swaggerFilePath)
  if (apiDirectory.indexOf('dist') == -1) {
    const swaggerSpec = swaggerJsdoc(options)

    // Write to generated swagger file on development
    writeFileSync(swaggerFilePath, JSON.stringify(swaggerSpec, null, 2))

  }
  // else {
  //   // Copy the generated swagger file to the dist directory
  //   const distSwaggerFilePath = join(__dirname, '..', 'dist', 'generated', 'swagger.json')
  //   mkdirSync(dirname(distSwaggerFilePath), { recursive: true })
  //   copyFileSync(join(__dirname, '..', 'generated', 'swagger.json'), distSwaggerFilePath)
  // }

  await app.register(fastifySwagger, {
    mode: 'static',
    specification: {
      path: join(__dirname, '..', 'generated', 'swagger.json'),
      postProcessor(swaggerObject) {
        return swaggerObject
      },
      baseDir: join(__dirname, '..', 'generated'),
    },
  })


  await app.register(fastifySwaggerUi, {
    routePrefix: '/doc',
    uiConfig: {
      docExpansion: 'list',
      deepLinking: false,
    },
    uiHooks: {
      onRequest(request, reply, next) {
        next()
      },
      preHandler(request, reply, next) {
        next()
      },
    },
    staticCSP: true,
    transformStaticCSP: (header) => header,
  })
}
