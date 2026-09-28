"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import Icon from "@/components/learner/Icon";
import { api, CommunityPostRecord, DomainItem } from "@/lib/api";
import { currentUser, User } from "@/lib/store";

const serverRoot = process.env.NEXT_PUBLIC_API_URL?.replace(/\/api$/, "") || "http://localhost:3001";
const initials = (name: string) => name.split(" ").map((part) => part[0]).join("").slice(0, 2).toUpperCase();
const assetUrl = (url: string | null) => url?.startsWith("/uploads/") ? `${serverRoot}${url}` : url || "";

function AuthorIdentity({ post, color }: { post: CommunityPostRecord; color: string }) {
  return (
    <>
      <div className={`avatar avatar-${color}`}>
        {post.author.image ? <img src={assetUrl(post.author.image)} alt="" /> : initials(post.author.name)}
      </div>
      <div>
        <h3>
          {post.author.name}
          <span title="Specialist" style={{ marginLeft: "4px", color: "#6366f1" }}>✓</span>
        </h3>
        <p>{post.author.specialist?.headline || "Learnova specialist"}</p>
      </div>
    </>
  );
}

export default function CommunityHub({ canPublish = false }: { canPublish?: boolean }) {
  const [user, setUser] = useState<User | null>(null);
  const [posts, setPosts] = useState<CommunityPostRecord[]>([]);
  const [domains, setDomains] = useState<DomainItem[]>([]);
  const [specialistVerified, setSpecialistVerified] = useState(true);
  const [loading, setLoading] = useState(true);
  const [publishing, setPublishing] = useState(false);
  const [error, setError] = useState("");
  const [message, setMessage] = useState("");
  const [text, setText] = useState("");
  const [selectedDomain, setSelectedDomain] = useState("Career Guidance & Planning");
  const [imageName, setImageName] = useState("");

  // Track expanded comments per post ID
  const [openComments, setOpenComments] = useState<Record<string, boolean>>({});
  const [commentDrafts, setCommentDrafts] = useState<Record<string, string>>({});
  const [submittingComment, setSubmittingComment] = useState<Record<string, boolean>>({});

  useEffect(() => {
    setUser(currentUser());
    Promise.all([
      api.getPosts(),
      api.getDomains(),
      canPublish ? api.getMySpecialistProfile() : Promise.resolve(null),
    ])
      .then(([postRes, domainRes, specRes]) => {
        setPosts(postRes.posts);
        setDomains(domainRes.domains);
        if (domainRes.domains.length > 0) {
          setSelectedDomain(domainRes.domains[0].name);
        }
        if (specRes && specRes.specialist) {
          setSpecialistVerified(specRes.specialist.verification === "VERIFIED");
        }
      })
      .catch((caught) => setError(caught instanceof Error ? caught.message : "Could not load the community"))
      .finally(() => setLoading(false));
  }, [canPublish]);

  const topics = useMemo(() => {
    return Object.entries(
      posts.reduce<Record<string, number>>((all, post) => {
        all[post.domain] = (all[post.domain] || 0) + 1;
        return all;
      }, {})
    ).sort((a, b) => b[1] - a[1]);
  }, [posts]);

  async function publish(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!text.trim() || publishing) return;
    if (!specialistVerified) {
      setError("Your specialist account must be verified by an administrator before publishing posts.");
      return;
    }
    setPublishing(true);
    setError("");
    setMessage("");
    const form = event.currentTarget;
    const data = new FormData(form);
    data.set("text", text.trim());
    data.set("domain", selectedDomain);
    try {
      const result = await api.createPost(data);
      setPosts((current) => [result.post, ...current]);
      setText("");
      setImageName("");
      form.reset();
      setMessage("Your post is now visible to learners.");
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not publish the post");
    } finally {
      setPublishing(false);
    }
  }

  async function handleToggleLike(postId: string) {
    if (!user) {
      setError("Please sign in to like posts.");
      return;
    }
    try {
      const result = await api.togglePostLike(postId);
      setPosts((current) =>
        current.map((p) => {
          if (p.id !== postId) return p;
          const alreadyLiked = p.likes.some((l) => l.userId === user.id);
          const newLikes = alreadyLiked
            ? p.likes.filter((l) => l.userId !== user.id)
            : [...p.likes, { id: `like-${Date.now()}`, userId: user.id }];
          return { ...p, likes: newLikes };
        })
      );
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not update like");
    }
  }

  function toggleCommentsDrawer(postId: string) {
    setOpenComments((prev) => ({ ...prev, [postId]: !prev[postId] }));
  }

  async function submitComment(postId: string, e: React.FormEvent) {
    e.preventDefault();
    const draft = commentDrafts[postId]?.trim();
    if (!draft || submittingComment[postId]) return;
    if (!user) {
      setError("Please sign in to comment on posts.");
      return;
    }
    setSubmittingComment((prev) => ({ ...prev, [postId]: true }));
    setError("");
    try {
      const result = await api.addPostComment(postId, draft);
      setPosts((current) =>
        current.map((p) => {
          if (p.id !== postId) return p;
          return { ...p, comments: [...p.comments, result.comment] };
        })
      );
      setCommentDrafts((prev) => ({ ...prev, [postId]: "" }));
    } catch (caught) {
      setError(caught instanceof Error ? caught.message : "Could not post comment");
    } finally {
      setSubmittingComment((prev) => ({ ...prev, [postId]: false }));
    }
  }

  return (
    <div className="learnerPage communityPage">
      <section className="pageTitle">
        <div>
          <p className="pageKicker">COMMUNITY HUB</p>
          <h1>{canPublish ? "Share guidance with learners" : "Guidance feed & discussions"}</h1>
          <p>
            {canPublish
              ? "Publish practical guidance, resources, and advice for learners."
              : "Read real insights from verified specialists, like helpful posts, and join discussions."}
          </p>
        </div>
      </section>

      {error && <div className="formAlert error">{error}</div>}
      {message && <div className="formAlert success"><Icon name="check" size={16} />{message}</div>}

      <div className="communityLayout">
        <main>
          {canPublish && (
            specialistVerified ? (
              <form className="composeCard panel specialistComposer" onSubmit={publish}>
                <div className="composeIntro">
                  <span><Icon name="community" size={18} /></span>
                  <div>
                    <h2>Create a post</h2>
                    <p>Share useful guidance with learners across Learnova.</p>
                  </div>
                </div>
                <textarea
                  name="text"
                  value={text}
                  maxLength={5000}
                  required
                  onChange={(event) => setText(event.target.value)}
                  placeholder="Share practical guidance, resources, or advice..."
                />
                <div className="composeActions">
                  <div className="composerTools">
                    <select
                      name="domain"
                      value={selectedDomain}
                      onChange={(event) => setSelectedDomain(event.target.value)}
                      aria-label="Post topic"
                    >
                      {domains.length > 0 ? (
                        domains.map((d) => (
                          <option key={d.id} value={d.name}>{d.name}</option>
                        ))
                      ) : (
                        <option value="Career Guidance & Planning">Career Guidance & Planning</option>
                      )}
                    </select>
                    <label className="imagePicker">
                      <Icon name="sparkles" size={15} />
                      <span>{imageName || "Add image"}</span>
                      <input
                        name="image"
                        type="file"
                        accept="image/*"
                        onChange={(event) => setImageName(event.target.files?.[0]?.name || "")}
                      />
                    </label>
                  </div>
                  <button className="learnerPrimary compact" disabled={!text.trim() || publishing}>
                    {publishing ? "Publishing..." : "Publish post"}
                  </button>
                </div>
                <small className="uploadHint">Optional image · any image format · no size limit</small>
              </form>
            ) : (
              <div className="panel" style={{ padding: "1.25rem", background: "#fffbeb", border: "1px solid #fde68a", borderRadius: "12px", marginBottom: "1.5rem" }}>
                <div style={{ display: "flex", alignItems: "center", gap: "0.5rem" }}>
                  <Icon name="clock" size={20} />
                  <strong style={{ color: "#92400e" }}>Account verification pending</strong>
                </div>
                <p style={{ margin: "0.5rem 0 0", color: "#78350f", fontSize: "0.9rem" }}>
                  Specialists can publish community posts once their qualification document has been approved by an administrator. You can still read community posts and comment below.
                </p>
              </div>
            )
          )}

          <div className="feedTabs">
            <button className="active" type="button">Latest specialist posts</button>
          </div>

          {loading ? (
            <div className="apiState">Loading community...</div>
          ) : (
            <div className="communityFeed">
              {posts.length ? (
                posts.map((post, index) => {
                  const isLiked = Boolean(user && post.likes?.some((l) => l.userId === user.id));
                  const commentsShown = Boolean(openComments[post.id]);
                  const commentCount = post.comments?.length || 0;
                  const isSendingComment = Boolean(submittingComment[post.id]);

                  return (
                    <article className="feedPost panel" key={post.id}>
                      <header>
                        {canPublish ? (
                          <div className="communityAuthorLink">
                            <AuthorIdentity post={post} color={["coral", "blue", "purple", "gold"][index % 4]} />
                          </div>
                        ) : (
                          <Link className="communityAuthorLink" href={`/learner/specialists?specialist=${post.author.id}`}>
                            <AuthorIdentity post={post} color={["coral", "blue", "purple", "gold"][index % 4]} />
                          </Link>
                        )}
                        <time>
                          {new Date(post.createdAt).toLocaleString([], { dateStyle: "medium", timeStyle: "short" })}
                        </time>
                      </header>

                      <span className="postCategory">{post.domain}</span>
                      <p className="feedPostText">{post.text}</p>
                      {post.image && (
                        <img
                          className="communityPostImage"
                          src={assetUrl(post.image)}
                          alt={`Image shared by ${post.author.name}`}
                        />
                      )}

                      {!canPublish && (
                        <Link className="viewSpecialistLink" href={`/learner/specialists?specialist=${post.author.id}`}>
                          View specialist profile <Icon name="arrow" size={14} />
                        </Link>
                      )}

                      {/* Interactive Post Actions: Like and Comment only */}
                      <div className="postActionsRow" style={{ display: "flex", alignItems: "center", gap: "1rem", marginTop: "1rem", paddingTop: "0.75rem", borderTop: "1px solid #f1f3f7" }}>
                        <button
                          type="button"
                          className={`postActionBtn ${isLiked ? "liked" : ""}`}
                          onClick={() => handleToggleLike(post.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            fontWeight: isLiked ? 600 : 400,
                            color: isLiked ? "#e11d48" : "#64748b",
                            fontSize: "0.85rem",
                          }}
                        >
                          <Icon name="heart" size={16} />
                          <span>{post.likes?.length || 0} {post.likes?.length === 1 ? "Like" : "Likes"}</span>
                        </button>

                        <button
                          type="button"
                          className="postActionBtn"
                          onClick={() => toggleCommentsDrawer(post.id)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "6px",
                            background: "transparent",
                            border: "none",
                            cursor: "pointer",
                            color: "#64748b",
                            fontSize: "0.85rem",
                          }}
                        >
                          <Icon name="message" size={16} />
                          <span>{commentCount} {commentCount === 1 ? "Comment" : "Comments"}</span>
                        </button>
                      </div>

                      {/* Interactive Comment Section */}
                      {commentsShown && (
                        <div className="postCommentsThread" style={{ marginTop: "0.75rem", paddingTop: "0.75rem", borderTop: "1px solid #f8fafc" }}>
                          {commentCount > 0 && (
                            <div className="commentsList" style={{ display: "flex", flexDirection: "column", gap: "0.5rem", marginBottom: "0.75rem" }}>
                              {post.comments.map((c) => (
                                <div key={c.id} style={{ display: "flex", gap: "0.5rem", alignItems: "flex-start" }}>
                                  <div className="avatar avatar-blue" style={{ width: "26px", height: "26px", fontSize: "11px" }}>
                                    {c.author.image ? <img src={assetUrl(c.author.image)} alt="" /> : c.author.name[0]}
                                  </div>
                                  <div style={{ background: "#f8fafc", padding: "6px 10px", borderRadius: "8px", flex: 1 }}>
                                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                                      <strong style={{ fontSize: "0.8rem", color: "#1e293b" }}>{c.author.name}</strong>
                                      <small style={{ fontSize: "0.7rem", color: "#94a3b8" }}>
                                        {new Date(c.createdAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })}
                                      </small>
                                    </div>
                                    <p style={{ margin: "2px 0 0", fontSize: "0.82rem", color: "#334155" }}>{c.text}</p>
                                  </div>
                                </div>
                              ))}
                            </div>
                          )}

                          <form
                            onSubmit={(e) => submitComment(post.id, e)}
                            style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}
                          >
                            <input
                              type="text"
                              placeholder="Write a comment..."
                              value={commentDrafts[post.id] || ""}
                              onChange={(e) =>
                                setCommentDrafts((prev) => ({ ...prev, [post.id]: e.target.value }))
                              }
                              style={{
                                flex: 1,
                                padding: "6px 10px",
                                borderRadius: "6px",
                                border: "1px solid #cbd5e1",
                                fontSize: "0.85rem",
                              }}
                            />
                            <button
                              type="submit"
                              className="learnerPrimary compact"
                              disabled={!commentDrafts[post.id]?.trim() || isSendingComment}
                              style={{ padding: "6px 12px", fontSize: "0.8rem" }}
                            >
                              {isSendingComment ? "Posting..." : "Post"}
                            </button>
                          </form>
                        </div>
                      )}
                    </article>
                  );
                })
              ) : (
                <div className="emptyState panel">
                  <Icon name="community" size={30} />
                  <h3>No specialist posts yet</h3>
                  <p>
                    {canPublish
                      ? "Share the first piece of guidance with learners."
                      : "Specialist guidance will appear here."}
                  </p>
                </div>
              )}
            </div>
          )}
        </main>

        <aside className="communityAside">
          <section className="panel">
            <div className="sideHeading">
              <h3>Active topics</h3>
            </div>
            <div className="topicList">
              {topics.length ? (
                topics.map(([topic, count], index) => (
                  <div className="topicItem" key={topic}>
                    <span>{index + 1}</span>
                    <div>
                      <b>{topic}</b>
                      <small>{count} post{count === 1 ? "" : "s"}</small>
                    </div>
                  </div>
                ))
              ) : (
                <div className="emptyState">
                  <p>No topics yet.</p>
                </div>
              )}
            </div>
          </section>

          <section className="panel communityGuidelines">
            <span><Icon name="sparkles" /></span>
            <h3>Specialist-led guidance</h3>
            <p>
              Verified specialists publish practical advice. Learners can like posts, join discussions via comments, and connect directly with specialists.
            </p>
          </section>
        </aside>
      </div>
    </div>
  );
}
