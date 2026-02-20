---
title: Anatomy of the Checks API
product: vercel
url: /docs/checks/creating-checks
type: reference
prerequisites:
  - /docs/checks
related:
  - /docs/webhooks/webhooks-api
  - /docs/observability/checks-overview
  - /docs/speed-insights
  - /docs/speed-insights/metrics
  - /docs/rest-api/reference
summary: Learn how to create your own Checks with Vercel Integrations. You can build your own Integration in order to register any arbitrary Check for your...
---

# Anatomy of the Checks API

Checks API extends the build and deploy process once your deployment is ready. Each check behaves like a webhook that triggers specific events, such as `deployment.created`, `deployment.ready`, and `deployment.succeeded`. The test are verified before domains are assigned.

To learn more, see the [Supported Webhooks Events docs](/docs/webhooks/webhooks-api#supported-event-types).

The workflow for registering and running a check is as follows:

1. A check is created after the `deployment.created` event
2. When the `deployment.ready` event triggers, the check updates its `status` to `running`
3. When the check is finished, the `status` updates to `completed`

If a check is "rerequestable", your integration users get an option to [rerequest and rerun the failing checks](#rerunning-checks).

### Types of Checks

Depending on the type, checks can block the domain assignment stage of deployments.

- **Blocking Checks**: Prevents a successful deployment and returns a `conclusion` with a `state` value of `canceled` or `failed`. For example, a [Core Check](/docs/observability/checks-overview#types-of-flows-enabled-by-checks-api) returning a `404` error results in a `failed` `conclusion` for a deployment
- **Non-blocking Checks**: Return test results with a successful deployment regardless of the `conclusion`

A blocking check with a `failed` state is configured by the developer (and not the integration).

### Associations

Checks are always associated with a specific deployment that is tested and validated.

### Body attributes

| Attributes      | Format             | Purpose                                                                                                                                                                                              |
| --------------- | ------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `blocking`      | Boolean            | Tells Vercel if this check needs to block the deployment                                                                                                                                             |
| `name`          | String             | Name of the check                                                                                                                                                                                    |
| `detailsUrl`    | String (optional)  | URL to display in the Vercel dashboard                                                                                                                                                               |
| `externalID`    | String (optional)  | ID used for external use                                                                                                                                                                             |
| `path`          | String (optional)  | Path of the page that is being checked                                                                                                                                                               |
| `rerequestable` | Boolean (optional) | Tells Vercel if the check can rerun. Users can trigger a `deployment.check-rerequested` [webhook](/docs/webhooks/webhooks-api#deployment.check-rerequested), through a button on the deployment page |
| `conclusion`    | String (optional)  | The result of a running check. For [blocking checks](#types-of-checks) the values can be `canceled`, `failed`, `neutral`, `succeeded`, `skipped`. `canceled` and `failed`                            |
| `status`        | String (optional)  | Tells Vercel the status of the check with values: `running` and `completed`                                                                                                                          |
| `output`        | Object (optional)  | Details about the result of the check. Vercel uses this data to display actionable information for developers. This helps them debug failed checks                                                   |

The check gets a `stale` status if there is no status update for more than one hour (`status = registered`). The same applies if the check is running (`status = running`) for more than five minutes.

### Response

| Response      | Format | Purpose                                                                           |
| ------------- | ------ | --------------------------------------------------------------------------------- |
| `status`      | String | The status of the check. It expects specific values like `running` or `completed` |
| `state`       | String | Tells the current state of the connection                                         |
| `connectedAt` | Number | Timestamp (in milliseconds) of when the configuration was connected               |
| `type`        | String | Name of the integrator performing the check                                       |

### Response codes

| Status | Outcome                                                                                                                                                                       |
| ------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `200`  | Success                                                                                                                                                                       |
| `400`  | One of the provided values in the request body is invalid, **OR** one of the provided values in the request query is invalid                                                  |
| `403`  | The provided token is not from an OAuth2 client **OR** you do not have permission to access this resource **OR** the API token doesn't have permission to perform the request |
| `404`  | The check was not found **OR** the deployment was not found                                                                                                                   |
| `413`  | The output provided is too large                                                                                                                                              |

## Rich results

### Output

The `output` property can store any data like [Web Vitals](/docs/speed-insights) and [Virtual Experience Score](/docs/speed-insights/metrics#predictive-performance-metrics-with-virtual-experience-score). It is defined under a `metrics` field:

| Key                      | [Type](/docs/rest-api/reference#types) | Description                                                                                                                                             |
| ------------------------ | ----------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `TBT`                    | [Map](/docs/rest-api/reference#types)          | The [Total Blocking Time](/docs/speed-insights/metrics#total-blocking-time-tbt), measured by the check                                                  |
| `LCP`                    | [Map](/docs/rest-api/reference#types)          | The [Largest Contentful Paint](/docs/speed-insights/metrics#largest-contentful-paint-lcp), measured by the check                                        |
| `FCP`                    | [Map](/docs/rest-api/reference#types)          | The [First Contentful Paint](/docs/speed-insights/metrics#first-contentful-paint-fcp), measured by the check                                            |
| `CLS`                    | [Map](/docs/rest-api/reference#types)          | The [Cumulative Layout Shift](/docs/speed-insights/metrics#cumulative-layout-shift-cls), measured by the check                                          |
| `virtualExperienceScore` | [Map](/docs/rest-api/reference#types)          | The overall [Virtual Experience Score](/docs/speed-insights/metrics#predictive-performance-metrics-with-virtual-experience-score) measured by the check |

Each of these keys has the following properties:

| Key             | [Type](/docs/rest-api/reference#types)  | Description                                                                                                                            |
| --------------- | ------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------- |
| `value`         | [Float](/docs/rest-api/reference#types) | The value measured for a particular metric, in milliseconds. For `virtualExperienceScore` this value is the percentage between 0 and 1 |
| `previousValue` | [Float](/docs/rest-api/reference#types) | A previous value for comparison purposes                                                                                               |
| `source`        | [Enum](/docs/rest-api/reference#types)  | `web-vitals`                                                                                                                           |

### Metrics

`metrics` makes [Web Vitals](/docs/speed-insights) visible on checks. It is defined inside `output` as follows:

```json filename="checks-metrics.json"
{
  "path": "/",
  "output": {
    "metrics": {
        "FCP": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        }
        "LCP": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        },
        "CLS": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        },
        "TBT": {
          "value": 1200,
          "previousValue": 1400,
          "source": "web-vitals"
        }
      }
    }
  }
}
```

> **💡 Note:** All fields are required except `previousValue`. If
> `previousValue` is present, the delta will be shown.

### Rerunning checks

A check can be "rerequested" using the `deployment.check-rerequested` webhook. Add the `rerequestable` attribute, and you can rerequest failed checks.

A rerequested check triggers the`deployment.check-rerequested` webhook. It updates the check `status` to `running` and resets the `conclusion`, `detailsUrl`, `externalId`, and `output` fields.

### Skipping Checks

You can "Skip" to stop and ignore check results without affecting the alias assignment. You cannot skip active checks. They continue running until built successfully, and assign domains as the last step.

### Availability of URLs

For "Running Checks", only the [Automatic Deployment URL](/docs/deployments/generated-urls) is available. [Automatic Branch URL](/docs/deployments/generated-urls#generated-from-git) and [Custom Domains](/docs/domains/add-a-domain) will apply once the checks finish.

### Order of execution

Checks may take different times to run. Each integrator determines the running order of the checks. While [Vercel REST API](/docs/rest-api/vercel-api-integrations) determines the order of check results.

### Status and conclusion

When Checks API begins running on your deployment, the `status` is set to `running`. Once it gets a `conclusion`, the `status` updates to `completed`. This results in a successful deployment.

However, your deployment will fail if the `conclusion` updates to one of the following values:

| Conclusion  | `blocking=true` |
| ----------- | --------------- |
| `canceled`  | Yes             |
| `failed`    | Yes             |
| `neutral`   | No              |
| `succeeded` | No              |
| `skipped`   | No              |


---

[View full sitemap](/docs/sitemap)
