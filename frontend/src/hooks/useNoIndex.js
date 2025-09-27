import { useEffect } from "react";

const META_ATTR = "data-managed-noindex";
let activeConsumers = 0;

const ensureMeta = () => {
  let meta = document.head.querySelector(`meta[${META_ATTR}]`);
  if (meta) {
    return meta;
  }

  meta = document.createElement("meta");
  meta.setAttribute("name", "robots");
  meta.setAttribute(META_ATTR, "true");
  document.head.appendChild(meta);
  return meta;
};

export default function useNoIndex() {
  useEffect(() => {
    if (typeof document === "undefined") {
      return undefined;
    }

    const meta = ensureMeta();
    if (activeConsumers === 0) {
      meta.setAttribute(
        "data-original-content",
        meta.getAttribute("content") ?? ""
      );
    }

    activeConsumers += 1;
    meta.setAttribute("content", "noindex, nofollow");

    return () => {
      activeConsumers = Math.max(0, activeConsumers - 1);
      if (activeConsumers === 0) {
        const previous = meta.getAttribute("data-original-content") ?? "";
        if (previous) {
          meta.setAttribute("content", previous);
        } else {
          meta.removeAttribute("content");
        }
        meta.removeAttribute("data-original-content");
      }
    };
  }, []);
}