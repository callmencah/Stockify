"use client";

import { useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutDashboard,
  Package,
  Warehouse,
  ArrowLeftRight,
  ShoppingCart,
  TruckIcon,
  ClipboardList,
  BarChart3,
  Users,
  Settings,
  ChevronLeft,
  ChevronRight,
  MapPin,
  UserCircle,
  Building2,
} from "lucide-react";
import { useSession } from "next-auth/react";
import { ScrollArea } from "@/components/ui/scroll-area";
import { Separator } from "@/components/ui/separator";

const navItems = [
  {
    title: "Dashboard",
    href: "/dashboard",
    icon: LayoutDashboard,
    roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
    exact: false,
  },
  {
    title: "Barang",
    href: "/items",
    icon: Package,
    roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
    exact: false,
  },
  {
    title: "Inventori",
    href: "/inventory",
    icon: Warehouse,
    roles: ["ADMIN", "MANAGER", "STAFF", "VIEWER"],
    exact: true, // hanya aktif di /inventory, bukan /inventory/*
  },
  {
    title: "Transfer Stok",
    href: "/inventory/transfer",
    icon: ArrowLeftRight,
    roles: ["ADMIN", "MANAGER", "STAFF"],
    exact: false,
  },
  {
    title: "Purchase Order",
    href: "/purchase-orders",
    icon: TruckIcon,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Sales Order",
    href: "/sales-orders",
    icon: ShoppingCart,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Stock Opname",
    href: "/stock-opname",
    icon: ClipboardList,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Laporan",
    href: "/reports",
    icon: BarChart3,
    roles: ["ADMIN", "MANAGER", "VIEWER"],
  },
  {
    title: "Lokasi/Gudang",
    href: "/locations",
    icon: MapPin,
    roles: ["ADMIN", "MANAGER"],
  },
  {
    title: "Supplier",
    href: "/suppliers",
    icon: Building2,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Customer",
    href: "/customers",
    icon: UserCircle,
    roles: ["ADMIN", "MANAGER", "STAFF"],
  },
  {
    title: "Pengguna",
    href: "/users",
    icon: Users,
    roles: ["ADMIN"],
  },
  {
    title: "Pengaturan",
    href: "/settings",
    icon: Settings,
    roles: ["ADMIN", "MANAGER"],
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const { data: session } = useSession();
  const [collapsed, setCollapsed] = useState(false);

  const userRole = session?.user?.role || "VIEWER";
  const filteredNav = navItems.filter((item) => item.roles.includes(userRole));

  return (
    <div
      className={cn(
        "relative flex flex-col h-full bg-gray-900 text-white transition-all duration-300",
        collapsed ? "w-16" : "w-64",
      )}
    >
      {/* Logo */}
      <div
        className={cn(
          "flex items-center gap-3 p-4 border-b border-gray-700",
          collapsed && "justify-center",
        )}
      >
        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-blue-600">
          <Package className="h-5 w-5 text-white" />
        </div>
        {!collapsed && (
          <div>
            <p className="font-bold text-lg leading-none">Stockify</p>
            <p className="text-xs text-gray-400 mt-0.5">Inventory Management</p>
          </div>
        )}
      </div>

      {/* Navigation */}
      <ScrollArea className="flex-1 py-3">
        <nav className="px-2 space-y-1">
          {filteredNav.map((item) => {
            const isActive = item.exact
              ? pathname === item.href
              : pathname === item.href || pathname.startsWith(item.href + "/");
            return (
              <Link
                key={item.href}
                href={item.href}
                title={collapsed ? item.title : undefined}
                className={cn(
                  "flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors",
                  isActive
                    ? "bg-blue-600 text-white"
                    : "text-gray-300 hover:bg-gray-800 hover:text-white",
                  collapsed && "justify-center",
                )}
              >
                <item.icon className="h-5 w-5 shrink-0" />
                {!collapsed && <span>{item.title}</span>}
              </Link>
            );
          })}
        </nav>
      </ScrollArea>

      <Separator className="bg-gray-700" />

      {/* User info */}
      {!collapsed && session && (
        <div className="p-4">
          <div className="flex items-center gap-3">
            <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-blue-600 text-sm font-bold">
              {session.user.name?.[0]?.toUpperCase() || "U"}
            </div>
            <div className="overflow-hidden">
              <p className="text-sm font-medium truncate">
                {session.user.name}
              </p>
              <p className="text-xs text-gray-400 truncate">
                {session.user.role}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Collapse button */}
      <button
        onClick={() => setCollapsed(!collapsed)}
        className="absolute -right-3 top-20 flex h-6 w-6 items-center justify-center rounded-full bg-gray-700 text-white shadow-md hover:bg-gray-600 z-10"
      >
        {collapsed ? (
          <ChevronRight className="h-3 w-3" />
        ) : (
          <ChevronLeft className="h-3 w-3" />
        )}
      </button>
    </div>
  );
}
