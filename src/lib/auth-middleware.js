import { createMiddleware } from "@tanstack/react-start";
import { getRequest, setResponseStatus } from "@tanstack/react-start/server";
import { serverBackend } from "@/lib/server-db";

// Both middlewares hand handlers the same lazy `context.getBase44()`: a
// function, not the client, because the backend needs the Supabase configuration
// and a handler that never touches the database must still answer without it.
// The caller's Authorization header decides who the request acts as.
const withGetBase44 = (next, request = getRequest()) => {
  let backend;
  return next({ context: { getBase44: () => (backend ??= serverBackend(request)) } });
};

// Applied to every server function by src/start.js: sends the visitor's Supabase
// access token with the call so the request acts as that visitor (the staff guards
// still check roles). Anonymous visitors send nothing and get a 401 from `requireUser`.
export const authMiddleware = createMiddleware({ type: "function" })
  .client(async ({ next }) => {
    if (typeof window === "undefined") return next();
    const { supabase } = await import("@/api/supabase");
    const { data } = await supabase.auth.getSession();
    const token = data?.session?.access_token;
    return next({ headers: token ? { Authorization: `Bearer ${token}` } : {} });
  })
  .server(({ next }) => withGetBase44(next));

// Applied to every request by src/start.js, so a server route handler
// (`server.handlers`) receives the same `context.getBase44()` as a server function.
export const base44RequestMiddleware = createMiddleware({ type: "request" }).server(({ next, request }) =>
  withGetBase44(next, request),
);

// Only an auth rejection means "not signed in"; outages propagate as themselves.
const currentUser = (context) =>
  context
    .getBase44()
    .auth.me()
    .catch((error) => {
      if (error?.status === 401 || error?.status === 403) return null;
      throw error;
    });

// Neither middleware authenticates anyone. Add this to a server function that
// needs a signed-in caller; it rejects anonymous callers and sets `context.user`:
//   createServerFn().middleware([requireUser]).handler(({ context }) => context.user.id)
export const requireUser = createMiddleware({ type: "function" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  if (!user) {
    setResponseStatus(401);
    throw Object.assign(new Error("Unauthorized"), { status: 401, code: "UNAUTHORIZED" });
  }
  return next({ context: { user } });
});

// The same for a server route: `server: { middleware: [requireUserRoute], handlers }` answers
// anonymous callers with 401 and sets `context.user`. Only on src/routes/api/* files: a route's
// middleware also runs for every route under it, and page navigations carry no token.
export const requireUserRoute = createMiddleware({ type: "request" }).server(async ({ next, context }) => {
  const user = await currentUser(context);
  if (!user) return Response.json({ error: "Unauthorized" }, { status: 401 });
  return next({ context: { user } });
});
