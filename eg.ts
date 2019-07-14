import { createServer, IncomingMessage, ServerResponse } from 'http';
import { Router } from './router';

const router = new Router();

function Index(res: ServerResponse, req: IncomingMessage, params: any) {
  res.write(
    'Welcome! ' +
      (params ? params.find((v: any) => v.Key === 'name').Value : '')
  );
  res.end();
}

router.GET('/another', Index);
router.GET('/hello/:name', Index);

const server = createServer(router.ServeHTTP.bind(router));

server.listen(3000);
console.log('Listening on 3000..');
