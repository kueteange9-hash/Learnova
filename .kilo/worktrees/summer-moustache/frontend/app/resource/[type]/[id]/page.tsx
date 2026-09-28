"use client";

/**
 * Recommendation detail page.
 *
 * The AI chat recommends real database resources; "View Profile",
 * "View Workshop" and "View Post" buttons land here. Everything shown is
 * loaded from the Learnova backend (no invented content).
 *
 * Routes: /resource/specialist/[id] | /resource/workshop/[id] | /resource/post/[id]
 */

import Link from "next/link";
import { useParams } from "next/navigation";
import { useCallback, useEffect, useState } from "react";

import Nav from "@/components/Nav";
import Card from "@/components/Card";
import { api, mediaUrl } from "@/lib/api";
import { formatDate, formatPrice } from "@/lib/ai";

type ResourceKind = "specialist" | "workshop" | "post";

export default function ResourcePage() {
  const params = useParams<{ type: string; id: string }>();
  const type = (Array.isArray(params?.type) ? params.type[0] : params?.type || "").toLowerCase();
  const id = Array.isArray(params?.id) ? params.id[0] : params?.id || "";

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [data, setData] = useState<any>(null);

  const load = useCallback(async () => {
    if (!id) return;

    setLoading(true);
    setError("");

    try {
      if (type === "specialist") {
        setData(await api.getSpecialist(id));
      } else if (type === "workshop") {
        setData(await api.getWorkshop(id));
      } else if (type === "post") {
        setData(await api.getPost(id));
      } else {
        setError("This recommendation type is not supported.");
      }
    } catch (requestError) {
      setError(
        requestError instanceof Error
          ? requestError.message
          : "We could not load this resource from the Learnova database."
      );
    } finally {
      setLoading(false);
    }
  }, [id, type]);

  useEffect(() => {
    load();
  }, [load]);

  const backHref =
    type === "specialist" ? "/learner/specialists" : type === "workshop" ? "/workshops" : "/community";
  const backLabel =
    type === "specialist" ? "Back to specialists" : type === "workshop" ? "Back to workshops" : "Back to community";

  return (
    <>
      <Nav />

      <main className="dashboard resourcePage">
        <Link className="backLink" href={backHref}>
          ← {backLabel}
        </Link>

        {loading && (
          <Card>
            <div className="resourceLoading">
              <p>Loading this resource from Learnova…</p>
            </div>
          </Card>
        )}

        {!loading && error && (
          <Card>
            <div className="resourceLoading">
              <p className="aiInlineError">⚠ {error}</p>
              <button type="button" className="secondaryButton" onClick={load}>
                ↻ Try again
              </button>
            </div>
          </Card>
        )}

        {!loading && !error && type === "specialist" && data?.specialist && (
          <SpecialistView resource={data} />
        )}

        {!loading && !error && type === "workshop" && data?.workshop && (
          <WorkshopView workshop={data.workshop} />
        )}

        {!loading && !error && type === "post" && data?.post && <PostView post={data.post} />}

        <Link className="aiChip" href="/learner#ai-assistant">
          ✦ Ask the Learnova AI Assistant
        </Link>
      </main>
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Specialist
 * ------------------------------------------------------------------ */
function SpecialistView({ resource }: { resource: any }) {
  const specialist = resource.specialist;
  const photo = mediaUrl(specialist.image);

  return (
    <>
      <Card className="profileHero">
        <div className="profilePhoto">
          {photo ? <img src={photo} alt={specialist.name} /> : specialist.name?.charAt(0) || "L"}
        </div>

        <div className="profileInfo">
          <span className="resourceBanner">✦ Recommended by Learnova AI</span>

          {specialist.verified && <span className="verified">✓ Verified specialist</span>}

          <h1>{specialist.name}</h1>
          <h3>{specialist.domain}</h3>

          <p>{specialist.bio || "Verified Learnova specialist."}</p>

          <div className="resourceMeta">
            <span>
              <b>Specialization:</b> {specialist.specialization}
            </span>
            {specialist.experience && (
              <span>
                <b>Experience:</b> {specialist.experience}
              </span>
            )}
          </div>

          <div className="profileActions">
            <Link
              className="primaryButton"
              href={`/appointments?specialist=${specialist.userId}&name=${encodeURIComponent(
                specialist.name
              )}&domain=${encodeURIComponent(specialist.domain)}`}
            >
              Book Appointment →
            </Link>
            <Link className="secondaryButton" href="/learner/specialists">
              Browse all specialists
            </Link>
          </div>
        </div>
      </Card>

      {resource.workshops?.length > 0 && (
        <section>
          <div className="sectionHead">
            <h2>Workshops by {specialist.name}</h2>
          </div>

          <div className="workshopGrid">
            {resource.workshops.map((workshop: any) => (
              <Card key={workshop.id}>
                <span className={workshop.type === "PAID" ? "aiPriceTag paid" : "aiPriceTag free"}>
                  {workshop.type === "PAID"
                    ? formatPrice(workshop.price) || "PAID"
                    : "FREE"}
                </span>
                <h2>{workshop.title}</h2>
                <p>{workshop.description}</p>
                <small>{formatDate(workshop.date)}</small>
                <div className="workshopBottom">
                  <Link className="primaryButton" href={`/resource/workshop/${workshop.id}`}>
                    View Workshop
                  </Link>
                </div>
              </Card>
            ))}
          </div>
        </section>
      )}

      {resource.posts?.length > 0 && (
        <section>
          <div className="sectionHead">
            <h2>Recent posts</h2>
          </div>

          <div className="postGrid">
            {resource.posts.map((post: any) => (
              <Card key={post.id}>
                <small className="muted">
                  {post.domain} · {formatDate(post.createdAt)}
                </small>
                <p className="postText">{post.text}</p>
                <Link className="secondaryButton full" href={`/resource/post/${post.id}`}>
                  View Post
                </Link>
              </Card>
            ))}
          </div>
        </section>
      )}
    </>
  );
}

/* ------------------------------------------------------------------ *
 * Workshop
 * ------------------------------------------------------------------ */
function WorkshopView({ workshop }: { workshop: any }) {
  const image = mediaUrl(workshop.image);

  return (
    <Card>
      <span className="resourceBanner">✦ Recommended by Learnova AI</span>

      {image && <img className="resourceImage" src={image} alt={workshop.title} />}

      <div className="aiRecTopRow">
        <h1 className="profileInfo h1">{workshop.title}</h1>
        <span className={workshop.type === "PAID" ? "aiPriceTag paid" : "aiPriceTag free"}>
          {workshop.type === "PAID" ? formatPrice(workshop.price) || "PAID" : "FREE"}
        </span>
      </div>

      <div className="resourceMeta">
        <span>
          <b>Domain:</b> {workshop.domain}
        </span>
        <span>
          <b>Date:</b> {formatDate(workshop.date)}
        </span>
        <span>
          <b>Specialist:</b> {workshop.specialist?.name}
        </span>
      </div>

      <p className="resourceBody">{workshop.description}</p>

      <div className="profileActions">
        {workshop.specialist?.id && (
          <Link
            className="secondaryButton"
            href={`/resource/specialist/${workshop.specialist.id}`}
          >
            View Specialist Profile
          </Link>
        )}
        <Link className="primaryButton" href="/workshops">
          All workshops →
        </Link>
      </div>
    </Card>
  );
}

/* ------------------------------------------------------------------ *
 * Post
 * ------------------------------------------------------------------ */
function PostView({ post }: { post: any }) {
  const image = mediaUrl(post.image);

  return (
    <>
      <Card>
        <span className="resourceBanner">✦ Recommended by Learnova AI</span>

        <div className="profileRow">
          <div className="avatar">{post.author?.name?.charAt(0) || "L"}</div>
          <div>
            <b>{post.author?.name || "Learnova specialist"}</b>
            <small>
              {post.author?.domain || post.domain} · {formatDate(post.createdAt)}
            </small>
          </div>
        </div>

        {image && <img className="resourceImage" src={image} alt="Post illustration" />}

        <p className="resourceBody">{post.text}</p>

        <div className="resourceMeta">
          <span>
            <b>Domain:</b> {post.domain}
          </span>
          <span>
            <b>Likes:</b> {post.likes}
          </span>
          <span>
            <b>Comments:</b> {post.comments?.length || 0}
          </span>
        </div>

        <div className="profileActions">
          {post.author?.id && (
            <Link className="secondaryButton" href={`/resource/specialist/${post.author.id}`}>
              View Specialist Profile
            </Link>
          )}
          <Link className="primaryButton" href="/community">
            Go to community →
          </Link>
        </div>
      </Card>

      {post.comments?.length > 0 && (
        <Card>
          <h2>Comments</h2>
          <div className="comments">
            {post.comments.map((comment: any) => (
              <p key={comment.id}>
                <b>{comment.author?.name || "Learner"}:</b> {comment.text}
              </p>
            ))}
          </div>
        </Card>
      )}
    </>
  );
}
