---
title: What is Compute?
product: vercel
url: /docs/getting-started-with-vercel/fundamental-concepts/what-is-compute
type: conceptual
prerequisites:
  - /docs/getting-started-with-vercel/fundamental-concepts
  - /docs/getting-started-with-vercel
related:
  - /docs/deployments/builds
  - /docs/functions/configuring-functions/advanced-configuration
  - /docs/functions/configuring-functions/region
  - /docs/functions/regions
  - /docs/functions/functions-api-reference/vercel-functions-package
summary: Learn about the different models for compute and how they can be used with Vercel.
---

# What is Compute?

## Where does compute happen?

Traditionally with web applications, we talk about two main locations:

- **Client**: This is the browser on your *user's* device that sends a request to a server for your application code. It then turns the response it receives from the server into an interface the user can interact with. The term "client" could also be used for any device, including another server, that is making a request to a server.
- **Server**: This is the computer in a data center that stores your application code. It receives requests from a client, does some computation, and sends back an appropriate response. This server does not sit in complete isolation; it is usually part of a bigger network designed to deliver your application to users around the world.
  - **Origin Server**: The server that stores and runs the original version of your app code. When the origin server receives a request, it does some computation before sending a response. The result of this computation work may be cached by a CDN.
  - **CDN (Content Delivery Network)**: This stores static content, such as HTML, in multiple locations around the globe, placed between the client who is requesting and the origin server that is responding. When a user sends a request, the closest CDN will respond with its cached response.
  - **Global Network**: Vercel's global network consists of Points of Presence (PoPs) and compute regions distributed around the world. This architecture allows Vercel to cache content and execute code in the region closest to the user, reducing latency and improving performance.

![Image](`/docs-assets/static/docs/concepts/functions/request-response.png`)

## Compute in practice

To demonstrate an example of what this looks like in practice, we'll use the example of a Next.js app deployed to Vercel.

When you start a deployment of your Next.js app to Vercel, Vercel's [build process](/docs/deployments/builds#build-process) creates a build output, that contains artifacts such as [bundled Vercel Functions](/docs/functions/configuring-functions/advanced-configuration#bundling-vercel-functions) or static assets. It will then deploy either to Vercel's CDN or, in the case of a function, to a [specified region](/docs/functions/configuring-functions/region).

Now that the deployment is ready to serve traffic, a user can visit your site. When they do, the request is sent to the closest region, which will then either serve the static assets or execute the function. The function will then run, and the response will be sent back to the user. At a very high-level this looks like:

1. **User Action**: The user interacts with a website by clicking a link, submitting a form, or entering a URL.
2. **HTTP Request**: The user's browser sends a request to the server, asking for the resources needed to display the webpage.
3. **Server Processing**: The server receives the request, processes it, and prepares the necessary resources. For Vercel Functions, Vercel's [gateway](https://vercel.com/blog/behind-the-scenes-of-vercels-infrastructure) triggers a function execution in the region where the function was deployed.
4. **HTTP Response**: The server sends back a response to the browser, which includes the requested resources and a status code indicating whether the request was successful. The browser then receives the response, interprets the resources, and displays the webpage to the user.

In this lifecycle, the "Server Processing" step can look very different depending on your needs, the artifacts being requested, and the model of compute that you use. In the next section we'll explore these models, each of which has their own tradeoffs.

## Servers

Servers provide a specific environment and resources for your applications. This means that you have control over the environment, but you also have to manage the infrastructure, provision servers, or upgrade hardware. How much control you have depends on the server option you choose. Some options might be: Amazon EC2, Azure Virtual Machines, or Google Compute Engine. All of these services provide you with a virtual machine that you'll configure through their site. You will be responsible for provisioning, and pay for the entire duration of the server's uptime. Other options such as Virtual Private Servers (VPS), dedicated physical servers in a data center, or your own on-premises servers are also considered traditional servers.

Managing your own servers can work well if you have a highly predictable workload. You don't have a need to scale up or down and you have a consistent amount of traffic. If you don't face peaks of traffic, the upside is predicable performance and cost, with complete control over the environment and security. The fact that the resource is always available means that you can run long-running processes.

### Server advantages

Servers give you complete control to configure the environment to suit your needs. You can set the CPU power and RAM for consistent performance. They enable the execution of long-running processes and support applications that require persistent connections. Additionally, for businesses with predictable workloads, servers provide stable costs.

### Server disadvantages

If you have peaks of traffic, you'll need to anticipate and provision additional resources in advance, which can lead to 2 possible scenarios:

- Under provisioning: leads to degraded performance due to lack of compute availability.
- Over provisioning: leads to increased costs due to wasted compute capacity.

Furthermore, because scaling resources can be slow, you will need to apply it in advance of the time where traffic peaks are expected.

## Serverless

Serverless is a cloud computing model that allows you to build and run applications and services without having to manage your own servers. It addresses many of the disadvantages of traditional servers, and enables teams to have an infrastructure that is more elastic: resources that are scaled and available based on demand, and have a pricing structure that reflects that. Despite the name, servers are still used.

The term "Serverless" has been used by several cloud providers to describe the compute used for functions, such as AWS Lambda functions, Google Cloud Functions, Azure Functions, and Vercel Functions.

The difference between serverless and servers, is that there is no single server assigned to your application. Instead, when a request is made, a computing instance on a server is spun up to handle the request, and then spun down after the request is complete. This allows your app to handle unpredictable traffic with the benefit of only paying for what you use. You do not need to manage the infrastructure, provision servers, or upgrade hardware.

