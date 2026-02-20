---
title: Firewall concepts
product: vercel
url: /docs/vercel-firewall/firewall-concepts
type: conceptual
prerequisites:
  - /docs/vercel-firewall
related:
  - /docs/security/deployment-protection
  - /docs/security/vercel-waf
  - /docs/security/vercel-waf/custom-rules
  - /docs/vercel-firewall
  - /docs/manage-cdn-usage
summary: Understand the fundamentals behind the Vercel Firewall.
---

# Firewall concepts

## How Vercel secures requests

To safeguard your application against malicious activity, Vercel's platform-wide firewall is the first line of defense, inspecting requests as they arrive at Vercel's CDN. Once a request passes this layer, [deployment protection](/docs/security/deployment-protection) checks whether it can continue based on access rules set at the level of your project.

If allowed to go through, the request is subject to the rules that you configured with the [Web Application Firewall (WAF)](/docs/security/vercel-waf) at the level of your project. If the request is not blocked by the WAF rules, your deployment can process and serve it.

If you [enabled a persistent action](/docs/security/vercel-waf/custom-rules#persistent-actions) for a WAF rule and it blocks the request, the source IP address is stored in the platform firewall so that future requests from this source continue to be blocked for the specified time period. These future blocks happen at the level of the platform-wide firewall.

![Image](`/docs-assets/static/docs/security/vercel-firewall-protection-concept-light.png`)

## Firewall actions

The Vercel Firewall allows several possible actions to be taken when traffic matches a rule. These actions, that can be taken by custom rules or system DDoS mitigations, apply when detecting malicious traffic. You can view the actions and their results in the [Firewall and Monitoring](/docs/vercel-firewall#observability) tabs.

### Log

The log action allows you to monitor and record specific traffic patterns without affecting the request. When a request matches a rule with the log action:

- The request is allowed to proceed normally.
- Details about the request are logged and displayed in the Firewall and Monitoring tabs, and sent to log drains for analysis.
- There is no impact on the visitor's experience.

This is useful for monitoring suspicious patterns or gathering data about specific types of traffic before implementing stricter actions.

### Deny

The deny action blocks requests immediately when they match a rule. When a request is denied:

- A `403 Forbidden` response is returned.
- The request does not reach your application.
- Usage is incurred only for the edge request and ingress [Fast Data Transfer](/docs/manage-cdn-usage#fast-data-transfer) which are required to process the custom rule.

This is the most restrictive action and you should use it for known malicious traffic patterns or IP addresses.

### Challenge

A security challenge verifies that incoming traffic originates from a real web browser with JavaScript capabilities. Only human visitors using a web browser can pass the challenge and access protected resources, while non-browser clients (bots, scripts, etc.) cannot.

Use the challenge action when you want to block automated traffic while allowing legitimate users to access your content. It offers a middle ground between the log and deny actions, protecting against bots while maintaining accessibility for real visitors through a simple one-time verification.

When the challenge action is applied:

- ### Initial challenge
  During this process, visitors see a **Vercel Security Checkpoint** screen:

  ![Image](https://vercel.com/docs-assets/static/docs/security/challenge-light.png)
  - The browser must execute JavaScript code to prove it's a real browser.
  - The code computes and submits a challenge solution.
  - The system validates browser characteristics to prevent automated tools from passing.
  - If the challenge succeeds, the [WAF](/docs/vercel-firewall/vercel-waf) validates the request as a legitimate browser client and continues processing the request, which includes evaluating any additional WAF rules.
  - If the challenge fails, the request is blocked before reaching your application.
  The checkpoint page localizes to a language based on the visitor's browser settings and respects their preferred color scheme, ensuring a seamless experience for legitimate users.

- ### Challenge session
  - Upon successful verification, a challenge session is created in the browser.
  - Sessions are valid for 1 hour.
  - All subsequent requests within the session are allowed.
  - Challenge sessions are tied to the browser that completed the challenge, ensuring secure session management.
  - After session expiration, the client must re-solve the challenge.

#### Challenge subrequests and APIs

If your application makes additional requests (e.g., API calls) during a valid session, they automatically succeed. This is particularly useful for server-side rendered applications where the server makes additional requests to APIs in the same application.

#### Challenge limitations

- API routes that are protected by a challenge rule can only be accessed within a valid challenge session.
- Direct API calls (e.g., from scripts, cURL, or Postman) will fail if they require challenge validation.
- Direct API calls from outside a valid challenge session will not succeed.
- If a user hasn't completed a challenge session through your website first, they cannot access challenged API routes.
- Automated tools and scripts cannot establish challenge sessions. For legitimate automation needs, use [Bypass](#bypass) to allow specific trusted sources.

### Bypass

The bypass action allows specific traffic to skip any subsequent firewall rules. When a request matches a bypass rule:

- For custom rule bypasses, the request is allowed through any custom or managed rules.
- For system bypasses, the request is allowed through any system-level mitigations.
- The request proceeds directly to your application.

This is useful for trusted traffic sources, internal tools, or critical services that should never be blocked.

## Understanding DDoS

A Denial of Service (DoS) attack happens when one device attempts to exhaust the resources of a system using methods such as sending a large amount of data to a server or network. These attacks can often be mitigated by finding and closing off the connection to the source of the attack.

A Distributed Denial of Service (DDoS) attack happens when multiple connected devices are used to simultaneously overwhelm a site with targeted, illegitimate traffic. The goal of DoS and DDoS attacks is to disrupt access to the servers hosting the site.

In addition to built-in systems like [rate limits](/docs/limits#rate-limits), you can protect yourself against such attacks with [WAF custom rules](/docs/vercel-firewall/vercel-waf/custom-rules), [WAF Rate Limiting](/docs/vercel-firewall/vercel-waf/rate-limiting) and securing your backend with [Secure Compute](/docs/secure-compute) and [OIDC](/docs/oidc).

### Open System Interconnection (OSI) model

The OSI model is a concept that outlines the different communication steps of a networking system. Different attack types can target different layers of the [OSI model](https://en.wikipedia.org/wiki/OSI_model).

DDoS attacks target either the [network](#layer-3-ddos) (layer 3), the [transport](#layer-4-ddos) (layer 4) or the [application](#layer-7-ddos) (layer 7) layer of the OSI model. Vercel mitigates against these attacks, and protects the entire platform and all customers from attacks that would otherwise affect reliability.

### Layer 3 DDoS

The goal of a layer 3 (L3) DDoS attack is to slow down and ultimately crash applications, servers, and entire networks. These attacks are often used to target specific IP addresses, but can also target entire networks.

### Layer 4 DDoS

The goal of a layer 4 (L4) DDoS attack is to crash and slow down applications. They target the 3-way-handshake used to establish a reliable connection between TCP connections. This is often called a SYN flood. Layer 4 DDoS attacks are used to target specific ports, but can also target entire protocols.

### Layer 7 DDoS

The goal of a Layer 7 (L7) DDoS attack is to crash and slow down software at the application layer by targeting protocols such as HTTP, which is often done with GET and POST requests. They are often silent and look to leverage vulnerabilities by sending many innocuous requests to a single page. Vercel provides sophisticated proprietary L7 mitigation and is constantly tuning and adjusting attack detection techniques.

## JA3 and JA4 TLS fingerprints

Vercel Firewall leverages [JA3](#ja3) and [JA4](#ja4) TLS fingerprints to identify and restrict malicious traffic. TLS fingerprints allow the unique identification of user sessions inspecting details in the Transport Layer Security (TLS) protocol initiation process.

> **🔒 Permissions Required**: TLS Fingerprints

### TLS fingerprinting

TLS fingerprinting is a process used to identify and categorize encrypted network traffic.

It creates a unique identifier from the details of a [TLS client hello packet](https://serializethoughts.com/2014/07/27/dissecting-tls-client-hello-message), such as the version of TLS, supported cipher suites, and included extensions.

- TLS fingerprints allow the unique identification of user sessions
- JA3 and JA4 transform the TLS handshake details into a hash
- The hash is used as a fingerprint to monitor and restrict access
- The hash can then be read from your Functions through the request headers

### Why track TLS fingerprints?

Controlling access by TLS fingerprint allows us to mitigate malicious actors that use sophisticated methods of attack.
For example, a DDoS attack that is spread across multiple user agents, IPs, or geographic locations might share the same TLS fingerprint.
With fingerprinting, the Vercel Firewall can block all of the traffic that matches that TLS fingerprint.

#### JA4

JA4 is part of the [JA4+ suite](https://github.com/FoxIO-LLC/ja4?tab=readme-ov-file#ja4-details). It offers a more granular and flexible approach to network fingerprinting, helping to mitigate malicious traffic and prevent bot traffic.

With JA4, it's possible to identify, track, and categorize server-side encrypted network traffic. This is crucial in detecting and mitigating potential security threats, as it provides a more comprehensive view of the network traffic when used in conjunction with other fields.

#### JA3

JA3 is a tool that uses TLS fingerprinting to track and identify potential security threats. It specifically focuses on the details of the TLS client hello packet, generating a unique hash from it. This [client hello packet](https://serializethoughts.com/2014/07/27/dissecting-tls-client-hello-message) contains specific information such as the TLS version, supported cipher suites, and any extensions used.

#### Monitor JA4 signatures

In the **Allowed Requests** view of the [Vercel WAF monitoring page](/docs/security/vercel-waf#traffic-monitoring), you can group the web traffic by **JA4 Digest** to review the fingerprints of the live traffic or the past 24 hours.

### Request headers

The following headers are sent to each deployment and can be used to process the [request](https://developer.mozilla.org/en-US/docs/Web/API/Request) before sending back a response. These headers can be read from the [Request](https://nodejs.org/api/http.html#http_message_headers) object in your [Function](/docs/functions/functions-api-reference#function-signature).

#### `x-vercel-ja4-digest` (preferred)

Unique client fingerprint hash generated by the JA4 algorithm. JA4 is preferred as it offers a more granular and flexible approach to network fingerprinting, which helps with mitigating malicious traffic.

#### `x-vercel-ja3-digest`

Unique client fingerprint hash generated by the JA3 algorithm.


---

[View full sitemap](/docs/sitemap)
