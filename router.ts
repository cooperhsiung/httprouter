import { ServerResponse, IncomingMessage} from 'http';
import { parse as parseUrl } from 'url';
import { Node } from './tree';

export type Handle = (
  res: ServerResponse,
  req: IncomingMessage,
  p?: Params
) => void;

type Param = {
  Key: string;
  Value: string;
};

type Params = Param[];

export function byName(ps: Params, name: string): string {
  for (let i = 0; i < ps.length; i++) {
    if (ps[i].Key === name) {
      return ps[i].Value;
    }
  }
  return '';
}

interface Handler {
  ServeHTTP: (res: ServerResponse, req: IncomingMessage) => any;
}

export class Router {
  public trees!: { [key: string]: Node };

  RedirectTrailingSlash!: boolean;
  RedirectFixedPath!: boolean;
  HandleMethodNotAllowed!: boolean;

  HandleOPTIONS!: boolean;

  NotFound!: Handler;
  MethodNotAllowed!: Handler;
  PanicHandler!: (res: ServerResponse, req: IncomingMessage, i: any) => any;

  constructor() {}

  Handle(method: string, path: string, handle: Handle) {
    if (path[0] != '/') {
      throw new Error("path must begin with '/' in path '" + path + "'");
    }

    if (!this.trees) {
      this.trees = {};
    }

    let root = this.trees[method];

    if (!root) {
      root = new Node();
      this.trees[method] = root;
    }

    root.addRoute(path, handle);
  }

  GET(path: string, handle: Handle) {
    this.Handle('GET', path, handle);
  }

  ServeHTTP(req: IncomingMessage, res: ServerResponse) {
    let path = parseUrl(req.url!).pathname!;

    let root = this.trees[req.method!];
    if (root !== null) {
      let { handle, p, tsr } = root.getValue(path);
      if (handle !== null) {
        handle(res, req, p);
        return;
      }
    }

    res.end('Not Found');
  }
}
