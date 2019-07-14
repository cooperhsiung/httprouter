import { Handle } from './router';
declare type nodeType = number;
export declare class Node {
    path: string;
    wildChild: boolean;
    nType: nodeType;
    maxParams: number;
    indices: string;
    children: Node[];
    handle: Handle | null;
    priority: number;
    constructor(options?: any);
    incrementChildPrio(pos: number): number;
    addRoute(path: string, handle: Handle): void;
    insertChild(numParams: number, path: string, fullPath: string, handle: Handle): void;
    getValue(path: string): any;
}
export {};
