declare module 'hono' {
  export class Hono<T = any> {
    constructor(options?: any);
    use(path: string, ...middleware: any[]): this;
    get(path: string, ...handlers: any[]): this;
    post(path: string, ...handlers: any[]): this;
    put(path: string, ...handlers: any[]): this;
    delete(path: string, ...handlers: any[]): this;
    fetch: (request: Request, env?: any, ctx?: any) => Promise<Response>;
  }

  export interface Context<T = any> {
    req: {
      header(name: string): string | undefined;
      param(name: string): string;
      json(): Promise<any>;
    };
    env: any;
    set(key: string, value: any): void;
    get(key: string): any;
    json(data: any, status?: number): Response;
    text(text: string, status?: number): Response;
  }

  export type Next = () => Promise<void>;
}
