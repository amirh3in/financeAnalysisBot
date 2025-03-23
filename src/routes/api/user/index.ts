import type { FastifyInstance, FastifyPluginAsync, FastifyReply, FastifyRequest } from 'fastify'

import LoginBody from '../../../models/schemas/login_body.json'
import AddBody from '../../../models/schemas/add_user.json'
import { UserService } from '../../../services/userService'
import { BasePageAndSizeSchema } from '../../../models/im/page_and_size'



const user: FastifyPluginAsync = async (fastify: FastifyInstance, _opts): Promise<void> => {
  // Refer https://swagger.io/docs/specification/describing-request-body/
  const userService = new UserService(fastify.prisma);

  /**
   * @swagger
   * tags:
   *   name: Users
   *   description: User management and login
   */

  /**
   * @swagger
   * /api/user/login:
   *   post:
   *     tags: [Users]
   *     requestBody:
   *        description: Login to the application
   *        content:
   *           application/json:
   *            schema:
   *             type: object
   *             properties:
   *              username:
   *               type: string
   *              password:
   *               type: string
   *             required:
   *             - username
   *             - password
   *     responses:
   *       200:
   *         description: login success with token
   */
  fastify.post(
    '/login',
    {
      schema: {
        body: LoginBody,
      },
    },
    userService.LoginUser.bind(userService),
  )


  /**
   * @swagger
   * /api/user/create:
   *   post:
   *     tags: [Users]
   *     requestBody:
   *        description: Create a new user
   *        content:
   *           application/json:
   *            schema:
   *             type: object
   *             properties:
   *              username:
   *               type: string
   *              password:
   *               type: string
   *              company:
   *               type: string
   *              role:
   *               type: integer
   *              status:
   *               type: integer
   *               enum: [0, 1]
   *              verified:
   *               type: boolean
   *             required:
   *             - username
   *             - password
   *     responses:
   *       201:
   *         description: User created successfully
   *         content:
   *           application/json:
   *             schema:
   *               type: object
   *               properties:
   *                 id:
   *                   type: number
   *                 username:
   *                   type: string
   *                 password:
   *                   type: string
   *                 company:
   *                   type: string
   *                 role:
   *                   type: number
   *                 status:
   *                   type: integer
   *                   enum: [0, 1]
   *                 verified:
   *                   type: boolean
   */

  fastify.post(
    '/create',
    {
      schema: {
        body: AddBody,
      },
    },
    userService.createUser.bind(userService),
  )
  /**
     * @swagger
     * /api/user/paginnated:
     *   post:
     *     tags: [Users]
     *     requestBody:
     *        description: get list of users
     *        content:
     *           application/json:
     *            schema:
     *             type: object
     *             properties:
     *              page:
     *               type: integer
     *              size:
     *               type: integer
     *              username:
     *                type: string
     *              company:
     *                type: string
     *
     *     responses:
     *       201:
     *         description: User created successfully
     *         content:
     *           application/json:
     *             schema:
     *               type: object
     *               properties:
     *                 id:
     *                   type: number
     *                 username:
     *                   type: string
     *                 password:
     *                   type: string
     *                 company:
     *                   type: string
     *                 role:
     *                   type: number
     *                 status:
     *                   type: integer
     *                   enum: [0, 1]
     *                 verified:
     *                   type: boolean
     */
  fastify.post('/paginnated', {
    config: {
      rateLimit: {
        max: 5,
        timeWindow: '1 minute',
      },
    },
    handler: async (request: FastifyRequest<{ Body: BasePageAndSizeSchema & { username?: string; company?: string } }>, reply: FastifyReply) => {
      return userService.GetAllUsers(request, reply);
    },
  })
}

export default user
