// Runs synchronously in <head> before first paint: applies the saved theme and the
// sidebar state so neither flashes on load. Keep in sync with lib/theme.ts and
// components/shell/sidebar.tsx.
const script = `(function(){try{
var d=document.documentElement;
var p=localStorage.getItem("theme");if(p!=="light"&&p!=="dark")p="system";
var q=matchMedia("(prefers-color-scheme: dark)");
var t=p==="system"?(q.matches?"dark":"light"):p;
d.setAttribute("data-theme",t);d.setAttribute("data-theme-pref",p);
q.addEventListener("change",function(e){if(d.getAttribute("data-theme-pref")==="system")d.setAttribute("data-theme",e.matches?"dark":"light")});
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
