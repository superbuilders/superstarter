---
title: Managing Edge Configs with Vercel REST API
product: vercel
url: /docs/edge-config/vercel-api
type: conceptual
prerequisites:
  - /docs/edge-config
related:
  - /docs/edge-config/edge-config-sdk
  - /docs/cdn
  - /docs/rest-api/reference/endpoints/edge-config
  - /docs/rest-api
  - /docs/rest-api/vercel-api-integrations
summary: Learn how to use the Vercel REST API to create and update Edge Configs. You can also read data stored in Edge Configs with the Vercel REST API.
---

# Managing Edge Configs with Vercel REST API

We recommend you use the Vercel REST API only for creating and updating an [Edge Config](/edge-config). For reading data (which you should do more often), we highly recommend using the [SDK](/docs/edge-config/edge-config-sdk).

Updates to your Edge Config can take up to a few seconds to propagate globally, and therefore might not be available from the Edge Config API endpoint immediately. However, fetching your Edge Config data from the Vercel REST API will always return the latest version of your Config. The request will not have Vercel's optimizations, and the response will not be served through Vercel's [CDN](/docs/cdn).

You can also request metadata about your Edge Configs through the API.

This section will show you how to update, read metadata about, and read the contents of your Edge Configs with the Vercel REST API. To learn about other Vercel REST API functionality with Edge Configs, [read our API spec reference](/docs/rest-api/reference/endpoints/edge-config).

## Create an Edge Config

To create an Edge Config with the [Vercel REST API](/docs/rest-api), make a `POST` request to the `edge-config` path of the API endpoint. Your URL should look like this:

```javascript filename="endpoint"
'https://api.vercel.com/v1/edge-config';
```

The request body should be a JSON object containing a `"slug"` with the name you would like to call your Edge Config as its value.

> **💡 Note:** The name can only contain alphanumeric letters, "\_" and "-". It cannot exceed
> 32 characters.

See the example below:

#### \['cURL'

```bash filename="cURL"
curl  -X 'POST' 'https://api.vercel.com/v1/edge-config' \
      -H 'Authorization: Bearer your_vercel_api_token_here' \
      -H 'Content-Type: application/json; charset=utf-8' \
      -d $'{ "slug": "your_edge_config_name_here" }'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const createEdgeConfig = await fetch(
    'https://api.vercel.com/v1/edge-config',
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        slug: 'your_edge_config_name_here',
      }),
    },
  );
  const result = await createEdgeConfig.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

Upon success, you should receive a JSON response similar to the following:

```json filename="response"
{
  "createdAt": 1234567890123,
  "updatedAt": 1234567890123,
  "slug": "your_edge_config_slug_here",
  "id": "your_edge_config_id_here",
  "digest": "abc123efg456hij789",
  "sizeInBytes": 2,
  "itemCount": 0,
  "ownerId": "your_id_here"
}
```

The above example will create an Edge Config scoped to your Hobby team. To scope your Edge Config to a Vercel Team:

- [Generate a Vercel REST API access token](/docs/rest-api/vercel-api-integrations#create-an-access-token) that is scoped to the appropriate Vercel Team
- Add the `?teamId` query parameter to your `POST` request. Set its value to [the Team's ID](/docs/accounts#find-your-team-id), which you can find under the **Settings** tab in the Team's **Dashboard** on Vercel.

> **💡 Note:** The `"ownerId"` key's value will be your
> &#x20;if you created
> the Edge Config using the `?teamId` query parameter.

## Update your Edge Config items

To add an item to or update an item in your Edge Config, send a `PATCH` request to the `edge-config` endpoint, appending `/your_edge_config_id_here/items` to the end.

If you're requesting an Edge Config scoped to a team, add `?teamId=` to the end of the endpoint, pasting [the Vercel Team's ID](/docs/accounts#find-your-team-id) after the `=` symbol.

Your URL should look like this:

```javascript filename="endpoint"
'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here';
```

Your request body should be a JSON object containing an `"items"` array. The `"items"` array must contain objects that describe the change you want to make to the Edge Config. The following table outlines valid keys and values for these objects:

| Property          | Description                                                               | Valid values                                                                         |
| ----------------- | ------------------------------------------------------------------------- | ------------------------------------------------------------------------------------ |
| **`"operation"`** | The change you want to make to your Edge Config.                          | `"create"`, `"update"`, `"upsert"`, `"delete"`                                       |
| **`"key"`**       | The name of the key you want to add to or update within your Edge Config. | String of alphanumeric characters, "\_" and "-" only. Up to 256 characters.          |
| **`"value"`**     | The value you want to assign to the key.                                  | Strings, JSON objects, `null` objects, Numbers and arrays of the previous four types |

The following example demonstrates a request body that creates an `"example_key_1"` key with a value of `"example_value_1"`, then updates the `"example_key_2"` key with a new value of `"new_value"`:

```json filename="body"
{
  "items": [
    {
      "operation": "create",
      "key": "example_key_1",
      "value": "example_value_1"
    },
    {
      "operation": "update",
      "key": "example_key_2",
      "value": "new_value"
    }
  ]
}
```

The following is an API call that sends the above request body to your Edge Config:

#### \['cURL'

```bash filename="cURL"
curl -X 'PATCH' 'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items' \
     -H 'Authorization: Bearer your_vercel_api_token_here' \
     -H 'Content-Type: application/json' \
     -d $'{ "items": [ { "operation": "create", "key": "example_key_1", "value": "example_value_1" }, { "operation": "update", "key": "example_key_2", "value": "new_value" } ] }'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const updateEdgeConfig = await fetch(
    'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items',
    {
      method: 'PATCH',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        items: [
          {
            operation: 'create',
            key: 'example_key_1',
            value: 'example_value_1',
          },
          {
            operation: 'update',
            key: 'example_key_2',
            value: 'new_value',
          },
        ],
      }),
    },
  );
  const result = await updateEdgeConfig.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

