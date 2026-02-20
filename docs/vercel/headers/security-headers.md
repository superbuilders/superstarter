---
title: Content Security Policy
product: vercel
url: /docs/headers/security-headers
type: conceptual
prerequisites:
  - /docs/headers
related:
  []
summary: Learn how the Content Security Policy (CSP) offers defense against web vulnerabilities, its key features, and best practices.
---

# Content Security Policy

Content Security Policy is a browser feature designed to prevent cross-site scripting (XSS) and related code-injection attacks. CSP provides developers with the ability to define an allowlist of sources of trusted content, effectively restricting the browser from loading any resources from non-allowlisted sources.

When a browser receives the `Content-Security-Policy` HTTP header from a web server it adheres to the defined policy, blocking or allowing content loads based on the provided rules.

[XSS](/kb/guide/understanding-xss-attacks) remains one of the most prevalent web application vulnerabilities. In an XSS attack, malicious scripts are injected into websites, which run on the end user's browser, potentially leading to stolen data, session hijacking, and other malicious actions.

CSP can reduce the likelihood of XSS by:

- **Allowlisting content sources** – CSP works by specifying which sources of content are legitimate for a web application. You can define a list of valid sources for scripts, images, stylesheets, and other web resources. Any content not loaded from these approved sources will be blocked. Thus, if an attacker tries to inject a script from an unauthorized source, CSP will prevent it from loading and executing.
- **Inline script blocking** – A common vector for XSS is through inline scripts, which are scripts written directly within the HTML content. CSP can be configured to block all inline scripts, rendering script tags injected by attackers (like `<script>alert('XSS Attack!')</script>`) ineffective.
- **Disallowing `eval()`** – The `eval()` function in JavaScript can be misused to execute arbitrary code, which can be a potential XSS vector. CSP can be set up to disallow the use of `eval()` and its related functions.
- **Nonce and hashes** – If there's a need to allow certain inline scripts (while still blocking others), CSP supports a nonce (number used once) that can be added to a script tag. Only scripts with the correct nonce value will be executed. Similarly, CSP can use hashes to allow the execution of specific inline scripts by matching their hash value.
- **Reporting violations** – CSP can be set in `report-only` mode where policy violations don't result in content being blocked but instead send a report to a specified URI. This helps website administrators detect and respond to potential XSS attempts, allowing them to patch vulnerabilities and refine their CSP rules.
- **Plugin restrictions** – Some XSS attacks might exploit browser plugins. With CSP, you can limit the types of plugins that can be invoked, further reducing potential attack vectors.

While input sanitization and secure coding practices are essential, **CSP acts as a second line of defense**, reducing the risk of [XSS exploits](/kb/guide/understanding-xss-attacks).

Beyond XSS, CSP can prevent the unauthorized loading of content, protecting users from other threats like clickjacking and data injection.

## Content Security Policy headers

```bash
Content-Security-Policy: default-src 'self'; script-src 'self' cdn.example.com; img-src 'self' img.example.com; style-src 'self';
```

This policy permits:

- All content to be loaded only from the site's own origin.
- Scripts to be loaded from the site's own origin and cdn.example.com.
- Images from the site's own origin and img.example.com
- Styles only from the site's origin.

## Best Practices

- Before enforcing a CSP, start with the `Content-Security-Policy-Report-Only` header. You can do this to keep an eye on possible violations without actually blocking any content. Change to enforcing mode once you know your policy won't break any features.
- Avoid using `unsafe-inline` and `unsafe-eval` . The use of `eval()` and inline scripts/styles can pose security risks. Avoid enabling these unless absolutely necessary as a best practice. Use nonces or hashes to allowlist particular scripts or styles if you need to allow inline scripts or styles.
- Use nonces for inline scripts and styles. To allow that particular inline content, a nonce (number used once) can be added to a script or style tag, the CSP header, or both. This ensures that only the inline scripts and styles you have explicitly permitted will be used.
- Be as detailed as you can, and avoid using too general sources like `.` . List the specific subdomains you want to allow rather than allowing all subdomains (`.domain.com`).
- Keep directives updated. As your project evolves, the sources from which you load content might change. Ensure you update your CSP directives accordingly.

Keep in mind that while CSP is a robust security measure, it's part of a multi-layered security strategy. Input validation, output encoding, and other security practices remain crucial.

Additionally, while CSP is supported by modern browsers, nuances exist in their implementations. Ensure you **test your policy across diverse browsers**, accounting for variations and ensuring the same security postures.


---

[View full sitemap](/docs/sitemap)
