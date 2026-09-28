"use client";
import { assetUrl } from "@/lib/assets";
import { useEffect,useState } from "react";
import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { currentUser,getPosts,savePosts,Post } from "@/lib/store";

export default function Community(){
 const [posts,setPosts]=useState<Post[]>([]); const [text,setText]=useState(""); const [domain,setDomain]=useState("Career Guidance"); const [user,setUser]=useState<any>(null);
 useEffect(()=>{setPosts(getPosts());setUser(currentUser())},[]);
 function create(){if(!text.trim())return; const p:Post={id:"p"+Date.now(),author:user.name,authorId:user.id,role:"specialist",domain,text,likes:0,comments:[],shares:0,createdAt:"now"}; const v=[p,...posts];setPosts(v);savePosts(v);setText("");}
 function like(id:string){const v=posts.map(p=>p.id===id?{...p,likes:p.likes+1}:p);setPosts(v);savePosts(v)}
 function comment(id:string){const c=prompt("Write a comment");if(!c)return;const v=posts.map(p=>p.id===id?{...p,comments:[...p.comments,c]}:p);setPosts(v);savePosts(v)}
 function share(id:string){const v=posts.map(p=>p.id===id?{...p,shares:p.shares+1}:p);setPosts(v);savePosts(v);alert("Post shared.")}
 return <><Nav/><main className="dashboard community"><div className="welcome"><div><span className="eyebrow">Community</span><h1>Learn, share and connect</h1><p>Specialists share guidance and learners can like, comment and share.</p></div></div>{user?.role==="specialist"&&<Card><h2>Create a post</h2><textarea value={text} onChange={e=>setText(e.target.value)} placeholder="Share useful guidance with learners..."/><div className="formActions"><select value={domain} onChange={e=>setDomain(e.target.value)}><option>Career Guidance</option><option>Academic Guidance</option><option>Mental Wellbeing</option><option>Entrepreneurship</option><option>Agriculture</option><option>Personal Development</option></select><button className="primaryButton" onClick={create}>Publish Post</button></div></Card>}<div className="feed">{posts.map(p=><Card key={p.id}><div className="profileRow"><div className="avatar">{p.author[0]}</div><div><b>{p.author} <span className="verified">✓</span></b><small>{p.domain} · {p.createdAt}</small></div></div><p className="postText">{p.text}</p>{p.image&&<img className="postImage" src={assetUrl(p.image)}/>}<div className="postActions"><button onClick={()=>like(p.id)}>♥ {p.likes}</button><button onClick={()=>comment(p.id)}>💬 {p.comments.length}</button><button onClick={()=>share(p.id)}>↗ {p.shares}</button><button>🔖 Save</button></div>{p.comments.length>0&&<div className="comments">{p.comments.map((c,i)=><p key={i}><b>Learner:</b> {c}</p>)}</div>}</Card>)}</div></main></>
}
