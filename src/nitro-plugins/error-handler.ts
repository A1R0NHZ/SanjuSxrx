// Nitro plugin: intercepts unhandled server errors and returns a clean HTML
// error page instead of leaking JSON stack traces to the client.
import { renderErrorPage } from "../lib/error-page";

export default defineNitroPlugin((nitroApp) => {
  nitroApp.hooks.hook("error", (error, { event }) => {
    if (!event) return;

    console.error("[SSR error]", error);

    const response = new Response(renderErrorPage(), {
      status: 500,
      headers: { "content-type": "text/html; charset=utf-8" },
    });

    event._handled = true;
    // @ts-expect-error – h3 internal, set the raw response
    event.node?.res?.writeHead(500, { "content-type": "text/html; charset=utf-8" });
    event.node?.res?.end(renderErrorPage());
  });
});
