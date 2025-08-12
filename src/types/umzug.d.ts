declare module "umzug" {
  export class Umzug<TContext = any> {
    constructor(options: any);
    up(params?: any): Promise<Array<{ name: string }>>;
    down(params?: any): Promise<void>;
    pending(): Promise<Array<{ name: string }>>;
    executed(): Promise<Array<{ name: string }>>;
  }
  export class SequelizeStorage {
    constructor(options: any);
  }
}
