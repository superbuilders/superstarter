---
title: Using the Rust Runtime with Vercel functions
product: vercel
url: /docs/functions/runtimes/rust
type: reference
prerequisites:
  - /docs/functions/runtimes
  - /docs/functions
related:
  - /docs/fluid-compute
summary: Build fast, memory-safe serverless functions with Rust on Vercel.
---

# Using the Rust Runtime with Vercel functions

> **🔒 Permissions Required**: The Rust runtime

Use Rust to build high-performance, memory-safe serverless functions. The Rust runtime runs on [Fluid compute](/docs/fluid-compute) for optimal performance and lower latency.

## Getting Started

1. [**Configure your project**](#cargo.toml-configuration) - Add a `Cargo.toml` file with required dependencies
2. [**Create your function**](#creating-api-handlers) - Write handlers in the `api/` directory
3. [**Deploy**](#deployment) - Push to GitHub or use the Vercel CLI

## Project setup

### Cargo.toml configuration

Create a `Cargo.toml` file in your project root:

```toml filename="Cargo.toml"
[package]
name = "rust-hello-world"
version = "0.1.0"
edition = "2024"

[dependencies]
tokio = { version = "1", features = ["full"] } # async runtime
vercel_runtime = { version = "2" } # handles communicating with Vercel's function bridge
serde = { version = "1.0", features = ["derive"] }
serde_json = "1.0"

# Each handler has to be specified as [[bin]]
# Note that you need to provide unique names for each binary
[[bin]]
name = "hello"
path = "api/hello.rs"

# This section configures settings for the release profile, which optimizes the build for performance.
[profile.release]
codegen-units = 1
lto = "fat"
opt-level = 3
```

### Creating API handlers

Create Rust files in your `api/` directory. Each file becomes a serverless function:

```rust filename="api/hello.rs"
use serde_json::{Value, json};
use vercel_runtime::{Error, Request, run, service_fn};

#[tokio::main]
async fn main() -> Result<(), Error> {
    let service = service_fn(handler);
    run(service).await
}

async fn handler(_req: Request) -> Result<Value, Error> {
    Ok(json!({
        "message": "Hello, world!",
    }))
}
```

For more code examples, please refer to our templates:

- [Rust Hello World](https://vercel.com/templates/template/rust-hello-world)
- [Rust Axum](https://vercel.com/templates/template/rust-axum)

[vercel/examples](https://github.com/vercel/examples/tree/main/rust).

## Deployment

### Git deployment

Push your code to a connected GitHub repository for automatic deployments.

### CLI deployment

Deploy directly using the Vercel CLI:

```bash
vercel deploy
```

### Build optimization

For prebuilt deployments, optimize your `.vercelignore`:

```bash filename=".vercelignore"
# Ignore everything in the target directory except for release binaries
target/**
!target/release
!target/x86_64-unknown-linux-gnu/release/**
!target/aarch64-unknown-linux-gnu/release/**
```

## Feature support


---

[View full sitemap](/docs/sitemap)
