import { Handle } from './router';

type NodeType = number;

const STATIC: NodeType = 0;
const ROOT: NodeType = 1;
const PARAM: NodeType = 2;
const CATCHALL: NodeType = 3;

export class Node {
  path: string = '';
  wildChild: boolean = false;
  nType: NodeType = 0;
  maxParams: number = 0;
  indices: string = '';
  children: Node[] = [];
  handle!: Handle | null;
  priority: number = 0;

  constructor(options: any = {}) {
    for (let k in options) {
      (this as any)[k] = options[k];
    }
  }

  incrementChildPrio(pos: number): number {
    this.children[pos].priority++;
    let prio = this.children[pos].priority;

    let newPos = pos;

    while (newPos > 0 && this.children[newPos - 1].priority < prio) {
      [this.children[newPos - 1], this.children[newPos]] = [
        this.children[newPos],
        this.children[newPos - 1]
      ];
      newPos--;
    }

    if (newPos !== pos) {
      this.indices =
        this.indices.slice(0, newPos) +
        this.indices.slice(pos, pos + 1) +
        this.indices.slice(newPos, pos) +
        this.indices.slice(pos + 1);
    }

    return newPos;
  }

  addRoute(path: string, handle: Handle) {
    let fullPath = path;
    this.priority++;
    let numParams = countParams(path);

    function dispatch(this: Node): any {
      let self = this;
      while (1) {
        if (numParams > self.maxParams) {
          self.maxParams = numParams;
        }

        let i = 0;

        let max = Math.min(path.length, self.path.length);

        while (i < max && path[i] === self.path[i]) {
          i++;
        }

        if (i < self.path.length) {
          let child = new Node({
            path: self.path.slice(i),
            wildChild: self.wildChild,
            nType: STATIC,
            indices: self.indices,
            children: self.children,
            handle: self.handle,
            priority: self.priority - 1
          });

          for (let j = 0; j < child.children.length; j++) {
            if (child.children[j].maxParams > child.maxParams) {
              child.maxParams = child.children[j].maxParams;
            }
          }

          self.children = [child];
          self.indices = String(self.path[i]);
          self.path = path.slice(0, i);
          self.handle = null; // todo
          self.wildChild = false;
        }

        if (i < path.length) {
          path = path.slice(i);

          if (self.wildChild) {
            self = self.children[0];
            self.priority++;

            if (numParams > self.maxParams) {
              self.maxParams = numParams;
            }

            numParams--;

            if (
              path.length > self.path.length &&
              self.path === path.slice(0, self.path.length) &&
              (self.path.length >= path.length ||
                path[self.path.length] === '/')
            ) {
              return dispatch.call(self);
            } else {
              let pathSeg: string;

              if (self.nType === CATCHALL) {
                pathSeg = path;
              } else {
                pathSeg = splitN(path, '/', 2)[0];
              }

              let prefix =
                fullPath.slice(0, fullPath.indexOf(pathSeg)) + self.path;

              throw new Error(
                "'" +
                  pathSeg +
                  "' in new path '" +
                  fullPath +
                  "' conflicts with existing wildcard '" +
                  self.path +
                  "' in existing prefix '" +
                  prefix +
                  "'"
              );
            }
          }

          let c = path[0];

          if (self.nType === PARAM && c === '/' && self.children.length === 1) {
            self = self.children[0];
            self.priority++;
            return dispatch.call(self);
          }

          for (let j = 0; j < self.indices.length; j++) {
            if (c === self.indices[j]) {
              j = self.incrementChildPrio(j);

              self = self.children[j];
              return dispatch.call(self);
            }
          }

          if (c !== ':' && c !== '*') {
            self.indices += c;
            let child = new Node({ maxParams: numParams });
            self.children.push(child);
            self.incrementChildPrio(self.indices.length - 1);

            self = child;
          }

          self.insertChild(numParams, path, fullPath, handle);

          return;
        } else if (i === path.length) {
          if (!self.handle) {
            throw new Error(
              "a handle is already registered for path '" + fullPath + "'"
            );
          }

          self.handle = handle;
        }

        return;
      }
    }

    if (this.path.length > 0 || this.children.length > 0) {
      dispatch.call(this);
    } else {
      this.insertChild(numParams, path, fullPath, handle);
      this.nType = ROOT;
    }
  }

