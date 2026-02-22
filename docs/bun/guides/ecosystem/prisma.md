# Use Prisma with Bun

> **Note:** **Note** — Prisma's dynamic subcommand loading system currently requires npm to be installed alongside Bun. This affects certain CLI commands like `prisma init`, `prisma migrate`, etc. Generated code works perfectly with Bun using the new `prisma-client` generator.

#### Create a new project
    Prisma works out of the box with Bun. First, create a directory and initialize it with `bun init`.

    ```bash
    mkdir prisma-app
    cd prisma-app
    bun init
    ```

#### Install Prisma dependencies
    Then install the Prisma CLI (`prisma`), Prisma Client (`@prisma/client`), and the LibSQL adapter as dependencies.

    ```bash
    bun add -d prisma
    bun add @prisma/client @prisma/adapter-libsql
    ```

#### Initialize Prisma with SQLite
    We'll use the Prisma CLI with `bunx` to initialize our schema and migration directory. For simplicity we'll be using an in-memory SQLite database.

    ```bash
    bunx --bun prisma init --datasource-provider sqlite
    ```

    This creates a basic schema. We need to update it to use the new Rust-free client with Bun optimization. Open `prisma/schema.prisma` and modify the generator block, then add a simple `User` model.

    ```prisma
      generator client {
        provider = "prisma-client" // [!code ++]
        output = "./generated" // [!code ++]
        engineType = "client" // [!code ++]
        runtime = "bun" // [!code ++]
      }

      datasource db {
        provider = "sqlite"
        url      = env("DATABASE_URL")
      }

      model User { // [!code ++]
        id    Int     @id @default(autoincrement()) // [!code ++]
        email String  @unique // [!code ++]
        name  String? // [!code ++]
      } // [!code ++]
    ```

#### Create and run database migration
    Then generate and run initial migration.

    This will generate a `.sql` migration file in `prisma/migrations`, create a new SQLite instance, and execute the migration against the new instance.

    ```bash
     bunx --bun prisma migrate dev --name init
    ```

    ```txt
    Environment variables loaded from .env
    Prisma schema loaded from prisma/schema.prisma
    Datasource "db": SQLite database "dev.db" at "file:./dev.db"

    SQLite database dev.db created at file:./dev.db

    Applying migration `20251014141233_init`

    The following migration(s) have been created and applied from new schema changes:

    prisma/migrations/
     └─ 20251014141233_init/
       └─ migration.sql

    Your database is now in sync with your schema.

    ✔ Generated Prisma Client (6.17.1) to ./generated in 18ms
    ```

#### Generate Prisma Client
    As indicated in the output, Prisma re-generates our *Prisma client* whenever we execute a new migration. The client provides a fully typed API for reading and writing from our database. You can manually re-generate the client with the Prisma CLI.

    ```sh
    bunx --bun prisma generate
    ```

#### Initialize Prisma Client with LibSQL
    Now we need to create a Prisma client instance. Create a new file `prisma/db.ts` to initialize the PrismaClient with the LibSQL adapter.

    ```ts
    import { PrismaClient } from "./generated/client";
    import { PrismaLibSQL } from "@prisma/adapter-libsql";

    const adapter = new PrismaLibSQL({ url: process.env.DATABASE_URL || "" });
    export const prisma = new PrismaClient({ adapter });
    ```

#### Create a test script
    Let's write a simple script to create a new user, then count the number of users in the database.

    ```ts
    import { prisma } from "./prisma/db";

    // create a new user
    await prisma.user.create({
      data: {
        name: "John Dough",
        email: `john-${Math.random()}@example.com`,
      },
    });

    // count the number of users
    const count = await prisma.user.count();
    console.log(`There are ${count} users in the database.`);
    ```

#### Run and test the application
    Let's run this script with `bun run`. Each time we run it, a new user is created.

    ```bash
    bun run index.ts
    ```

    ```txg
    Created john-0.12802932895402364@example.com
    There are 1 users in the database.
    ```

    ```bash
    bun run index.ts
    ```

    ```txt
    Created john-0.8671308799782803@example.com
    There are 2 users in the database.
    ```

    ```bash
    bun run index.ts
    ```

    ```txt
    Created john-0.4465968383115295@example.com
    There are 3 users in the database.
    ```

***

That's it! Now that you've set up Prisma using Bun, we recommend referring to the [official Prisma docs](https://www.prisma.io/docs/orm/prisma-client) as you continue to develop your application.
