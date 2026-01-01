# DayWise Booking - oEmbed Implementation Documentation

## Overview

DayWise Booking is an online appointment booking and scheduling platform. This document describes our oEmbed implementation for embedding booking pages into third-party platforms.

**Provider Name:** DayWise Booking
**Provider URL:** https://daywisebooking.com
**oEmbed API Endpoint:** https://api.daywisebooking.com/api/oembed

---

## Supported Content

### Booking Pages

Each business on DayWise has a unique booking page accessible at:

```
https://app.daywisebooking.com/{slug}
```

Where `{slug}` is the business's unique identifier (e.g., `john-doe-consulting`, `acme-salon`, etc.).

These booking pages allow clients to:
- Browse available services
- Select appointment times
- Fill out intake forms
- Complete bookings and payments

---

## oEmbed Discovery

### HTTP Link Headers (Recommended)

Our booking pages expose oEmbed endpoints via **HTTP Link headers**, allowing discovery without JavaScript execution.

**Example Request:**
```bash
curl -I "https://app.daywisebooking.com/demo-business"
```

**Response Headers:**
```http
HTTP/2 200
link: <https://api.daywisebooking.com/api/oembed?url=https%3A%2F%2Fapp.daywisebooking.com%2Fdemo-business&format=json>; rel="alternate"; type="application/json+oembed"
link: <https://api.daywisebooking.com/api/oembed?url=https%3A%2F%2Fapp.daywisebooking.com%2Fdemo-business&format=xml>; rel="alternate"; type="application/xml+oembed"
```

### HTML Link Tags (Alternative)

Booking pages also include oEmbed discovery links in the HTML `<head>`:

```html
<link rel="alternate" type="application/json+oembed"
      href="https://api.daywisebooking.com/api/oembed?url=https%3A%2F%2Fapp.daywisebooking.com%2Fdemo-business&format=json" />

<link rel="alternate" type="application/xml+oembed"
      href="https://api.daywisebooking.com/api/oembed?url=https%3A%2F%2Fapp.daywisebooking.com%2Fdemo-business&format=xml" />
```

---

## oEmbed API Endpoint

### Endpoint

```
GET https://api.daywisebooking.com/api/oembed
```

### Parameters

| Parameter   | Required | Type    | Description                                          |
|-------------|----------|---------|------------------------------------------------------|
| `url`       | Yes      | String  | The URL of the booking page to embed                |
| `format`    | No       | String  | Response format: `json` (default) or `xml`          |
| `maxwidth`  | No       | Integer | Maximum width of the embed (default: 800)           |
| `maxheight` | No       | Integer | Maximum height of the embed (default: 1200)         |

### Example Requests

**JSON Format:**
```bash
curl "https://api.daywisebooking.com/api/oembed?url=https://app.daywisebooking.com/demo-business&format=json"
```

**XML Format:**
```bash
curl "https://api.daywisebooking.com/api/oembed?url=https://app.daywisebooking.com/demo-business&format=xml"
```

**With Custom Dimensions:**
```bash
curl "https://api.daywisebooking.com/api/oembed?url=https://app.daywisebooking.com/demo-business&maxwidth=600&maxheight=900"
```

---

## Response Format

### JSON Response

```json
{
  "version": "1.0",
  "type": "rich",
  "provider_name": "DayWise Booking",
  "provider_url": "https://daywisebooking.com",
  "title": "Demo Business - Book an Appointment",
  "author_name": "Demo Business",
  "author_url": "https://app.daywisebooking.com/demo-business",
  "html": "<iframe src=\"https://app.daywisebooking.com/demo-business\" width=\"800\" height=\"1200\" frameborder=\"0\" scrolling=\"yes\" allowfullscreen allowtransparency=\"true\" style=\"border: none; border-radius: 4px; background: transparent;\"></iframe>",
  "width": 800,
  "height": 1200,
  "thumbnail_url": "https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com/logos/demo-business-logo.png",
  "thumbnail_width": 400,
  "thumbnail_height": 300
}
```

### XML Response

