# HttpRouter

[![NPM Version][npm-image]][npm-url]
[![Node Version][node-image]][node-url]

Super fast web router for node.js, rewritten from golang's [httprouter](https://github.com/julienschmidt/httprouter)

## Installation

```bash
npm i httprouter-js -S
```

## Usage

```typescript
import { createServer, IncomingMessage, ServerResponse } from "http";
import { Router } from "httprouter-js";

const router = new Router();

function Index(res: ServerResponse, req: IncomingMessage, params: any) {
  res.write(
    "Welcome! " +
      (params ? params.find((v: any) => v.Key === "name").Value : "")
  );
  res.end();
}

router.GET("/another", Index);
router.GET("/hello/:name", Index);

const server = createServer(router.ServeHTTP.bind(router));

server.listen(3000);
console.log("Listening on 3000..");
```

## Todo

- [ ] middleware
- [ ] adapter for express or koa

## License

MIT

[npm-image]: https://img.shields.io/npm/v/httprouter-js.svg
[npm-url]: https://www.npmjs.com/package/httprouter-js
[node-image]: https://img.shields.io/badge/node.js-%3E=8-brightgreen.svg
[node-url]: https://nodejs.org/download/
