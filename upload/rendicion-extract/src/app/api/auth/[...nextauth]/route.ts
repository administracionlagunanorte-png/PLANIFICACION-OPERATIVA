import NextAuth from "next-auth"
import { authOptions } from "@/lib/auth-config"

// Simple and correct NextAuth handler for App Router
const handler = NextAuth(authOptions)

export { handler as GET, handler as POST }