```xml
<?xml version="1.0" encoding="utf-8"?>
<oembed>
  <version>1.0</version>
  <type>rich</type>
  <provider_name>DayWise Booking</provider_name>
  <provider_url>https://daywisebooking.com</provider_url>
  <title>Demo Business - Book an Appointment</title>
  <author_name>Demo Business</author_name>
  <author_url>https://app.daywisebooking.com/demo-business</author_url>
  <html>&lt;iframe src="https://app.daywisebooking.com/demo-business" width="800" height="1200" frameborder="0" scrolling="yes" allowfullscreen allowtransparency="true" style="border: none; border-radius: 4px; background: transparent;"&gt;&lt;/iframe&gt;</html>
  <width>800</width>
  <height>1200</height>
  <thumbnail_url>https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com/logos/demo-business-logo.png</thumbnail_url>
  <thumbnail_width>400</thumbnail_width>
  <thumbnail_height>300</thumbnail_height>
</oembed>
```

### Response Fields

| Field              | Type    | Description                                          |
|--------------------|---------|------------------------------------------------------|
| `version`          | String  | oEmbed version (always "1.0")                       |
| `type`             | String  | Content type (always "rich" for interactive embeds) |
| `provider_name`    | String  | "DayWise Booking"                                   |
| `provider_url`     | String  | https://daywisebooking.com                          |
| `title`            | String  | Business name + "Book an Appointment"               |
| `author_name`      | String  | Business name                                        |
| `author_url`       | String  | Full URL to the booking page                        |
| `html`             | String  | Embed HTML (iframe code)                            |
| `width`            | Integer | Recommended embed width in pixels                   |
| `height`           | Integer | Recommended embed height in pixels                  |
| `thumbnail_url`    | String  | URL to business logo/thumbnail image                |
| `thumbnail_width`  | Integer | Thumbnail width (400px)                             |
| `thumbnail_height` | Integer | Thumbnail height (300px)                            |

---

## Error Responses

### Invalid URL (400 Bad Request)

```json
{
  "error": "url parameter is required"
}
```

### Invalid Booking Page URL (400 Bad Request)

```json
{
  "error": "Invalid booking page URL"
}
```

### Booking Page Not Found (404 Not Found)

```json
{
  "error": "Booking page not found"
}
```

### Server Error (500 Internal Server Error)

```json
{
  "error": "Failed to generate oEmbed response"
}
```

---

## Embedding Instructions

### Using the iframe Directly

The simplest way to embed a DayWise booking page is to use the iframe HTML provided in the `html` field:

```html
<iframe
  src="https://app.daywisebooking.com/demo-business"
  width="800"
  height="1200"
  frameborder="0"
  scrolling="yes"
  allowfullscreen
  allowtransparency="true"
  style="border: none; border-radius: 4px; background: transparent;">
</iframe>
```

### Responsive Embedding

For responsive layouts, use a container with aspect ratio:

```html
<div style="position: relative; padding-bottom: 150%; height: 0; overflow: hidden;">
  <iframe
    src="https://app.daywisebooking.com/demo-business"
    style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; border: none;"
    allowfullscreen
    allowtransparency="true">
  </iframe>
</div>
```

### Canva Website Integration

DayWise booking pages work seamlessly with Canva Websites when embedded using the Canva embed element:

```javascript
await addElementAtPoint({
  type: 'embed',
  url: 'https://app.daywisebooking.com/demo-business',
  top: 100,
  left: 100,
  width: 800,
  height: 1200,
});
```

---

## Technical Implementation Details

### Cross-Domain Compatibility

Our booking pages are designed to work in cross-domain iframe contexts:

- **No sessionStorage dependency**: Payment flows use URL parameters instead of sessionStorage for cross-domain compatibility
- **Iframe detection**: Scroll locking is disabled when embedded to prevent conflicts with parent page scrolling
- **CORS enabled**: oEmbed API endpoint includes proper CORS headers for universal access

### Security & Privacy

- **CSP Configuration**: Content Security Policy allows embedding from Canva and other platforms
- **HTTPS Only**: All URLs use HTTPS for secure communication
- **Payment Security**: Stripe integration for secure payment processing
- **Data Privacy**: Compliant with data protection regulations

### Performance