### Serverless advantages

With serverless, applications are automatically scaled up or down based on demand, ensuring that resources are used efficiently and costs are optimized. Since this is done automatically, it reduces the complexity of infrastructure management. For workloads with unpredictable or variable traffic, the serverless model can be very cost-effective.

### Serverless disadvantages

#### Cold starts

When adding additional capacity to a serverless application there is a short period of initialization time that happens as the first request is received. This is called a *cold start*. When this capacity is reused the initialization no longer needs to happen and we refer to the function as *warm*.

Reusing a function means the underlying instance that hosts it does not get discarded. State, such as temporary files, memory caches, and sub-processes, are preserved. The developer is encouraged not just to minimize the time spent in the *booting* process, but to also take advantage of caching data (in memory or filesystem) and [memoizing](https://en.wikipedia.org/wiki/Memoization) expensive computations.

By their very nature of being on-demand, serverless applications will always have the notion of cold starts.

With Vercel, pre-warmed instances are enabled for paid plans on production environments. This prevents cold starts by keeping a minimum of one active function instance running.

#### Region model

Serverless compute typically happens in a single specified location (or [region](/docs/functions/regions)). Having a single region (or small number) makes it easier to increase the likelihood of a warm function as all of your users will be hitting the same instances. You'll likely also only have your data store in a single region, and so for latency reasons, it makes sense to have the trip between your compute and data be as short as possible.

However, a single region can be a disadvantage if you have user request coming from different region, as the response latency will be high.

All of this means that it's left up to teams to determine which region (or regions) they want Vercel to deploy their functions to. This requires taking into account latency between your compute and your data source, as well as latency to your users. In addition, region failover is not automatic, and requires [manual intervention](/docs/functions/configuring-functions/region#automatic-failover).

#### High maximum duration

AI-driven workloads have stretched the limits of serverless compute, through the requirement of long-running processes, data-intensive tasks, a requirement for streaming data, and the need for real-time interaction.

The maximum duration of a function describes the maximum amount of time that a function can run before it is terminated. As a user, you have to understand and configure the maximum duration, which is a balance between the cost of running the function and the time it takes to complete the task.

This can be a challenge, as you may not know how long a task will take to complete, and if you set the duration too low, the function will be terminated before it completes. If you set it too high, it can be a source of excessive execution costs.

## Fluid compute

Fluid compute is a hybrid approach between [serverless](#serverless) and [servers](#servers), and it builds upon the benefits of serverless computing, addresses its disadvantages and includes some of the strengths of servers, such as the ability to execute tasks concurrently within a single instance.

### How does Fluid compute work

In the serverless compute model, one serverless instance can process only one request at a time so that the number of instances needed can significantly increase if the traffic to a specific page increases. In many cases, the available resources in one instance are not fully used when processing a single request. This can lead to significant wasted resources that you still have to pay for.

![Image](`/docs-assets/static/docs/fluid/serverless-light.png`)

In the Fluid compute model, when a request requires a function to be executed, a new compute instance is started if there are no existing instances processing this function. Additional requests will re-use the same instance as long as it is still processing existing requests and there is sufficient capacity available in the instance. We refer to this as *optimized concurrency*. It significantly decreases the number of instances that need to be running and increases the efficiency of an instance by fully utilising the available CPU, leading to reduced operational costs.

![Image](`/docs-assets/static/docs/fluid/optimized-concurrency-light.png`)

### Benefits of Fluid compute

#### Optimized concurrency

Resource usage is optimized by handling multiple request with invocations in one function instance and dynamically routing traffic to instances based on load and availability. This can save significant costs compared to traditional serverless models.

#### Reduction in cold starts

Optimized concurrency reduces the likelihood of [cold starts](#cold-starts), a disadvantage of serverless, as there is less chance that a new function instance needs to be initialized. However, it can still happen such as during periods of low traffic. Fluid compute improves cold start times with Bytecode caching and pre-warmed instances:

- **Bytecode caching**: It automatically pre-compiles function code to minimize startup time during cold invocations.
- **Pre-warmed instances**: It keeps functions ready to handle requests without cold start delays.

#### Dynamic scaling

Fluid compute includes one of the advantages of serverless with the ability of automatically adjusting the number of concurrent instances needed based on the demands of your traffic. Therefore, you don't have to worry about increased latency during high traffic events or pay for increased resource limits during low traffic times before and after high traffic events.

#### Background processing

Serverless computing is designed for quick tasks that are short-lived. With Fluid compute, you can execute background tasks with [`waitUntil`](/docs/functions/functions-api-reference/vercel-functions-package#waituntil) after having responded to the user's request, combining the ability to provide a responsive user experience with running time-consuming tasks like logging and analytics.

#### Cross-region failover

Fluid compute includes backup regions where it can launch function instances and route traffic to in case of outages in the regions where your functions are normally executed. You also have the ability to specify multiple regions where your function instances should be deployed.

#### Compute instance sharing

As opposed to traditional serverless where instances are completely isolated, Fluid compute allows multiple invocations to share the same physical instance (a global state/process) concurrently. With this approach, functions can share resources which improves performance and reduce costs.

### Enabling Fluid compute

You can enable Fluid compute from the [Functions Settings](https://vercel.com/d?to=/%5Bteam%5D/%5Bproject%5D/settings/functions%fluid-compute\&title=Go+to+Function+Settings) section of your project. For more details, review [how to enable Fluid compute](/docs/fluid-compute).


---

[View full sitemap](/docs/sitemap)
