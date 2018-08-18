import {HTTP_METHODS, Route, Server} from "../lib/server";
import sinon from "sinon";
import {expect} from "chai";
import {IncomingMessage, ServerResponse} from "http";
import {FastifyReply, FastifyRequest} from "fastify";
import * as faker from "faker";

describe('Route', () => {
  it('should append / to route path if not exists', () => {
    //Arrange
    const word = faker.random.word();
    const route = new Route(word);
    //Act
    const path = route.toString();

    //Assert
    expect(path).to.eq(`/${word}`);
  });
});

describe('Server', () => {
  it('should create server instance', () => {
    //Arrange
    const server = new Server();

    //Assert
    expect(server).to.be.instanceof(Server);
  });

  it('should add route', () => {
    //Arrange
    const route = new Route('/');
    const server = new Server();
    const method = HTTP_METHODS.GET;
    const spy = sinon.spy(server.app, 'route');
    const handler = (req: FastifyRequest<IncomingMessage>, res: FastifyReply<ServerResponse>) => {
    };

    //Act
    server.addRoute(route, method, handler);

    //Assert
    expect(spy.calledOnce).to.eq(true);
    expect(spy.calledWithExactly({
      method,
      url: route.toString(),
      handler
    })).to.eq(true);
  });

  it('should add routes as array', () => {
    //Arrange
    const route = new Route('/');
    const route2 = new Route('/route2');
    const server = new Server();
    const method = HTTP_METHODS.GET;
    const spy = sinon.spy(server.app, 'route');
    const handler = (req: FastifyRequest<IncomingMessage>, res: FastifyReply<ServerResponse>) => {
    };

    //Act
    server.addRoute([route, route2], method, handler);

    //Assert
    expect(spy.calledTwice).to.eq(true);
    expect(spy.calledWithExactly({
      method,
      url: route.toString(),
      handler
    })).to.eq(true);
    expect(spy.calledWithExactly({
      method,
      url: route2.toString(),
      handler
    })).to.eq(true);
  });

  it('should add middleware route', () => {
    //Arrange
    const route = new Route('/');
    const server = new Server();
    const spy = sinon.spy(server.app, 'use');
    const handler = (req: IncomingMessage, res: ServerResponse, next: Function) => {
    };

    //Act
    server.addUse(route, handler);

    //Assert
    expect(spy.calledOnce).to.eq(true);
    expect(spy.calledWithExactly(route.toString(), handler)).to.eq(true);
  });

  it('should append schema into route definitions', () => {
    //Arrange
    const route = new Route('/');
    const server = new Server();
    const method = HTTP_METHODS.GET;
    const spy = sinon.spy(server.app, 'route');
    const handler = (req: FastifyRequest<IncomingMessage>, res: FastifyReply<ServerResponse>) => {
    };
    const schema = {
      response: {
        200: {
          type: 'object',
          properties: {
            hello: {type: 'string'}
          }
        }
      }
    };

    //Act
    server.addRoute(route, method, handler, schema);

    //Assert
    expect(spy.calledOnce).to.eq(true);
    expect(spy.calledWithExactly({
      method,
      url: route.toString(),
      handler,
      schema
    })).to.eq(true);
  });

  it('should add middleware route as array', () => {
    //Arrange
    const route = new Route('/');
    const route2 = new Route('/route2');
    const server = new Server();
    const spy = sinon.spy(server.app, 'use');
    const handler = (req: IncomingMessage, res: ServerResponse, next: Function) => {
    };

    //Act
    server.addUse([route, route2], handler);

    //Assert
    expect(spy.calledTwice).to.eq(true);
    expect(spy.calledWithExactly(route.toString(), handler)).to.eq(true);
    expect(spy.calledWithExactly(route2.toString(), handler)).to.eq(true);
  });
});
