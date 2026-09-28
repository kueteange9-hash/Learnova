import { WorkshopRecord } from "@/lib/api";
import "./workshops.css";

export const priceLabel = (w: WorkshopRecord) => w.type === "FREE" ? "Free" : `${(w.price || 0).toLocaleString()} FCFA`;
export const dateLabel = (date: string) => new Date(date).toLocaleString([], { dateStyle: "medium", timeStyle: "short" });
export function DateTile({ date }: { date: string }) {
  return <div className="ws-date"><span>{new Date(date).toLocaleDateString([], { month: "short" })}</span><strong>{new Date(date).getDate()}</strong></div>;
}
export function Empty({ title, children }: { title: string; children: React.ReactNode }) {
  return <div className="ws-empty"><h2>{title}</h2><p>{children}</p></div>;
}