Successful requests will receive a response of `{"status":"ok"}`.

### Failing Edge Config `PATCH` requests

If only one of the operations in the `"items"` array of your `PATCH` request body fails, the entire request will fail. Failed requests will receive a response JSON object containing an `"error"` property with an object that contains information about why the request failed.

For example:

```json filename="error"
{
  "error": {
    "code": "forbidden",
    "message": "The request is missing an authentication token",
    "missingToken": true
  }
}
```

## Read all items

**Reading items from your Edge Configs with the Vercel REST API is not recommended**. Instead, you should [use the SDK](/docs/edge-config/edge-config-sdk#read-multiple-values) or fetch Edge Config data with [the Edge Config endpoint](#make-requests-to-the-edge-config-endpoint).

However, if you must read your Edge Config with the API, you can do so by making a `GET` request to the `edge-config` endpoint.

Your URL should look like this:

```javascript filename="endpoint"
'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here';
```

The following is an example of a request that fetches an Edge Config's items with the Vercel REST API:

#### \['cURL'

```bash filename="request"
curl "https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here" \
     -H 'Authorization: Bearer your_vercel_api_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readItems = await fetch(
    'https://api.vercel.com/v1/edge-config/your_edge_config_id_here/items?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
      },
    },
  );
  const result = await readItems.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

## Read metadata

You can read your Edge Config's metadata (but not its key-value pair contents) by making a `GET` request to the `edge-config` API endpoint. Append the Edge Config's id to the endpoint as a path, as demonstrated below. If the Edge Config is associated with a Team, add the `teamId` query param to the end.

The following is an example `GET` request that fetches metadata about an Edge Config associated with a Vercel Team.

#### \['cURL'

```bash filename="request"
curl "https://api.vercel.com/v1/edge-config/your_edge_config_id_here?teamId=your_team_id_here" \
     -H 'Authorization: Bearer your_vercel_api_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readMetadata = await fetch(
    'https://api.vercel.com/v1/edge-config/your_edge_config_id_here?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
      },
    },
  );
  const result = await readMetadata.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

If the Edge Config exists, the response will be the same JSON object you receive when [creating your Edge Config with the Vercel REST API](#create-an-edge-config):

```json filename="response"
{
  "createdAt": 1234567890123,
  "updatedAt": 1234567890123,
  "slug": "your_edge_config_slug_here",
  "id": "your_edge_config_id_here",
  "digest": "abc123efg456hij789",
  "sizeInBytes": 2,
  "itemCount": 0,
  "ownerId": "your_id_here"
}
```

## List all Edge Configs

You can list all of your Edge Configs in a specific Hobby team or team with a `GET` request to the `edge-config` API endpoint. For example:

#### \['cURL'

```bash filename="request"
curl "https://api.vercel.com/v1/edge-config?teamId=your_team_id_here" \
     -H 'Authorization: Bearer your_vercel_api_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const listItems = await fetch(
    'https://api.vercel.com/v1/edge-config?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_vercel_api_token_here}`,
      },
    },
  );
  const result = await listItems.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

The response should be similar to this:

```json filename="response"
[
  {
    "slug": "example_config_1",
    "itemCount": 0,
    "createdAt": 1234567890123,
    "updatedAt": 1234567890123,
    "id": "your_edge_config_id_here",
    "digest": "abc123efg456hij789",
    "sizeInBytes": 2,
    "ownerId": "your_id_here"
  },
  {
    "slug": "example_config_2",
    "itemCount": 0,
    "createdAt": 0123456789012,
    "updatedAt": 0123456789012,
    "id": "your_edge_config_id_here",
    "digest": "123efg456hij789abc",
    "sizeInBytes": 2,
    "ownerId": "your_id_here"
  }
]
```

