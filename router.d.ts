/// <reference types="node" />
import { ServerResponse, IncomingMessage } from 'http';
import { Node } from './tree';
export declare type Handle = (res: ServerResponse, req: IncomingMessage, p?: Params) => void;
declare type Param = {
    Key: string;
    Value: string;
};
declare type Params = Param[];
export declare function byName(ps: Params, name: string): string;
interface Handler {
    ServeHTTP: (res: ServerResponse, req: IncomingMessage) => any;
}
export declare class Router {
    trees: {
        [key: string]: Node;
    };
    RedirectTrailingSlash: boolean;
    RedirectFixedPath: boolean;
    HandleMethodNotAllowed: boolean;
    HandleOPTIONS: boolean;
    NotFound: Handler;
    MethodNotAllowed: Handler;
    PanicHandler: (res: ServerResponse, req: IncomingMessage, i: any) => any;
    constructor();
    Handle(method: string, path: string, handle: Handle): void;
    GET(path: string, handle: Handle): void;
    ServeHTTP(req: IncomingMessage, res: ServerResponse): void;
}
export {};
