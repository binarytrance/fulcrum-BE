// import swaggerJSDocs from 'swagger-jsdoc';
// import { env } from '~/data/env';

// export class Swagger {
//   private readonly swaggerSpec: Object;

//   constructor() {
//     this.swaggerSpec = this.initSwagger();
//   }

//   public getSpecs(): object {
//     return this.swaggerSpec;
//   }

//   private initSwagger() {
//     const options: swaggerJSDocs.Options = {
//       definition: {
//         swagger: '2.0',
//         info: {
//           title: 'Fulcrum API',
//           version: '1.0.0',
//           description: 'Fulcrum docs',
//         },
//         tags: [
//           { name: 'user', description: 'User related stuff' },
//           { name: 'goals', description: 'goal related stuff' },
//           { name: 'tasks', description: 'tasks related stuff' },
//         ],
//         host: `localhost:${env.APP.PORT}`,
//         basePath: '/',
//         schemes: ['http'],
//         consumes: ['application/json'],
//         produces: ['application/json'],
//       },
//       apis: ['./src/app/routes/v1/*.ts'],
//     };

//     return swaggerJSDocs(options);
//   }
// }
