# Using AgentKit with E2B

> Develop Coding Agents using E2B Sandboxes as tools

[E2B](https://e2b.dev) is an open-source runtime for executing AI-generated code in secure cloud sandboxes. Made for agentic & AI use cases.

E2B is a perfect fit to build Coding Agents that can write code, fix bugs, and more.

## Setup

    Within an existing project, Install AgentKit and E2B from npm:

      ```shell npm theme={"system"}
      npm install @inngest/agent-kit inngest @e2b/code-interpreter
      ```

      ```shell pnpm theme={"system"}
      pnpm install @inngest/agent-kit inngest @e2b/code-interpreter
      ```

      ```shell yarn theme={"system"}
      yarn add @inngest/agent-kit inngest @e2b/code-interpreter
      ```

      To create a new project, create a new directory then initialize using your package manager:

        ```shell npm theme={"system"}
        mkdir my-agent-kit-project && npm init
        ```

        ```shell pnpm theme={"system"}
        mkdir my-agent-kit-project && pnpm init
        ```

        ```shell yarn theme={"system"}
        mkdir my-agent-kit-project && yarn init
        ```

    Create a Agent and its associated Network:

    ```typescript  theme={"system"}
    import {
      createAgent,
      createNetwork,
      anthropic
    } from "@inngest/agent-kit";

    const agent = createAgent({
      name: "Coding Agent",
      description: "An expert coding agent",
      system: `You are a coding agent help the user to achieve the described task.

      Once the task completed, you should return the following information:
      <task_summary>
      </task_summary>

      Think step-by-step before you start the task.
      `,
      model: anthropic({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4096,
      }),
    });

    const network = createNetwork({
      name: "Coding Network",
      agents: [agent],
      defaultModel: anthropic({
        model: "claude-3-5-sonnet-20240620",
        maxTokens: 1000,
      })
    });

    ```

    To operate, our Coding Agent will need to create files and run commands.

    Below is an example of how to create the `createOrUpdateFiles` and `terminal` E2B tools:

    ```typescript {5, 23-79} theme={"system"}
    import {
      createAgent,
      createNetwork,
      anthropic,
      createTool
    } from "@inngest/agent-kit";

    const agent = createAgent({
      name: "Coding Agent",
      description: "An expert coding agent",
      system: `You are a coding agent help the user to achieve the described task.

      Once the task completed, you should return the following information:
      <task_summary>
      </task_summary>

      Think step-by-step before you start the task.
      `,
      model: anthropic({
        model: "claude-3-5-sonnet-latest",
        max_tokens: 4096,
      }),
      tools: [
        // terminal use
        createTool({
          name: "terminal",
          description: "Use the terminal to run commands",
          parameters: z.object({
            command: z.string(),
          }),
          handler: async ({ command }, { network }) => {
            const buffers = { stdout: "", stderr: "" };

            try {
              const sandbox = await getSandbox(network);
              const result = await sandbox.commands.run(command, {
                onStdout: (data: string) => {
                  buffers.stdout += data;
                },
                onStderr: (data: string) => {
                  buffers.stderr += data;
                },
              });
              return result.stdout;
            } catch (e) {
              console.error(
                `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`
              );
              return `Command failed: ${e} \nstdout: ${buffers.stdout}\nstderr: ${buffers.stderr}`;
            }
          },
        }),
        // create or update file
        createTool({
          name: "createOrUpdateFiles",
          description: "Create or update files in the sandbox",
          parameters: z.object({
            files: z.array(
              z.object({
                path: z.string(),
                content: z.string(),
              })
            ),
          }),
          handler: async ({ files }, { network }) => {
            try {
              const sandbox = await getSandbox(network);
              for (const file of files) {
                await sandbox.files.write(file.path, file.content);
              }
              return `Files created or updated: ${files
                .map((f) => f.path)
                .join(", ")}`;
            } catch (e) {
              return "Error: " + e;
            }
          },
        }),
      ]
    });

    const network = createNetwork({
      name: "Coding Network",
      agents: [agent],
      defaultModel: anthropic({
        model: "claude-3-5-sonnet-20240620",
        maxTokens: 1000,
      })
    });

    ```

    You will find the complete example in the [E2B Coding Agent example](https://github.com/inngest/agent-kit/tree/main/examples/e2b-coding-agent#readme).

      **Designing useful tools**

      As covered in Anthropic's ["Tips for Building AI Agents"](https://www.youtube.com/watch?v=LP5OCa20Zpg),
      the best Agents Tools are the ones that you will need to accomplish the task by yourself.

      Do not map tools directly to the underlying API, but rather design tools that are useful for the Agent to accomplish the task.

## Examples

    This examples shows how to use E2B sandboxes to build a coding agent that can write code and run commands to generate complete project, complete refactoring and fix bugs.

    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Agents</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Tools</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Network</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Integrations</span>

    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Code-based Router</span>

    Let's reinvent the CSV upload UX with an AgentKit network leveraging E2B sandboxes.

    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Agents</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Tools</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Network</span>
    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Integrations</span>

    <span className="mr-2 border-primary dark:border-primary-light bg-primary/10 text-primary text-xs dark:text-primary-light dark:bg-primary-light/10 rounded-xl px-2 py-1">Code-based Router</span>
