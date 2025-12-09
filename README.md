# Person Entity Resolution API

> Find the complete digital footprint of any person across the web

## Why Entity Resolution Matters for B2B

In B2B, understanding _who_ you're dealing with is everything. But people fragment their online presence across dozens of platforms—LinkedIn for professional networking, GitHub for code, Twitter for thought leadership, personal blogs for long-form content. **Traditional search falls short because it can't reliably connect these scattered identities.**

This API solves that problem with AI-powered entity resolution that finds and verifies all social media profiles belonging to a single person.

## The Business Value

### 🎯 Sales & Revenue

- **Deeper prospect intelligence**: Move beyond LinkedIn. Find prospects' GitHub repos, technical blogs, conference talks, and social presence to craft personalized outreach that actually resonates.
- **Better qualification**: A CTO who's active on GitHub and speaks at conferences is a very different buyer than one who isn't. Surface the signals that matter.
- **Warmer introductions**: Find mutual connections across any platform, not just LinkedIn.

### 👥 Recruiting & Talent

- **Complete candidate profiles**: Evaluate technical skills through GitHub, communication style through Twitter, thought leadership through blogs—all from a single search.
- **Passive candidate sourcing**: Find engineers who don't have their LinkedIn updated but are active on GitHub, Stack Overflow, or technical communities.
- **Cultural fit assessment**: Get a fuller picture of how candidates present themselves across different contexts.

### 🔍 Customer Success & Account Management

- **Relationship intelligence**: Know which customers are vocal advocates on social media, who's at risk based on sentiment shifts, and which champions you should be engaging.
- **Multi-channel engagement**: Meet your champions where they are—whether that's LinkedIn, Twitter, or industry forums.
- **Expansion signals**: Spot when decision-makers move to new companies or change roles.

### 🏢 Competitive Intelligence

- **Track key hires**: See when competitors hire senior talent and what their digital footprint reveals about the company's direction.
- **Product insights**: Engineers often discuss their work on social platforms before official announcements.
- **Market positioning**: Understand how competitor teams present themselves and what they emphasize.

### 🛡️ Risk & Compliance

- **Due diligence**: Comprehensive background checks that don't miss profiles on emerging platforms.
- **Ongoing monitoring**: Continuous assessment of key personnel across all their digital presences.
- **Fraud prevention**: Verify identities by correlating self-claimed profiles across platforms.

### 📊 Data Quality

- **CRM deduplication**: Merge duplicate records by definitively linking email addresses, names, and social profiles to single entities.
- **Enrichment at scale**: Turn sparse contact data into rich, multi-platform profiles.
- **Attribution accuracy**: Know which profiles in your database are actually the same person.

## How It Works

The API uses advanced AI to:

1. **Analyze** your input (name, email, username, or any profile URL)
2. **Search** across major platforms (Twitter, LinkedIn, GitHub, Instagram, Facebook, TikTok, and more)
3. **Verify** matches through cross-referencing and confidence scoring
4. **Return** structured profile data with reasoning and verification flags

### Key Features

- **Self-proclaimed tracking**: Know which profiles link to each other (high confidence)
- **Self-referring verification**: Identify bidirectional references between profiles
- **Match reasoning**: Understand _why_ the AI believes profiles belong together
- **Conservative matching**: Only returns profiles with high confidence—no false positives

## Quick Start

```ts
// Submit a resolution request
const response = await fetch("https://your-api.com/resolve", {
  method: "POST",
  headers: {
    "Content-Type": "application/json",
    "x-api-key": "your-api-key",
  },
  body: JSON.stringify({
    input: "john.doe@techcorp.com or @johndoe on Twitter",
  }),
});

const { trun_id } = await response.json();

// Poll for results
const result = await fetch(`https://your-api.com/resolve/${trun_id}`, {
  headers: { "x-api-key": "your-api-key" },
});

const { profiles } = await result.json();
```

## Response Format

```json
{
  "profiles": [
    {
      "platform_slug": "twitter",
      "profile_url": "https://twitter.com/johndoe",
      "is_self_proclaimed": true,
      "is_self_referring": true,
      "match_reasoning": "Profile bio links to LinkedIn and GitHub profiles found in search",
      "profile_snippet": "CTO @TechCorp | Building AI infrastructure | Thoughts on ML systems"
    }
  ]
}
```

## Use Cases We've Seen

- Sales teams enriching their CRM with 10x more context per lead
- Recruiting firms cutting candidate research time from 30 minutes to 30 seconds
- Customer success teams identifying at-risk customers through social sentiment
- Investment firms doing due diligence on startup founders
- Marketing teams finding the real influencers in their industry

This demo showcases how we can use Parallel's Task API to resolve a person with all their social media profiles in a reliable way.

To build this, the [Parallel OAuth Provider](https://docs.parallel.ai/integrations/oauth-provider) as well as the [Parallel Task API](https://docs.parallel.ai/task-api/guides/choose-a-processor) were used.

- Sales and prospecting intelligence
- Talent acquisition and recruiting
