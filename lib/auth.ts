import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import bcrypt from "bcryptjs";
import prisma from "./prisma";

export const authOptions: NextAuthOptions = {
  session: {
    strategy: "jwt",
    maxAge: 30 * 24 * 60 * 60, // 30 days
  },
  pages: {
    signIn: "/login",
    error: "/login",
  },
  providers: [
    CredentialsProvider({
      name: "credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Email dan password diperlukan");
        }

        const user = await prisma.user.findUnique({
          where: { email: credentials.email },
        });

        if (!user) {
          throw new Error("Email atau password salah");
        }

        if (!user.isActive) {
          throw new Error("Akun tidak aktif. Hubungi administrator.");
        }

        const isValidPassword = await bcrypt.compare(
          credentials.password,
          user.password,
        );

        if (!isValidPassword) {
          throw new Error("Email atau password salah");
        }

        // Log audit
        await prisma.auditLog.create({
          data: {
            userId: user.id,
            action: "LOGIN",
            entity: "User",
            entityId: user.id,
          },
        });

        return {
          id: user.id,
          name: user.name,
          email: user.email,
          role: user.role,
          avatar: user.avatar ?? undefined,
        };
      },
    }),
  ],
  callbacks: {
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = (user as { role: string }).role;
        token.avatar = (user as { avatar?: string }).avatar;
      }
      return token;
    },
    async session({ session, token }) {
      if (token && session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as string;
        session.user.avatar = token.avatar as string | undefined;
      }
      return session;
    },
  },
};

export const ROLE_PERMISSIONS = {
  ADMIN: ["*"],
  MANAGER: [
    "items.read",
    "items.write",
    "inventory.read",
    "inventory.write",
    "purchase_orders.read",
    "purchase_orders.write",
    "sales_orders.read",
    "sales_orders.write",
    "stock_opname.read",
    "stock_opname.write",
    "reports.read",
    "suppliers.read",
    "suppliers.write",
    "customers.read",
    "customers.write",
    "locations.read",
    "users.read",
  ],
  STAFF: [
    "items.read",
    "inventory.read",
    "inventory.write",
    "purchase_orders.read",
    "purchase_orders.write",
    "sales_orders.read",
    "sales_orders.write",
    "stock_opname.read",
    "stock_opname.write",
    "suppliers.read",
    "customers.read",
    "locations.read",
  ],
  VIEWER: [
    "items.read",
    "inventory.read",
    "purchase_orders.read",
    "sales_orders.read",
    "reports.read",
  ],
};

export function hasPermission(role: string, permission: string): boolean {
  const permissions =
    ROLE_PERMISSIONS[role as keyof typeof ROLE_PERMISSIONS] || [];
  return permissions.includes("*") || permissions.includes(permission);
}