## Make requests to the Edge Config endpoint

We recommend storing your [connection string](/docs/edge-config/using-edge-config#using-a-connection-string) as an environment variable in your project and [using our SDK](/docs/edge-config/edge-config-sdk) to read Edge Config data. However, you can make requests to the Edge Config endpoint to read your Edge Config's data as well.

To do so, create an [Edge Config read access token](/docs/edge-config/using-edge-config#creating-a-read-access-token), which will be used to authenticate requests to the Edge Config endpoint.

The Edge Config endpoint used in the connection string is distinct from a Vercel REST API endpoint. Its root is `https://edge-config.vercel.com`. Making requests to the Edge Config endpoint allows you to take advantage of the optimizations that make Vercel's Edge Config reads hundreds of milliseconds faster than alternative options on the global network.

### Request all items

To read all of your Edge Config's items, send a `GET` request to the appropriate edge config endpoint by adding your Edge Config's ID and Edge Config read access token in the appropriate places in the below URL:

#### \['cURL'

```bash filename="cURL"
curl 'https://edge-config.vercel.com/your_edge_config_id_here/items?token=your_edge_config_read_access_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readAllEdgeConfigItems = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/items?token=your_edge_config_read_access_token_here',
  );
  const result = await readAllEdgeConfigItems.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

You can also send your Edge Config read access token in an Authorization header rather than as a query param.

#### \['cURL'

```bash filename="request"
curl "https://edge-config.vercel.com/your_edge_config_id_here/items" \
     -H 'Authorization: Bearer your_edge_config_read_access_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readAllWithAuth = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/items',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_edge_config_read_access_token_here}`,
      },
    },
  );
  const result = await readAllWithAuth.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

The response will be a JSON object containing all key-value pairs in the Edge Config. For example:

```json filename="response"
{
  "example_key_1": "example_value_1",
  "example_key_2": "example_value_2",
  "example_key_3": "example_value_3"
}
```

### Request a single item

To request a single item, you can use the `/item` path instead of `/items`, then add the key of the item you want as the final path as shown below:

#### \['cURL'

```bash filename="request"
curl "https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1?token=your_edge_config_read_access_token_here" \
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readSingle = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1?token=your_edge_config_read_access_token_here',
  );
  const result = await readSingle.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

You can also send your Edge Config read access token in an Authorization header rather than as a query param.

#### \['cURL'

```bash filename="request"
curl -X 'https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1' \
     -H 'Authorization: Bearer your_edge_config_read_access_token_here'
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readSingleWithAuth = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/item/example_key_1',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_edge_config_read_access_token_here}`,
      },
    },
  );
  const result = await readSingleWithAuth.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

The response will be the raw value at the specified key. For example, if `example_key_1` has a string value of `"example_value"`, the response will be:

```bash filename="response"
"example_value"
```

### Request the digest

When you create an Edge Config, a hash string called a digest is generated and attached to it. This digest is replaced with a new hash string whenever you update your config. You can check this digest to verify whether your Edge Config has properly updated, and confirm which version of the Config you're working with.

To fetch an Edge Config's digest, send a `GET` request to your edge config endpoint, as shown below:

#### \['cURL'

```bash filename="request"
curl "https://edge-config.vercel.com/your_edge_config_id_here/digest?teamId=your_team_id_here&token=your_edge_config_read_access_token_here"
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readDigest = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/digest?teamId=your_team_id_here&token=your_edge_config_read_access_token_here',
  );
  const result = await readDigest.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

You can also send the Edge Config read access token in the `Authorization` header of your request using the `Bearer token` format:

#### \['cURL'

```bash filename="request"
curl  -X 'GET' 'https://edge-config.vercel.com/your_edge_config_id_here/digest?teamId=your_team_id_here' \
      -H 'Authorization: Bearer your_edge_config_read_access_token_here
```

#### 'fetch']

```javascript filename="fetch"
try {
  const readDigestWithAuth = await fetch(
    'https://edge-config.vercel.com/your_edge_config_id_here/digest?teamId=your_team_id_here',
    {
      method: 'GET',
      headers: {
        Authorization: `Bearer ${your_edge_config_read_access_token_here}`,
      },
    },
  );
  const result = await readDigestWithAuth.json();
  console.log(result);
} catch (error) {
  console.log(error);
}
```

## Up Next


---

[View full sitemap](/docs/sitemap)
