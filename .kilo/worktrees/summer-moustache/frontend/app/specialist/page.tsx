"use client";
import Link from "next/link";
import { useEffect,useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import RoleGuard from "@/components/RoleGuard";
import { currentUser,getAppointments,getPosts,getWorkshops,User } from "@/lib/store";

export default function Specialist(){
 const [u,setU]=useState<User|null>(null); useEffect(()=>setU(currentUser()),[]);
 if(!u)return null; const apps=getAppointments().filter(a=>a.specialistId===u.id); const posts=getPosts().filter(p=>p.authorId===u.id); const workshops=getWorkshops().filter(w=>w.specialist===u.name);
 return <RoleGuard role="specialist"><Nav/><main className="dashboard"><div className="welcome"><div><span className="eyebrow">Specialist Dashboard</span><h1>Welcome, {u.name}</h1><p>Manage your consultations, posts, workshops and professional profile.</p></div><Link className="primaryButton" href="/community">Create Post →</Link></div><div className="metricGrid"><Metric n={apps.length} t="Appointments"/><Metric n={posts.length} t="My Posts"/><Metric n={workshops.length} t="Workshops"/><Metric n="4.9★" t="Rating"/></div><div className="dashboardGrid"><section><Card><div className="sectionHead"><h2>Appointments</h2><Link href="/appointments">Manage</Link></div>{apps.map(a=><div className="appointment" key={a.id}><b>{a.learner}</b><span>{a.date} · {a.time}</span><em>{a.status}</em></div>)}{!apps.length&&<p className="muted">No appointments yet.</p>}</Card><Card><div className="sectionHead"><h2>My professional profile</h2><Link href="/settings">Edit</Link></div><div className="profileRow"><div className="bigAvatar">{u.photo?<img src={u.photo}/>:u.name[0]}</div><div><b>{u.name}</b><small>{u.domain}</small><span className="verified">✓ Verified</span></div></div><p>{u.bio}</p></Card></section><aside><Card><h2>Quick actions</h2><div className="quickLinks"><Link href="/community">📝 Create post</Link><Link href="/workshops">🎓 Create workshop</Link><Link href="/appointments">📅 Appointments</Link><Link href="/settings">👤 Profile & photo</Link></div></Card><Card><h2>Earnings</h2><strong className="bigMoney">125,000 FCFA</strong><p className="muted">This month · after platform commission</p></Card></aside></div></main></RoleGuard>
}
function Metric({n,t}:{n:any;t:string}){return <Card><strong className="metric">{n}</strong><span>{t}</span></Card>}
