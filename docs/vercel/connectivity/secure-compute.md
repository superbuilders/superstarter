---
title: Secure Compute
product: vercel
url: /docs/connectivity/secure-compute
type: reference
prerequisites:
  - /docs/connectivity
related:
  - /docs/functions
  - /docs/projects
  - /docs/connectivity/static-ips
  - /docs/builds
  - /docs/functions/configuring-functions/region
summary: Secure Compute provides dedicated private networks with VPC peering for Enterprise teams.
---

# Secure Compute

> **🔒 Permissions Required**: Secure Compute

Secure Compute creates private connections between your [Vercel Functions](/docs/functions) and your backend infrastructure like databases, APIs, or any private services you're running.

By default, Vercel deployments can come from [any IP address](/kb/guide/how-to-allowlist-deployment-ip-address). Secure Compute gives you dedicated static IPs, so you can tighten your backend's access controls to only allow traffic from your specific Vercel infrastructure.

When you enable Secure Compute on your [project](/docs/projects), your deployments and build container get their own [dedicated network with static IP addresses](#secure-compute-networks-and-dedicated-ip-addresses) in a [region you choose](#specific-region). Your traffic stays completely separate from other customers.

You can provision and manage your own Secure Compute networks directly from the Vercel dashboard. Create networks for different teams, projects, or environments, all through self-service.

> **💡 Note:** If you only need static IP addresses for IP allowlisting, without features like dedicated infrastructure, VPC peering, or complete network isolation, consider [Static IPs](/docs/connectivity/static-ips).

## How Secure Compute works

Here's what you get with Secure Compute:

- Your own dedicated private network inside a VPC
- Static IPs that won't change, plus a NAT Gateway
- Complete isolation — only your specified resources can reach your Vercel Functions

## Enabling Secure Compute

You can create Secure Compute networks directly from the Vercel dashboard:

1. Navigate to your team's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fconnectivity\&title=Connectivity).
2. Click **Create Network** to start the setup process.
3. Select your desired **Region**: choose the region closest to your backend infrastructure for best performance.
4. Optionally expand **Advanced options** to configure:
   - **CIDR Address Block**: Specify a custom private IPv4 address range.
   - **Availability Zones**: Select specific AWS Availability Zones within your chosen region.
5. Click **Next** to review your settings.
6. Click **Create Network** to provision your network.

Once created, your network includes:

- A pair of dedicated IP addresses
- AWS account ID
- AWS region based on your selection
- AWS VPC ID
- CIDR block based on your selection

![Image](https://vercel.com/front/docs/secure-compute/private-network-light.png)

When you enable Secure Compute on a project, Vercel attaches your project's [build container](/docs/builds) and subsequent deployment inside a Secure Compute network with a specific IP address pair ([dedicated IP](#secure-compute-networks-and-dedicated-ip-addresses)). You can choose to [exclude the build container](#managing-the-build-container) from the private network.

## Secure Compute networks and dedicated IP addresses

Each private network has its own dedicated IP pair and is isolated from others, ensuring no sharing across teams. You can assign multiple projects to a Secure Compute network, but each project belongs to only one active and one passive network.

You can create multiple Secure Compute networks for your team directly from the dashboard. For example, separate networks for different projects, environments, or teams. Navigate to your team's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fconnectivity\&title=Connectivity) and click **Create Network** to add additional networks.

Once your IP pair is ready, add it to your backend's access control list. You'll still need to use a username/password or authentication key on top of the IP filtering — the IPs alone aren't enough.

## Specific region

When you create a Secure Compute network, you select the [Vercel Function region](/docs/functions/configuring-functions/region) where it will be provisioned. For the best performance, pick the same [region](/docs/functions/configuring-functions/region) where your backend runs.

Vercel applies Secure Compute to [Vercel Functions](/docs/functions) using the following runtimes:

- [Node.js](/docs/functions/runtimes/node-js)
- [Ruby](/docs/functions/runtimes/ruby)
-
- [Python](/docs/functions/runtimes/python)

The [Edge Runtime](/docs/functions/runtimes/edge) **is not supported** meaning features like [Routing Middleware](/docs/routing-middleware) and Vercel Functions using the [`edge` runtime](/docs/functions/runtimes/edge) will **not** use the provided dedicated IP addresses.

### Region failover

Secure Compute supports automatic region failover using the active and passive network concept. Each project environment can have:

- **Active Network**: The primary Secure Compute network where your functions run
- **Passive Network**: A secondary network in a different region for automatic failover

To set up region failover:

1. **Create networks in different regions**: Navigate to your team's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fconnectivity\&title=Connectivity) and click **Create Network** to create Secure Compute networks in your primary and failover regions.
2. **Connect project environments**: In your project's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fconnectivity\&title=Connectivity), configure each environment (Production, Preview, etc.) with an **Active Network** (primary) and an optional **Passive Network** (failover).
3. **Automatic failover**: When enabled, Vercel automatically switches to the passive network if the primary region becomes unavailable, ensuring your Vercel Functions continue to operate.

## Add a project to your Secure Compute network

To add a project to your Secure Compute network:

1. Navigate to your project's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fsettings%2Fconnectivity\&title=Connectivity).
2. For every environment you want to connect to Secure Compute:
   - Select an **Active Network**.
   - Optionally select a **Passive Network** to enable passive failover.
   - Optionally enable **Builds** to include the project's build container in the network.
3. Click **Save** to persist your changes.

![Image](https://vercel.com/front/docs/secure-compute/secure-compute-connect-envs-light.png)

To change multiple environments at once:

1. Select the environments using checkboxes or use the checkbox in the table header to select all environments.
2. Click **Edit Selected**.
3. In bulk edit modal:
   - Select an **Active Network**.
   - Optionally select a **Passive Network** to enable passive failover.
   - Optionally check **Include Builds** to include the project's build container in the network.
   - Click **Apply** to modify the selected environments.
4. Click **Save** to persist your changes.

![Image](https://vercel.com/front/docs/secure-compute/secure-compute-connect-envs-bulk-light.png)

### Managing the build container

When you add a project to a Secure Compute network, you can choose to include the project's build container in the network. This is useful if your application calls your data sources at build time.

You can opt the [build container](/docs/builds) out of using the dedicated IP addresses. This is useful if your application **only** calls your data sources at run time and **not** at build time.

By opting out of including the build container, you will not incur the 5s delay when provisioning a secure build container.

To manage the build container during the [project connection](#add-a-project-to-your-secure-compute-network) process select **Include Builds**.

To manage the build container *after* the project is connected to the Secure Compute network:

1. Navigate to your team's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fconnectivity\&title=Connectivity).
2. Select a private network from the list.
3. Select the **Projects** tab.
4. Click the  icon to the right of your connected project and click **Edit**.
5. Check/uncheck **Include Builds** to include/exclude the project's build container in the network.
6. Click **Save**.

![Image](https://vercel.com/front/docs/secure-compute/manage-build-container-light.png)

## Multiple Secure Compute networks

You can use one network with multiple projects in the same team. In this case, the same IP pair is shared across multiple projects.

If you require additional security or have a large team, you can have one network for each project so that each project will have its own dedicated IP pair.

Connecting a project to multiple networks across different regions is currently not supported. Each project environment can only be linked to a single active network within a single region. A passive network in a different region may only be used for failover.

## VPC peering

Virtual private cloud (VPC) peering is a method of connecting two VPCs in the same or different region. When you use Secure Compute, Vercel accepts a VPC peering connection between your Vercel Secure Compute network and your AWS VPC.

To set up VPC peering:

1. **Create a Secure Compute network**: Navigate to your team's **Settings** → [**Connectivity**](https://vercel.com/d?to=%2F%5Bteam%5D%2F%7E%2Fsettings%2Fconnectivity\&title=Connectivity) and click **Create Network**. Select your desired region and optionally specify a CIDR block. The CIDR blocks of your Secure Compute network and your AWS VPC must not overlap.
2. **Set up peering in AWS**: In your AWS VPC dashboard, configure the peering connection by copying the values from your Secure Compute network settings, and pasting in the AWS VPC peering connection settings:
   - **Requester VPC ID**: Your VPC ID
   - **Account ID**: The AWS account ID
   - **Accepter VPC ID**: Your Vercel Secure Compute network's VPC Peering ID
   - **Region**: Your Vercel Secure Compute network's region
3. **Create peering connection**: In the AWS VPC peering connection settings, click **Create Peering Connection** to establish the connection.
4. **Accept peering connection**: Go back to your Vercel dashboard and click **Accept** to accept the connection.
5. **Update route tables**: Go to AWS's VPC dashboard, select **Route Tables**, and configure routing to allow traffic from Vercel's CIDR block.

![Image](https://vercel.com/front/docs/secure-compute/vpc-connection-light.png)

The connection can be deleted from either the Vercel dashboard, or the AWS VPC dashboard.

## VPN Support

If your current security and compliance obligations require more than dedicated IP addresses, contact us for guidance related to your specific needs.

## Pricing

Secure Compute starts at **$6.5K/year** for Enterprise teams, plus **Secure Connect Data Transfer** at **$0.15/GB**.

### Understanding data transfer costs

Data transfer costs apply to all outbound traffic from your Vercel Functions to external services:

- Database queries and responses
- API calls to third-party services
- File uploads and downloads
- Any other outbound network traffic

Monitor your usage in the **Team Settings** **Usage** tab under the **Secure Connect Data Transfer** section.

## Limits

### Build delay

When connected to a Secure Compute network, builds experience up to a 5s delay as they provision a secure build container. When this happens, your build is marked as **Provisioning Container** in the dashboard.

### Max number of VPC peering connections

The maximum number of VPC peering connections that can be established per network is **50**.


---

[View full sitemap](/docs/sitemap)
