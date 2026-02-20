---
title: Server Uploads with Vercel Blob
product: vercel
url: /docs/vercel-blob/server-upload
type: tutorial
prerequisites:
  - /docs/vercel-blob
related:
  - /docs/functions/runtimes
  - /docs/storage/vercel-blob/client-upload
  - /docs/storage/vercel-blob/using-blob-sdk
summary: Learn how to upload files to Vercel Blob using Server Actions and Route Handlers
---

# Server Uploads with Vercel Blob

> **🔒 Permissions Required**: Vercel Blob

In this guide, you'll learn how to do the following:

- Use the Vercel dashboard to create a Blob store connected to a project
- Upload a file using the Blob SDK from the server

> **⚠️ Warning:** Vercel has a [4.5 MB request body size
> limit](/docs/functions/runtimes#request-body-size) on Vercel Functions. If you
> need to upload larger files, use [client
> uploads](/docs/storage/vercel-blob/client-upload).

## Prerequisites

Vercel Blob works with any frontend framework. First, install the package:

- ### Create a Blob store
  1. Go to your project's [**Storage** tab](https://vercel.com/d?to=%2F%5Bteam%5D%2F%5Bproject%5D%2Fstores\&title=Go+to+Storage)
  2. Select **Create Database**, then choose **Blob**
  3. Select **Continue**, then set the access to **Private** or **Public**
  4. Use the name "Images" and select **Create a new Blob store**
  5. Select the environments where you would like the read-write token to be included. You can also update the prefix of the Environment Variable in Advanced Options
  Once created, you are taken to the Vercel Blob store page.

- ### Prepare your local project
  Since you created the Blob store in a project, we automatically created and added the following Environment Variable to the project for you.
  - `BLOB_READ_WRITE_TOKEN`
  To use this Environment Variable locally, we recommend pulling it with the Vercel CLI:
  ```bash
  vercel env pull
  ```

Server uploads are perfectly fine as long as you do not need to upload files larger than [4.5 MB on Vercel](/docs/functions/runtimes#request-body-size). If you need to upload larger files, consider using [client uploads](/docs/storage/vercel-blob/client-upload).

## Upload a file using Server Actions

## Upload a file using a server upload page and route

You can upload files to Vercel Blob using Route Handlers/API Routes. The following example shows how to upload a file to Vercel Blob using a server upload page and route.

- ### Create a server upload page
  This page will upload files to your server. The files will then be sent to Vercel Blob.

- ### Create a server upload route
  This route forwards the file to Vercel Blob and returns the URL of the uploaded file to the browser.

### Testing your page

- ### Run your application locally
  Run your application locally and visit `/avatar/upload` to upload the file to your store. The browser will display the unique URL created for the file.

- ### Review the Blob object metadata
  - Go to the Vercel Project where you created the store
  - Select the **Storage** tab and select your new store
  - Paste the blob object URL returned in the previous step in the **Blob URL** input box in the **Browser** section and select **Lookup**
  - The following blob object metadata will be displayed: file name, path, size, uploaded date, content type and HTTP headers
  - You also have the option to download and delete the file from this page

You have successfully uploaded an object to your Vercel Blob store and are able to review its metadata, download, and delete it from your Vercel Storage Dashboard.

## Next steps

- Learn how to [use the methods](/docs/storage/vercel-blob/using-blob-sdk) available with the `@vercel/blob` package


---

[View full sitemap](/docs/sitemap)
