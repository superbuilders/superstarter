---
title: Domains Overview
product: vercel
url: /docs/domains
type: conceptual
prerequisites:
  []
related:
  - /docs/domains/add-a-domain
  - /docs/domains/working-with-dns
  - /docs/domains/working-with-nameservers
  - /docs/domains/working-with-ssl
  - /docs/domains/working-with-domains
summary: Learn the fundamentals of how domains, DNS, and nameservers work on Vercel.
---

# Domains Overview

A **domain** is a user-friendly way of referring to the address access a website on the internet. For example, the domain you're reading this on is `vercel.com`. Domains can be analogous to the address where your house is. When someone sends a letter to your house, they don't need to know exactly *where* it is, they just need the address and the relevant post office handles routing the letter.

The system that manages the details about where a site is located on the internet, is known as **DNS or the Domain Name System**. At its most basic, DNS maps human-readable domain names to computer-friendly IP addresses. When you request a site in your browser, the first step is converting the domain address to an IP address. That process is handled by DNS and called **DNS Resolution**. Understanding how DNS works is important to ensure that you are configuring your domain correctly.

*Diagram showing the a basic DNS query.*

1. You enter `vercel.com` in your browser. Your browser will first check its local DNS cache to see if it knows the IP address of `vercel.com`. If it does, it will request the site from that address.

2. Your browser initiates a DNS query through a server known as a **recursive resolver**, usually provided by your [ISP](# "ISP or Internet service provider") or a third-party. The recursive resolver acts as a middleman between the browser and DNS server and is used to increase the speed and efficiency of the resolution process. The resolver will check its cache first to see if it already has the IP address. If it doesn't, it'll request the IP address from a DNS server.

3. There is a network of DNS servers, in a hierarchy, located all around the world. The recursive resolver will query in the following pattern:
   - At the entrance to the network are 13 **root nameservers**. These are the servers that will be contacted first. The root server will look at the domain name, and based on the **TLD or top-level domain** (.com, .co.uk, etc.), will direct the resolver to the correct **TLD server**.
   - The TLD nameservers store information about domain names that belong to the same TLD. For example, when searching for `vercel.com`, once the recursive resolver receives a response from the root nameserver, it will query the `.com` TLD nameserver.
   - This TLD server will then respond resolver with details about the **authoritative nameserver** that has the IP address mapping for `vercel.com` stored in an A record. The authoritative nameserver returns this record to the recursive resolver, which will cache the result and return it to your browser.

4. Once your browser has the IP address, an HTTP request is made by the browser to the web server located at that IP address.

> **💡 Note:** This list is just a general overview and doesn't happen every time. Most of us
> tend to visit the same sites over and over. Therefore, the request will first
> check the cache from your browser and then from the recursive resolver,
> allowing for quicker load times. In addition, this example describes a basic
> unicast DNS network. In reality, when using Vercel, you're using anycast
> servers on the Vercel CDN.

This overview shows a point of view of a user visiting your site. Here's what this looks like from the developer's perspective.

When you've created a Project and deployed it on Vercel, your site lives on Vercel's web servers, which we know to be at the IP address `76.76.21.21`. However, your user's browser doesn't know that. For this reason, the browser will perform a DNS Lookup to retrieve the correct IP mapping to `yoursiteaddress.com` from a DNS server.

*Diagram showing the Vercel-hosted query.*

This is where, as a developer, you may have to configure the DNS settings to tell the authoritative server exactly where your site lives. Vercel [guides you through](/docs/domains/add-a-domain) exactly what information you need to set, within your Dashboard. There are a number of different settings that you should be aware of:

- **DNS records**: DNS records are an entry in a database that maps the domain with the IP address, which is then stored on the authoritative server. Some of the most common record types are: CNAME (Canonical name), A (Address), NS (nameserver), and MX (mail exchange). These are all described in more detail in [Working with DNS](/docs/domains/working-with-dns).
- **Nameserver**: Nameservers are an important part of the DNS. They refer to the *actual* server that maintains and manages the DNS records. There are three types of nameservers: root nameserver, TLD nameserver, and the authoritative server. You can learn more about using a nameserver with Vercel in [Working with nameservers](/docs/domains/working-with-nameservers).
- **SSL Certificates**: SSL Certificates are a way to show that there is a secure connection from your domain to your website. These are described in more detail in [Working with SSL certificates](/docs/domains/working-with-ssl).

## More resources

- [Working with domains](/docs/domains/working-with-domains)
- [Working with DNS](/docs/domains/working-with-dns)
- [Working with nameservers](/docs/domains/working-with-nameservers)
- [Working with SSL](/docs/domains/working-with-ssl)
- [Troubleshooting domains](/docs/domains/troubleshooting)


---

[View full sitemap](/docs/sitemap)
