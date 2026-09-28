"use client";
import { useEffect,useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { currentUser,getUsers,saveUsers } from "@/lib/store";

export default function Settings(){
 const [u,setU]=useState<any>(null);const [name,setName]=useState("");const [bio,setBio]=useState("");
 useEffect(()=>{const x=currentUser();if(!x)return;setU(x);setName(x.name);setBio(x.bio||"")},[]);
 if(!u)return null;
 function save(){const users=getUsers().map(x=>x.id===u.id?{...x,name,bio}:x);saveUsers(users);setU({...u,name,bio});alert("Profile saved.");}
 function photo(e:React.ChangeEvent<HTMLInputElement>){const f=e.target.files?.[0];if(!f)return;const r=new FileReader();r.onload=()=>{const users=getUsers().map(x=>x.id===u.id?{...x,photo:String(r.result)}:x);saveUsers(users);setU({...u,photo:String(r.result)});};r.readAsDataURL(f);}
 return <><Nav/><main className="dashboard narrow"><Card><span className="eyebrow">My profile</span><h1>Profile & settings</h1><div className="photoEditor"><div className="profilePhoto">{u.photo?<img src={u.photo}/>:u.name[0]}</div><label className="secondaryButton">Add / change photo<input type="file" accept="image/*" hidden onChange={photo}/></label></div><label>Name<input value={name} onChange={e=>setName(e.target.value)}/></label><label>Email<input value={u.email} disabled/></label><label>Role<input value={u.role} disabled/></label><label>Bio<textarea value={bio} onChange={e=>setBio(e.target.value)} placeholder="Tell people about yourself"/></label><button className="primaryButton" onClick={save}>Save changes</button></Card></main></>
}
