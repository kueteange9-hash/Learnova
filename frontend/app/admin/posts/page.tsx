"use client";

import { useEffect, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api } from "@/lib/api";
import { assetUrl } from "@/lib/assets";

type AdminPost = {
  id: string;
  domain: string;
  text: string;
  image: string | null;
  createdAt: string;
  author: {
    id: string;
    name: string;
    email: string;
    image: string | null;
    specialist?: { headline: string | null; domain: string; verification: string } | null;
  };
  _count: {
    likes: number;
    comments: number;
  };
};

export default function AdminPostsPage() {
  const [posts, setPosts] = useState<AdminPost[]>([]);
  const [query, setQuery] = useState("");
  const [domainFilter, setDomainFilter] = useState("ALL");
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [notice, setNotice] = useState("");
  const [deletingId, setDeletingId] = useState<string | null>(null);

  async function loadPosts() {
    try {
      const res = await api.getAdminPosts();
      setPosts(res.posts);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Failed to load posts");
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadPosts();
  }, []);

  async function handleDelete(id: string) {
    if (!confirm("Are you sure you want to remove this post from the community feed?")) return;
    setDeletingId(id);
    setError("");
    setNotice("");
    try {
      await api.deleteAdminPost(id);
      setPosts(prev => prev.filter(p => p.id !== id));
      setNotice("The post was removed successfully.");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to delete post");
    } finally {
      setDeletingId(null);
    }
  }

  const domains = ["ALL", ...Array.from(new Set(posts.map(p => p.domain)))];

  const filtered = posts.filter(p => {
    const matchDomain = domainFilter === "ALL" || p.domain === domainFilter;
    const matchQuery =
      p.text.toLowerCase().includes(query.toLowerCase()) ||
      p.author.name.toLowerCase().includes(query.toLowerCase()) ||
      p.author.email.toLowerCase().includes(query.toLowerCase());
    return matchDomain && matchQuery;
  });

  return (
    <div className="learnerPage adminPostsPage">
      <section className="dashboardHello">
        <div>
          <p className="pageKicker">CONTENT MODERATION</p>
          <h1>Community Posts</h1>
          <p>Review and moderate posts published by verified specialists across the platform.</p>
        </div>
      </section>

      {notice && <div className="formAlert success"><Icon name="check" size={16} />{notice}</div>}
      {error && <div className="formAlert error">{error}</div>}

      <div className="directoryTools">
        <div className="directorySearch">
          <Icon name="search" size={18} />
          <input
            value={query}
            onChange={e => setQuery(e.target.value)}
            placeholder="Search by post text, specialist name, or email..."
          />
        </div>
        <select value={domainFilter} onChange={e => setDomainFilter(e.target.value)}>
          {domains.map(d => (
            <option key={d} value={d}>{d === "ALL" ? "All domains" : d}</option>
          ))}
        </select>
      </div>

      <div className="resultsHeading">
        <p><b>{filtered.length}</b> posts shown ({posts.length} total)</p>
      </div>

      {loading ? (
        <div className="apiState">Loading community posts...</div>
      ) : filtered.length ? (
        <div className="adminPostsList">
          {filtered.map(post => (
            <article key={post.id} className="panel adminPostCard">
              <header className="adminPostHeader">
                <div className="authorBlock">
                  <div className="avatar avatar-blue">
                    {post.author.image ? (
                      <img src={assetUrl(post.author.image)} alt="" />
                    ) : (
                      post.author.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h4>{post.author.name} <span className="verifiedCheck">✓</span></h4>
                    <small>{post.author.email} · {post.author.specialist?.headline || post.domain}</small>
                  </div>
                </div>
                <div className="postMeta">
                  <span className="domainBadge">{post.domain}</span>
                  <time>{new Date(post.createdAt).toLocaleDateString([], { month: "short", day: "numeric", year: "numeric" })}</time>
                </div>
              </header>

              <p className="postContentText">{post.text}</p>
              {post.image && (
                <div className="adminPostImgWrap">
                  <img src={assetUrl(post.image)} alt="" />
                </div>
              )}

              <footer className="adminPostFooter">
                <div className="postEngagement">
                  <span><Icon name="heart" size={15} /> {post._count?.likes || 0} likes</span>
                  <span><Icon name="message" size={15} /> {post._count?.comments || 0} comments</span>
                </div>
                <button
                  type="button"
                  className="outlineAction dangerAction compact"
                  disabled={deletingId === post.id}
                  onClick={() => handleDelete(post.id)}
                >
                  {deletingId === post.id ? "Deleting..." : "Delete post"}
                </button>
              </footer>
            </article>
          ))}
        </div>
      ) : (
        <div className="emptyState panel">
          <Icon name="community" size={32} />
          <h3>No posts found</h3>
          <p>No community posts match your current search criteria.</p>
        </div>
      )}
    </div>
  );
}
