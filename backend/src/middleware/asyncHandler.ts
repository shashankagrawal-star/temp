import { NextFunction, Request, Response } from "express";

/**
 * Express 4 does not route a rejected promise from an async handler to error
 * middleware — it becomes an unhandled rejection, which crashes the process
 * on modern Node (unhandled rejections are fatal by default since Node 15).
 * Wrap every async route handler with this so failures become a normal 500
 * instead of taking the whole server down.
 */
export function asyncHandler(
  fn: (req: Request, res: Response, next: NextFunction) => Promise<void>
) {
  return (req: Request, res: Response, next: NextFunction) => {
    fn(req, res, next).catch(next);
  };
}