  insertChild(
    numParams: number,
    path: string,
    fullPath: string,
    handle: Handle
  ) {
    let offset: number = 0;

    let self = this as Node;
    for (let i = 0, max = path.length; numParams > 0; i++) {
      let c = path[i];
      if (c !== ':' && c !== '*') {
        continue;
      }

      let end = i + 1;

      while (end < max && path[end] !== '/') {
        switch (path[end]) {
          case ':':
          case '*':
            throw new Error(
              "only one wildcard per path segment is allowed, has: '" +
                path.slice(i) +
                "' in path '" +
                fullPath +
                "'"
            );
          default:
            end++;
        }
      }

      if (self.children.length > 0) {
        throw new Error(
          "wildcard route '" +
            path.slice(i, end) +
            "' conflicts with existing children in path '" +
            fullPath +
            "'"
        );
      }

      if (end - i < 2) {
        throw new Error(
          "wildcards must be named with a non-empty name in path '" +
            fullPath +
            "'"
        );
      }

      if (c === ':') {
        if (i > 0) {
          self.path = path.slice(offset, i);
          offset = i;
        }

        let child = new Node({
          nType: PARAM,
          maxParams: numParams
        });
        self.children = [child];
        self.wildChild = true;
        self = child;
        self.priority++;
        numParams--;

        if (end < max) {
          self.path = path.slice(offset, end);
          offset = end;

          let child = new Node({
            maxParams: numParams,
            priority: 1
          });

          self.children = [child];
          self = child;
        }
      } else {
        if (end !== max || numParams > 1) {
          throw new Error(
            "catch-all routes are only allowed at the end of the path in path '" +
              fullPath +
              "'"
          );
        }

        if (self.path.length > 0 && self.path[self.path.length - 1] === '/') {
          throw new Error(
            "catch-all conflicts with existing handle for the path segment root in path '" +
              fullPath +
              "'"
          );
        }

        i--;

        if (path[i] !== '/') {
          throw new Error("no / before catch-all in path '" + fullPath + "'");
        }

        self.path = path.slice(offset, i);

        let child = new Node({
          wildChild: true,
          nType: CATCHALL,
          maxParams: 1
        });

        self.children = [child];
        self.indices = String(path[i]);
        self = child;
        self.priority++;

        child = new Node({
          path: path.slice(i),
          nType: CATCHALL,
          maxParams: 1,
          handle: handle,
          priority: 1
        });

        self.children = [child];

        return;
      }
    }

    self.path = path.slice(offset);
    self.handle = handle;
  }

  getValue(path: string): any {
    let obj = {
      handle: null,
      p: null,
      tsr: false
    } as any;

    function dispatch(this: Node): any {
      let self = this;

      while (1) {
        if (path.length > self.path.length) {
          if (path.slice(0, self.path.length) === self.path) {
            path = path.slice(self.path.length);

            if (!self.wildChild) {
              let c = path[0];
              for (let i = 0; i < self.indices.length; i++) {
                if (c === self.indices[i]) {
                  self = self.children[i];
                  return dispatch.call(self);
                }
              }

              obj.tsr = path === '/' && self.handle !== null;
              return obj;
            }
            self = self.children[0];

            switch (self.nType) {
              case PARAM:
                let end = 0;
                while (end < path.length && path[end] !== '/') {
                  end++;
                }

                if (obj.p === null) {
                  obj.p = Array(self.maxParams).fill({});
                }

                let i = obj.p.length;
                obj.p.push({});
                //
                obj.p[i].Key = self.path.slice(1);
                obj.p[i].Value = path.slice(0, end);

                if (end < path.length) {
                  if (self.children.length > 0) {
                    path = path.slice(end);
                    self = self.children[0];
                    return dispatch.call(self);
                  }

                  obj.tsr = path.length === end + 1;
                  return obj;
                }

                obj.handle = self.handle;
                if (obj.handle !== null) {
                  return obj;
                } else if (self.children.length === 1) {
                  self = self.children[0];
                  obj.tsr = self.path === '/' && self.handle !== null;
                }

                return obj;
              case CATCHALL:
                if (obj.p === null) {
                  obj.p = Array(self.maxParams).fill({});
                }
                let i2 = obj.p.length;
                obj.p.push({});

                obj.p[i].Key = self.path.slice(2);
                obj.p[i].Value = path;

                obj.handle = self.handle;
                return obj;
              default:
                throw new Error('invalid Node type');
            }
          }
        } else if (path === self.path) {
          obj.handle = self.handle;
          if (obj.handle !== null) {
            return obj;
          }

          if (path === '/' && self.wildChild && self.nType !== ROOT) {
            obj.tsr = true;
            return obj;
          }

          for (let i = 0; i < self.indices.length; i++) {
            if (self.indices[i] === '/') {
              self = self.children[i];
              obj.tsr =
                (self.path.length === 1 && self.handle !== null) ||
                (self.nType === CATCHALL && self.children[0].handle !== null);
              return obj;
            }
          }

          return obj;
        }

        obj.tsr =
          path == '/' ||
          (self.path.length === path.length + 1 &&
            self.path[path.length] === '/' &&
            path === self.path.slice(0, self.path.length - 1) &&
            self.handle !== null);
        return obj;
      }
    }
    return dispatch.call(this);
  }
}

function countParams(path: string): number {
  let n = 0;
  for (let i = 0; i < path.length; i++) {
    if (path[i] !== ':' && path[i] !== '*') {
      continue;
    }
    n++;
  }

  if (n > 255) {
    return 255;
  }

  return n;
}

function splitN(s: string, seq: string, n: number) {
  if (n === 0) {
    return [];
  }

  if (n === 1) {
    return [s];
  }

  let arr = s.split(seq);

  let x = arr.slice(0, n - 1);
  x.push(arr.slice(n - 1).join(','));
  return x;
}
