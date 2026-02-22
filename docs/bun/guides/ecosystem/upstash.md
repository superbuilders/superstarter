# Bun Redis with Upstash

[Upstash](https://upstash.com/) is a fully managed Redis database as a service. Upstash works with the Redis® API, which means you can use Bun's native Redis client to connect to your Upstash database.

> **Note:** TLS is enabled by default for all Upstash Redis databases.

***

#### Create a new project
    Create a new project by running `bun init`:

    ```sh
    bun init bun-upstash-redis
    cd bun-upstash-redis
    ```

#### Create an Upstash Redis database
    Go to the [Upstash dashboard](https://console.upstash.com/) and create a new Redis database. After completing the [getting started guide](https://upstash.com/docs/redis/overall/getstarted), you'll see your database page with connection information.

    The database page displays two connection methods; HTTP and TLS. For Bun's Redis client, you need the **TLS** connection details. This URL starts with `rediss://`.

![Upstash Redis database page](https://mintcdn.com/bun-1dd33a4e/ONaGWxnTD93zNXCt/images/guides/upstash-1.png?fit=max&auto=format&n=ONaGWxnTD93zNXCt&q=85&s=bf927cfe3f0c675c100ae9a2af1d687c)

#### Connect using Bun's Redis client
    You can connect to Upstash by setting environment variables with Bun's default `redis` client.

    Set the `REDIS_URL` environment variable in your `.env` file using the Redis endpoint (not the REST URL):

    ```ini
    REDIS_URL=rediss://********@********.upstash.io:6379
    ```

    Bun's Redis client reads connection information from `REDIS_URL` by default:

    ```ts
    import { redis } from "bun";

    // Reads from process.env.REDIS_URL automatically
    await redis.set("counter", "0"); // [!code ++]
    ```

    Alternatively, you can create a custom client using `RedisClient`:

    ```ts
    import { RedisClient } from "bun";

    const redis = new RedisClient(process.env.REDIS_URL); // [!code ++]
    ```

#### Use the Redis client
    You can now use the Redis client to interact with your Upstash Redis database:

    ```ts
    import { redis } from "bun";

    // Get a value
    let counter = await redis.get("counter");

    // Set a value if it doesn't exist
    if (!counter) {
    	await redis.set("counter", "0");
    }

    // Increment the counter
    await redis.incr("counter");

    // Get the updated value
    counter = await redis.get("counter");
    console.log(counter);
    ```

    ```txt
    1
    ```

    The Redis client automatically handles connections in the background. No need to manually connect or disconnect for basic operations.
