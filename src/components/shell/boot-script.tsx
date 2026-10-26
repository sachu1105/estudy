// Runs synchronously in <head> before first paint: applies the saved theme and the
// sidebar state so neither flashes on load. Keep in sync with lib/theme.ts and
// components/shell/sidebar.tsx.
const script = `(function(){try{
var d=document.documentElement;d.setAttribute("data-js","");
d.setAttribute("data-theme",localStorage.getItem("theme")==="dark"?"dark":"light");
if(localStorage.getItem("sidebar")==="collapsed")d.setAttribute("data-sidebar","collapsed");
}catch(e){}})()`;

export function BootScript() {
  return (
    <script
      // React warns about <script> rendered on the client; the type swap avoids it.
      type={typeof window === "undefined" ? "text/javascript" : "text/plain"}
      suppressHydrationWarning
      dangerouslySetInnerHTML={{ __html: script }}
    />
  );
}
