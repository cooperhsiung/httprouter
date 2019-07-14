"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const _static = 0;
const root = 1;
const param = 2;
const catchAll = 3;
class Node {
    constructor(options = {}) {
        this.path = '';
        this.wildChild = false;
        this.nType = 0;
        this.maxParams = 0;
        this.indices = '';
        this.children = [];
        this.priority = 0;
        if (options.path !== undefined) {
            this.path = options.path;
        }
        if (options.wildChild !== undefined) {
            this.wildChild = options.wildChild;
        }
        if (options.nType !== undefined) {
            this.nType = options.nType;
        }
        if (options.indices !== undefined) {
            this.indices = options.indices;
        }
        if (options.children !== undefined) {
            this.children = options.children;
        }
        if (options.handle !== undefined) {
            this.handle = options.handle;
        }
        if (options.priority !== undefined) {
            this.priority = options.priority;
        }
        if (options.maxParams !== undefined) {
            this.maxParams = options.maxParams;
        }
    }
    incrementChildPrio(pos) {
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
    addRoute(path, handle) {
        let fullPath = path;
        this.priority++;
        let numParams = countParams(path);
        // console.log("========= numParams",numParams);
        // console.log(this);
        function dispatch() {
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
                // console.log('========= i', i);
                // console.log('========= self.path', self.path);
                if (i < self.path.length) {
                    let child = new Node({
                        path: self.path.slice(i),
                        wildChild: self.wildChild,
                        nType: 0,
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
                // console.log("========= self",self);
                if (i < path.length) {
                    path = path.slice(i);
                    // console.log("========= path11",path);
                    if (self.wildChild) {
                        self = self.children[0];
                        self.priority++;
                        if (numParams > self.maxParams) {
                            self.maxParams = numParams;
                        }
                        numParams--;
                        if (path.length > self.path.length &&
                            self.path === path.slice(0, self.path.length) &&
                            (self.path.length >= path.length ||
                                path[self.path.length] === '/')) {
                            console.log('========= 111', 111);
                            return dispatch.call(self);
                        }
                        else {
                            let pathSeg;
                            if (self.nType === catchAll) {
                                pathSeg = path;
                            }
                            else {
                                pathSeg = splitN(path, '/', 2)[0];
                            }
                            let prefix = fullPath.slice(0, fullPath.indexOf(pathSeg)) + self.path;
                            throw new Error("'" +
                                pathSeg +
                                "' in new path '" +
                                fullPath +
                                "' conflicts with existing wildcard '" +
                                self.path +
                                "' in existing prefix '" +
                                prefix +
                                "'");
                        }
                    }
                    let c = path[0];
                    if (self.nType === param && c === '/' && self.children.length === 1) {
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
                    // console.log('========= 2', 2);
                    if (c !== ':' && c !== '*') {
                        // console.log('========= 2.5', 2.5);
                        self.indices += c;
                        // console.log("========= self",self);
                        let child = new Node({ maxParams: numParams });
                        self.children.push(child);
                        self.incrementChildPrio(self.indices.length - 1);
                        self = child;
                    }
                    // console.log("========= self000",self);
                    // console.log("========= self.children",self.children);
                    // console.log("========= self.children",self.children);
                    self.insertChild(numParams, path, fullPath, handle);
                    // console.log("========= self",self);
                    return;
                }
                else if (i === path.length) {
                    if (!self.handle) {
                        throw new Error("a handle is already registered for path '" + fullPath + "'");
                    }
                    self.handle = handle;
                }
                return;
            }
        }
        if (this.path.length > 0 || this.children.length > 0) {
            dispatch.call(this);
        }
        else {
            this.insertChild(numParams, path, fullPath, handle);
            this.nType = root;
        }
        // console.log("========= this",path,this);
    }
    insertChild(numParams, path, fullPath, handle) {
        let offset = 0;
        let self = this;
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
                        throw new Error("only one wildcard per path segment is allowed, has: '" +
                            path.slice(i) +
                            "' in path '" +
                            fullPath +
                            "'");
                    default:
                        end++;
                }
            }
            if (self.children.length > 0) {
                throw new Error("wildcard route '" +
                    path.slice(i, end) +
                    "' conflicts with existing children in path '" +
                    fullPath +
                    "'");
            }
            if (end - i < 2) {
                throw new Error("wildcards must be named with a non-empty name in path '" +
                    fullPath +
                    "'");
            }
            // console.log('========= c', c);
            if (c === ':') {
                if (i > 0) {
                    self.path = path.slice(offset, i);
                    offset = i;
                }
                // console.log("========= self.path",self.path);
                // console.log("========= offset",offset);
                let child = new Node({
                    nType: param,
                    maxParams: numParams
                });
                self.children = [child];
                self.wildChild = true;
                self = child;
                self.priority++;
                numParams--;
                // console.log('========= self', self);
                if (end < max) {
                    self.path = path.slice(offset, end);
                    offset = end;
                    // console.log("========= self.path",self.path);
                    // console.log("========= offset",offset);
                    let child = new Node({
                        maxParams: numParams,
                        priority: 1
                    });
                    self.children = [child];
                    self = child;
                }
                // console.log('========= 11111', 11111);
            }
            else {
                if (end !== max || numParams > 1) {
                    throw new Error("catch-all routes are only allowed at the end of the path in path '" +
                        fullPath +
                        "'");
                }
                if (self.path.length > 0 && self.path[self.path.length - 1] === '/') {
                    throw new Error("catch-all conflicts with existing handle for the path segment root in path '" +
                        fullPath +
                        "'");
                }
                i--;
                if (path[i] !== '/') {
                    throw new Error("no / before catch-all in path '" + fullPath + "'");
                }
                self.path = path.slice(offset, i);
                let child = new Node({
                    wildChild: true,
                    nType: catchAll,
                    maxParams: 1
                });
                self.children = [child];
                self.indices = String(path[i]);
                self = child;
                self.priority++;
                child = new Node({
                    path: path.slice(i),
                    nType: catchAll,
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
    getValue(path) {
        let obj = {
            handle: null,
            p: null,
            tsr: false
        };
        function dispatch() {
            // console.log('========= this0', this);
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
                            case param:
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
                                }
                                else if (self.children.length === 1) {
                                    self = self.children[0];
                                    obj.tsr = self.path === '/' && self.handle !== null;
                                }
                                return obj;
                            case catchAll:
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
                }
                else if (path === self.path) {
                    // console.log('========= self---', self);
                    obj.handle = self.handle;
                    if (obj.handle !== null) {
                        return obj;
                    }
                    if (path === '/' && self.wildChild && self.nType !== root) {
                        obj.tsr = true;
                        return obj;
                    }
                    for (let i = 0; i < self.indices.length; i++) {
                        if (self.indices[i] === '/') {
                            self = self.children[i];
                            obj.tsr =
                                (self.path.length === 1 && self.handle !== null) ||
                                    (self.nType === catchAll && self.children[0].handle !== null);
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
exports.Node = Node;
function countParams(path) {
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
function splitN(s, seq, n) {
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
