import { httpRouter } from "convex/server";
import { auth } from "./auth";

const http = httpRouter();

// Auth routes (Google OAuth callback, etc.)
auth.addHttpRoutes(http);

export default http;
