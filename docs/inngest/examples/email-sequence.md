# Email Sequence

A drip campaign is usually based on your user's behavior.

Let's say you want to create the following campaign:

- Send every user a welcome email when they join.
  - If a user received an email: wait a day and then follow-up with pro user tips meant for highly engaged users.
  - Otherwise: wait for up to three days and then send them the default trial offer, but only if the user hasn't already upgraded their plan in the meantime.

This page provides an overview on how to use Inngest to build reliable marketing campaigns, as well as all the related materials to this feature.

## Quick Snippet

Below is an example of how such a campaign would look like:

```javascript
const signupDripCampaign = inngest.createFunction(
  { id: "signup-drip-campaign" },
  { event: "app/signup.completed" },
  async ({ event, step }) => {
    const { user } = event.data;
    const { email, first_name } = user
    const welcome = "Welcome to ACME";

    const { id: emailId } = await step.run("welcome-email", async () => {
      return await sendEmail(
        email,
        welcome,
        <div>
          <h1>Welcome to ACME, {user.firstName}</h1>
        </div>
      );
    });

    // Wait up to 3 days for the user open the email and click any link in it
    const clickEvent = await step.waitForEvent("wait-for-engagement", {
      event: "resend/email.clicked",
      if: `async.data.email_id == ${emailId}`,
      timeout: "3 days",
    });

    // if the user clicked the email, send them power user tips
    if (clickEvent) {
      await step.sleep("delay-power-tips-email", "1 day");
      await step.run("send-power-user-tips", async () => {
        await sendEmail(
          email,
          "Supercharge your ACME experience",
          <h1>
            Hello {firstName}, here are tips to get the most out of ACME
          </h1>
        );
      });

      // wait one more day before sending the trial offer
      await step.sleep("delay-trial-email", "1 day");
    }

    // check that the user is not already on the pro plan
    const dbUser = db.users.byEmail(email);

    if (dbUser.plan !== "pro") {
      // send them a free trial offer
      await step.run("trial-offer-email", async () => {
        await sendEmail(
          email,
          "Free ACME Pro trial",
          <h1>
            Hello {firstName}, try our Pro features for 30 days for free
          </h1>
        );
      });
    }
  }
);
```

## Code examples

Here are apps which use Inngest to power email campaigns.

## More context

Check the resources below to learn more about building email sequences with Inngest.

## How it works

With Inngest, you define functions or workflows using its SDK right in your own codebase and serve them through an HTTP endpoint in your application. Inngest uses this endpoint to download the function definitions and to execute them.

When a specific event is triggered, Inngest takes care of reliably executing the function (or functions).

In case of failure, Inngest will retry until it succeeds or you will see the failure on the Inngest dashboard, which you can debug and then retrigger so no data is lost.

## Related concepts

- [Steps](/docs-markdown/learn/inngest-steps)
- [Fan-out jobs](/docs-markdown/guides/fan-out-jobs)
- [Delayed functions](/docs-markdown/guides/delayed-functions#delaying-jobs)
- [Scheduled functions](/docs-markdown/guides/scheduled-functions)