- **Edge Middleware**: HTTP Link headers are added via Vercel Edge Middleware for minimal latency
- **Caching**: oEmbed responses are cached for 5 minutes (`Cache-Control: public, max-age=300`)
- **Optimized Assets**: Images and static assets served via CDN

---

## Open Graph & Social Media

In addition to oEmbed, our booking pages include Open Graph meta tags for rich social media previews:

```html
<meta property="og:type" content="website" />
<meta property="og:url" content="https://app.daywisebooking.com/demo-business" />
<meta property="og:title" content="Demo Business - Book an Appointment" />
<meta property="og:description" content="Schedule your appointment with us" />
<meta property="og:site_name" content="DayWise Booking" />
<meta property="og:image" content="https://daywisebookingsspace.tor1.cdn.digitaloceanspaces.com/logos/demo-business-logo.png" />
<meta property="og:image:width" content="400" />
<meta property="og:image:height" content="300" />
```

---

## Testing & Validation

### Test URLs

Here are some example booking pages for testing:

- Production example: `https://app.daywisebooking.com/demo-business`
- Test discovery: `curl -I https://app.daywisebooking.com/demo-business`
- Test oEmbed: `curl "https://api.daywisebooking.com/api/oembed?url=https://app.daywisebooking.com/demo-business&format=json"`

### Validation Checklist

- ✅ HTTP Link headers present on booking pages
- ✅ oEmbed endpoint returns valid JSON/XML
- ✅ Iframe HTML is properly escaped
- ✅ CORS headers allow cross-origin access
- ✅ Error responses follow oEmbed spec
- ✅ Works without JavaScript execution (for crawlers)
- ✅ Embedded pages are fully functional (not just previews)

---

## Browser & Platform Compatibility

### Supported Platforms

- Canva Websites
- WordPress (oEmbed auto-embed)
- Medium (URL paste)
- Notion (Embed block)
- Ghost (Bookmark/Embed card)
- Any platform supporting oEmbed or iframe embeds

### Browser Support

- Chrome 90+
- Firefox 88+
- Safari 14+
- Edge 90+
- Mobile browsers (iOS Safari, Chrome Mobile)

---

## Support & Contact

For technical questions or integration support:

- **Website**: https://daywisebooking.com
- **API Documentation**: This document
- **Support Email**: support@daywisebooking.com (if available)

---

## Changelog

### Version 1.0 (Current)

- Initial oEmbed implementation
- HTTP Link header discovery support
- JSON and XML format support
- Cross-domain iframe compatibility
- Canva Website integration
- Stripe payment support in embedded context

---

## Appendix: Example Integration

### Complete Integration Example

Here's a complete example of how a platform can integrate DayWise booking pages:

```javascript
// 1. Discover oEmbed endpoint
const bookingUrl = 'https://app.daywisebooking.com/demo-business';

// 2. Fetch oEmbed data
const oembedUrl = `https://api.daywisebooking.com/api/oembed?url=${encodeURIComponent(bookingUrl)}&format=json`;
const response = await fetch(oembedUrl);
const oembedData = await response.json();

// 3. Render embed
const embedContainer = document.getElementById('embed-container');
embedContainer.innerHTML = oembedData.html;

// 4. (Optional) Add custom styling
const iframe = embedContainer.querySelector('iframe');
iframe.style.border = '1px solid #e0e0e0';
iframe.style.borderRadius = '8px';
iframe.style.boxShadow = '0 2px 8px rgba(0,0,0,0.1)';
```

### WordPress Auto-Embed

WordPress will automatically convert DayWise booking URLs into embeds:

```
Simply paste the URL on its own line:

https://app.daywisebooking.com/demo-business

WordPress will automatically fetch the oEmbed data and render the embed.
```

---

## Compliance & Standards

This implementation follows:

- **oEmbed 1.0 Specification**: https://oembed.com/
- **HTTP Link Header (RFC 5988)**: For oEmbed discovery
- **Open Graph Protocol**: For social media previews
- **W3C HTML5 Standards**: For iframe embedding
- **WCAG 2.1 Accessibility Guidelines**: For embedded content

---

*Last Updated: January 2026*
*oEmbed Specification Version: 1.0*
*DayWise Booking Platform Version: Production*
