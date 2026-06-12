import { clerkMiddleware, createRouteMatcher } from "@clerk/nextjs/server";

const isPublicRoute = createRouteMatcher([
  "/",
  "/login(.*)",
  "/signup(.*)",
  "/sso-callback(.*)",
  "/privacy",
  "/terms",
  "/cancel",
  "/success",
  "/marketplace(.*)",
  "/api/whatsapp(.*)",
  "/api/health",
  "/api/whapi/webhook",
  "/api/pipeline-ia",
  "/api/agent-config",
  "/api/cron/(.*)",
  "/api/whatsapp",
  "/api/data-deletion",
  "/data-deletion(.*)",
]);

export default clerkMiddleware(async (auth, req) => {
  if (!isPublicRoute(req)) {
    await auth.protect();
  }
});

export const config = {
  matcher: [
    "/((?!_next|[^?]*\\.(?:html?|css|js(?!on)|jpe?g|webp|png|gif|svg|ttf|woff2?|ico|csv|docx?|xlsx?|zip|webmanifest)).*)",
    "/(api|trpc)(.*)",
  ],
};
