---
title: vercel.functions API Reference (Python)
product: vercel
url: /docs/functions/functions-api-reference/vercel-sdk-python
type: reference
prerequisites:
  - /docs/functions/functions-api-reference
  - /docs/functions
related:
  - /docs/environment-variables/system-environment-variables
  - /docs/incremental-static-regeneration
  - /docs/pricing/regional-pricing
summary: Learn about available APIs when working with Vercel Functions in Python.
---

# vercel.functions API Reference (Python)

## Install and use the package

1. Install the `vercel` package:

   ```python
   pip install vercel
   ```

2. Import the `vercel.functions` package:

   ```python
   from vercel.functions import get_env
   ```

## Helper methods

### `get_env`

**Description**: Gets the [System Environment Variables](/docs/environment-variables/system-environment-variables#system-environment-variables) exposed by Vercel.

```python filename="src/example.py"
from vercel.functions import get_env

print(get_env().VERCEL_REGION)
```

### `geolocation`

**Description**: Returns the location information for the incoming request, in the following way:

```json
{
  "city": "New York",
  "country": "US",
  "flag": "🇺🇸",
  "countryRegion": "NY",
  "region": "iad1",
  "latitude": "40.7128",
  "longitude": "-74.0060",
  "postalCode": "10001"
}
```

| Name                 | Type                         | Description                                       |
| :------------------- | :--------------------------- | :------------------------------------------------ |
| `request_or_headers` | `RequestLike \| HeadersLike` | The incoming request object which provides the IP |

```python filename="src/main.py"
from fastapi import FastAPI, Request
from vercel.functions import geolocation

app = FastAPI()

@app.get("/api/geo")
async def geo_info(request: Request):
    info = geolocation(request)
    return info
```

### `ip_address`

**Description**: Returns the IP address of the request from the headers.

| Name                 | Type                         | Description                                       |
| :------------------- | :--------------------------- | :------------------------------------------------ |
| `request_or_headers` | `RequestLike \| HeadersLike` | The incoming request object which provides the IP |

```python filename="src/main.py"
from fastapi import FastAPI, Request
from vercel.functions import ip_address

app = FastAPI()

@app.get("/api/ip")
async def get_ip_address(request: Request):
    ip = ip_address(request)  # you can also pass request.headers
    return {"ip": ip}
```

### `RuntimeCache`

**Description**: Allows you to interact with the Vercel Runtime Cache in any Vercel region. Use this for storing and retrieving data across function, routing middleware, and build execution within a Vercel region.

| Name                  | Type                   | Description                                        |
| --------------------- | ---------------------- | -------------------------------------------------- |
| `key_hash_function`   | `Callable[[str], str]` | Optional custom hash function for generating keys. |
| `namespace`           | `str`                  | Optional namespace to prefix cache keys.           |
| `namespace_separator` | `str`                  | Optional separator string for the namespace.       |

#### Specification

`RuntimeCache | AsyncRuntimeCache` provide the following methods:

| Method       | Description                                                                                                                                                                                     | Parameters                                                                                                                                                                                       |
| :----------- | :---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | :----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `get`        | Retrieves a value from the Vercel Runtime Cache.                                                                                                                                                | `key: str`: The cache key                                                                                                                                                                        |
| `set`        | Stores a value in the Vercel Runtime Cache with optional `ttl` and/or `tags`. The `name` option allows a human-readable label to be associated with the cache entry for observability purposes. |  |
| `delete`     | Removes a value from the Vercel Runtime Cache by key                                                                                                                                            | `key: str`: The cache key to delete                                                                                                                                                              |
| `expire_tag` | Expires all cache entries associated with one or more tags                                                                                                                                      | `tag: str \| Sequence[str]`: Tag or sequence of tags to expire                                                                                                                                   |

Use `AsyncRuntimeCache` in async code. It has the same API and uses the same underlying cache as `RuntimeCache`, and exposes awaitable methods.

```python filename="src/main.py"
import requests
import httpx
from fastapi import FastAPI, Request
from vercel.functions import RuntimeCache, AsyncRuntimeCache

app = FastAPI()
cache = RuntimeCache()
acache = AsyncRuntimeCache()

@app.get("/blog")
def get_blog(request: Request):
    key = "blog"
    value = cache.get(key)
    if value is not None:
        return value

    res = requests.get("https://api.vercel.app/blog")
    origin_value = res.json()
    cache.set(key, origin_value, {"ttl": 3600, "tags": ["blog"]})

    return origin_value

@app.get("/blog-async")
async def get_blog_async(request: Request):
    key = "blog"
    value = await acache.get(key)
    if value is not None:
        return value

    async with httpx.AsyncClient() as client:
        res = await client.get("https://api.vercel.app/blog")
        origin_value = res.json()
    await acache.set(key, origin_value, {"ttl": 3600, "tags": ["blog"]})
    return origin_value
```

After assigning tags to your cached data, use the `expire_tag` method to invalidate all cache entries associated with that tag. This operation is propagated globally across all Vercel regions within 300ms.

```python filename="src/main.py"
from fastapi import FastAPI, Request
from vercel.functions import RuntimeCache

app = FastAPI()
cache = RuntimeCache()

@app.get("/expire-blog")
def expire_blog(request: Request):
    cache.expire_tag("blog")
    return {"ok": True}

```

#### Limits and usage

The Runtime Cache is isolated per Vercel project and deployment environment (`preview` and `production`). Cached data is persisted across deployments and can be invalidated either through time-based expiration or by calling `expire_tag`. However, TTL (time-to-live) and tag updates aren't reconciled between deployments. In those cases, we recommend either purging the runtime cache or modifying the cache key.

The Runtime Cache API does not have first class integration with [Incremental Static Regeneration](/docs/incremental-static-regeneration). This means that:

- Runtime Cache entry tags will not apply to ISR pages, so you cannot use `expire_tag` to invalidate both caches.
- Runtime Cache entry TTLs will have no effect on the ISR revalidation time and

The following Runtime Cache limits apply:

- The maximum size of an item in the cache is 2 MB. Items larger than this will not be cached.
- A cached item can have a maximum of 128 tags.
- The maximum tag length is 256 bytes.

Usage of the Vercel Runtime Cache is charged, learn more about pricing in the [regional pricing docs](/docs/pricing/regional-pricing).


---

[View full sitemap](/docs/sitemap)
