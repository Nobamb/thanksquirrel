export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    const responseHeaders = {
      "Content-Type": "application/json; charset=utf-8",
      "Access-Control-Allow-Origin": "*",
      "Access-Control-Allow-Methods": "GET,OPTIONS",
      "Access-Control-Allow-Headers": "Content-Type",
    };

    if (request.method === "OPTIONS") {
      return new Response(null, { headers: responseHeaders });
    }

    try {
      const data = await env.all_letter.get("all_letter", { type: "json" });
      const letters = Array.isArray(data) ? data : [];

      if (!letters.length) {
        return new Response(
          JSON.stringify({ error: "letters_not_found" }),
          { status: 404, headers: responseHeaders },
        );
      }

      if (url.pathname === "/letters" && url.searchParams.get("mode") === "all") {
        return new Response(JSON.stringify(letters), { headers: responseHeaders });
      }

      const randomLetter = letters[Math.floor(Math.random() * letters.length)];
      return new Response(JSON.stringify(randomLetter), { headers: responseHeaders });
    } catch (error) {
      return new Response(
        JSON.stringify({ error: error.message }),
        { status: 500, headers: responseHeaders },
      );
    }
  },
};
