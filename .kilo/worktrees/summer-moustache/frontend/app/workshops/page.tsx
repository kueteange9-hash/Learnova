"use client";
import { useEffect,useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { currentUser,getWorkshops,saveWorkshops,Workshop } from "@/lib/store";

export default function Workshops(){
 const [ws,setWs]=useState<Workshop[]>([]);const [user,setUser]=useState<any>(null);const [title,setTitle]=useState("");const [price,setPrice]=useState("0");
 useEffect(()=>{setWs(getWorkshops());setUser(currentUser())},[]);
 function create(){if(!title)return;const w:Workshop={id:"w"+Date.now(),title,specialist:user.name,domain:user.domain||"General Guidance",date:"2026-09-05",price:Number(price),description:"New workshop created by the specialist.",status:"Pending"};const v=[...ws,w];setWs(v);saveWorkshops(v);setTitle("");}
 return <><Nav/><main className="dashboard"><div className="welcome"><div><span className="eyebrow">Workshops</span><h1>Learn from specialists</h1><p>Join free or paid workshops created by verified specialists.</p></div></div>{user?.role==="specialist"&&<Card><h2>Create workshop</h2><div className="formGrid"><label>Title<input value={title} onChange={e=>setTitle(e.target.value)} placeholder="Workshop title"/></label><label>Price (FCFA)<input value={price} onChange={e=>setPrice(e.target.value)} type="number"/></label></div><button className="primaryButton" onClick={create}>Create Workshop</button></Card>}<div className="workshopGrid">{ws.filter(w=>w.status==="Approved"||w.specialist===user?.name).map(w=><Card key={w.id}><span className={w.status==="Approved"?"status good":"status pending"}>{w.status}</span><h2>{w.title}</h2><p>{w.description}</p><small>By {w.specialist} · {w.date}</small><div className="workshopBottom"><b>{w.price===0?"FREE":w.price.toLocaleString()+" FCFA"}</b><button className="primaryButton">{w.price===0?"Join workshop":"Register"}</button></div></Card>)}</div></main></>
}
