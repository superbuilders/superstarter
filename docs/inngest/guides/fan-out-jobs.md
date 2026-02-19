# Fan-out (one-to-many)

The fan-out pattern enables you to send a single event and trigger multiple functions in parallel (one-to-many). The key benefits of this approach are:

- **Reliability**: Logic from each function runs independently, meaning an issue with one function will not affect the other(s).
- **Performance**: As functions area run in parallel, all of the work will execute faster than running in sequence.

A use case for fan-out is, for example, when a user signs up for your product. In this scenario, you may want to:

1. Send a welcome email
2. Start a trial in Stripe
3. Add the user to your CRM
4. Add the user's email to your mailing list

The fan-out pattern is also useful in distributed systems where a single event is consumed by functions running in different applications.

## How to fan-out to multiple functions

Since Inngest is powered by events, implementing fan-out is as straightforward as defining multiple functions that use the same event trigger. Let's take the above example of user signup and implement it in Inngest.

First, set up a `/signup` route handler to send an event to Inngest when a user signs up:

```ts {{ filename: "app/routes/signup/route.ts" }}
import { inngest } from '../inngest/client';

export async function POST(request: Request) {
  // NOTE - this code is simplified for the example:
  const { email, password } = await request.json();
  const user = await createUser({ email, password });
  await createSession(user.id);

  // Send an event to Inngest
  await inngest.send({
    name: 'app/user.signup',
    data: {
      user: {
        id: user.id,
        email: user.email,
      },
    },
  });

  redirect('https://myapp.com/dashboard');
}
```

Now, with this event, any function using `"app/user.signup"` as its event trigger will be automatically invoked.

Next, define two functions: `sendWelcomeEmail` and `startStripeTrial`. As you can see below, both functions use the same event trigger, but perform different work.

```ts {{ filename: "inngest/functions.ts" }}
const sendWelcomeEmail = inngest.createFunction(
  { id: 'send-welcome-email' },
  { event: 'app/user.signup' },
  async ({ event, step }) => {
    await step.run('send-email', async () => {
      await sendEmail({ email: event.data.user.email, template: 'welcome');
    });
  }
)

const startStripeTrial = inngest.createFunction(
  { id: 'start-stripe-trial' },
  { event: 'app/user.signup' },
  async ({ event }) => {
    const customer = await step.run('create-customer', async () => {
      return await stripe.customers.create({ email: event.data.user.email });
    });
    await step.run('create-subscription', async () => {
      return await stripe.subscriptions.create({
        customer: customer.id,
        items: [{ price: 'price_1MowQULkdIwHu7ixraBm864M' }],
        trial_period_days: 14,
      });
    });
  }
)
```

You've now successfully implemented fan-out in our application. Each function will run independently and in parallel. If one function fails, the others will not be disrupted.

Other benefits of fan-out include:

- **Bulk Replay**: If a third-party API goes down for a period of time (for example, your email provider), you can use [Replay](/docs-markdown/platform/replay) to selectively re-run all functions that failed, without having to re-run all sign-up flow functions.
- **Testing**: Each function can be tested in isolation, without having to run the entire sign-up flow.
- **New features or refactors**: As each function is independent, you can add new functions or refactor existing ones without having to edit unrelated code.
- **Trigger functions in different codebases**: If you have multiple codebases, even using different programming languages (for example [Python](/docs-markdown/reference/python) or [Go](https://pkg.go.dev/github.com/inngest/inngestgo)), you can trigger functions in both codebases from a single event.

Since Inngest is powered by events, implementing fan-out is as straightforward as defining multiple functions that use the same event trigger. Let's take the above example of user signup and implement it in Inngest.

First, set up a `/signup` route handler to send an event to Inngest when a user signs up:

```go {{ filename: "main.go" }}
import (
	"encoding/json"
	"log"
	"net/http"

	"github.com/inngest/inngestgo"
)

func main() {
	// Initialize the Inngest SDK client
	client, err := inngestgo.NewClient(inngestgo.ClientOpts{
		AppID: "core",
	})
	if err != nil {
		panic(err)
	}

	// Initialize your HTTP server
	mux := http.NewServeMux()

	// Handle signup route
	mux.HandleFunc("/signup", func(w http.ResponseWriter, r *http.Request) {
		if r.Method != http.MethodPost {
			http.Error(w, "Method not allowed", http.StatusMethodNotAllowed)
			return
		}

		// Parse request body - in a real app you'd validate the input
		var user struct {
			Email string `json:"email"`
		}
		if err := json.NewDecoder(r.Body).Decode(&user); err != nil {
			http.Error(w, err.Error(), http.StatusBadRequest)
			return
		}

		// Send event to Inngest
		_, err := client.Send(r.Context(), inngestgo.Event{
			Name: "app/user.signup",
			Data: map[string]interface{}{
				"user": map[string]interface{}{
					"email": user.Email,
				},
			},
		})
		if err != nil {
			http.Error(w, err.Error(), http.StatusInternalServerError)
			return
		}

		w.WriteHeader(http.StatusOK)
	})

	// Start the server
	log.Fatal(http.ListenAndServe(":8080", mux))
}
```

Now, with this event, any function using `"app/user.signup"` as its event trigger will be automatically invoked.

Next, define two functions: `sendWelcomeEmail` and `startStripeTrial`. As you can see below, both functions use the same event trigger, but perform different work.

```go {{ filename: "inngest/functions.go" }}
func loadSendWelcomeEmailInngestFn(client inngestgo.Client) (inngestgo.ServableFunction, error) {
	return inngestgo.CreateFunction(
		client,
		inngestgo.FunctionOpts{
			ID: "send-welcome-email",
		},
		inngestgo.EventTrigger("app/user.signup", nil),
		func(ctx context.Context, input inngestgo.Input[map[string]any]) (any, error) {
			_, err := step.Run(ctx, "send-email", func(ctx context.Context) (any, error) {
				return SendEmail(SendEmailInput{
					To:      input.Event.Data["user"].(map[string]interface{})["email"].(string),
					Subject: "welcome",
				})
			})
			return nil, err
		},
	)
}

func loadStartStripeTrialInngestFn(client inngestgo.Client) (inngestgo.ServableFunction, error) {
	return inngestgo.CreateFunction(
		client,
		inngestgo.FunctionOpts{
			ID: "start-stripe-trial",
		},
		inngestgo.EventTrigger("app/user.signup", nil),
		func(ctx context.Context, input inngestgo.Input[map[string]any]) (any, error) {
			customerID, err := step.Run(ctx, "create-customer", func(ctx context.Context) (any, error) {
				return CreateStripeAccount(&StripeCustomerParams{
					Email: input.Event.Data["user"].(map[string]interface{})["email"].(string),
				})
			})
			if err != nil {
				return nil, err
			}
			_, err = step.Run(ctx, "create-subscription", func(ctx context.Context) (any, error) {
				return CreateStripeSubscription(&StripeSubscriptionParams{
					Customer:        customerID.(string),
					TrialPeriodDays: 14,
				})
			})
			return nil, err
		},
	)
}
```

You've now successfully implemented fan-out in our application. Each function will run independently and in parallel. If one function fails, the others will not be disrupted.

Other benefits of fan-out include:

- **Bulk Replay**: If a third-party API goes down for a period of time (for example, your email provider), you can use [Replay](/docs-markdown/platform/replay) to selectively re-run all functions that failed, without having to re-run all sign-up flow functions.
- **Testing**: Each function can be tested in isolation, without having to run the entire sign-up flow.
- **New features or refactors**: As each function is independent, you can add new functions or refactor existing ones without having to edit unrelated code.
- **Trigger functions in different codebases**: If you have multiple codebases, even using different programming languages (for example [TypeScript](/docs-markdown/reference/typescript) or [Python](/docs-markdown/reference/python)), you can trigger functions in both codebases from a single event.

Since Inngest is powered by events, implementing fan-out is as straightforward as defining multiple functions that use the same event trigger. Let's take the above example of user signup and implement it in Inngest.

First, set up a `/signup` route handler to send an event to Inngest when a user signs up:

```py {{ title: "Flask route" }}
import inngest
from flask import Flask, request, redirect

inngest_client = inngest.Inngest(app_id="my-app")
app = Flask(__name__)

@app.route("/signup", methods=["POST"])
async def signup():
    # NOTE - this code is simplified for the example:
    data = await request.get_json()
    email = data["email"]
    password = data["password"]

    user = await create_user(email=email, password=password)
    await create_session(user.id)

    # Send an event to Inngest
    await inngest_client.send(
        inngest.Event(
            name="app/user.signup",
            data={"id": user.id, "email": user.email},
        )
    )

    return redirect("https://myapp.com/dashboard")
```

```py {{ title: "FastAPI route" }}
import inngest
from fastapi import FastAPI, Request
from fastapi.responses import RedirectResponse

inngest_client = inngest.Inngest(app_id="my-app")
app = FastAPI()

@app.post("/signup")
async def signup(request: Request):
    # NOTE - this code is simplified for the example:
    data = await request.json()
    email = data["email"]
    password = data["password"]

    user = await create_user(email=email, password=password)
    await create_session(user.id)

    # Send an event to Inngest
    await inngest_client.send(
        inngest.Event(
            name="app/user.signup",
            data={"id": user.id, "email": user.email},
        )
    )

    return RedirectResponse(url="https://myapp.com/dashboard")
```

Now, with this event, any function using `"app/user.signup"` as its event trigger will be automatically invoked.

Next, define two functions: `sendWelcomeEmail` and `startStripeTrial`. As you can see below, both functions use the same event trigger, but perform different work.

```py {{ filename: "inngest/functions.py" }}
@inngest_client.create_function(
    fn_id="send-welcome-email",
    trigger=inngest.TriggerEvent(event="app/user.signup"),
)
async def send_welcome_email(ctx: inngest.Context) -> None:
    await ctx.step.run("send-email", lambda: send_email(
        email=ctx.event.data["email"],
        template="welcome",
    ))

@inngest_client.create_function(
    fn_id="start-stripe-trial", 
    trigger=inngest.TriggerEvent(event="app/user.signup"),
)
async def start_stripe_trial(
    ctx: inngest.Context,
) -> None:
    customer = await ctx.step.run("create-customer", lambda: stripe.Customer.create(
        email=ctx.event.data["email"]
    ))
    
    await ctx.step.run("create-subscription", lambda: stripe.Subscription.create(
        customer=customer.id,
        items=[{"price": "price_1MowQULkdIwHu7ixraBm864M"}],
        trial_period_days=14
    ))
```

You've now successfully implemented fan-out in our application. Each function will run independently and in parallel. If one function fails, the others will not be disrupted.

Other benefits of fan-out include:

- **Bulk Replay**: If a third-party API goes down for a period of time (for example, your email provider), you can use [Replay](/docs-markdown/platform/replay) to selectively re-run all functions that failed, without having to re-run all sign-up flow functions.
- **Testing**: Each function can be tested in isolation, without having to run the entire sign-up flow.
- **New features or refactors**: As each function is independent, you can add new functions or refactor existing ones without having to edit unrelated code.
- **Trigger functions in different codebases**: If you have multiple codebases, even using different programming languages (for example [TypeScript](/docs-markdown/reference/typescript) or [Go](https://pkg.go.dev/github.com/inngest/inngestgo)), you can trigger functions in both codebases from a single event.

## Further reading

- [Sending events](/docs-markdown/events)
- [Invoking functions from within functions](/docs-markdown/guides/invoking-functions-directly)
- [Sending events from functions](/docs-markdown/guides/sending-events-from-functions)