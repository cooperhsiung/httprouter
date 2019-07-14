"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const url_1 = require("url");
const tree_1 = require("./tree");
function byName(ps, name) {
    for (let i = 0; i < ps.length; i++) {
        if (ps[i].Key === name) {
            return ps[i].Value;
        }
    }
    return '';
}
exports.byName = byName;
class Router {
    constructor() { }
    Handle(method, path, handle) {
        if (path[0] != '/') {
            throw new Error("path must begin with '/' in path '" + path + "'");
        }
        if (!this.trees) {
            this.trees = {};
        }
        let root = this.trees[method];
        if (!root) {
            root = new tree_1.Node();
            this.trees[method] = root;
        }
        root.addRoute(path, handle);
    }
    GET(path, handle) {
        this.Handle('GET', path, handle);
    }
    ServeHTTP(req, res) {
        let path = url_1.parse(req.url).pathname;
        let root = this.trees[req.method];
        if (root !== null) {
            let { handle, p, tsr } = root.getValue(path);
            if (handle !== null) {
                handle(res, req, p);
                return;
            }
        }
        res.end('not found');
    }
}
exports.Router = Router;
