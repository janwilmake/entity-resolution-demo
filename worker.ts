/// <reference types="@cloudflare/workers-types" />
/// <reference lib="esnext" />

export interface Env {}

interface ResolutionRequest {
  input: string;
}

interface ProfileResult {
  platform_slug: string;
  profile_url: string;
  is_self_proclaimed_from_input: boolean;
  is_self_referring: boolean;
  confidence: number;
  match_reasoning: string;
  profile_snippet: string;
}

interface ResolutionResult {
  profiles: ProfileResult[];
}

export default {
  async fetch(
    request: Request,
    env: Env,
    ctx: ExecutionContext
  ): Promise<Response> {
    const url = new URL(request.url);

    // Handle CORS preflight
    if (request.method === "OPTIONS") {
      return handleCORS();
    }

    // Handle OAuth callback
    if (url.pathname === "/callback") {
      return handleOAuthCallback(request, url);
    }

    // Handle resolution endpoints
    if (url.pathname === "/resolve" && request.method === "POST") {
      return handleResolutionSubmission(request);
    }

    if (url.pathname.startsWith("/resolve/") && request.method === "GET") {
      const trunId = url.pathname.split("/resolve/")[1];
      return handleResolutionResult(request, trunId);
    }

    // Handle logout
    if (url.pathname === "/api/logout" && request.method === "POST") {
      return handleLogout();
    }

    return new Response("Not found", { status: 404 });
  },
} satisfies ExportedHandler<Env>;

function handleCORS(): Response {
  return new Response(null, {
    status: 200,
    headers: getCORSHeaders(),
  });
}

function getCORSHeaders(): Record<string, string> {
  return {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
    "Access-Control-Allow-Headers": "Content-Type, x-api-key",
  };
}

async function handleOAuthCallback(
  request: Request,
  url: URL
): Promise<Response> {
  const code = url.searchParams.get("code");

  if (!code) {
    return new Response("Missing authorization code", { status: 400 });
  }

  try {
    const cookies = parseCookies(request.headers.get("Cookie") || "");
    const codeVerifier = cookies.code_verifier;

    if (!codeVerifier) {
      return new Response("Missing code verifier", { status: 400 });
    }

    const tokenResponse = await fetch(
      "https://platform.parallel.ai/getKeys/token",
      {
        method: "POST",
        headers: { "Content-Type": "application/x-www-form-urlencoded" },
        body: new URLSearchParams({
          grant_type: "authorization_code",
          code: code,
          client_id: url.hostname,
          redirect_uri: `${url.origin}/callback`,
          code_verifier: codeVerifier,
        }),
      }
    );

    const tokenData = await tokenResponse.json();

    if (tokenData.access_token) {
      const response = new Response("", {
        status: 302,
        headers: {
          Location: "/?auth=success",
          "Set-Cookie": [
            `parallel_api_key=${tokenData.access_token}; Path=/; HttpOnly; Secure; SameSite=Lax; Max-Age=2592000`,
            "code_verifier=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
          ].join(", "),
        },
      });
      return response;
    } else {
      return new Response("Failed to exchange token", { status: 400 });
    }
  } catch (error) {
    return new Response("OAuth error", { status: 500 });
  }
}

