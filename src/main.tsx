import { StrictMode } from "react";
import { createRoot } from "react-dom/client";
import App from "./App";
import "./styles.css";

createRoot(document.getElementById("root")!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);

// 紙上不能點開：列印時把收起的小區塊展開，印完恢復。「各校完整日程」很長，照使用者自己開或不開。
const printOpened: HTMLDetailsElement[] = [];
window.addEventListener("beforeprint", () => {
  document.querySelectorAll<HTMLDetailsElement>("#panel details:not([open]):not(.detail-list)").forEach((d) => {
    d.open = true;
    printOpened.push(d);
  });
});
window.addEventListener("afterprint", () => {
  printOpened.splice(0).forEach((d) => (d.open = false));
});
