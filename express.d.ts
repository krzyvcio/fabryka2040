declare module "npm:express@5" {
  export function Application(): any;
  export type Application = any;
  export type Request = any;
  export type Response = any;
  export type NextFunction = (err?: any) => void;
  
  export interface Router {
    get(path: string, handler: (req: Request, res: Response) => void): this;
    use(path: string, handler: (req: Request, res: Response, next: NextFunction) => void): this;
  }
  
  export function Router(): Router;
  export function json(): any;
  export function static_(path: string): any;
  
  export default function express(): Application;
}
