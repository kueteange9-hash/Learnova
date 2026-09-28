"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect,useState } from "react";
import RoleGuard from "@/components/RoleGuard";
import Icon from "@/components/learner/Icon";
import { currentUser,logout,User } from "@/lib/store";
const items = [
  { href: "/admin", label: "Overview", icon: "home" },
  { href: "/admin/specialists", label: "Specialist reviews", icon: "users" },
  { href: "/admin/users", label: "Platform users", icon: "user" },
  { href: "/admin/domains", label: "Guidance domains", icon: "sparkles" },
  { href: "/admin/posts", label: "Community posts", icon: "community" },
  { href: "/admin/workshops", label: "Workshops", icon: "video" },
  { href: "/admin/appointments", label: "Appointments", icon: "calendar" },
  { href: "/admin/payments", label: "Payments", icon: "check" },
  { href: "/admin/support", label: "Support & Feedback", icon: "message" },
];
export default function AdminShell({children}:{children:React.ReactNode}){const path=usePathname();const [user,setUser]=useState<User|null>(null);const [open,setOpen]=useState(false);useEffect(()=>setUser(currentUser()),[]);useEffect(()=>setOpen(false),[path]);return <RoleGuard role="admin"><div className="learnerApp adminApp"><aside className={`learnerSidebar ${open?"isOpen":""}`}><div className="sidebarBrand" style={{ display: "flex", alignItems: "center", gap: "10px" }}><img src="/logo.png" alt="Learnova" style={{ height: "54px", width: "auto", objectFit: "contain", background: "#ffffff", borderRadius: "8px", padding: "4px 8px" }} /><div><small>ADMIN CONSOLE</small></div></div><nav className="sidebarNav"><span className="navLabel">PLATFORM</span>{items.map(i=>{const active=i.href==="/admin"?path===i.href:path.startsWith(i.href);return <Link key={i.href} href={i.href} className={active?"active":""}><Icon name={i.icon} size={19}/>{i.label}</Link>})}</nav><div className="adminSecurity"><Icon name="check"/><div><b>Administrator access</b><p>Actions are applied to live platform records.</p></div></div><button className="sidebarLogout" onClick={logout}><Icon name="logout" size={18}/>Log out</button></aside>{open&&<button className="sidebarBackdrop" onClick={()=>setOpen(false)}/>}<div className="learnerMain"><header className="learnerTopbar"><button className="sidebarToggle" onClick={()=>setOpen(!open)}><Icon name={open?"close":"menu"}/></button><p className="workspaceLabel">ADMINISTRATION</p><div className="topbarActions"><div className="userPill"><div className="userAvatar">{user?.name?.[0]||"A"}</div><div><b>{user?.name||"Administrator"}</b><small>Platform admin</small></div></div></div></header><main className="learnerContent">{children}</main></div></div></RoleGuard>}
