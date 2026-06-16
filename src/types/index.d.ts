declare namespace Express {
  export interface Request {
    user?: { id: string; userId: string; email: string, roleUsers: { role: { name: string } }[] };
    rawBody: any;
  }
}