async function handleResolutionSubmission(request: Request): Promise<Response> {
  try {
    const body = (await request.json()) as ResolutionRequest;
    const apiKey = getApiKey(request);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      });
    }

    // Create the task payload for person entity resolution
    const taskPayload = {
      task_spec: {
        output_schema: {
          type: "object",
          properties: {
            profiles: {
              type: "array",
              items: {
                type: "object",
                properties: {
                  platform_slug: {
                    type: "string",
                    description:
                      "Platform identifier (e.g., 'twitter', 'linkedin', 'github')",
                  },
                  profile_url: {
                    type: "string",
                    description: "Full URL to the profile",
                  },
                  is_self_proclaimed_from_input: {
                    type: "boolean",
                    description:
                      "Whether this profile was directly mentioned in the input",
                  },
                  is_self_referring: {
                    type: "boolean",
                    description:
                      "Whether this profile links back to other found profiles",
                  },
                  confidence: {
                    type: "number",
                    minimum: 0,
                    maximum: 1,
                    description: "Confidence score for this match (0-1)",
                  },
                  match_reasoning: {
                    type: "string",
                    description:
                      "Explanation of why this profile matches the input person",
                  },
                  profile_snippet: {
                    type: "string",
                    description:
                      "Brief excerpt or description from the profile",
                  },
                },
                required: [
                  "platform_slug",
                  "profile_url",
                  "is_self_proclaimed_from_input",
                  "is_self_referring",
                  "confidence",
                  "match_reasoning",
                  "profile_snippet",
                ],
              },
            },
          },
          required: ["profiles"],
        },
      },
      input: `You are a person entity resolution system. Given information about a person, find and return their digital profiles across various platforms.

Input: ${body.input}

Instructions:
1. Analyze the input for any directly mentioned social media handles, usernames, email addresses, names, or other identifying information
2. Search for and identify profiles across platforms like Twitter, LinkedIn, GitHub, Instagram, Facebook, TikTok, etc.
3. For each profile found, determine:
   - Whether it was directly mentioned in the input (is_self_proclaimed_from_input)
   - Whether the profile links to or references other profiles you found (is_self_referring)  
   - Your confidence level in the match (0.0 to 1.0)
   - Clear reasoning for why you believe this profile belongs to the same person
   - A brief snippet or description from the profile

4. Pay attention to cross-references between profiles to increase confidence
5. Return only profiles you have reasonable confidence belong to the same person
6. If no profiles can be found, return an empty profiles array

Be thorough but conservative - only return profiles you're reasonably confident about.`,
      processor: "core",
    };

    const response = await fetch("https://api.parallel.ai/v1/tasks/runs", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
      },
      body: JSON.stringify(taskPayload),
    });

    const result = await response.json();

    if (result.run_id) {
      return new Response(JSON.stringify({ trun_id: result.run_id }), {
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Failed to create resolution task" }),
        {
          status: 500,
          headers: {
            "Content-Type": "application/json",
            ...getCORSHeaders(),
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to submit resolution" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      }
    );
  }
}

async function handleResolutionResult(
  request: Request,
  trunId: string
): Promise<Response> {
  try {
    const apiKey = getApiKey(request);

    if (!apiKey) {
      return new Response(JSON.stringify({ error: "API key required" }), {
        status: 401,
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      });
    }

    const response = await fetch(
      `https://api.parallel.ai/v1/tasks/runs/${trunId}/result`,
      {
        headers: {
          "x-api-key": apiKey,
        },
      }
    );

    const result = await response.json();

    if (result.run && result.run.status === "completed" && result.output) {
      // Extract the profiles from the output content
      const profiles = result.output.content?.profiles || [];

      return new Response(JSON.stringify({ profiles }), {
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      });
    } else if (result.run) {
      // Task is still running or failed
      return new Response(JSON.stringify({ status: result.run.status }), {
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      });
    } else {
      return new Response(
        JSON.stringify({ error: "Task not found or failed" }),
        {
          status: 404,
          headers: {
            "Content-Type": "application/json",
            ...getCORSHeaders(),
          },
        }
      );
    }
  } catch (error) {
    return new Response(
      JSON.stringify({ error: "Failed to get resolution result" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...getCORSHeaders(),
        },
      }
    );
  }
}

async function handleLogout() {
  return new Response("", {
    status: 302,
    headers: {
      Location: "/",
      "Set-Cookie":
        "parallel_api_key=; Path=/; Expires=Thu, 01 Jan 1970 00:00:00 GMT",
    },
  });
}

function getApiKey(request: Request): string | null {
  // Try header first
  const headerKey = request.headers.get("x-api-key");
  if (headerKey) return headerKey;

  // Try cookie
  const cookies = parseCookies(request.headers.get("Cookie") || "");
  return cookies.parallel_api_key || null;
}

function parseCookies(cookieString: string): Record<string, string> {
  return cookieString.split(";").reduce((cookies, cookie) => {
    const [name, value] = cookie.trim().split("=");
    if (name && value) {
      cookies[name] = decodeURIComponent(value);
    }
    return cookies;
  }, {} as Record<string, string>);
}
